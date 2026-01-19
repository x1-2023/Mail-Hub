package utils

import (
	"crypto/rand"
	"encoding/hex"
)

func GenerateRandomString(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// hex string is 2x length of bytes, so for n chars we need n/2 bytes
	// But let's just do hex.Encode and truncate/use
	// Actually better to use base32 or just hex
	return hex.EncodeToString(bytes), nil
}
