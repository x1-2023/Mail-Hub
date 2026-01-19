import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import API from "@/lib/api";

const NotificationsTab = () => {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await API.getNotifications();
      return res.data.data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => API.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to delete notification");
    }
  });

  const handleSend = async () => {
    if (!message) return;
    try {
      await API.sendAnnouncement(message, type);
      toast.success("System Notification created successfully!");
      setMessage("");
      // Reset type? Or keep it.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      toast.error("Failed to create notification");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Global System Notifications</h2>
        <p className="text-muted-foreground">Manage persistent system-wide notifications for all users.</p>
      </div>

      <div className="brutalist-card p-8 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-yellow-400 p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Megaphone className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Create System Notification</h3>
            <p className="text-sm text-gray-500">This message will be saved and shown to all users until dismissed.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: "info", label: "Info", color: "bg-blue-100 border-blue-600 text-blue-700" },
              { id: "success", label: "Success", color: "bg-green-100 border-green-600 text-green-700" },
              { id: "warning", label: "Warning", color: "bg-yellow-100 border-yellow-600 text-yellow-700" },
              { id: "error", label: "Error", color: "bg-red-100 border-red-600 text-red-700" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-4 py-2 border-2 font-bold uppercase text-sm transition-all ${type === t.id
                  ? `${t.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]`
                  : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            className="w-full h-32 p-4 text-lg border-2 border-black bg-gray-50 resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            placeholder="Type your notification message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              className="bg-black text-white hover:bg-gray-800 border-2 border-black h-12 px-8 text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish Notification
            </Button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div>
        <h4 className="font-bold uppercase mb-4 text-gray-500">Active Notifications (Previw)</h4>
        <div className="brutalist-card bg-white p-0 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active notifications found.
            </div>
          ) : (
            <div className="divide-y-2 border-black">
              {notifications.map((n: any) => (
                <div key={n.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50 group">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'error' ? 'bg-red-500' : n.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="font-bold text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: <span className="uppercase font-bold">{n.type}</span> • {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(n.id)}
                    disabled={deleteMutation.isPending}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
