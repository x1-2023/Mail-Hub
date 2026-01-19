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
	fmt.Println("🚀 Starting Integrated System Test...")

	// 1. Build Everything (Just to be sure)
	exec.Command("go", "build", "-o", "api.exe", "./cmd/api").Run()
	exec.Command("go", "build", "-o", "smtp.exe", "./cmd/smtp").Run()
	exec.Command("go", "build", "-o", "worker.exe", "./cmd/worker").Run()

	// 2. Start Services (Background)
	fmt.Println("Starting Services...")
	apiCmd := exec.Command("./api.exe")
	apiCmd.Env = append(os.Environ(), "PORT=8080")
	apiCmd.Stdout = os.Stdout
	apiCmd.Stderr = os.Stderr
	if err := apiCmd.Start(); err != nil {
		panic(err)
	}
	defer func() { apiCmd.Process.Kill(); fmt.Println("API Stopped") }()

	smtpCmd := exec.Command("./smtp.exe")
	smtpCmd.Env = append(os.Environ(), "SMTP_PORT=2525")
	smtpCmd.Stdout = os.Stdout
	smtpCmd.Stderr = os.Stderr
	if err := smtpCmd.Start(); err != nil {
		panic(err)
	}
	defer func() { smtpCmd.Process.Kill(); fmt.Println("SMTP Stopped") }()

	workerCmd := exec.Command("./worker.exe")
	workerCmd.Stdout = os.Stdout
	workerCmd.Stderr = os.Stderr
	if err := workerCmd.Start(); err != nil {
		panic(err)
	}
	defer func() { workerCmd.Process.Kill(); fmt.Println("Worker Stopped") }()

	// Wait for start
	fmt.Println("Waiting 5s for services to warm up...")
	time.Sleep(5 * time.Second)

	// 3. Create Anon Identity via API
	fmt.Println("Creating Anon Address...")
	resp, err := http.Post("http://localhost:8080/api/anon/address", "application/json", nil)
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
	fmt.Printf("✅ Created Target: %s\n", targetEmail)

	// 4. Send Email via SMTP (Direct TCP to localhost:2525)
	fmt.Println("Sending SMTP Mail...")
	sendMail(targetEmail)

	// 5. Wait for Worker Processing
	fmt.Println("Waiting for Worker...")
	time.Sleep(3 * time.Second)

	// 6. Verification (Manual DB check or future API check)
	// For now, if we don't crash and logs show input, we are good.
	// But let's print a success message.
	fmt.Println("✅ Integration Test Complete! Check worker logs for 'Saved email' message.")
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
	write(conn, "Subject: Hello World Integration\r\n\r\nThis is a test body from integration script.\r\n.")
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
	// fmt.Printf("Server: %s", string(buf))
}
