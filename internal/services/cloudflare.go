package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mailhub/internal/utils"
)

type CloudflareService struct{}

func NewCloudflareService() *CloudflareService {
	return &CloudflareService{}
}

// GetPublicIP fetches the current public IP of the server
func (s *CloudflareService) GetPublicIP() (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://api.ipify.org")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	ip := strings.TrimSpace(string(body))
	if ip == "" {
		return "", fmt.Errorf("empty IP returned")
	}

	return ip, nil
}

func (s *CloudflareService) getHeaders() (http.Header, error) {
	token := Settings.GetString("cf_api_token", "")
	if token == "" {
		return nil, fmt.Errorf("Cloudflare API Token not configured")
	}

	headers := http.Header{}
	headers.Set("Authorization", "Bearer "+token)
	headers.Set("Content-Type", "application/json")
	return headers, nil
}

// GetZoneID fetches the Cloudflare Zone ID for a given domain
func (s *CloudflareService) GetZoneID(domain string) (string, error) {
	headers, err := s.getHeaders()
	if err != nil {
		return "", err
	}

	reqURL := "https://api.cloudflare.com/client/v4/zones?name=" + url.QueryEscape(domain)
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return "", err
	}
	req.Header = headers

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Result  []struct {
			ID string `json:"id"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if !result.Success || len(result.Result) == 0 {
		return "", fmt.Errorf("zone not found for domain %s", domain)
	}

	return result.Result[0].ID, nil
}

// EnsureRecord creates or updates a DNS record
func (s *CloudflareService) EnsureRecord(zoneID string, recordType, name, content string, proxied bool, priority *int) error {
	headers, err := s.getHeaders()
	if err != nil {
		return err
	}

	// 1. Check if record exists
	query := fmt.Sprintf("type=%s&name=%s", recordType, url.QueryEscape(name))
	reqURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records?%s", zoneID, query)
	req, _ := http.NewRequest("GET", reqURL, nil)
	req.Header = headers

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var listResult struct {
		Success bool `json:"success"`
		Result  []struct {
			ID      string `json:"id"`
			Content string `json:"content"`
			Proxied bool   `json:"proxied"`
		} `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&listResult)

	payload := map[string]interface{}{
		"type":    recordType,
		"name":    name,
		"content": content,
		"proxied": proxied,
		"ttl":     1, // 1 = Auto
	}
	if priority != nil {
		payload["priority"] = *priority
	}

	payloadBytes, _ := json.Marshal(payload)

	if listResult.Success && len(listResult.Result) > 0 {
		// Update existing
		recordID := listResult.Result[0].ID
		existingContent := listResult.Result[0].Content
		existingProxied := listResult.Result[0].Proxied

		if existingContent == content && existingProxied == proxied {
			// No change needed
			return nil
		}

		putURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", zoneID, recordID)
		req, _ = http.NewRequest("PUT", putURL, bytes.NewBuffer(payloadBytes))
		req.Header = headers
		utils.LogInfo("[CF] Updating %s record %s -> %s", recordType, name, content)
	} else {
		// Create new
		postURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID)
		req, _ = http.NewRequest("POST", postURL, bytes.NewBuffer(payloadBytes))
		req.Header = headers
		utils.LogInfo("[CF] Creating %s record %s -> %s", recordType, name, content)
	}

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// ConfigureMailRecords sets up A, MX, SPF, DMARC for a domain
func (s *CloudflareService) ConfigureMailRecords(domain string, ip string) error {
	zoneID, err := s.GetZoneID(domain)
	if err != nil {
		return err
	}

	mailDomain := "mail." + domain
	mxPriority := 10

	// 1. A Record for root domain (proxied)
	_ = s.EnsureRecord(zoneID, "A", domain, ip, true, nil)
	
	// 2. A Record for mail subdomain (NOT proxied)
	_ = s.EnsureRecord(zoneID, "A", mailDomain, ip, false, nil)
	
	// 3. MX Record
	_ = s.EnsureRecord(zoneID, "MX", domain, mailDomain, false, &mxPriority)
	
	// 4. TXT (SPF)
	_ = s.EnsureRecord(zoneID, "TXT", domain, "v=spf1 mx -all", false, nil)
	
	// 5. TXT (DMARC)
	_ = s.EnsureRecord(zoneID, "TXT", "_dmarc."+domain, "v=DMARC1; p=none;", false, nil)

	return nil
}

// SyncAllIPs checks if public IP changed and updates all domains
func (s *CloudflareService) SyncAllIPs() error {
	token := Settings.GetString("cf_api_token", "")
	if token == "" {
		return nil // Not configured
	}

	currentIP, err := s.GetPublicIP()
	if err != nil {
		return fmt.Errorf("failed to get public IP: %v", err)
	}

	lastIP := Settings.GetString("cf_last_ip", "")
	if currentIP == lastIP {
		return nil // No change
	}

	utils.LogInfo("[CF] IP changed from %s to %s. Updating all DNS records...", lastIP, currentIP)

	// Fetch all domains from DB
	// Since CloudflareService is in services, we can access AdminService or DB directly
	adminService := NewAdminService()
	domains, err := adminService.GetDomains()
	if err != nil {
		return err
	}

	for _, d := range domains {
		err := s.ConfigureMailRecords(d.Domain, currentIP)
		if err != nil {
			utils.LogError("[CF] Failed to sync domain %s: %v", d.Domain, err)
		} else {
			utils.LogInfo("[CF] Successfully synced domain %s", d.Domain)
		}
	}

	// Save new IP
	err = Settings.SetConfig("cf_last_ip", currentIP, "Last updated Cloudflare IP")
	if err != nil {
		return err
	}

	return nil
}
