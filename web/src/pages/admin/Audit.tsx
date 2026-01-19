
import API from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ScrollText } from "lucide-react";

export default function AdminAudit() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-audit"],
        queryFn: async () => {
            const res = await API.getAuditLogs();
            return res.data.data as any[];
        },
        refetchInterval: 5000
    });

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText /> System Audit Logs</h1>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>IP / Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "PPpp")}</TableCell>
                                <TableCell className="font-bold">{log.action}</TableCell>
                                <TableCell className="font-mono text-xs">{log.target}</TableCell>
                                <TableCell className="text-xs">{log.ip}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
