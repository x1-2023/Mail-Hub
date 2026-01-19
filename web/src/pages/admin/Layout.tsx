
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Globe, Mail, LogOut, ShieldAlert, ScrollText } from "lucide-react";

export default function AdminLayout() {
    const location = useLocation();
    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/domains", label: "Domains", icon: Globe },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/aliases", label: "Aliases", icon: Mail },
        { href: "/admin/spam", label: "Spam Filters", icon: ShieldAlert },
        { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
    ];

    return (
        <div className="min-h-screen flex bg-muted/20">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                <div className="p-6 border-b border-border">
                    <h1 className="font-title text-2xl font-black tracking-tighter">MAILHUB ADMIN</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const active = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all font-medium
                    ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}
                 `}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Link to="/inbox" className="flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-md">
                        <LogOut className="w-5 h-5" />
                        Exit Admin
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
