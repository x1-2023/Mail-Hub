package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"time"
)

func main() {
	fmt.Println("🚀 Starting Integrated System Test (E2E Frontend Simulation)...")

	// 1. Build Everything
	build("cmd/api", "api.exe")
	build("cmd/smtp", "smtp.exe")
	build("cmd/worker", "worker.exe")

	// 2. Kill any old processes (cleanup)
	exec.Command("taskkill", "/F", "/IM", "api.exe").Run()
	exec.Command("taskkill", "/F", "/IM", "smtp.exe").Run()
	exec.Command("taskkill", "/F", "/IM", "worker.exe").Run()

	// 3. Start Services
	startService("./api.exe", []string{"PORT=8080"})
	startService("./smtp.exe", []string{"SMTP_PORT=2525"})
	startService("./worker.exe", nil)

	fmt.Println("⏳ Waiting 5s for services to warm up...")
	time.Sleep(5 * time.Second)

	// 4. Create Anon Identity (Simulate Landing Page)
	fmt.Println("🔹 Client: Requesting Anonymous Address...")
	resp, err := http.Post("http://127.0.0.1:8080/api/anon/address", "application/json", nil)
	if err != nil {
		panic(fmt.Errorf("API Call failed: %v", err))
	}
	defer resp.Body.Close()

	var apiRes struct {
		Success bool `json:"success"`
		Data    struct {
			Address string `json:"address"`
			Token   string `json:"token"`
		} `json:"data"`
	}

	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &apiRes)

	if !apiRes.Success {
		panic("Failed to create anon address: " + string(body))
	}

	targetEmail := apiRes.Data.Address
	token := apiRes.Data.Token
	fmt.Printf("✅ Client: Identity Created: %s\n", targetEmail)

	// 5. Send Email via SMTP (Simulate External Sender)
	fmt.Println("🔹 External: Sending Priority SMTP Mail...")
	sendMail(targetEmail)

	// 6. Poll for Message (Simulate Inbox Polling)
	fmt.Println("🔹 Client: Polling Inbox for new message...")
	found := false
	for i := 0; i < 10; i++ {
		time.Sleep(2 * time.Second)
		fmt.Printf(".")

		req, _ := http.NewRequest("GET", "http://127.0.0.1:8080/api/anon/messages", nil)
		req.Header.Set("X-Anon-Token", token) // Authentication

		client := &http.Client{}
		pollResp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Poll Error: %v\n", err)
			continue
		}

		pollBody, _ := io.ReadAll(pollResp.Body)
		pollResp.Body.Close()

		var pollRes struct {
			Success bool `json:"success"`
			Data    struct {
				Emails []struct {
					Subject string `json:"subject"`
					Sender  string `json:"sender"`
				} `json:"emails"`
			} `json:"data"`
		}
		json.Unmarshal(pollBody, &pollRes)

		if len(pollRes.Data.Emails) > 0 {
			email := pollRes.Data.Emails[0]
			fmt.Printf("\n✨ Client: New Mail Found! Subject: '%s' From: '%s'\n", email.Subject, email.Sender)
			if email.Subject == "Hello World Integration" && email.Sender == "tester@external.com" {
				found = true
				break
			}
		}
	}

	if found {
		fmt.Println("\n✅ E2E TEST PASSED: Full flow verified (API -> SMTP -> Worker -> API)")
	} else {
		fmt.Println("\n❌ E2E TEST FAILED: Timeout waiting for message.")
		os.Exit(1)
	}

	// Cleanup handled by user stopping script or manual kill, but ideally we kill here.
	// For dev convenience, we let them run so user can check Frontend manually if they want.
	// But we will kill to keep it clean for the user's manual run later.
	exec.Command("taskkill", "/F", "/IM", "api.exe").Run()
	exec.Command("taskkill", "/F", "/IM", "smtp.exe").Run()
	exec.Command("taskkill", "/F", "/IM", "worker.exe").Run()
}

func build(dir, out string) {
	fmt.Printf("Building %s...\n", out)
	cmd := exec.Command("go", "build", "-o", out, "./"+dir)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		panic(err)
	}
}

func startService(bin string, env []string) {
	cmd := exec.Command(bin)
	cmd.Env = append(os.Environ(), env...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		panic(err)
	}
}

func sendMail(to string) {
	conn, err := net.Dial("tcp", "localhost:2525")
	if err != nil {
		panic(err)
	}
	defer conn.Close()

	read(conn) // Banner
	write(conn, "HELO localhost")
	read(conn)
	write(conn, "MAIL FROM:<tester@external.com>")
	read(conn)
	write(conn, "RCPT TO:<"+to+">")
	read(conn)
	write(conn, "DATA")
	read(conn)
	write(conn, "Subject: Hello World Integration\r\n\r\nThis is a test body.\r\n.")
	read(conn) // Queued
	write(conn, "QUIT")
	read(conn)
}

func write(conn net.Conn, s string) {
	fmt.Fprintf(conn, "%s\r\n", s)
}

func read(conn net.Conn) {
	buf := make([]byte, 1024)
	conn.Read(buf)
}
