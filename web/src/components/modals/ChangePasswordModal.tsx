import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import API from "@/lib/api";

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!oldPassword || !newPassword) {
            toast.error("Please fill all fields");
            return;
        }
        setLoading(true);
        try {
            const res = await API.changePassword({ old_password: oldPassword, new_password: newPassword });
            if (res.data.success) {
                toast.success("Password updated successfully");
                onOpenChange(false);
                setOldPassword("");
                setNewPassword("");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="brutalist-card">
                <DialogHeader>
                    <DialogTitle>CHANGE PASSWORD</DialogTitle>
                    <DialogDescription>Enter your current password and a new one.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input
                        type="password"
                        placeholder="Current Password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="brutalist-input"
                    />
                    <Input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="brutalist-input"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="brutalist-button bg-secondary text-secondary-foreground">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="brutalist-button gradient-hero text-accent-foreground">
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
