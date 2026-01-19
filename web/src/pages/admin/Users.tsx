
import API from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function AdminUsers() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const res = await API.getUsers();
            return res.data.data.users as any[];
        }
    });

    if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">User Management</h1>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>{format(new Date(user.created_at), "PPP")}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Delete User?')) {
                                                API.deleteUser(user.id).then(() => {
                                                    // Force reload or invalidate
                                                    window.location.reload();
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
