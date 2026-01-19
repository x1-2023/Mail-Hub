import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Mail,
  Megaphone,
  Shield,
  UserCog,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import DashboardTab from "./DashboardTab";
import UsersTab from "./UsersTab";
import EmailManagementTab from "./EmailManagementTab";
import NotificationsTab from "./NotificationsTab";
import SpamFiltersTab from "./SpamFiltersTab";
import AdminsTab from "./AdminsTab";
import SettingsTab from "./SettingsTab";
import MaintenanceTab from "./MaintenanceTab";
import AliasesTab from "./AliasesTab";
import DomainsTab from "./DomainsTab";

// Helper to decode JWT and get role
const getUserRole = (): string => {
  const token = localStorage.getItem("mh_token");
  if (!token) return "user";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || "user";
  } catch {
    return "user";
  }
};

type TabId =
  | "dashboard"
  | "users"
  | "email"
  | "notifications"
  | "spam"
  | "admins"
  | "settings"
  | "maintenance"
  | "domains"
  | "aliases";

const TABS = [
  { id: "dashboard" as TabId, label: "Dashboard", icon: LayoutDashboard },
  { id: "users" as TabId, label: "Users", icon: Users },
  { id: "email" as TabId, label: "Email Management", icon: Mail },
  { id: "notifications" as TabId, label: "Notifications", icon: Megaphone },
  { id: "spam" as TabId, label: "Spam Filters", icon: Shield },
  { id: "admins" as TabId, label: "Admins", icon: UserCog },
  { id: "settings" as TabId, label: "Settings", icon: Settings, ownerOnly: true }, // Owner only
  { id: "maintenance" as TabId, label: "Maintenance", icon: ShieldAlert },
  { id: "domains" as TabId, label: "Domains", icon: Wrench },
  { id: "aliases" as TabId, label: "Aliases", icon: Wrench },
];

const AdminTabs = () => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const userRole = getUserRole();

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "users":
        return <UsersTab />;
      case "email":
        return <EmailManagementTab />;
      case "notifications":
        return <NotificationsTab />;
      case "spam":
        return <SpamFiltersTab />;
      case "admins":
        return <AdminsTab />;
      case "settings":
        return <SettingsTab />;
      case "maintenance":
        return <MaintenanceTab />;
      case "domains":
        return <DomainsTab />;
      case "aliases":
        return <AliasesTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="brutalist-card p-2 bg-white">
        <div className="flex flex-wrap gap-2">
          {TABS.filter((tab: any) => !tab.ownerOnly || userRole === "owner").map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-2 border-border rounded-lg font-bold uppercase text-sm transition-all hover:translate-y-[-2px] ${isActive
                  ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminTabs;
