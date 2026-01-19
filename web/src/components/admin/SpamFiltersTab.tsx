import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Plus, Edit, Trash2, Ban, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SpamFiltersTab = () => {
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState("");
  const [ruleType, setRuleType] = useState("subject");
  const [ruleAction, setRuleAction] = useState("reject");
  const [isOpen, setIsOpen] = useState(false);

  const { data: filters, isLoading } = useQuery({
    queryKey: ["admin-spam"],
    queryFn: async () => {
      const res = await API.getSpamFilters();
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => API.createSpamFilter(newRule, ruleType, ruleAction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spam"] });
      toast.success("Filter created");
      setIsOpen(false);
      setNewRule("");
      setRuleType("subject");
      setRuleAction("reject");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => API.deleteSpamFilter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spam"] });
      toast.success("Filter deleted");
    }
  });

  if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-electric-blue" />
          <div>
            <h2 className="text-2xl font-black uppercase">Spam Filters</h2>
            <p className="text-sm text-muted-foreground">
              Block or auto-delete spam emails based on subject or sender
            </p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="brutalist-button bg-electric-blue text-black hover:bg-electric-blue/80">
              <Plus className="w-5 h-5 mr-2" />
              Add Filter
            </Button>
          </DialogTrigger>
          <DialogContent className="brutalist-card">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Add Spam Rule</DialogTitle>
              <DialogDescription>
                Block emails that contain specific keywords in subject, sender, or body.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Keyword Input */}
              <div className="space-y-2">
                <Label className="font-bold uppercase text-sm">Keyword (Contains)</Label>
                <Input
                  placeholder="e.g. 'casino', 'lottery', 'bitcoin'"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  className="brutalist-input"
                />
                <p className="text-xs text-muted-foreground">Emails containing this keyword will be filtered</p>
              </div>

              {/* Type Dropdown */}
              <div className="space-y-2">
                <Label className="font-bold uppercase text-sm">Filter Target</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger className="brutalist-input">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">📧 Subject Line</SelectItem>
                    <SelectItem value="sender">👤 Sender Email</SelectItem>
                    <SelectItem value="body">📄 Email Body</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Dropdown */}
              <div className="space-y-2">
                <Label className="font-bold uppercase text-sm">Action</Label>
                <Select value={ruleAction} onValueChange={setRuleAction}>
                  <SelectTrigger className="brutalist-input">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reject">🚫 Block (Reject)</SelectItem>
                    <SelectItem value="flag">🚩 Flag as Spam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newRule.trim() || createMutation.isPending}
                className="w-full brutalist-button gradient-hero text-accent-foreground"
              >
                {createMutation.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Plus className="mr-2 w-4 h-4" />}
                Create Filter Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards (Static for now in MVP) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="brutalist-card p-4 bg-white hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-border bg-destructive/20 flex items-center justify-center">
              <Ban className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-black">{filters?.length || 0}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Active Rules
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-electric-blue" />
          <h3 className="text-lg font-black uppercase">Spam Filter Rules</h3>
        </div>

        <div className="brutalist-card bg-white divide-y-2 divide-border">
          {!filters || filters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">No spam filters configured</p>
              <p className="text-sm mt-1">Click "Add Filter" to create your first rule</p>
            </div>
          ) : (
            filters.map((filter: any) => (
              <div
                key={filter.id}
                className="p-4 hover:bg-lime-neon/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-black">{filter.rule}</span>
                      <span
                        className={`px-3 py-1 border-2 border-border rounded-lg text-xs font-black uppercase ${filter.is_active
                          ? "bg-lime-neon text-black"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {filter.is_active ? "✓ Enabled" : "Disabled"}
                      </span>
                      <span className="px-3 py-1 border-2 border-border rounded-lg text-xs font-bold uppercase bg-white">
                        📤 {filter.type}
                      </span>
                      <span
                        className={`px-3 py-1 border-2 border-border rounded-lg text-xs font-bold uppercase ${filter.action === "reject"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-amber-100 text-amber-700"
                          }`}
                      >
                        {filter.action === "reject" ? "🚫 Block" : "⏰ Auto-Delete"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteMutation.mutate(filter.id)}
                      className="p-2 border-2 border-border rounded-lg bg-white hover:bg-destructive/20 transition-all hover:translate-y-[-2px]"
                      title="Delete Filter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default SpamFiltersTab;
