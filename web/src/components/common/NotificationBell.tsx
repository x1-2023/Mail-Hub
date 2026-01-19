import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";

interface Notification {
    id: string | number;
    type: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export const NotificationBell = () => {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    // Fetch Notifications
    const { data: notifications = [], isLoading, isError } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            try {
                const res = await API.getNotifications();
                return res.data.data || [];
            } catch (err) {
                throw err;
            }
        },
        refetchInterval: 30000,
    });

    const unreadCount = Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.is_read).length : 0;

    // Mark All Read Mutation
    const markReadMutation = useMutation({
        mutationFn: async () => {
            return API.markNotificationsRead();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const getNotificationStyle = (type: string) => {
        switch (type) {
            case "success":
                return {
                    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
                    bgColor: "bg-green-500/10",
                    borderColor: "border-green-200",
                    titleColor: "text-green-700",
                    title: "Thành công"
                };
            case "warning":
                return {
                    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
                    bgColor: "bg-yellow-500/10",
                    borderColor: "border-yellow-200",
                    titleColor: "text-yellow-700",
                    title: "Cảnh báo"
                };
            case "error":
                return {
                    icon: <XCircle className="w-5 h-5 text-red-600" />,
                    bgColor: "bg-red-500/10",
                    borderColor: "border-red-200",
                    titleColor: "text-red-700",
                    title: "Lỗi hệ thống"
                };
            default:
                return {
                    icon: <Info className="w-5 h-5 text-blue-600" />,
                    bgColor: "bg-blue-500/10",
                    borderColor: "border-blue-200",
                    titleColor: "text-blue-700",
                    title: "Thông tin"
                };
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative brutalist-button shadow-none hover:bg-muted h-10 w-10 p-0"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold border-2 border-background"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="brutalist-card w-[380px] p-0 bg-card" align="end">
                <div className="border-b-[2px] border-border p-4 flex items-center justify-between bg-muted/30">
                    <h3 className="font-black text-lg uppercase tracking-tight">{t("notifications.title")}</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markReadMutation.mutate()}
                            disabled={markReadMutation.isPending}
                            className="text-xs font-bold uppercase hover:bg-muted h-7"
                        >
                            {t("notifications.markAllRead")}
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <p className="text-xs font-mono">Loading...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-500">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="font-bold text-sm">Error loading notifications</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                            <Bell className="h-12 w-12 mb-3 opacity-20" />
                            <p className="font-semibold text-sm">{t("notifications.noNotifications")}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {notifications.map((notification: Notification) => {
                                const style = getNotificationStyle(notification.type);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`w-full text-left p-4 transition-all hover:bg-muted/40 ${!notification.is_read ? "bg-muted/30" : "bg-card"
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            {/* Icon Box */}
                                            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${style.bgColor} ${style.borderColor}`}>
                                                {style.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-sm font-bold uppercase tracking-tight ${style.titleColor}`}>
                                                        {style.title}
                                                    </h4>
                                                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                        {notification.created_at ? formatDistanceToNow(new Date(notification.created_at), {
                                                            addSuffix: true,
                                                            locale: language === "vi" ? vi : enUS,
                                                        }) : ""}
                                                    </span>
                                                </div>

                                                <p className="text-sm font-medium leading-normal text-foreground/90">
                                                    {notification.message}
                                                </p>
                                            </div>

                                            {/* Unread Dot */}
                                            {!notification.is_read && (
                                                <div className="shrink-0 mt-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
