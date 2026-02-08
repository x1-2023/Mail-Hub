// --- Auth & Users ---
export interface User {
    id: string;
    email: string;
    role: "user" | "admin" | "owner";
    created_at: string;
}

export interface Domain {
    id: string;
    domain: string;
    is_public: boolean;
    created_at: string;
}

export interface Alias {
    id: string;
    local_part: string;
    domain_id: string;
    user_id?: string;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
}

// --- Email ---
export interface Email {
    id: string;
    alias_id: string;
    sender: string;
    subject: string;
    snippet: string;
    body?: string;
    is_read: boolean;
    is_starred: boolean;
    received_at: string;
    created_at: string;
}

// --- Notifications ---
export interface Notification {
    id: string;
    user_id: string;
    type: "info" | "warning" | "success" | "error";
    message: string;
    is_read: boolean;
    created_at: string;
}

// --- Admin ---
export interface SystemSetting {
    key: string;
    value: string;
    description: string;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
}

export interface SpamFilter {
    id: string;
    rule: string;
    type: "subject" | "sender" | "body";
    action: "reject" | "flag";
    is_active: boolean;
    created_at: string;
}
