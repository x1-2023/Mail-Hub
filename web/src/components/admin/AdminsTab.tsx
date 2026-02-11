import { useState } from "react";
import { Shield, UserPlus, Trash2, Loader2, Crown, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ITEMS_PER_PAGE = 10;

// Helper to get current user role
const getUserRole = (): string => {
  const token = localStorage.getItem("mh_token");
  if (!token) return "user";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || "user";
  } catch {
    return "user";
  }
};

const AdminsTab = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [promoteModal, setPromoteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const currentUserRole = getUserRole();

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-all"],
    queryFn: async () => {
      const res = await API.getUsers();
      return res.data.data?.users || [];
    }
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      API.changeUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-all"] });
      toast.success("Role updated successfully");
      setPromoteModal(false);
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to change role");
    }
  });

  // Filter admins and owner
  // Filter admins and owner (case-insensitive) - Added safe navigation
  const admins = users?.filter((u: any) => u.role?.toLowerCase() === "admin" || u.role?.toLowerCase() === "owner") || [];
  const regularUsers = users?.filter((u: any) => u.role?.toLowerCase() === "user") || [];

  // Debug logs
  console.log("All Users:", users);
  console.log("Regular Users (Filtered):", regularUsers);

  // Pagination for admins
  const totalPages = Math.ceil(admins.length / ITEMS_PER_PAGE);
  const paginatedAdmins = admins.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePromote = () => {
    if (!selectedUserId) return;
    changeRoleMutation.mutate({ userId: selectedUserId, role: "ADMIN" });
  };

  const handleDemote = (userId: string, email: string) => {
    if (confirm(`Demote "${email}" from admin to user?`)) {
      changeRoleMutation.mutate({ userId, role: "USER" });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-electric-blue" />
          <div>
            <h2 className="text-2xl font-black uppercase">Admin Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage administrator accounts and permissions
            </p>
          </div>
        </div>
        <Button
          onClick={() => setPromoteModal(true)}
          className="brutalist-button gradient-hero text-accent-foreground"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Promote User to Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="brutalist-card p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-border bg-yellow-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-black">
                {users?.filter((u: any) => u.role.toLowerCase() === "owner").length || 0}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Owner</div>
            </div>
          </div>
        </div>
        <div className="brutalist-card p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-border bg-destructive/20 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black">
                {users?.filter((u: any) => u.role.toLowerCase() === "admin").length || 0}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Admins</div>
            </div>
          </div>
        </div>
        <div className="brutalist-card p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black">{regularUsers.length}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Regular Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="brutalist-card overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="text-left p-4 uppercase text-sm font-black">Email</th>
              <th className="text-left p-4 uppercase text-sm font-black">Role</th>
              <th className="text-left p-4 uppercase text-sm font-black">Created</th>
              <th className="text-center p-4 uppercase text-sm font-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAdmins.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No administrators found</p>
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((user: any, index: number) => (
                <tr
                  key={user.id}
                  className={`border-b-2 border-border hover:bg-lime-neon/20 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/30"
                    }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg border-2 border-border flex items-center justify-center font-black text-lg ${user.role.toLowerCase() === "owner" ? "bg-yellow-100" : "bg-destructive/20"
                        }`}>
                        {user.role.toLowerCase() === "owner" ? "👑" : "🛡️"}
                      </div>
                      <div>
                        <div className="font-bold">{user.email}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      className={`uppercase font-bold ${user.role.toLowerCase() === "owner"
                        ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-600"
                        : "bg-destructive/20 text-destructive border-2 border-destructive"
                        }`}
                    >
                      {user.role.toLowerCase() === "owner" ? "👑 Owner" : "🛡️ Admin"}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm font-mono">
                    {user.created_at ? format(new Date(user.created_at), "PP") : "-"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {user.role.toLowerCase() === "admin" && (
                        <button
                          onClick={() => handleDemote(user.id, user.email)}
                          className="p-2 border-2 border-border rounded-lg bg-white hover:bg-destructive/20 transition-all hover:translate-y-[-2px]"
                          title="Demote to User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {user.role.toLowerCase() === "owner" && (
                        <span className="text-xs text-muted-foreground italic">Protected</span>
                      )}
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
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, admins.length)} of {admins.length}
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

      {/* Promote Modal */}
      <Dialog open={promoteModal} onOpenChange={setPromoteModal}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Promote User to Admin</DialogTitle>
            <DialogDescription>
              Select a user to grant admin privileges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="font-bold uppercase text-sm">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="brutalist-input">
                  <SelectValue placeholder="Choose a user (v2 fix)..." />
                </SelectTrigger>
                <SelectContent>
                  {regularUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regularUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">No regular users available to promote</p>
              )}
            </div>
            <Button
              onClick={handlePromote}
              disabled={!selectedUserId || changeRoleMutation.isPending}
              className="w-full brutalist-button gradient-hero text-accent-foreground"
            >
              {changeRoleMutation.isPending ? (
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
              ) : (
                <UserPlus className="mr-2 w-4 h-4" />
              )}
              Promote to Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminsTab;
