package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"log"
	"os"
)

var privateKey *rsa.PrivateKey

func InitRSAKey() {
	keyPath := "data/.rsa_key.pem"
	
	// Create data dir if not exists
	os.MkdirAll("data", 0755)

	if _, err := os.Stat(keyPath); os.IsNotExist(err) {
		log.Println("Generating new RSA Key Pair for Auth payload encryption...")
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			log.Fatalf("Failed to generate RSA key: %v", err)
		}
		
		keyBytes := x509.MarshalPKCS1PrivateKey(key)
		pemBlock := &pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: keyBytes,
		}
		
		file, err := os.Create(keyPath)
		if err != nil {
			log.Fatalf("Failed to create RSA key file: %v", err)
		}
		defer file.Close()
		
		err = pem.Encode(file, pemBlock)
		if err != nil {
			log.Fatalf("Failed to encode RSA key: %v", err)
		}
		privateKey = key
	} else {
		// Load existing key
		keyBytes, err := os.ReadFile(keyPath)
		if err != nil {
			log.Fatalf("Failed to read RSA key file: %v", err)
		}
		
		block, _ := pem.Decode(keyBytes)
		if block == nil {
			log.Fatalf("Failed to decode PEM block containing RSA key")
		}
		
		key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			log.Fatalf("Failed to parse RSA key: %v", err)
		}
		privateKey = key
	}
}

// GetPublicKeyPEM returns the public key in PEM format
func GetPublicKeyPEM() string {
	if privateKey == nil {
		InitRSAKey()
	}
	
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		log.Printf("Failed to marshal public key: %v", err)
		return ""
	}
	
	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	}
	
	return string(pem.EncodeToMemory(pemBlock))
}

// DecryptRSA decrypts a base64 encoded payload encrypted with the public key
func DecryptRSA(base64Ciphertext string) (string, error) {
	if privateKey == nil {
		InitRSAKey()
	}

	ciphertext, err := base64.StdEncoding.DecodeString(base64Ciphertext)
	if err != nil {
		return "", err
	}

	plaintext, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, ciphertext)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
