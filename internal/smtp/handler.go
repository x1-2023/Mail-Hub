package smtp

import (
	"bufio"
	"net"
	"strings"

	"mailhub/internal/models"
	"mailhub/internal/queue"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
)

// Session holds the state of an SMTP connection
type Session struct {
	conn   net.Conn
	reader *bufio.Reader
	writer *bufio.Writer

	helo     string
	mailFrom string
	rcptTo   []string
	data     []byte
}

func HandleConnection(conn net.Conn) {
	defer conn.Close()

	session := &Session{
		conn:   conn,
		reader: bufio.NewReader(conn),
		writer: bufio.NewWriter(conn),
	}

	utils.LogInfo("SMTP Connection accepted from %s", conn.RemoteAddr())
	session.write("220 mailhub ESMTP Ready")

	for {
		line, err := session.reader.ReadString('\n')
		if err != nil {
			break
		}

		line = strings.TrimSpace(line)
		cmd := strings.ToUpper(strings.Split(line, " ")[0])
		args := ""
		if len(line) > len(cmd) {
			args = strings.TrimSpace(line[len(cmd):])
		}

		switch cmd {
		case "HELO", "EHLO":
			session.helo = args
			utils.LogInfo("[SMTP] HELO from %s", args)
			session.write("250 OK")
		case "MAIL":
			// MAIL FROM:<sender@example.com>
			if strings.HasPrefix(strings.ToUpper(args), "FROM:") {
				sender := parseAddress(args[5:])
				utils.LogInfo("[SMTP] MAIL FROM: %s", sender)
				// SPAM CHECK at SMTP level (sender-based quick reject)
				spamResult := CheckSpam(sender, "", "")
				if spamResult.IsSpam && spamResult.Action == "reject" {
					utils.LogInfo("Blocked spam sender at SMTP: %s (rule: %s)", sender, spamResult.Rule)
					session.write("554 Access denied - spam filter")
					return
				}
				session.mailFrom = sender
				session.write("250 OK")
			} else {
				session.write("500 Syntax error in parameters or arguments")
			}
		case "RCPT":
			// RCPT TO:<alias@mailhub.io>
			if strings.HasPrefix(strings.ToUpper(args), "TO:") {
				rcpt := parseAddress(args[3:])
				utils.LogInfo("[SMTP] RCPT TO: %s", rcpt)
				// VALIDATE RECIPIENT
				if isValidRecipient(rcpt) {
					session.rcptTo = append(session.rcptTo, rcpt)
					session.write("250 OK")
				} else {
					utils.LogInfo("[SMTP] Rejected rcpt: %s (not found)", rcpt)
					session.write("550 No such user here")
				}
			} else {
				session.write("500 Syntax error")
			}
		case "DATA":
			session.write("354 End data with <CR><LF>.<CR><LF>")
			if err := session.readData(); err != nil {
				utils.LogError("Error reading data: %v", err)
				return
			}
			// Enqueue Task
			for _, rcpt := range session.rcptTo {
				queue.EnqueueEmailTask(session.data, session.mailFrom, rcpt)
				utils.LogInfo("[SMTP] Email Queued from %s to %s", session.mailFrom, rcpt)
			}
			session.write("250 OK Queued")
		case "QUIT":
			session.write("221 Bye")
			return
		case "RSET":
			session.reset()
			session.write("250 OK")
		default:
			session.write("502 Command not implemented")
		}
	}
}

func (s *Session) write(msg string) {
	s.writer.WriteString(msg + "\r\n")
	s.writer.Flush()
}

func (s *Session) readData() error {
	var data []byte
	for {
		line, err := s.reader.ReadBytes('\n')
		if err != nil {
			return err
		}
		// Dot stuffing handling needed ideally, but for now check . CRLF
		if string(line) == ".\r\n" {
			break
		}
		data = append(data, line...)
	}
	s.data = data
	return nil
}

func (s *Session) reset() {
	s.mailFrom = ""
	s.rcptTo = []string{}
	s.data = []byte{}
}

func parseAddress(raw string) string {
	// Simple cleanup <email> -> email
	clean := strings.Trim(raw, "<> ")
	return clean
}

func isValidRecipient(email string) bool {
	// Split local@domain
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	localPart := parts[0]
	domainName := parts[1]

	// Check DB
	var count int64
	err := database.DB.Model(&models.Alias{}).
		Joins("JOIN domains ON domains.id = aliases.domain_id").
		Where("aliases.local_part = ? AND domains.domain = ?", localPart, domainName).
		Count(&count).Error

	if err != nil {
		utils.LogError("DB Error validating recipient: %v", err)
		return false
	}

	if count > 0 {
		return true
	}

	// Phase 8: Legacy Adoption (Orphan Catch-all)
	// If enabled, accept email even if alias doesn't exist (Worker will create it)
	if services.Settings.GetString("allow_legacy_adoption", "false") == "true" {
		// Check if domain is valid in our system
		var domainCount int64
		database.DB.Model(&models.Domain{}).Where("domain = ?", domainName).Count(&domainCount)
		if domainCount > 0 {
			utils.LogInfo("Accepting orphan email for adoption: %s", email)
			return true
		}
	}

	return false
}
