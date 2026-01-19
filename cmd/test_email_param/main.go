package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"mailhub/internal/models"
	"mailhub/pkg/database"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

const baseURL = "http://localhost:8080/api"
const apiKey = "mh_0f6edb4b22f2a0bf7078453ed2f6348248dfb2a073ee228b451be28ba9417612"

type Response struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error"`
}

type CreateAliasData struct {
	Address string `json:"address"`
	Token   string `json:"token"`
}

type MessagesData struct {
	Emails []map[string]interface{} `json:"emails"`
	Total  int                      `json:"total"`
}

func main() {
	fmt.Println(">>> Starting Full API Test: Email Query Param <<<")
	fmt.Println("============================================")

	// Load .env for DB connection
	godotenv.Load()
	database.Connect()

	client := &http.Client{Timeout: 10 * time.Second}
	timestamp := time.Now().Unix()

	// 1. Create Alias using API Key
	fmt.Println("\n[1] Creating Anonymous Alias via API...")
	localPart := fmt.Sprintf("apitest_%d", timestamp)
	aliasPayload := map[string]string{
		"local_part": localPart,
	}
	aliasData := createAliasWithAPIKey(client, aliasPayload)
	fmt.Printf("    ✓ Created: %s\n", aliasData.Address)

	// 2. Find the Alias in DB and inject an email
	fmt.Println("\n[2] Injecting Test Email into Database...")
	var alias models.Alias
	if err := database.DB.Where("local_part = ?", localPart).First(&alias).Error; err != nil {
		panic(fmt.Sprintf("Failed to find alias: %v", err))
	}

	emailID := uuid.NewString()
	testEmail := models.Email{
		AliasID:    alias.ID,
		Sender:     "sender@example.com",
		Subject:    "Test Email for API Verification",
		Snippet:    "This is a test email...",
		ReceivedAt: time.Now(),
	}
	testEmail.ID = emailID
	if err := database.DB.Create(&testEmail).Error; err != nil {
		panic(fmt.Sprintf("Failed to create email: %v", err))
	}
	fmt.Printf("    ✓ Injected Email ID: %s\n", emailID)

	// Also create email content
	emailContent := models.EmailContent{
		EmailID:  emailID,
		BodyHTML: "<p>Test Email Body HTML</p>",
		BodyText: "Test Email Body Text",
	}
	database.DB.Create(&emailContent)

	// 3. Fetch Messages using EMAIL query param
	fmt.Println("\n[3] Fetching Messages using ?email=...")
	fetchURL := fmt.Sprintf("%s/anon/messages?email=%s", baseURL, url.QueryEscape(aliasData.Address))
	req, _ := http.NewRequest("GET", fetchURL, nil)
	req.Header.Set("X-Api-Key", apiKey)

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		fmt.Printf("\n!!! TEST FAILED: Expected 200, got %d\n", resp.StatusCode)
		fmt.Printf("Response: %s\n", string(body))
		os.Exit(1)
	}

	var msgResp Response
	json.Unmarshal(body, &msgResp)
	var msgData MessagesData
	json.Unmarshal(msgResp.Data, &msgData)

	fmt.Printf("    ✓ Response Code: %d\n", resp.StatusCode)
	fmt.Printf("    ✓ Total Messages: %d\n", msgData.Total)

	if msgData.Total < 1 {
		fmt.Println("\n!!! TEST FAILED: Expected at least 1 message")
		os.Exit(1)
	}

	// 4. Verify the injected email is in the list
	found := false
	for _, email := range msgData.Emails {
		if email["id"] == emailID {
			found = true
			fmt.Printf("    ✓ Found Test Email: %s\n", email["subject"])
			break
		}
	}

	if !found {
		fmt.Println("\n!!! TEST FAILED: Injected email not found in response")
		os.Exit(1)
	}

	fmt.Println("\n============================================")
	fmt.Println(">>> ALL TESTS PASSED: Email Query Param Works! <<<")
}

func createAliasWithAPIKey(client *http.Client, payload interface{}) CreateAliasData {
	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", baseURL+"/anon/address", bytes.NewBuffer(jsonData))
	req.Header.Set("X-Api-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		panic(fmt.Sprintf("Create Alias failed: %d - %s", resp.StatusCode, string(body)))
	}

	var res Response
	json.Unmarshal(body, &res)
	var data CreateAliasData
	json.Unmarshal(res.Data, &data)
	return data
}
