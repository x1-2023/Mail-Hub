import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";

export const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem("mh_token");
    const userStr = localStorage.getItem("mh_user");

    if (!token) {
        // Not logged in -> Redirect to Auth
        return <Navigate to="/auth" replace />;
    }

    let role = "";
    try {
        if (userStr) {
            const user = JSON.parse(userStr);
            role = user.role;
        }
    } catch (e) {
        console.error("Failed to parse user", e);
    }

    // Logged in but not Admin/Owner -> Show 404 (Masking)
    if (role !== "admin" && role !== "owner") {
        return <NotFound />;
    }

    return <>{children}</>;
};
