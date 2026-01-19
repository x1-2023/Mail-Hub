import { useState } from "react";
import { Mail, ArrowLeft, Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const res = await API.login({ email, password });
        const { token, user } = res.data.data;

        localStorage.setItem("mh_token", token);
        localStorage.setItem("mh_user", JSON.stringify(user));

        toast.success(t("auth.loginSuccess") || "Logged in successfully");

        if (user.role === "admin" || user.role === "owner") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        // Register
        if (password !== confirmPassword) {
          toast.error(t("auth.passwordMismatch") || "Passwords do not match");
          setLoading(false);
          return;
        }

        const res = await API.register({ email, password });
        const { token, user } = res.data.data;

        localStorage.setItem("mh_token", token);
        localStorage.setItem("mh_user", JSON.stringify(user));

        toast.success(t("auth.registerSuccess") || "Account created successfully");
        // New users are always "user" role initially
        navigate("/");
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "vi" ? "en" : "vi");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="brutalist-card rounded-none border-b-[2px] border-t-0 border-l-0 border-r-0 shadow-none bg-card">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Mail className="w-8 h-8" />
            <h1 className="text-xl font-black uppercase tracking-tight">MailHub</h1>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="brutalist-button bg-card hover:bg-muted font-bold"
            >
              <Globe className="w-4 h-4 mr-2" />
              {language === "vi" ? "Tiếng Việt" : "English"}
            </Button>
            <Link to="/">
              <Button variant="ghost" className="brutalist-button shadow-none hover:bg-muted">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("auth.backToHome")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="brutalist-card p-8 bg-card">
            {/* Tabs */}
            <div className="flex mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-center font-black uppercase text-sm border-[2px] border-border transition-all ${isLogin
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
                  }`}
              >
                {t("auth.login")}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-center font-black uppercase text-sm border-[2px] border-l-0 border-border transition-all ${!isLogin
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
                  }`}
              >
                {t("auth.register")}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase">
                  {isLogin ? "Email / Username" : t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type={isLogin ? "text" : "email"}
                  placeholder={isLogin ? "Email hoặc Username" : t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="brutalist-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black uppercase">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="brutalist-input pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-black uppercase">
                    {t("auth.confirmPassword")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="brutalist-input"
                    required
                  />
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <button type="button" className="text-sm font-semibold text-primary hover:underline">
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="brutalist-button gradient-hero text-accent-foreground w-full py-3 text-base"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? t("auth.loginButton") : t("auth.registerButton")}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
