import { useState, useEffect } from "react";
import { Menu, Check, Search, RefreshCw, Trash2, LayoutDashboard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { useAnon } from "@/contexts/AnonContext";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
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

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const { t, language } = useLanguage();
  const { address, loading, createIdentity, token, history, switchIdentity, removeIdentity } = useAnon();
  const [page, setPage] = useState(1);

  // Auth State for Mobile
  const userToken = localStorage.getItem("mh_token");
  const isGuest = !userToken;
  let isAdmin = false;
  if (userToken) {
    try {
      const decoded: any = jwtDecode(userToken);
      isAdmin = decoded.role === "admin" || decoded.role === "owner";
    } catch { }
  }

  // Fetch Domains
  const { data: availableDomains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => {
      try {
        const res = await API.getAnonDomains();
        if (res.data.success) {
          const list = res.data.data?.map((d: any) => d.domain) || [];
          if (list.length > 0 && !selectedDomain) setSelectedDomain(list[0]);
          return list;
        }
        return [];
      } catch (e) {
        return [];
      }
    }
  });

  const displayDomains = availableDomains.length > 0 ? availableDomains : ["Loading..."];

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchEmail]);

  const handleRandom = async () => {
    const domains = displayDomains.length > 0 ? displayDomains : [];
    if (domains.length === 0) {
      await createIdentity();
    } else {
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];
      await createIdentity(randomDomain);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden brutalist-button shadow-none hover:bg-muted"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] sm:w-[400px] bg-background p-0 border-r-[2px] border-border overflow-y-auto">
        <SheetHeader className="brutalist-card rounded-none border-t-0 border-l-0 border-r-0 shadow-none p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-black uppercase">Menu</SheetTitle>
            {!isGuest && (
              <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md">
                {t("sidebar.loggedIn")}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Auth Button */}
          {isGuest && (
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button className="brutalist-button gradient-hero text-accent-foreground w-full">
                {t("header.login")}
              </Button>
            </Link>
          )}

          {/* Navigation */}
          <div className="brutalist-card p-4 space-y-2">
            <Link to="/" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="brutalist-button shadow-none hover:bg-primary hover:text-primary-foreground w-full justify-start mb-2"
              >
                {t("header.inbox")}
              </Button>
            </Link>
            <Link to="/?tab=starred" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="brutalist-button shadow-none hover:bg-secondary hover:text-secondary-foreground w-full justify-start mb-2"
              >
                {t("header.starred")}
              </Button>
            </Link>
            <Link to="/docs" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="brutalist-button shadow-none hover:bg-muted w-full justify-start"
              >
                {t("header.apiDocs")}
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="brutalist-button shadow-none hover:bg-destructive hover:text-destructive-foreground text-destructive w-full justify-start mt-2">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  {t("sidebar.adminPanel")}
                </Button>
              </Link>
            )}
          </div>

          {/* Available Domains */}
          <div className="brutalist-card p-4 bg-primary/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black">{t("sidebar.availableDomains").toUpperCase()}</h3>
              <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md border-2 border-border">
                {displayDomains.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayDomains.map((d: string) => (
                <button
                  key={d}
                  onClick={() => setSelectedDomain(d)}
                  className={`brutalist-button px-3 py-1.5 text-xs ${selectedDomain === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted"
                    }`}
                >
                  {selectedDomain === d && <Check className="w-3 h-3 inline mr-1" />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* My Addresses */}
          <div className="brutalist-card p-4 space-y-3 bg-secondary/10">
            <h3 className="text-xs font-black">{t("sidebar.myAddresses")}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("sidebar.searchAddresses")}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="brutalist-input"
                style={{ paddingLeft: "3.5rem" }}
              />
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
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
                          className="flex-1 cursor-pointer overflow-hidden"
                          onClick={() => { switchIdentity(h.address); setOpen(false); }}
                        >
                          <p className="font-bold text-sm truncate">{h.address}</p>
                          <p className="text-[10px] text-muted-foreground">📧 {h.email_count ?? 0} {language === 'vi' ? 'thư' : 'emails'}</p>
                        </div>
                        <div className="flex items-center shrink-0 ml-2">
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
                          className="brutalist-button h-8 px-2 text-xs"
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
                          className="brutalist-button h-8 px-2 text-xs"
                        >
                          {t("sidebar.next")}
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <Button onClick={handleRandom} disabled={loading} className="brutalist-button gradient-hero w-full">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? t("sidebar.creating") : t("sidebar.newIdentity")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
