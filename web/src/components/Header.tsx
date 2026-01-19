import { Mail, User, LayoutDashboard, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/common/NotificationBell";
import { MobileSidebar } from "@/components/MobileSidebar";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ChangePasswordModal } from "@/components/modals/ChangePasswordModal";
import { ApiKeyModal } from "@/components/modals/ApiKeyModal";

export const Header = () => {
  const token = localStorage.getItem("mh_token");
  const isGuest = !token;
  const { t } = useLanguage();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);

  let isAdmin = false;
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      isAdmin = decoded.role === "admin" || decoded.role === "owner";
    } catch (e) {
      console.error("Invalid token", e);
    }
  }

  return (
    <header className="sticky top-0 z-50 brutalist-card rounded-none border-b-[2px] border-t-0 border-l-0 border-r-0 shadow-none bg-card">
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Mobile Menu + Brand */}
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <Mail className="w-8 h-8" />
          <h1 className="text-xl font-black uppercase tracking-tight hidden sm:block">MailHub</h1>
          {isGuest && (
            <Badge variant="secondary" className="hidden sm:flex items-center gap-1 border-2 border-border bg-muted text-muted-foreground">
              <Shield className="w-3 h-3" />
              {t("header.anonymous") || "ANON"}
            </Badge>
          )}
        </div>

        {/* Center: Nav - Hidden on mobile/tablet */}
        <nav className="hidden lg:flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" className="brutalist-button shadow-none hover:bg-primary hover:text-primary-foreground">
              {t("header.inbox")}
            </Button>
          </Link>
          <Link to="/?tab=starred">
            <Button variant="ghost" className="brutalist-button shadow-none hover:bg-secondary hover:text-secondary-foreground">
              {t("header.starred")}
            </Button>
          </Link>
          <Link to="/docs">
            <Button variant="ghost" className="brutalist-button shadow-none hover:bg-muted">
              {t("header.apiDocs")}
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" className="brutalist-button shadow-none hover:bg-destructive hover:text-destructive-foreground text-destructive">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                {t("header.admin")}
              </Button>
            </Link>
          )}
        </nav>

        {/* Right: Settings + Auth Actions */}
        <div className="flex items-center gap-3">
          <SettingsDropdown />
          {!isGuest && <NotificationBell />}
          {isGuest ? (
            <Link to="/auth">
              <Button className="hidden lg:flex brutalist-button gradient-hero text-accent-foreground">
                {t("header.login")}
              </Button>
            </Link>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full border-[2px] border-border p-0">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="brutalist-card w-48 bg-card">
                  <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setShowApiModal(true)}>
                    {t("header.myApi")}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setShowPasswordModal(true)}>
                    {t("header.changePassword")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-semibold text-destructive cursor-pointer"
                    onClick={() => {
                      localStorage.removeItem("mh_token");
                      window.location.reload();
                    }}
                  >
                    {t("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
              <ApiKeyModal open={showApiModal} onOpenChange={setShowApiModal} />
            </>
          )}
        </div>
      </div>
    </header>
  );
};
