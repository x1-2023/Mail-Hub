import { Mail, Users, Database, Shield, TrendingUp, Loader2, Activity, Server, Clock, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const DashboardTab = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await API.getStats();
      return res.data.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* 1. TOP STATS CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Mail className="w-8 h-8" />}
          label="Total Emails"
          value={stats?.total_emails || 0}
          color="text-lime-neon"
          sub="All time volume"
        />
        <StatCard
          icon={<Users className="w-8 h-8" />}
          label="Active Aliases"
          value={stats?.active_aliases || 0}
          color="text-electric-blue"
          sub="Active email addresses"
        />
        <StatCard
          icon={<Shield className="w-8 h-8" />}
          label="Active Domains"
          value={stats?.active_domains || 0}
          color="text-lime-neon"
          sub="Managed domains"
        />
        <StatCard
          icon={<Database className="w-8 h-8" />}
          label="Storage Used"
          value={formatBytes(stats?.storage_used || 0)}
          color="text-accent"
          sub="Database size"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. TRAFFIC CHART (Row 1, Col 1) */}
        <section className="brutalist-card p-6 bg-white min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black uppercase flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-electric-blue" />
              Traffic Trend (7 Days)
            </h3>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.traffic_trend || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D00F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2D00F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#CCFF00' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2D00F7"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 3. SYSTEM HEALTH (Row 1, Col 2) */}
        <section className="brutalist-card p-6 bg-white min-h-[400px] flex flex-col transition-transform hover:translate-y-[-4px]">
          <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-electric-blue">
            <Server className="w-6 h-6" /> System Health
          </h3>
          <div className="space-y-6 flex-1 flex flex-col">
            <div>
              <div className="flex justify-between mb-2 text-sm font-bold text-gray-700">
                <span>CPU Usage</span>
                <span className="text-electric-blue font-black">{stats?.system_health?.cpu_usage?.toFixed(1) || 0}%</span>
              </div>
              <ProgressBar value={stats?.system_health?.cpu_usage || 0} color="bg-electric-blue" trackColor="bg-gray-100" />
            </div>

            <div>
              <div className="flex justify-between mb-2 text-sm font-bold text-gray-700">
                <span>App Memory</span>
                <span className="font-black">{stats?.system_health?.mem_usage || 0} MB</span>
              </div>
              <ProgressBar value={Math.min((stats?.system_health?.mem_usage || 0) / 1024 * 100, 100)} color="bg-lime-neon" trackColor="bg-gray-100" />
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="flex items-center gap-2 font-bold text-gray-600"><Activity className="w-4 h-4 text-accent" /> Goroutines</span>
              <span className="font-mono text-xl font-bold">{stats?.system_health?.num_goroutine || 0}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-2 font-bold text-gray-600"><Clock className="w-4 h-4 text-gray-400" /> Uptime</span>
              <span className="font-mono text-sm font-medium text-gray-500">{stats?.system_health?.uptime || "0s"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 mt-auto">
              <Badge variant="outline" className="justify-center bg-green-50 text-green-700 border-green-200">SMTP: Online</Badge>
              <Badge variant="outline" className="justify-center bg-green-50 text-green-700 border-green-200">IMAP: Online</Badge>
            </div>
          </div>
        </section>

        {/* 4. TOP ACTIVE ALIASES (Row 2, Col 1) */}
        <section className="brutalist-card p-6 bg-white min-h-[300px]">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Top Active Aliases
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.top_aliases?.map((alias: any, i: number) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 p-3 rounded-lg hover:border-purple-200 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {i + 1}
                  </div>
                  <span className="font-mono text-sm font-semibold truncate" title={alias.email}>
                    {alias.email}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 shrink-0">{alias.count}</Badge>
              </div>
            ))}
            {(!stats?.top_aliases || stats.top_aliases.length === 0) && (
              <p className="text-sm text-muted-foreground italic col-span-2">No active aliases found in the last 7 days.</p>
            )}
          </div>
        </section>

        {/* 5. RECENT ACTIVITY (Row 2, Col 2) */}
        <section className="brutalist-card p-6 bg-white min-h-[300px]">
          <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
            <Play className="w-5 h-5" /> Recent Activity
          </h3>
          <div className="space-y-3 relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-100" />

            {stats?.recent_logs?.map((log: any, i: number) => (
              <div key={i} className="flex gap-3 relative">
                <div className={`mt-1 w-4 h-4 rounded-full border-2 border-white shrink-0 z-10 ${log.level === 'ERROR' ? 'bg-red-500' : 'bg-electric-blue'}`} />
                <div className="text-sm">
                  <p className="font-semibold text-xs text-gray-400 mb-0.5">{format(new Date(log.created_at), "HH:mm:ss")}</p>
                  <p className="leading-tight line-clamp-2">{log.message}</p>
                </div>
              </div>
            ))}
            {(!stats?.recent_logs || stats.recent_logs.length === 0) && (
              <p className="text-sm text-gray-500 italic pl-6">No recent logs.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

// --- Sub Components ---

const StatCard = ({ icon, label, value, color, sub }: any) => (
  <div className={`brutalist-card p-6 bg-white hover:translate-y-[-4px] transition-transform`}>
    <div className="flex items-center justify-between mb-4">
      {icon}
      <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')} animate-pulse`} />
    </div>
    <div className="text-4xl font-black mb-2">{value}</div>
    <div className="text-sm uppercase tracking-wide text-muted-foreground font-bold">{label}</div>
    <div className="text-xs text-muted-foreground mt-1 opacity-75">{sub}</div>
  </div>
);

const ProgressBar = ({ value, color, trackColor = "bg-gray-800" }: { value: number, color: string, trackColor?: string }) => (
  <div className={`h-2 w-full ${trackColor} rounded-full overflow-hidden`}>
    <div
      className={`h-full ${color} transition-all duration-500 ease-out`}
      style={{ width: `${value}%` }}
    />
  </div>
);

export default DashboardTab;
