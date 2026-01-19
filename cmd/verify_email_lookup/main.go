package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "http://localhost:8080/api"

// Helper struct for response
type Response struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error"`
}

type AuthResponseData struct {
	Token string `json:"token"`
}

type CreateAliasResponseData struct {
	Address string `json:"address"`
	ID      string `json:"id"`
}

func main() {
	fmt.Println(">>> Starting Verification: Email Query Param Check <<<")

	client := &http.Client{Timeout: 10 * time.Second}
	timestamp := time.Now().Unix()
	userEmail := fmt.Sprintf("testuser_%d@example.com", timestamp)
	password := "password123"

	// 1. Register User
	fmt.Printf("[1] Registering User: %s...\n", userEmail)
	registerPayload := map[string]string{
		"email":    userEmail,
		"password": password,
	}
	token := registerUser(client, registerPayload)
	fmt.Printf("    -> Success! Token: %s...\n", token[:10])

	// 2. Create Alias (Claimed by User)
	fmt.Println("[2] Creating Alias for User...")
	aliasPayload := map[string]string{
		"local_part": fmt.Sprintf("verify_%d", timestamp),
		"domain":     "mailhub.net", // Assuming this domain exists, fallback handled if not
	}
	address := createAlias(client, token, aliasPayload)
	fmt.Printf("    -> Success! Address: %s\n", address)

	// 3. Fetch Messages using EMAIL param (The Core Test)
	fmt.Printf("[3] Fetching Messages using ?email=%s...\n", address)
	url := fmt.Sprintf("%s/anon/messages?email=%s", baseURL, address)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		fmt.Printf("!!! FAILED: Expected 200, got %d\n", resp.StatusCode)
		fmt.Printf("Response: %s\n", string(body))
		panic("Verification Failed")
	}

	fmt.Printf("    -> Success! Response Code: %d\n", resp.StatusCode)
	fmt.Println(">>> VERIFICATION COMPLETE: Email Query Param Works! <<<")
}

func registerUser(client *http.Client, payload interface{}) string {
	jsonData, _ := json.Marshal(payload)
	resp, err := client.Post(baseURL+"/auth/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		panic(fmt.Sprintf("Register failed: %d - %s", resp.StatusCode, string(body)))
	}

	var res Response
	json.NewDecoder(resp.Body).Decode(&res)
	var data AuthResponseData
	json.Unmarshal(res.Data, &data)
	return data.Token
}

func createAlias(client *http.Client, token string, payload interface{}) string {
	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", baseURL+"/anon/address", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		// Fallback: If map[string]string failed, try empty body to get random alias
		if resp.StatusCode == 400 || resp.StatusCode == 500 {
			fmt.Println("    (Fallback to random alias creation)")
			req2, _ := http.NewRequest("POST", baseURL+"/anon/address", bytes.NewBuffer([]byte("{}")))
			req2.Header.Set("Authorization", "Bearer "+token)
			req2.Header.Set("Content-Type", "application/json")
			resp2, err2 := client.Do(req2)
			if err2 != nil {
				panic(err2)
			}
			defer resp2.Body.Close()
			resp = resp2
		} else {
			body, _ := io.ReadAll(resp.Body)
			panic(fmt.Sprintf("Create Alias failed: %d - %s", resp.StatusCode, string(body)))
		}
	}

	var res Response
	json.NewDecoder(resp.Body).Decode(&res)
	var data CreateAliasResponseData
	json.Unmarshal(res.Data, &data)
	return data.Address
}
