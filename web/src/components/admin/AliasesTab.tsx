import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Key, Trash2, ArrowRightLeft, Loader2, Search, Mail, User, Globe, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 50; // 50 per page for server pagination

const AliasesTab = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [transferModal, setTransferModal] = useState<{ aliasId: string; currentEmail: string } | null>(null);
    const [newUserId, setNewUserId] = useState("");

    // Calculate offset for server-side pagination
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const { data: aliasData, isLoading } = useQuery({
        queryKey: ["admin-aliases", currentPage, searchQuery], // Re-fetch on page/search change
        queryFn: async () => {
            // Note: Search is currently client-side. For server-side search, backend needs to support it.
            const res = await API.getAliases(ITEMS_PER_PAGE, offset);
            return res.data.data;
        }
    });

    const aliases = aliasData?.aliases || [];
    const total = aliasData?.total || 0;

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => API.deleteAlias(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-aliases"] });
            toast.success("Alias deleted");
        },
        onError: () => toast.error("Failed to delete alias")
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
            API.toggleAliasActive(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-aliases"] });
            toast.success("Alias updated");
        },
        onError: () => toast.error("Failed to update alias")
    });

    const transferMutation = useMutation({
        mutationFn: async ({ id, newUserId }: { id: string; newUserId: string }) =>
            API.transferAlias(id, newUserId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-aliases"] });
            toast.success("Alias transferred successfully");
            setTransferModal(null);
            setNewUserId("");
        },
        onError: () => toast.error("Failed to transfer alias")
    });

    const handleDelete = (id: string, email: string) => {
        if (confirm(`Delete alias "${email}"? This action cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleTransfer = () => {
        if (!transferModal || !newUserId.trim()) return;
        transferMutation.mutate({ id: transferModal.aliasId, newUserId: newUserId.trim() });
    };

    // Client-side filtering for search (server can be updated later for search)
    const filteredAliases = searchQuery
        ? aliases.filter((alias: any) => {
            const email = `${alias.local_part}@${alias.domain?.domain || ""}`.toLowerCase();
            return email.includes(searchQuery.toLowerCase());
        })
        : aliases;

    // Server-side pagination - total pages from backend
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    // Reset to page 1 when search changes
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Key className="w-8 h-8 text-electric-blue" />
                    <div>
                        <h2 className="text-2xl font-black uppercase">Aliases Management</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage all user and anonymous email aliases
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="text-lg font-mono px-4 py-2 border-2">
                    {total} Total Aliases
                </Badge>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search aliases..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 brutalist-input"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="brutalist-card p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border bg-lime-neon/20 flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {aliasData?.user_count || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">User Aliases</div>
                        </div>
                    </div>
                </div>
                <div className="brutalist-card p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border bg-electric-blue/20 flex items-center justify-center">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {aliasData?.anon_count || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Anonymous Aliases</div>
                        </div>
                    </div>
                </div>
                <div className="brutalist-card p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border bg-destructive/20 flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {aliasData?.disabled_count || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Disabled</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Aliases Table */}
            <div className="brutalist-card overflow-hidden bg-white">
                <table className="w-full">
                    <thead className="bg-black text-white">
                        <tr>
                            <th className="text-left p-4 uppercase text-sm font-black">Alias Email</th>
                            <th className="text-left p-4 uppercase text-sm font-black">Owner</th>
                            <th className="text-left p-4 uppercase text-sm font-black">Type</th>
                            <th className="text-center p-4 uppercase text-sm font-black">Active</th>
                            <th className="text-left p-4 uppercase text-sm font-black">Created</th>
                            <th className="text-center p-4 uppercase text-sm font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAliases.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">No aliases found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredAliases.map((alias: any, index: number) => {
                                const email = `${alias.local_part}@${alias.domain?.domain || "unknown"}`;
                                return (
                                    <tr
                                        key={alias.id}
                                        className={`border-b-2 border-border hover:bg-lime-neon/20 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/30"
                                            }`}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg border-2 border-border bg-electric-blue/20 flex items-center justify-center font-black text-lg">
                                                    {alias.local_part.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold font-mono">{email}</div>
                                                    <div className="text-xs text-muted-foreground">{alias.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm">
                                                {alias.user?.email ? (
                                                    <span className="font-medium">{alias.user.email}</span>
                                                ) : alias.user_id ? (
                                                    <span className="font-mono text-xs text-muted-foreground">{alias.user_id.substring(0, 8)}...</span>
                                                ) : alias.claimed_by_user?.email ? (
                                                    <span className="font-medium text-purple-600" title="Created via API Key">
                                                        🔑 {alias.claimed_by_user.email}
                                                    </span>
                                                ) : alias.claimed_by_user_id ? (
                                                    <span className="font-mono text-xs text-purple-500" title="Claimed via API Key">
                                                        🔑 {alias.claimed_by_user_id.substring(0, 8)}...
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">No owner</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge
                                                variant={alias.owner_type === "user" ? "default" : "secondary"}
                                                className={`uppercase font-bold ${alias.owner_type === "user"
                                                    ? "bg-lime-neon text-black border-2 border-black"
                                                    : "bg-muted"
                                                    }`}
                                            >
                                                {alias.owner_type === "user" ? "👤 User" : "🌐 Anon"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-center">
                                            <Switch
                                                checked={alias.is_active}
                                                onCheckedChange={(checked) =>
                                                    toggleMutation.mutate({ id: alias.id, isActive: checked })
                                                }
                                            />
                                        </td>
                                        <td className="p-4 text-sm font-mono">
                                            {alias.created_at ? format(new Date(alias.created_at), "PP") : "-"}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setTransferModal({ aliasId: alias.id, currentEmail: email })}
                                                    className="p-2 border-2 border-border rounded-lg bg-white hover:bg-electric-blue/20 transition-all hover:translate-y-[-2px]"
                                                    title="Transfer to another user"
                                                >
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(alias.id, email)}
                                                    className="p-2 border-2 border-border rounded-lg bg-white hover:bg-destructive/20 transition-all hover:translate-y-[-2px]"
                                                    title="Delete Alias"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between brutalist-card p-4 bg-white flex-wrap gap-4">
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} ({total} aliases total)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="brutalist-button"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {/* Smart Pagination with Ellipsis */}
                            {(() => {
                                const pages: (number | string)[] = [];
                                const showPages = 5; // Max pages to show

                                if (totalPages <= showPages + 4) {
                                    // Show all pages if total is small
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    // Always show first page
                                    pages.push(1);

                                    // Calculate range around current page
                                    let start = Math.max(2, currentPage - 2);
                                    let end = Math.min(totalPages - 1, currentPage + 2);

                                    // Adjust if at edges
                                    if (currentPage <= 3) {
                                        end = Math.min(totalPages - 1, showPages);
                                    } else if (currentPage >= totalPages - 2) {
                                        start = Math.max(2, totalPages - showPages + 1);
                                    }

                                    if (start > 2) pages.push("...");
                                    for (let i = start; i <= end; i++) pages.push(i);
                                    if (end < totalPages - 1) pages.push("...");

                                    // Always show last page
                                    pages.push(totalPages);
                                }

                                return pages.map((page, idx) => (
                                    page === "..." ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page as number)}
                                            className={`w-8 h-8 rounded-lg border-2 border-border font-bold text-sm transition-all ${currentPage === page
                                                ? "bg-black text-white"
                                                : "bg-white hover:bg-muted"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="brutalist-button"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            <Dialog open={!!transferModal} onOpenChange={() => setTransferModal(null)}>
                <DialogContent className="brutalist-card">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase">Transfer Alias</DialogTitle>
                        <DialogDescription>
                            Transfer "{transferModal?.currentEmail}" to a different user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="font-bold uppercase text-sm">New Owner User ID</Label>
                            <Input
                                placeholder="Enter user ID to transfer to..."
                                value={newUserId}
                                onChange={(e) => setNewUserId(e.target.value)}
                                className="brutalist-input font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                You can find user IDs in the Users tab
                            </p>
                        </div>
                        <Button
                            onClick={handleTransfer}
                            disabled={!newUserId.trim() || transferMutation.isPending}
                            className="w-full brutalist-button gradient-hero text-accent-foreground"
                        >
                            {transferMutation.isPending ? (
                                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                            ) : (
                                <ArrowRightLeft className="mr-2 w-4 h-4" />
                            )}
                            Transfer Alias
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AliasesTab;
