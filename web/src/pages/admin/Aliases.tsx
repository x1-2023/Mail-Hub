
import API from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function AdminAliases() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-aliases"],
        queryFn: async () => {
            const res = await API.getAliases();
            return res.data.data.aliases as any[];
        }
    });

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Alias Monitoring</h1>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Address</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Expires</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((alias) => (
                            <TableRow key={alias.id}>
                                <TableCell className="font-mono">{alias.local_part}@{alias.domain?.domain}</TableCell>
                                <TableCell>{alias.is_active ? "✅" : "❌"}</TableCell>
                                <TableCell>{alias.expires_at ? format(new Date(alias.expires_at), "PPP") : "Permanent"}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Revoke Alias?')) {
                                                API.deleteAlias(alias.id).then(() => {
                                                    window.location.reload();
                                                })
                                            }
                                        }}
                                    >Revoke</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
