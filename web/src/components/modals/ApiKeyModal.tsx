import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import API from "@/lib/api";
import { Copy, RefreshCw, Loader2 } from "lucide-react";

interface ApiKeyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ApiKeyModal = ({ open, onOpenChange }: ApiKeyModalProps) => {
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [rotating, setRotating] = useState(false);

    useEffect(() => {
        if (open) {
            fetchApiKey();
        }
    }, [open]);

    const fetchApiKey = async () => {
        setLoading(true);
        try {
            const res = await API.getApiKey();
            if (res.data.success) {
                setApiKey(res.data.data.api_key);
            }
        } catch (error) {
            //   toast.error("Failed to fetch API key");
        } finally {
            setLoading(false);
        }
    };

    const handleRotate = async () => {
        if (!confirm("Are you sure? This will invalidate the old key.")) return;
        setRotating(true);
        try {
            const res = await API.rotateApiKey();
            if (res.data.success) {
                setApiKey(res.data.data.api_key);
                toast.success("API Key rotated successfully");
            }
        } catch (error) {
            toast.error("Failed to rotate API key");
        } finally {
            setRotating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        toast.success("Copied to clipboard");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="brutalist-card">
                <DialogHeader>
                    <DialogTitle>MY API KEY</DialogTitle>
                    <DialogDescription>Use this key to access the API programmatically.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Input
                                value={apiKey}
                                readOnly
                                className="brutalist-input font-mono bg-muted"
                            />
                            <Button onClick={copyToClipboard} className="brutalist-button">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button
                        variant="destructive"
                        onClick={handleRotate}
                        disabled={rotating || loading}
                        className="brutalist-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${rotating ? "animate-spin" : ""}`} />
                        Rotate Key
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="brutalist-button bg-secondary text-secondary-foreground">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
