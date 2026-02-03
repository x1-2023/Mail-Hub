# PLAN-advanced-spam-filter: Hardcoded Guardrails for Orphan Adoption

> **Context**: User requires "Orphan Adoption" (auto-creating aliases for legacy emails) but needs strict filtering to reject obvious spam (Japanese characters, "% OFF", marketing blasts) without relying on the dynamic Admin Spam Rules.

## 1. Strategy
Implement a **Hardcoded Pre-flight Check** specifically for the "Adoption" phase. This check runs ONLY when an email is about to trigger the creation of a new Anonymous Alias. Existing aliases are unaffected.

## 2. Technical Implementation

### 2.1 Rule Engine (`internal/smtp/hardcoded_rules.go`)
Create a new utility to hold these static rules.

**Criteria to Reject:**
1.  **Subject Keywords**:
    - `% OFF`, `SALE`, `Discount`, `Free`
    - Japanese Characters (Range `\p{Hiragana}|\p{Katakana}|\p{Han}`) - *Configurable?*
    - `Casino`, `Bet`, `Crypto`, `Lottery`
2.  **Sender Reputation** (Optional/Future):
    - Block TLDs: `.xyz`, `.top`, `.tk` (often spammy for legacy restoration)

### 2.2 Integration Point (`internal/worker/processor.go`)
Modify the *Legacy Adoption* block:
```go
if err != nil { // Alias not found
    // ... check allow_legacy_adoption ...
    
    // NEW: Check Hardcoded Spam Rules
    if smtp.IsLegacySpam(payload.Sender, subject, body) {
        log.Printf("[Orphan] Rejected spam adoption request from %s: Content suspicious", payload.Sender)
        return nil
    }

    // ... Proceed to create alias ...
}
```

## 3. The Ruleset (Hardcoded)

```go
var LegacyBlocklist = []string{
    `(?i)\d+%\s*OFF`,      // "50% OFF"
    `(?i)SALE`,            // "SALE"
    `[\p{Hiragana}\p{Katakana}]`, // Japanese text (often used in stated spam)
    `(?i)VIAGRA`,
    `(?i)BITCOIN`,
}
```

## 4. Verification
1.  **Unit Test**: Test `IsLegacySpam` with clean english text vs Japanese spam text.
2.  **Integration**: Send a mail with Subject "50% OFF Sushi" to a non-existent alias -> Should NOT create alias.
3.  **Integration**: Send a mail "Hello friend" to non-existent alias -> Should CREATE alias.

## 5. Execution Plan
- [ ] Create `internal/smtp/legacy_rules.go` with regex engine.
- [ ] Integrate into `internal/worker/processor.go`.
- [ ] Add robust logging to track what was blocked.
