import { useState } from "react";
import { Database, Mail, Trash2, UserPlus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 10;

const UsersTab = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await API.getUsers();
      return res.data.data?.users || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => API.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: () => toast.error("Failed to delete user")
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => API.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully!");
      setCreateDialogOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "user" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to create user")
  });

  const migrateMutation = useMutation({
    mutationFn: async () => API.migrateUsers(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const stats = res.data.data;
      toast.success(`Migration complete! Imported: ${stats?.Imported || 0}, Skipped: ${stats?.Skipped || 0}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Migration failed")
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm("Delete this user?")) {
      deleteMutation.mutate(userId);
    }
  };

  const handleCreateUser = () => {
    if (!newUser.username && !newUser.email) {
      toast.error("Username or Email required");
      return;
    }
    if (!newUser.password) {
      toast.error("Password required");
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleMigrate = () => {
    if (confirm("Import users from OLD-Database/auth.db?")) {
      migrateMutation.mutate();
    }
  };

  // Pagination
  const totalPages = Math.ceil((users?.length || 0) / ITEMS_PER_PAGE);
  const paginatedUsers = users?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  ) || [];

  if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">User Management</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">
            Manage users and their permissions ({users?.length || 0} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMigrate}
            disabled={migrateMutation.isPending}
            className="brutalist-button"
          >
            {migrateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Import Old Users
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="brutalist-button bg-black text-white hover:bg-gray-800">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-black uppercase">Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. Username or Email is required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right font-bold">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="col-span-3"
                    placeholder="johndoe"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right font-bold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="col-span-3"
                    placeholder="john@example.com (optional)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right font-bold">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="col-span-3"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right font-bold">Role</Label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="col-span-3 h-10 px-3 border-2 border-border rounded-md"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateUser} disabled={createMutation.isPending} className="bg-black text-white">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <div className="brutalist-card overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="text-left p-4 uppercase text-sm font-black">Username</th>
              <th className="text-left p-4 uppercase text-sm font-black">Role</th>
              <th className="text-left p-4 uppercase text-sm font-black">Created</th>
              <th className="text-center p-4 uppercase text-sm font-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user: any, index: number) => (
              <tr
                key={user.id}
                className={`border-b-2 border-border hover:bg-lime-neon/20 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/30"
                  }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border-2 border-border bg-electric-blue/20 flex items-center justify-center font-black text-lg">
                      {(user.username || user.email || user.id).substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold">{user.username || <span className="text-muted-foreground italic">No username</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email || "No email"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-block px-3 py-1 border-2 border-border rounded-lg font-bold uppercase text-xs ${user.role === "admin"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    <span className="mr-1">👤</span>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-sm font-mono">
                  {user.created_at ? format(new Date(user.created_at), "PP") : "-"}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 border-2 border-border rounded-lg bg-white hover:bg-destructive/20 transition-all hover:translate-y-[-2px]"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between brutalist-card p-4 bg-white">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, users?.length || 0)} of {users?.length || 0} users
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
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg border-2 border-border font-bold text-sm transition-all ${currentPage === page
                    ? "bg-black text-white"
                    : "bg-white hover:bg-muted"
                    }`}
                >
                  {page}
                </button>
              ))}
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
    </div>
  );
};

export default UsersTab;
