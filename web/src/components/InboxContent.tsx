import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Star, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnon } from "@/contexts/AnonContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// We might not have dompurify installed. I'll simply use text or basic iframe.

const AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-cyan-500 text-white",
  "bg-purple-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
];

// --- Constants ---
const WELCOME_EMAIL_EN = {
  id: "welcome-email",
  sender: "MailHub Support",
  subject: "🚀 Welcome to MailHub - Support Us!",
  snippet: "Thank you for using our anonymous mail service. Click to see how you can support us!",
  received_at: new Date().toISOString(),
  is_read: false,
  is_starred: true,
  body_html: `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #6366f1;">Welcome to MailHub!</h2>
      <p>Thank you for choosing MailHub for your anonymous email needs. We are dedicated to providing a fast, secure, and truly anonymous experience.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
        <strong>💡 Did you know?</strong>
        <p style="margin-top: 5px;">You can generate multiple aliases and manage them all from the dashboard!</p>
      </div>

      <h3>Support Our Development</h3>
      <p>This project is open-source and free to use. If you find it useful, please consider supporting us to keep the servers running.</p>
      
      <p>
        <a href="#" style="background-color: #ec4899; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          ☕ Buy us a coffee
        </a>
      </p>

      <p style="font-size: 0.8em; color: #666; margin-top: 30px;">
        This adds a bit of life to your empty inbox, doesn't it? 😉 <br/>
        Real emails will appear below this one.
      </p>
    </div>
  `
};

const WELCOME_EMAIL_VI = {
  id: "welcome-email",
  sender: "MailHub Support",
  subject: "🚀 Chào mừng đến với MailHub - Ủng hộ chúng tôi!",
  snippet: "Cảm ơn bạn đã sử dụng dịch vụ. Nhấn vào đây để xem cách ủng hộ chúng tôi!",
  received_at: new Date().toISOString(),
  is_read: false,
  is_starred: true,
  body_html: `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #6366f1;">Chào mừng đến với MailHub!</h2>
      <p>Cảm ơn bạn đã chọn MailHub cho nhu cầu email ẩn danh của mình. Chúng tôi cam kết mang lại trải nghiệm nhanh chóng, bảo mật và thực sự ẩn danh.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
        <strong>💡 Bạn có biết?</strong>
        <p style="margin-top: 5px;">Bạn có thể tạo nhiều địa chỉ email khác nhau và quản lý tất cả từ bảng điều khiển!</p>
      </div>

      <h3>Ủng Hộ Chúng Tôi Phát Triển</h3>
      <p>Dự án này là miễn phí. Nếu bạn thấy nó hữu ích, hãy cân nhắc ủng hộ để giúp chúng tôi duy trì máy chủ.</p>
      
      <p>
        <a href="#" style="background-color: #ec4899; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          ☕ Mời chúng tôi ly cà phê
        </a>
      </p>

      <p style="font-size: 0.8em; color: #666; margin-top: 30px;">
        Cái này giúp hộp thư đỡ trống trải hơn phải không? 😉 <br/>
        Email thực tế sẽ xuất hiện bên dưới.
      </p>
    </div>
  `
};

// --- Sub Component: EmailDetailView ---
// ... (rest of EmailDetailView remains mostly same, just props usage)
// I won't redefine EmailDetailView here fully if replace_file_content chunk works on constants area.
// But wait, the previous tool call showed definitions were top level.
// Step 2930 added WELCOME_EMAIL at line 23.
// I will replace that block.


