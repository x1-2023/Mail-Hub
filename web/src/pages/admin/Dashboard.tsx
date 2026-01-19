
import API from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Globe, Server } from "lucide-react";

export default function AdminDashboard() {
    const { data: stats } = useQuery({
        queryKey: ["admin-stats"],
        queryFn: async () => {
            const res = await API.getStats();
            return res.data.data;
        },
    });

    const cards = [
        { title: "Total Users", value: stats?.total_users || 0, icon: Users, color: "text-blue-500" },
        { title: "Active Aliases", value: stats?.total_aliases || 0, icon: Mail, color: "text-green-500" },
        { title: "Processed Emails", value: stats?.total_emails || 0, icon: Server, color: "text-purple-500" },
        { title: "Domains", value: stats?.active_domains || 0, icon: Globe, color: "text-orange-500" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 shadow-sm">
                        <div className={`p-4 rounded-full bg-secondary/20 ${card.color}`}>
                            <card.icon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{card.title}</p>
                            <h3 className="text-2xl font-bold">{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
