import { useState } from "react";
import { Copy, RefreshCw, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnon } from "@/contexts/AnonContext";

interface TempAddressCardProps {
  className?: string;
}

export const TempAddressCard = ({ className = "" }: TempAddressCardProps) => {
  const { address, loading, resetIdentity } = useAnon();
  const { t } = useLanguage();

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success(t("toast.copied"));
    }
  };

  const handleRandom = () => {
    resetIdentity();
  };

  // Extract domain from address for display
  const domain = address ? address.split('@')[1] : "loading...";
  const localPart = address ? address.split('@')[0] : "generating";

  return (
    <div className={`brutalist-card p-5 space-y-3 bg-accent/20 ${className}`}>
      <div className="inline-block bg-accent text-accent-foreground px-3 py-1 brutalist-button text-xs shadow-[3px_3px_0px_hsl(var(--border))]">
        {t("sidebar.yourTempAddress")}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={localPart}
            readOnly
            className="brutalist-input flex-1 font-mono font-bold"
          />
          <div className="brutalist-input flex items-center gap-2 min-w-[140px] cursor-pointer hover:bg-muted">
            <span className="text-sm font-bold">@{domain}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            className="brutalist-button gradient-hero text-accent-foreground flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            {t("sidebar.copy")}
          </Button>
          <Button
            onClick={handleRandom}
            disabled={loading}
            className="brutalist-button bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {t("sidebar.random")}
          </Button>
        </div>

        <div className="inline-block bg-primary text-primary-foreground px-3 py-1.5 brutalist-button text-xs shadow-[3px_3px_0px_hsl(var(--border))]">
          Ready {t("sidebar.active")}
        </div>
      </div>
    </div>
  );
};
