
import axios from "axios";

// Determine Base URL (Prod vs Dev)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const axiosInstance = axios.create({
    baseURL: API_URL,
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("mh_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadUserSession = Boolean(localStorage.getItem("mh_token"));
        const requestUrl = String(error.config?.url || "");
        const isAuthRequest = requestUrl.startsWith("/auth/");

        // A 401 can also mean an anonymous mailbox token has expired. Only
        // expire the login session when one actually exists; public users must
        // remain on the anonymous inbox instead of being forced to /auth.
        if (error.response?.status === 401 && hadUserSession) {
            localStorage.removeItem("mh_token");
            localStorage.removeItem("mh_user");

            if (!isAuthRequest) {
                const destination = window.location.pathname.startsWith("/admin") ? "/auth" : "/";
                window.location.replace(destination);
            }
        }
        return Promise.reject(error);
    }
);

const API = {
    // Auth
    getAuthPublicKey: () => axiosInstance.get("/auth/key"),
    register: (data: any) => axiosInstance.post("/auth/register", data),
    login: (data: any) => axiosInstance.post("/auth/login", data),

    // User
    getApiKey: () => axiosInstance.get("/me/api-key"),
    rotateApiKey: () => axiosInstance.post("/me/api-key/rotate"),
    changePassword: (data: any) => axiosInstance.post("/me/password", data),

    // Anon Public
    createAnonAddress: (domain?: string, localPart?: string) => axiosInstance.post("/anon/address", { domain, local_part: localPart }),
    getAnonDomains: () => axiosInstance.get("/anon/domains"),
    getPublicConfig: () => axiosInstance.get("/anon/config"),

    // User Aliases (for logged-in users)
    getUserAliases: () => axiosInstance.get("/aliases"),
    createUserAlias: (domain?: string, localPart?: string) => axiosInstance.post("/aliases", { domain: domain, local_part: localPart }),
    deleteUserAlias: (id: string) => axiosInstance.delete(`/aliases/${id}`),

    // Anon Mail
    getMessages: (token: string, limit: number = 20, page: number = 1, starred: boolean = false, aliasId?: string) =>
        axiosInstance.get("/anon/messages", { headers: { 'X-Anon-Token': token }, params: { limit, page, starred, alias_id: aliasId } }),
    getMessageContent: (id: string, token: string) =>
        axiosInstance.get(`/anon/messages/${id}`, { headers: { 'X-Anon-Token': token } }),
    deleteMessage: (id: string, token: string) =>
        axiosInstance.delete(`/anon/messages/${id}`, { headers: { 'X-Anon-Token': token } }),
    starMessage: (id: string, token: string) =>
        axiosInstance.put(`/anon/messages/${id}/star`, {}, { headers: { 'X-Anon-Token': token } }),

    // Admin Basic
    getStats: () => axiosInstance.get("/admin/stats"),
    getUsers: () => axiosInstance.get("/admin/users"),
    getDomains: () => axiosInstance.get("/admin/domains"),
    createDomain: (domain: string, isPublic: boolean) => axiosInstance.post("/admin/domains", { domain, is_public: isPublic }),
    deleteDomain: (id: string) => axiosInstance.delete(`/admin/domains/${id}`),

    getAliases: (limit = 500, offset = 0) => axiosInstance.get(`/admin/aliases?limit=${limit}&offset=${offset}`),
    deleteAlias: (id: string) => axiosInstance.delete(`/admin/aliases/${id}`),
    transferAlias: (id: string, newUserId: string) => axiosInstance.post(`/admin/aliases/${id}/transfer`, { new_user_id: newUserId }),
    transferAliases: (aliasIds: string[], newUserId: string, emails?: string[]) => axiosInstance.post(`/admin/aliases/transfer/bulk`, { alias_ids: aliasIds, emails, new_user_id: newUserId }),
    toggleAliasActive: (id: string, isActive: boolean) => axiosInstance.put(`/admin/aliases/${id}/toggle`, { is_active: isActive }),
    createUser: (data: any) => axiosInstance.post("/admin/users", data),
    migrateUsers: (path?: string) => axiosInstance.post("/admin/users/migrate", { path }),
    deleteUser: (id: string) => axiosInstance.delete(`/admin/users/${id}`),
    changeUserRole: (id: string, role: string) => axiosInstance.put(`/admin/users/${id}/role`, { role }),

    getEmails: (query = "", limit = 50, offset = 0) => axiosInstance.get(`/admin/emails?q=${query}&limit=${limit}&offset=${offset}`),
    getEmailAliasStats: (page = 1, limit = 20, search = "") => axiosInstance.get(`/admin/emails/aliases?limit=${limit}&offset=${(page - 1) * limit}&search=${encodeURIComponent(search)}`),
    getEmailsByAlias: (aliasEmail: string) => axiosInstance.get(`/admin/emails/by-alias?email=${encodeURIComponent(aliasEmail)}`), // New: Get emails by alias
    deleteEmailAdmin: (id: string) => axiosInstance.delete(`/admin/emails/${id}`),
    replyEmail: (recipient: string, subject: string, body: string) => axiosInstance.post("/admin/emails/reply", { recipient, subject, body }),

    // Admin Advanced
    getAuditLogs: () => axiosInstance.get("/admin/audit"),
    getSpamFilters: () => axiosInstance.get("/admin/spam"),
    createSpamFilter: (rule: string, type: string, action: string) => axiosInstance.post("/admin/spam", { rule, type, action }),
    deleteSpamFilter: (id: string) => axiosInstance.delete(`/admin/spam/${id}`),
    // Maintenance
    triggerCleanup: (payload?: any) => axiosInstance.post("/admin/cleanup", payload),
    getSystemLogs: () => axiosInstance.get("/admin/logs"),
    sendAnnouncement: (message: string, type = "info") => axiosInstance.post("/admin/announcements", { message, type }),
    deleteAnnouncement: (id: string | number) => axiosInstance.delete(`/admin/announcements/${id}`),
    // Settings
    getSettings: () => axiosInstance.get("/admin/settings"),
    updateSetting: (key: string, value: string) => axiosInstance.put("/admin/settings", { key, value }),

    // Notifications
    getNotifications: () => axiosInstance.get("/notifications"),
    markNotificationsRead: () => axiosInstance.post("/notifications/read-all"),
};

export default API;