// --- Sub Components for Welcome Email ---
const DonateModal = ({ language }: { language: string }) => {
  const isVi = language === "vi";

  // Fetch Config
  const { data: config } = useQuery({
    queryKey: ["public-config"],
    queryFn: async () => {
      const res = await API.getPublicConfig();
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const bankName = config?.donate_bank_name || "MBBank";
  const accNum = config?.donate_account_number || "9999999999";
  const accName = config?.donate_account_name || "MAILHUB DONATE";
  const donateMessage = config?.donate_message || (isVi
    ? "Mọi sự đóng góp đều giúp chúng tôi duy trì server và phát triển tính năng mới."
    : "Every contribution helps us maintain servers and develop new features.");

  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accNum}-compact2.png?addInfo=Coffee%20MailHub&accountName=${encodeURIComponent(accName)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="brutalist-button bg-pink-500 hover:bg-pink-600 text-white font-bold animate-pulse">
          {isVi ? "☕ Mời chúng tôi ly cà phê" : "☕ Buy us a coffee"}
        </Button>
      </DialogTrigger>
      <DialogContent className="brutalist-card border-none sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-black">
            {isVi ? "Cảm ơn sự ủng hộ của bạn! ❤️" : "Thank you for your support! ❤️"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {donateMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="relative w-80 h-80 bg-white p-2 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <img
              src={qrUrl}
              alt="VietQR Donate"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-lg">{accName}</p>
            <p className="font-mono text-muted-foreground">{bankName} - {accNum}</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {isVi ? "Quét mã bằng App Ngân hàng hoặc MoMo" : "Scan with your Banking App"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WelcomeEmailBody = ({ language }: { language: string }) => {
  const isVi = language === "vi";

  return (
    <div className="font-sans leading-relaxed text-foreground space-y-6">
      <div>
        <h2 className="text-2xl font-black text-indigo-500 mb-2">
          {isVi ? "Chào mừng đến với MailHub!" : "Welcome to MailHub!"}
        </h2>
        <p>
          {isVi
            ? "Cảm ơn bạn đã chọn MailHub cho nhu cầu email ẩn danh của mình. Chúng tôi cam kết mang lại trải nghiệm nhanh chóng, bảo mật và thực sự ẩn danh."
            : "Thank you for choosing MailHub for your anonymous email needs. We are dedicated to providing a fast, secure, and truly anonymous experience."}
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg border-l-4 border-indigo-500">
        <strong className="block mb-1 text-indigo-600">
          {isVi ? "💡 Bạn có biết?" : "💡 Did you know?"}
        </strong>
        <p className="text-sm">
          {isVi
            ? "Bạn có thể tạo nhiều địa chỉ email khác nhau và quản lý tất cả từ bảng điều khiển!"
            : "You can generate multiple aliases and manage them all from the dashboard!"}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">
          {isVi ? "Ủng Hộ Chúng Tôi Phát Triển" : "Support Our Development"}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {isVi
            ? "Dự án này là miễn phí. Nếu bạn thấy nó hữu ích, hãy cân nhắc ủng hộ để giúp chúng tôi duy trì máy chủ."
            : "This project is free to use. If you find it useful, please consider supporting us to keep the servers running."}
        </p>

        <DonateModal language={language} />

        <p className="text-xs text-muted-foreground mt-8 italic">
          {isVi
            ? "Cái này giúp hộp thư đỡ trống trải hơn phải không? 😉"
            : "This adds a bit of life to your empty inbox, doesn't it? 😉"}
          <br />
          {isVi
            ? "Email thực tế sẽ xuất hiện bên dưới."
            : "Real emails will appear below this one."}
        </p>
      </div>
    </div>
  );
};

// --- Sub Component: EmailDetailView ---
const EmailDetailView = ({ email, token, onClose, onStar, onDelete }: any) => {
  const { t, language } = useLanguage();
  const isWelcome = email.id === "welcome-email";

  // Fetch Full Content (Skip for Welcome Email)
  const { data: content, isLoading } = useQuery({
    queryKey: ["email-content", email.id],
    queryFn: async () => {
      const res = await API.getMessageContent(email.id, token);
      return res.data.data; // { body_text, body_html, headers }
    },
    enabled: !!email.id && !isWelcome
  });

  return (
    <div className={`brutalist-card p-6 space-y-4`}>
      <Button
        onClick={onClose}
        className="lg:hidden brutalist-button bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("inbox.back")}
      </Button>

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-black mb-3">{email.subject}</h2>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="border-[2px] border-border">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(email.sender || "?").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{email.sender}</p>
              <p className="text-xs text-muted-foreground">{t("inbox.toMe")}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {email.received_at ? new Date(email.received_at).toLocaleString() : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isWelcome && (
            <>
              <Button
                onClick={onStar}
                className="brutalist-button bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <Star className={`w-4 h-4 mr-2 ${email.is_starred ? "fill-primary text-primary" : ""}`} />
                {email.is_starred ? t("inbox.unstar") : t("inbox.star")}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="brutalist-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("inbox.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="brutalist-card bg-card border-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black text-xl">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this message from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="brutalist-button bg-secondary hover:bg-secondary/80 text-secondary-foreground border-2 border-black">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="brutalist-button bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* Body */}
        <div className="brutalist-card p-6 bg-white min-h-[300px] shadow-[4px_4px_0px_hsl(var(--border))] overflow-hidden">
          {isWelcome ? (
            <WelcomeEmailBody language={language} />
          ) : (
            isLoading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8" /></div>
            ) : (
              content?.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: content.body_html }} className="prose max-w-none text-sm" />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">{content?.body_text || email.snippet || t("inbox.noContent")}</pre>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
};
// ... rest of imports and component ...
import { useSearchParams } from "react-router-dom";

export const InboxContent = () => {

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "starred" ? "starred" : "inbox";

  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "starred">(initialTab);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const { t, language } = useLanguage();
  const { token, address, history } = useAnon(); // Destructure history and address

  // Find current alias ID (for User Aliases)
  const currentAliasId = history.find(h => h.address === address)?.id;

  // Sync with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "starred") setActiveTab("starred");
    else setActiveTab("inbox");
  }, [searchParams]);

  const welcomeEmail = language === "vi" ? WELCOME_EMAIL_VI : WELCOME_EMAIL_EN;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inbox", token, activeTab, page, limit, currentAliasId], // Add currentAliasId to key
    queryFn: async () => {
      if (!token) return { emails: [], total: 0 };
      const isStarredTab = activeTab === "starred";
      const res = await API.getMessages(token, limit, page, isStarredTab, currentAliasId);
      if (res.data.success) {
        const all = res.data.data?.emails || [];
        const total = res.data.data?.total || 0;
        // No client-side filter needed anymore!
        return { emails: all, total };
      }
      return { emails: [], total: 0 };
    },
    enabled: !!token,
    refetchInterval: 10000,
    placeholderData: (prev) => prev
  });

  const rawMessages = data?.emails || [];
  // Welcome email is always starred, so include it in both Inbox and Starred tabs on page 1
  const messages = (page === 1 && (activeTab === "inbox" || activeTab === "starred"))
    ? [welcomeEmail, ...rawMessages]
    : rawMessages;

  const totalMessages = (data?.total || 0) + 1; // Add 1 for welcome email?
  // Wait, total comes from DB. Welcome email is fake.
  // If we show it, visual count in pagination might be off if we strictly use DB total.
  // But 'totalPages' calculation uses 'totalMessages'.
  // If we add welcome email, we effectively have total+1 items.
  // So yes, let's add 1 to total for visual consistency.

  const totalPages = Math.ceil(totalMessages / limit);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => API.deleteMessage(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Message deleted");
      setShowDetail(false);
      setSelectedEmail(null);
    }
  });

  const starMutation = useMutation({
    mutationFn: async (id: string) => API.starMessage(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    }
  });

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email);
    setShowDetail(true);
  };

  // Auto-select first email (Welcome Email) on mount
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!hasAutoSelected.current && messages.length > 0) {
      setSelectedEmail(messages[0]);
      // Don't set showDetail(true) to avoid forcing mobile view?
      // Actually, for better UX on mobile, usually user wants to see list first.
      // But for desktop, selectedEmail drives the right pane.
      hasAutoSelected.current = true;
    }
  }, [messages]);

  return (
    <div className="space-y-4">
      <div className="brutalist-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <Input
              placeholder={t("inbox.searchEmails")}
              className="brutalist-input"
              style={{ paddingLeft: "3rem" }}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} className="brutalist-button bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab("inbox")}
            className={`brutalist-button ${activeTab === "inbox"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
          >
            {t("header.inbox")}
          </Button>
          <Button
            onClick={() => setActiveTab("starred")}
            className={`brutalist-button ${activeTab === "starred"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
          >
            <Star className="w-4 h-4 mr-2" />
            {t("header.starred")}
          </Button>
        </div>
      </div>

      {/* Split Area */}
      <div className="grid lg:grid-cols-[40%_60%] gap-4">
        {/* Email List */}
        <div className={`space-y-2 w-full overflow-hidden ${showDetail ? "hidden lg:block" : ""}`}>
          {isLoading && <div className="text-center p-4"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>}
          {!isLoading && messages?.length === 0 && <div className="text-center p-8 text-muted-foreground">{t("inbox.noMessages")}</div>}

          {messages?.map((email: any, index: number) => (
            <div
              key={email.id}
              onClick={() => handleEmailClick(email)}
              className={`brutalist-card p-4 cursor-pointer hover:bg-muted transition-colors ${selectedEmail?.id === email.id ? "bg-muted" : ""
                } ${email.is_starred ? "border-primary border-[3px]" : ""}`}
            >
              <div className="flex gap-3">
                <Avatar className="border-[2px] border-border">
                  <AvatarFallback className={`${AVATAR_COLORS[index % AVATAR_COLORS.length]} font-bold`}>
                    {(email.sender || "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm truncate">{email.sender}</h4>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {email.received_at ? formatDistanceToNow(new Date(email.received_at), { addSuffix: true }) : ""}
                    </span>
                  </div>
                  <p className={`text-sm mb-1 truncate ${!email.is_read ? "font-bold" : ""}`}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{email.snippet}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {!email.is_read && (
                      <span className="w-2 h-2 rounded-full bg-accent"></span>
                    )}
                    {email.is_starred && <Star className="w-4 h-4 fill-primary text-primary" />}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {messages.length > 0 && (
            <div className="flex items-center justify-between p-4 brutalist-card mt-4">
              <div className="flex items-center gap-2">
                {/* Page size fixed to 5 */}
              </div>
              <div className="flex items-center gap-2 w-full justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="brutalist-button h-8"
                >
                  {t("inbox.prev")}
                </Button>
                <span className="text-sm font-bold">{t("inbox.page")} {page} {totalPages > 0 && `${t("inbox.of")} ${totalPages}`}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={messages.length < limit && page >= totalPages} // Simple heuristic
                  className="brutalist-button h-8"
                >
                  {t("inbox.next")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Email Detail Panel */}
        {selectedEmail ? (
          <div className={`${showDetail ? "block" : "hidden lg:block"}`}>
            <EmailDetailView
              email={selectedEmail}
              token={token}
              onClose={() => setShowDetail(false)}
              onStar={() => starMutation.mutate(selectedEmail.id)}
              onDelete={() => deleteMutation.mutate(selectedEmail.id)}
            />
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center brutalist-card h-[400px] text-muted-foreground">
            {t("inbox.selectMessage")}
          </div>
        )}
      </div>
    </div>
  );
};
