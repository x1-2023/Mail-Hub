import { useState } from "react";
import { Globe, Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 10;

const DomainsTab = () => {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [createModal, setCreateModal] = useState(false);
    const [newDomain, setNewDomain] = useState("");
    const [isPublic, setIsPublic] = useState(true);

    // Fetch domains
    const { data: domains, isLoading } = useQuery({
        queryKey: ["admin-domains"],
        queryFn: async () => {
            const res = await API.getDomains();
            return res.data.data || [];
        }
    });

    // Create domain mutation
    const createMutation = useMutation({
        mutationFn: async () => API.createDomain(newDomain, isPublic),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
            toast.success("Domain created successfully");
            setCreateModal(false);
            setNewDomain("");
            setIsPublic(true);
        },
        onError: () => toast.error("Failed to create domain")
    });

    // Delete domain mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => API.deleteDomain(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
            toast.success("Domain deleted");
        },
        onError: () => toast.error("Failed to delete domain")
    });

    const handleDelete = (id: string, domain: string) => {
        if (confirm(`Delete domain "${domain}"? All aliases on this domain will become invalid.`)) {
            deleteMutation.mutate(id);
        }
    };

    // Pagination
    const totalPages = Math.ceil((domains?.length || 0) / ITEMS_PER_PAGE);
    const paginatedDomains = domains?.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ) || [];

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Globe className="w-8 h-8 text-electric-blue" />
                    <div>
                        <h2 className="text-2xl font-black uppercase">Domains Management</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage email domains for aliases
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setCreateModal(true)}
                    className="brutalist-button gradient-hero text-accent-foreground"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Domain
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="brutalist-card p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border bg-lime-neon/20 flex items-center justify-center">
                            <Unlock className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {domains?.filter((d: any) => d.is_public).length || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Public Domains</div>
                        </div>
                    </div>
                </div>
                <div className="brutalist-card p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {domains?.filter((d: any) => !d.is_public).length || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Private Domains</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Domains Table */}
            <div className="brutalist-card overflow-hidden bg-white">
                <table className="w-full">
                    <thead className="bg-black text-white">
                        <tr>
                            <th className="text-left p-4 uppercase text-sm font-black">Domain</th>
                            <th className="text-center p-4 uppercase text-sm font-black">Status</th>
                            <th className="text-left p-4 uppercase text-sm font-black">Created</th>
                            <th className="text-center p-4 uppercase text-sm font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedDomains.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">No domains found</p>
                                    <p className="text-sm">Add a domain to get started</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedDomains.map((domain: any, index: number) => (
                                <tr
                                    key={domain.id}
                                    className={`border-b-2 border-border hover:bg-lime-neon/20 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/30"
                                        }`}
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg border-2 border-border bg-electric-blue/20 flex items-center justify-center font-black text-lg">
                                                🌐
                                            </div>
                                            <div>
                                                <div className="font-bold font-mono text-lg">{domain.domain}</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {domain.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge
                                            className={`uppercase font-bold ${domain.is_public
                                                    ? "bg-lime-neon text-black border-2 border-black"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {domain.is_public ? "🔓 Public" : "🔒 Private"}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-sm font-mono">
                                        {domain.created_at ? format(new Date(domain.created_at), "PP") : "-"}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleDelete(domain.id, domain.domain)}
                                                className="p-2 border-2 border-border rounded-lg bg-white hover:bg-destructive/20 transition-all hover:translate-y-[-2px]"
                                                title="Delete Domain"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between brutalist-card p-4 bg-white">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, domains?.length || 0)} of {domains?.length || 0}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-bold">{currentPage} / {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={createModal} onOpenChange={setCreateModal}>
                <DialogContent className="brutalist-card">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase">Add New Domain</DialogTitle>
                        <DialogDescription>
                            Add a new email domain for creating aliases.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="font-bold uppercase text-sm">Domain Name</Label>
                            <Input
                                placeholder="example.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                className="brutalist-input font-mono"
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border-2 border-border rounded-lg">
                            <div>
                                <Label className="font-bold uppercase text-sm">Public Domain</Label>
                                <p className="text-xs text-muted-foreground">Anyone can create aliases on public domains</p>
                            </div>
                            <Switch
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                            />
                        </div>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={!newDomain.trim() || createMutation.isPending}
                            className="w-full brutalist-button gradient-hero text-accent-foreground"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                            ) : (
                                <Plus className="mr-2 w-4 h-4" />
                            )}
                            Create Domain
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DomainsTab;
