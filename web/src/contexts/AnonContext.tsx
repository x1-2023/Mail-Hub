

import React, { createContext, useContext, useState, useEffect } from "react";
import API from "@/lib/api";
import { toast } from "sonner";

interface HistoryItem {
    id?: string; // DB ID for authenticated users
    address: string;
    token: string;
    expiresAt: string | null;
    email_count?: number;
}

interface AnonState {
    address: string | null;
    token: string | null;
    expiresAt: string | null;
    loading: boolean;
    history: HistoryItem[];
    createIdentity: (domain?: string, localPart?: string) => Promise<void>;
    switchIdentity: (address: string) => void;
    removeIdentity: (targetAddress: string) => void;
    resetIdentity: () => void;
}

const AnonContext = createContext<AnonState | undefined>(undefined);

const getStoredAnonValue = (key: string) => {
    if (localStorage.getItem("mh_token")) return null;
    return localStorage.getItem(key);
};

const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiresAtMs = Date.parse(expiresAt);
    return Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now();
};

export const AnonProvider = ({ children }: { children: React.ReactNode }) => {
    // Initial state from local storage (default for anon)
    const storedExpiresAt = getStoredAnonValue("anon_expires");
    const storedIdentityExpired = isExpired(storedExpiresAt);
    const [address, setAddress] = useState<string | null>(
        storedIdentityExpired ? null : getStoredAnonValue("anon_address")
    );
    const [token, setToken] = useState<string | null>(
        storedIdentityExpired ? null : getStoredAnonValue("anon_token")
    );
    const [expiresAt, setExpiresAt] = useState<string | null>(
        storedIdentityExpired ? null : storedExpiresAt
    );
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load History from LocalStorage (initial)
    useEffect(() => {
        const stored = localStorage.getItem("anon_history");
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as HistoryItem[];
                const activeHistory = parsed.filter(item => !isExpired(item.expiresAt));
                setHistory(activeHistory);
                localStorage.setItem("anon_history", JSON.stringify(activeHistory));
            } catch {
                localStorage.removeItem("anon_history");
            }
        }

        if (storedIdentityExpired) {
            localStorage.removeItem("anon_address");
            localStorage.removeItem("anon_token");
            localStorage.removeItem("anon_expires");
        }
    }, [storedIdentityExpired]);

    // Sync with Database if Logged In
    useEffect(() => {
        const userToken = localStorage.getItem("mh_token");
        if (userToken) {
            fetchUserAliases(userToken);
        }
    }, []);

    const fetchUserAliases = async (authToken: string) => {
        try {
            const res = await API.getUserAliases(); // Uses axios interceptor
            if (res.data.success) {
                const dbAliases = res.data.data;
                const dbHistory: HistoryItem[] = dbAliases.map((a: any) => ({
                    id: a.id,
                    address: `${a.local_part}@${a.domain.domain}`,
                    token: authToken,
                    expiresAt: null,
                    email_count: a.email_count ?? 0
                }));

                // Update state
                setHistory(dbHistory);

                // If current address is not in DB list (and we found some), default to first one
                if (dbHistory.length > 0) {
                    const currentInList = dbHistory.find(h => h.address === address);
                    if (!currentInList) {
                        // Switch effectively
                        const target = dbHistory[0];
                        setAddress(target.address);
                        setToken(target.token);
                        setExpiresAt(null);
                        // Update local storage too to keep in sync
                        localStorage.setItem("anon_address", target.address);
                        localStorage.setItem("anon_token", target.token);
                        localStorage.removeItem("anon_expires");
                    }
                } else if (dbHistory.length === 0) {
                    // Logged in but no aliases?
                    // Maybe prompt creation?
                }
            }
        } catch (e) {
            console.error("Failed to sync aliases", e);
        }
    };

    const saveHistory = (newHistory: HistoryItem[]) => {
        setHistory(newHistory);
        // Only save to localStorage if NOT logged in? 
        // Or strictly strictly only anonymous history?
        // User asked for separation.
        // If logged in, we rely on DB fetch on reload, so local storage history is less critical, 
        // BUT for offline/persistence speed it's okay.
        // However, user said: "local storage only for anon".
        const userToken = localStorage.getItem("mh_token");
        if (!userToken) {
            localStorage.setItem("anon_history", JSON.stringify(newHistory));
        }
    };

    const createIdentity = async (domain?: string, localPart?: string) => {
        setLoading(true);
        try {
            const userToken = localStorage.getItem("mh_token");

            if (userToken) {
                // Logged-in: Create in DB
                const res = await API.createUserAlias(undefined, localPart); // Backend selects domain if undefined
                if (res.data.success) {
                    const alias = res.data.data;
                    const newAddress = `${alias.local_part}@${alias.domain?.domain || "unknown"}`;
                    const newItem: HistoryItem = { id: alias.id, address: newAddress, token: userToken, expiresAt: null };

                    setAddress(newAddress);
                    setToken(userToken);
                    setExpiresAt(null);

                    localStorage.setItem("anon_address", newAddress);
                    localStorage.setItem("anon_token", userToken);
                    localStorage.removeItem("anon_expires");
                    toast.success(`Alias Created: ${newAddress}`);

                    // Append to DB List locally
                    setHistory(prev => [newItem, ...prev]);
                }
            } else {
                // Anonymous: Create via Anon API
                const res = await API.createAnonAddress(domain, localPart);
                if (res.data.success) {
                    const { address, token, expires_at } = res.data.data;
                    const newItem: HistoryItem = { address, token, expiresAt: expires_at };

                    setAddress(address);
                    setToken(token);
                    setExpiresAt(expires_at);

                    localStorage.setItem("anon_address", address);
                    localStorage.setItem("anon_token", token);
                    localStorage.setItem("anon_expires", expires_at);
                    toast.success(`Identity Created: ${address}`);

                    saveHistory([...history, newItem]);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create identity");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const switchIdentity = (targetAddress: string) => {
        const target = history.find(h => h.address === targetAddress);
        if (target) {
            setAddress(target.address);
            setToken(target.token);
            setExpiresAt(target.expiresAt);
            localStorage.setItem("anon_address", target.address);
            localStorage.setItem("anon_token", target.token);
            if (target.expiresAt) localStorage.setItem("anon_expires", target.expiresAt);
            else localStorage.removeItem("anon_expires");

            toast.success(`Switched to ${targetAddress}`);
        }
    };

    const removeIdentity = async (targetAddress: string) => {
        const target = history.find(h => h.address === targetAddress);

        // If it has ID -> Delete from DB
        if (target?.id) {
            try {
                await API.deleteUserAlias(target.id);
                toast.success(`Deleted alias ${targetAddress}`);
            } catch (e) {
                toast.error("Failed to delete alias from server");
                return; // Stop if db delete fails
            }
        }

        // Update UI
        const newHistory = history.filter(h => h.address !== targetAddress);
        setHistory(newHistory);

        if (!target?.id) {
            // Only update local storage if it was an anon alias
            const userToken = localStorage.getItem("mh_token");
            if (!userToken) {
                localStorage.setItem("anon_history", JSON.stringify(newHistory));
            }
        }

        // If removed current, switch
        if (address === targetAddress) {
            if (newHistory.length > 0) {
                switchIdentity(newHistory[0].address);
            } else {
                setAddress(null);
                setToken(null);
                localStorage.removeItem("anon_address");
                localStorage.removeItem("anon_token");
                // Will trigger auto-create if anon, or just empty if user
                const userToken = localStorage.getItem("mh_token");
                if (!userToken) {
                    createIdentity();
                }
            }
        } else {
            if (!target?.id) toast.success(`Removed ${targetAddress}`);
        }
    };

    const resetIdentity = () => {
        setAddress(null);
        setToken(null);
        setExpiresAt(null);
        localStorage.removeItem("anon_address");
        localStorage.removeItem("anon_token");
        localStorage.removeItem("anon_expires");
        createIdentity();
    }

    // Auto-init if empty only for Anon
    useEffect(() => {
        const userToken = localStorage.getItem("mh_token");
        if (!token && !userToken) {
            createIdentity();
        }
    }, [token]);

    return (
        <AnonContext.Provider value={{ address, token, expiresAt, loading, createIdentity, resetIdentity, history, switchIdentity, removeIdentity }}>
            {children}
        </AnonContext.Provider>
    );
};

export const useAnon = () => {
    const context = useContext(AnonContext);
    if (context === undefined) {
        throw new Error("useAnon must be used within an AnonProvider");
    }
    return context;
};

