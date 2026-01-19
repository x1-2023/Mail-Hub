
import API from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDomains() {
    const queryClient = useQueryClient();
    const [newDomain, setNewDomain] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-domains"],
        queryFn: async () => {
            const res = await API.getDomains();
            return res.data.data as any[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => API.createDomain(newDomain, true),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
            toast.success("Domain created");
            setIsOpen(false);
            setNewDomain("");
        },
        onError: () => toast.error("Failed to create domain")
    });

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Domain Management</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Add Domain</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Domain</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Input
                                placeholder="example.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                            />
                            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Adding..." : "Add Domain"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>Public</TableHead>
                            <TableHead>Owner</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((domain: any) => (
                            <TableRow key={domain.id}>
                                <TableCell className="font-bold">{domain.domain}</TableCell>
                                <TableCell>{domain.is_public ? "Yes" : "No"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{domain.owner_id || "System"}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Delete domain?')) {
                                                API.deleteDomain(domain.id).then(() => {
                                                    queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
                                                    toast.success("Deleted");
                                                })
                                            }
                                        }}
                                    >Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
