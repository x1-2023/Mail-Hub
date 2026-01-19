import { useState, useEffect } from "react";
import { Check, Copy, RefreshCw, ChevronDown, Search, Mail, Star, Inbox, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnon } from "@/contexts/AnonContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// const DOMAINS = ["tempmail.io", "quickmail.net", "fastinbox.com", "throwaway.email", "tempbox.dev"];

export const LeftSidebar = () => {
  const { address, loading, createIdentity, token, history, switchIdentity, removeIdentity } = useAnon();
  const [selectedDomain, setSelectedDomain] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const { t, language } = useLanguage();
  const [user, domain] = address ? address.split("@") : ["...", "..."];

  const [customAlias, setCustomAlias] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchEmail]);

  // Fetch Available Domains
  const { data: availableDomains = [], isLoading: domainsLoading, isError: domainsError } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => {
      try {
        const res = await API.getAnonDomains();
        if (res.data.success) {
          return res.data.data?.map((d: any) => d.domain) || [];
        }
        return [];
      } catch (e) {
        console.error("Failed to fetch domains", e);
        return [];
      }
    }
  });

  // Calculate stats for UI
  const displayDomains = availableDomains;
  const domainCount = domainsLoading ? "..." : displayDomains.length;

  // Ensure selectedDomain is set
  useEffect(() => {
    if (availableDomains.length > 0 && !selectedDomain) {
      setSelectedDomain(availableDomains[0]);
    }
  }, [availableDomains, selectedDomain]);

  // Sync selectedDomain with current address if user switches identity (optional but good for context)
  useEffect(() => {
    if (domain && domain !== "..." && displayDomains.includes(domain)) {
      setSelectedDomain(domain);
    }
  }, [domain, displayDomains]);

  // Fetch Message Stats for current user
  const { data: messages } = useQuery({
    queryKey: ["inbox", token],
    queryFn: async () => {
      if (!token) return [];
      try {
        const res = await API.getMessages(token);
        const list = res.data?.data?.emails || [];
        if (!Array.isArray(list)) return [];
        return list;
      } catch (err) {
        return [];
      }
    },
    enabled: !!token,
  });

  const totalMessages = messages?.length || 0;
  const unreadMessages = messages?.filter((m: any) => !m.is_read).length || 0;
  const starredMessages = messages?.filter((m: any) => m.is_starred).length || 0;

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success(t("toast.copied"));
    }
  };

  // Effect to sync customAlias when address changes (if not editing)
  useEffect(() => {
    if (user && user !== "...") {
      setCustomAlias(user);
    }
  }, [user]);

  const handleRandom = async () => {
    // If alias is empty or equals current user, treat as Random Request
    const isEditing = customAlias && customAlias !== user;

    if (isEditing) {
      if (customAlias.trim()) {
        // Create Custom
        if (!selectedDomain) {
          toast.error(t("error.selectDomain"));
          return;
        }
        toast.info(`Creating custom: ${customAlias.trim()}@${selectedDomain}`);
        await createIdentity(selectedDomain, customAlias.trim());
        // setCustomAlias will happen via useEffect above
      }
    } else {
      // Random from ALL available
      const domains = displayDomains.length > 0 ? displayDomains : [];
      if (domains.length === 0) {
        await createIdentity(); // Fallback to backend default
      } else {
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        await createIdentity(randomDomain);
      }
    }
  };

  const isEditing = customAlias && customAlias !== user;

  return (
    <aside className="hidden lg:block w-full lg:w-[380px] space-y-5 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {/* Collapsed Domain Selection */}
      <Accordion type="single" collapsible defaultValue="domains" className="brutalist-card bg-primary/20">
        <AccordionItem value="domains" className="border-none">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm font-black">{t("sidebar.availableDomains").toUpperCase()}</h2>
              <span className={`text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md border-2 border-border ${domainsError ? "bg-destructive text-white" : ""}`}>
                {domainsError ? "ERR" : domainCount}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-4">
            <div className="flex flex-wrap gap-2">
              {domainsLoading && (
                <div className="text-xs font-bold animate-pulse text-muted-foreground">Loading domains...</div>
              )}

              {!domainsLoading && displayDomains.length === 0 && (
                <div className="text-xs font-bold text-destructive">No domains found.</div>
              )}

              {displayDomains.map((d: string) => (
                <button
                  key={d}
                  onClick={() => setSelectedDomain(d)}
                  className={`brutalist-button px-3 py-1.5 text-xs ${selectedDomain === d ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                    }`}
                >
                  {selectedDomain === d && <Check className="w-3 h-3 inline mr-1" />}
                  {d}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Temp Address Hero Card */}
      <div className="brutalist-card p-6 space-y-4 bg-accent/20">
        <div className="inline-block bg-accent text-accent-foreground px-3 py-1 brutalist-button text-xs shadow-[3px_3px_0px_hsl(var(--border))]">
          {t("sidebar.yourTempAddress")}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder={t("sidebar.enterUsername")}
              className="brutalist-input flex-1 font-mono font-bold"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="brutalist-input flex items-center gap-2 min-w-[140px] cursor-pointer hover:bg-muted justify-between">
                  <span className="text-sm font-bold truncate">@{selectedDomain || domain}</span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="brutalist-card border-2">
                {displayDomains.map((d: string) => (
                  <DropdownMenuItem
                    key={d}
                    onClick={() => {
                      setSelectedDomain(d);
                    }}
                    className="cursor-pointer font-bold hover:bg-primary/20"
                  >
                    {d}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopy} className="brutalist-button gradient-hero text-accent-foreground flex-1">
              <Copy className="w-4 h-4 mr-2" />
              {t("sidebar.copy")}
            </Button>
            <Button
              onClick={handleRandom}
              disabled={loading}
              className="brutalist-button bg-card hover:bg-muted flex-1 text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {isEditing ? (loading ? t("sidebar.creating") : t("sidebar.create")) : t("sidebar.random")}
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Stats Card (Real Data) */}
      <div className="brutalist-card p-4 bg-muted">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <Mail className="w-5 h-5 mx-auto mb-1 text-foreground" />
            <p className="text-xl font-black">{totalMessages}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("sidebar.total")}</p>
          </div>
          <div className="text-center">
            <Inbox className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-xl font-black text-accent">{unreadMessages}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("sidebar.unread")}</p>
          </div>
          <div className="text-center">
            <Star className="w-5 h-5 mx-auto mb-1 text-primary fill-primary" />
            <p className="text-xl font-black text-primary">{starredMessages}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("sidebar.starred")}</p>
          </div>
        </div>
      </div>

      {/* My Addresses Drawer */}
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" className="w-full brutalist-button bg-card hover:bg-muted justify-between">
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t("sidebar.myAddresses")}
            </span>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="brutalist-card border-x-0 border-b-0 rounded-t-xl">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-2xl font-black uppercase">{t("sidebar.myAddresses")}</DrawerTitle>
              <DrawerDescription>{t("sidebar.searchManage")}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("sidebar.searchAddresses")}
                  className="brutalist-input"
                  style={{ paddingLeft: "3.5rem" }}
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  {(() => {
                    const filtered = history.filter(h => h.address.toLowerCase().includes(searchEmail.toLowerCase()));
                    // Sort: selected alias first
                    const sorted = [...filtered].sort((a, b) => {
                      if (a.address === address) return -1;
                      if (b.address === address) return 1;
                      return 0;
                    });
                    const totalPages = Math.ceil(sorted.length / 4);
                    const start = (page - 1) * 4;
                    const currentItems = sorted.slice(start, start + 4);

                    return (
                      <>
                        {currentItems.map((h, i) => (
                          <div
                            key={i}
                            className={`brutalist-card p-3 flex items-center justify-between transition-all ${h.address === address
                              ? "!bg-yellow-300 !border-2 !border-black shadow-md !text-black"
                              : "bg-card hover:bg-muted/50"
                              }`}
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => switchIdentity(h.address)}
                            >
                              <p className="font-bold text-sm truncate max-w-[180px]">{h.address}</p>
                              <p className="text-xs text-muted-foreground">📧 {h.email_count ?? 0} {language === 'vi' ? 'thư' : 'emails'}</p>
                            </div>
                            <div className="flex items-center">
                              <AlertDialog>
                                <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="brutalist-card bg-card border-none">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black">Delete this alias?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete <b>{h.address}</b> and all its messages.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="brutalist-button bg-secondary hover:bg-secondary/80 text-secondary-foreground border-2 border-black">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeIdentity(h.address);
                                      }}
                                      className="brutalist-button bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}

                        {filtered.length === 0 && (
                          <p className="text-center text-muted-foreground text-sm py-4">{t("sidebar.noMatches")}</p>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="brutalist-button h-8"
                            >
                              {t("sidebar.prev")}
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground">
                              {t("sidebar.page")} {page} {t("sidebar.of")} {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="brutalist-button h-8"
                            >
                              {t("sidebar.next")}
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => createIdentity()} className="brutalist-button gradient-hero w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("sidebar.generateNew")}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">{t("sidebar.close")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </aside>
  );
};