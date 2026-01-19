
import API from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminSpam() {
    const queryClient = useQueryClient();
    const [rule, setRule] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-spam"],
        queryFn: async () => {
            const res = await API.getSpamFilters();
            return res.data.data as any[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => API.createSpamFilter(rule, "subject", "reject"), // MVP: hardcoded type/action
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-spam"] });
            toast.success("Filter created");
            setIsOpen(false);
            setRule("");
        },
        onError: () => toast.error("Failed")
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => API.deleteSpamFilter(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-spam"] });
            toast.success("Deleted");
        }
    });

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert /> Spam Filters</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Rule</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Block Subject Keyphrase</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Input
                                placeholder="e.g. 'casino', 'viagra'"
                                value={rule}
                                onChange={(e) => setRule(e.target.value)}
                            />
                            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                                Save Filter
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((f) => (
                            <TableRow key={f.id}>
                                <TableCell className="font-mono">{f.rule}</TableCell>
                                <TableCell>{f.type}</TableCell>
                                <TableCell><span className="text-destructive font-bold">{f.action}</span></TableCell>
                                <TableCell>{f.is_active ? "Yes" : "No"}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(f.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
