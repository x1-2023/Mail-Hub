import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import API from "@/lib/api";
import { Email } from "@/lib/types";
import { toast } from "sonner";
import {
  Trash2, Mail, MessageSquare, Clock, HardDrive, Eye,
  Search, ChevronLeft, Loader2, Send, Terminal, X, ArrowLeft, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";


const EmailManagementTab = () => {
  const queryClient = useQueryClient();

  const [selectedAlias, setSelectedAlias] = useState<string>("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [view, setView] = useState<'list' | 'alias'>('list');
  const [search, setSearch] = useState(""); // For searching email content

  // Reply Modal
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyData, setReplyData] = useState({ recipient: "", subject: "", body: "" });

  // Fetch all aliases with email stats (with pagination)
  const [page, setPage] = useState(1);
  const [aliasSearch, setAliasSearch] = useState("");
  // Create debounced search term for API
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(aliasSearch);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [aliasSearch]);

  const limit = 10; // Updated to 10

  const { data: aliasesData, isLoading: aliasesLoading } = useQuery({
    queryKey: ["admin-email-aliases", page, debouncedSearch],
    queryFn: async () => {
      const res = await API.getEmailAliasStats(page, limit, debouncedSearch);
      return res.data.data;
    }
  });

  const aliases = aliasesData?.aliases || [];
  const totalAliases = aliasesData?.total || 0;
  const totalPages = Math.ceil(totalAliases / limit) || 1;

  // Fetch emails for selected alias
  const { data: emailsData, isLoading: emailsLoading } = useQuery({
    queryKey: ["admin-alias-emails", selectedAlias],
    queryFn: async () => {
      if (!selectedAlias) return { emails: [], total: 0 };
      const res = await API.getEmailsByAlias(selectedAlias);
      return res.data.data;
    },
    enabled: !!selectedAlias
  });

  const emails: Email[] = emailsData?.emails || [];

  // Delete mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => API.deleteEmailAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alias-emails", selectedAlias] });
      queryClient.invalidateQueries({ queryKey: ["admin-email-aliases"] });
      toast.success("Email deleted");
      setSelectedEmail(null);
    },
    onError: () => toast.error("Failed to delete email")
  });

  const deleteAliasMutation = useMutation({
    mutationFn: async (id: string) => API.deleteAlias(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-aliases"] });
      toast.success("Alias and all emails deleted");
    },
    onError: () => toast.error("Failed to delete alias")
  });

  const handleViewAlias = (aliasEmail: string) => {
    setSelectedAlias(aliasEmail);
    setView('alias');
  };

  const handleViewEmail = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleBack = () => {
    setView('list');
    setSelectedAlias("");
    setSelectedEmail(null);
  };

  const handleReplyClick = (email: Email) => {
    setReplyData({
      recipient: email.sender,
      subject: `Re: ${email.subject}`,
      body: `\n\n> On ${new Date(email.received_at).toLocaleString()}, ${email.sender} wrote:\n> ${email.snippet}...`
    });
    setReplyOpen(true);
  };

  const submitReply = async () => {
    if (!replyData.body) return;
    try {
      await API.replyEmail(replyData.recipient, replyData.subject, replyData.body);
      toast.success("Reply queued for delivery");
      setReplyOpen(false);
    } catch (e) {
      toast.error("Failed to send reply");
    }
  };

  // Filter emails by search (client side for now for individual inbox)
  const filteredEmails = emails.filter((e: Email) =>
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.sender?.toLowerCase().includes(search.toLowerCase()) ||
    e.body?.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view === 'alias' && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <Mail className="w-8 h-8 text-electric-blue" />
          <div>
            <h2 className="text-2xl font-black uppercase">
              {view === 'list' ? 'Email Management' : `Emails for ${selectedAlias}`}
            </h2>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">
              {view === 'list'
                ? `${totalAliases} Email Accounts found`
                : `${emails.length} messages`}
            </p>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* All Email Accounts with Search */}
          <div className="brutalist-card p-6 bg-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black">All Email Accounts</h3>
                <p className="text-sm text-muted-foreground">Manage all email accounts and their messages</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  placeholder="Search email address..."
                  value={aliasSearch}
                  onChange={(e) => setAliasSearch(e.target.value)}
                  className="brutalist-input w-full md:w-64"
                />
                <Button className="brutalist-button bg-electric-blue text-white shrink-0">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {aliasesLoading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>
            ) : aliases.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {debouncedSearch ? "No email accounts found matching your search." : "No email accounts found."}
              </div>
            ) : (
              <div className="space-y-2">
                {aliases.map((alias: any) => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => handleViewAlias(alias.email)}>
                      <div className="font-bold font-mono">{alias.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {alias.email_count || 0} emails
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last activity: {alias.last_activity ? format(new Date(alias.last_activity), "PP p") : 'Never'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        <HardDrive className="w-3 h-3 mr-1" />
                        {formatSize(alias.total_size || 0)}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleViewAlias(alias.email)} title="View">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete alias "${alias.email}" and all its emails?`)) {
                            deleteAliasMutation.mutate(alias.id);
                          }
                        }}
                        title="Delete"
                        className="text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center px-4 font-mono font-bold">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Alias Email View */
        <div className="space-y-4">
          {/* Search in messages */}
          <div className="brutalist-card p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Showing messages for:</p>
                <p className="font-bold font-mono text-lg">{selectedAlias}</p>
              </div>
              <Badge variant="outline" className="text-lg">{emails.length} / {emails.length} messages</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search in messages... (subject, sender, content)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 brutalist-input"
              />
            </div>
          </div>

          {/* Email List */}
          <div className="brutalist-card bg-white overflow-hidden">
            {emailsLoading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No messages found</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className="p-4 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => handleViewEmail(email)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{email.subject}</span>
                          {!email.is_read && <Badge className="bg-black text-white text-xs">New</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          From: {email.sender}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(email.received_at), "PP, p")}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewEmail(email); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Detail Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold pr-8">{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-muted-foreground">From:</Label>
                <p className="font-mono">{selectedEmail?.sender}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">To:</Label>
                <p className="font-mono">{selectedAlias}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date:</Label>
                <p>{selectedEmail && format(new Date(selectedEmail.received_at), "PPpp")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ID:</Label>
                <p className="font-mono text-xs">{selectedEmail?.id}</p>
              </div>
            </div>

            <div>
              <Label className="font-bold">Message Content:</Label>
              <ScrollArea className="h-[300px] mt-2 p-4 border rounded-lg bg-white">
                <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEmail?.body || selectedEmail?.snippet}</pre>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => selectedEmail && handleReplyClick(selectedEmail)}>
              <Send className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedEmail && confirm("Delete this email?")) {
                  deleteMutation.mutate(selectedEmail.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input value={replyData.recipient} disabled />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={replyData.subject} onChange={e => setReplyData({ ...replyData, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                className="h-32"
                value={replyData.body}
                onChange={e => setReplyData({ ...replyData, body: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitReply}>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMTP Console */}
      <SMTPConsole />
    </div>
  );
};

const SMTPConsole = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: logs, refetch, isRefetching } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const res = await API.getSystemLogs();
      return res.data.data;
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false // Auto refresh every 5s if open
  });

  return (
    <div className="brutalist-card bg-black text-green-500 overflow-hidden mt-8">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 font-mono font-bold">
          <Terminal className="w-5 h-5" />
          <span>SMTP Console Output</span>
          {isOpen && <span className="text-xs ml-2 opacity-50">(Auto-refreshing)</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-green-500 hover:text-green-400 hover:bg-green-900/20"
            onClick={(e) => {
              e.stopPropagation();
              refetch();
            }}
          >
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
          <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-green-900 font-mono text-xs h-[300px] overflow-y-auto bg-black scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
          {logs && logs.length > 0 ? (
            [...logs].reverse().map((log: any, i: number) => (
              <div key={i} className="mb-1 break-all">
                <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`mx-2 font-bold ${log.level === 'ERROR' ? 'text-red-500' : 'text-blue-400'
                  }`}>
                  {log.level}
                </span>
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <div className="opacity-50 italic">No logs available...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailManagementTab;
