import { useState, useEffect } from "react";
import { Save, RefreshCw, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SettingsTab = () => {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await API.getSettings();
      return res.data.data || {};
    }
  });

  useEffect(() => {
    if (data) {
      setLocalSettings(data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return API.updateSetting(key, value);
    },
    onSuccess: () => {
      toast.success("Setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => {
      toast.error("Failed to update setting");
    }
  });

  const handleSave = (key: string) => {
    updateMutation.mutate({ key, value: localSettings[key] });
  };

  const handleChange = (key: string, val: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: val }));
  };

  const renderField = (key: string, label: string, desc: string) => (
    <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-white transition-colors">
      <div className="space-y-1 flex-1">
        <Label htmlFor={key} className="font-bold text-gray-700">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-2 w-[200px]">
        <Input
          id={key}
          value={localSettings[key] || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="font-mono text-right"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleSave(key)}
          disabled={updateMutation.isPending || localSettings[key] === data?.[key]}
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">System Config</h2>
          <p className="text-muted-foreground">Dynamic configuration for Quotas, Retention, and Limits.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-settings"] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Retention Policy
            </CardTitle>
            <CardDescription>Control how long data lives in the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField("anon_retention_hours", "Anonymous Retention (Hours)", "TTL for anonymous emails (default: 24)")}
            {renderField("user_retention_days", "User Retention (Days)", "TTL for non-starred user emails (default: 30)")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Quotas & Limits
            </CardTitle>
            <CardDescription>Anti-abuse safeguards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField("max_emails_per_alias", "Rolling Buffer Limit", "Max non-starred emails per alias (default: 100)")}
            {renderField("star_cap_per_user", "Star Cap", "Max starred emails per user/alias (default: 50)")}
            {renderField("max_aliases_per_user", "Max Aliases", "Max aliases per user account (default: 10)")}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">☕</span>
              Donation Config
            </CardTitle>
            <CardDescription>Configure the "Buy us a coffee" popup content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField("donate_bank_name", "Bank Name", "e.g., MBBank")}
              {renderField("donate_account_number", "Account Number", "e.g., 9999999999")}
              {renderField("donate_account_name", "Account Name", "e.g., MAILHUB DONATE")}
            </div>
            {renderField("donate_message", "Welcome/Donate Message", "Pop-up message (supports basic text)")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsTab;
