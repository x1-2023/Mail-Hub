import { useState, useEffect } from "react";
import { AlertTriangle, Terminal, Trash2, Settings, CheckSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import API from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const MaintenanceTab = () => {
  const [logs, setLogs] = useState<any[]>([]);

  // Config State
  const [retentionDays, setRetentionDays] = useState(0); // 0 = default logic
  const [targets, setTargets] = useState<string[]>(["anon_mails", "user_mails"]);

  // Cleanup Mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => API.triggerCleanup({
      retention_days: retentionDays,
      targets: targets
    }),
    onSuccess: () => {
      toast.success("Cleanup job queued successfully");
    },
    onError: () => {
      toast.error("Failed to trigger cleanup");
    }
  });

  // Poll Logs
  const { data: serverLogs } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const res = await API.getSystemLogs();
      return res.data.data || [];
    },
    refetchInterval: 3000 // Poll every 3s
  });

  useEffect(() => {
    if (serverLogs) {
      setLogs(serverLogs);
    }
  }, [serverLogs]);

  const toggleTarget = (t: string) => {
    setTargets(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">System Maintenance</h2>
        <p className="text-muted-foreground">Advanced system controls and configuration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* DANGER ZONE */}
        <section className="border-4 border-red-500/20 bg-red-500/5 p-8 rounded-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-500 text-white p-2 rounded-lg shadow-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black uppercase text-red-600 tracking-wide">Danger Zone</h3>
            </div>

            <div className="space-y-6">
              {/* CONFGIURATION PANEL */}
              <div className="bg-white/60 p-4 rounded-lg border-2 border-red-100">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-red-600" />
                  <h4 className="font-bold uppercase text-sm">Cleanup Configuration</h4>
                </div>

                {/* TARGETS */}
                <div className="space-y-2 mb-6">
                  <Label className="text-xs uppercase font-bold text-gray-500">Targets</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="t1"
                        checked={targets.includes("anon_mails")}
                        onCheckedChange={() => toggleTarget("anon_mails")}
                        className="border-red-400 data-[state=checked]:bg-red-500"
                      />
                      <label htmlFor="t1" className="text-sm font-medium leading-none">Anon Mails</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="t2"
                        checked={targets.includes("user_mails")}
                        onCheckedChange={() => toggleTarget("user_mails")}
                        className="border-red-400 data-[state=checked]:bg-red-500"
                      />
                      <label htmlFor="t2" className="text-sm font-medium leading-none">User Mails</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="t3"
                        checked={targets.includes("aliases")}
                        onCheckedChange={() => toggleTarget("aliases")}
                        className="border-red-400 data-[state=checked]:bg-red-500"
                      />
                      <label htmlFor="t3" className="text-sm font-medium leading-none">Orphan Aliases</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="t4"
                        checked={targets.includes("vacuum")}
                        onCheckedChange={() => toggleTarget("vacuum")}
                        className="border-red-400 data-[state=checked]:bg-red-500"
                      />
                      <label htmlFor="t4" className="text-sm font-medium leading-none">Vacuum (Optimize DB)</label>
                    </div>
                  </div>
                </div>

                {/* RETENTION OVERRIDE */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase font-bold text-gray-500">Retention Override</Label>
                    <span className="text-xs font-mono font-bold bg-red-100 px-2 py-1 rounded text-red-700">
                      {retentionDays === 0 ? "DEFAULT LOGIC" : `${retentionDays} DAYS CACHE`}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[0]}
                    max={30}
                    step={1}
                    onValueChange={(v) => setRetentionDays(v[0])}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {retentionDays === 0
                      ? "Using default expiration set at email arrival (Anon: 24h, User: 30d)."
                      : `FORCE DELETE emails older than ${retentionDays} days, ignoring original expiry.`}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black h-12 text-lg uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                {cleanupMutation.isPending ? "Queuing..." : "Run Cleanup Job"}
              </Button>
            </div>
          </div>
        </section>

        {/* SYSTEM CONSOLE */}
        <section className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6" />
              <h3 className="text-xl font-black uppercase">System Console</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground">LIVE</span>
            </div>
          </div>

          <div className="bg-[#0f0f0f] rounded-xl border-4 border-gray-800 p-4 font-mono text-sm flex-1 min-h-[400px] overflow-y-auto shadow-2xl relative">
            {/* Scanlines effect */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>

            <div className="space-y-1 relative z-0">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">Waiting for logs...</div>
              ) : (
                logs.slice().reverse().map((log, i) => (
                  <div key={i} className="flex gap-4 border-b border-gray-800/50 pb-1 mb-1">
                    <span className="text-blue-400 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={log.level === "ERROR" ? "text-red-500 font-bold" : "text-green-400"}>
                      {log.level}
                    </span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MaintenanceTab;
