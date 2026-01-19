
import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Book,
    Server,
    Shield,
    Terminal,
    Copy,
    Check,
    ChevronRight,
    ArrowLeft,
    Key,
    Mail,
    Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

const Docs = () => {
    const { language, setLanguage } = useLanguage();
    const [copied, setCopied] = useState("");
    // Local translations to keep Docs self-contained and not bloat global context
    const tDocs = {
        vi: {
            intro: {
                title: "Giới thiệu",
                desc: "MailHub cung cấp API RESTful để tạo và quản lý địa chỉ email tạm thời một cách tự động. API tuân thủ các mã phản hồi HTTP tiêu chuẩn và trả về dữ liệu định dạng JSON.",
                baseUrl: "Base URL"
            },
            auth: {
                title: "Xác thực (Authentication)",
                desc: "MailHub sử dụng 3 loại xác thực tùy thuộc vào ngữ cảnh:",
                anonTitle: "Anonymous Token",
                anonDesc: "Dùng cho phiên email tạm thời. Được trả về khi tạo địa chỉ mới.",
                apiKeyTitle: "API Key (Khuyên dùng)",
                apiKeyDesc: "Khóa vĩnh viễn cho scripts & tích hợp backend. Không bao giờ hết hạn.",
                jwtTitle: "User JWT",
                jwtDesc: "Dành cho người dùng đã đăng ký/đăng nhập.",
                authOptions: "Tùy chọn xác thực (Chọn 1):",
                headerRequired: "Yêu cầu Header:"
            },
            sections: {
                gettingStarted: "Bắt đầu",
                intro: "Giới thiệu",
                auth: "Xác thực",
                anonMail: "Email Ẩn Danh",
                listDomains: "Danh sách Domain",
                createAddress: "Tạo Địa chỉ",
                listMessages: "Ds Tin nhắn",
                userManage: "Quản lý Người dùng",
                register: "Đăng ký",
                login: "Đăng nhập",
                system: "Hệ thống",
                pubConfig: "Cấu hình Public",
                pubInbox: "Hộp thư Public"
            },
            endpoints: {
                register: { title: "Đăng ký User", desc: "Tạo tài khoản vĩnh viễn để quản lý domain riêng và alias." },
                login: { title: "Đăng nhập", desc: "Xác thực để nhận Bearer Token cho các request cần quyền hạn." },
                domains: { title: "Danh sách Domain", desc: "Lấy danh sách các domain khả dụng để tạo email tạm." },
                create: { title: "Tạo Địa chỉ", desc: "Tạo địa chỉ email tạm mới. Có thể tùy chọn username và domain." },
                messages: { title: "Danh sách Tin nhắn", desc: "Lấy danh sách email của identity hiện tại. Hỗ trợ phân trang." },
                messageDetail: { title: "Xem Nội dung Tin", desc: "Lấy nội dung đầy đủ (HTML/Text) và headers của một tin nhắn cụ thể." },
                deleteMessage: { title: "Xóa Tin nhắn", desc: "Xóa vĩnh viễn một tin nhắn." },
                config: { title: "Lấy Config Public", desc: "Trả về các biến cấu hình công khai cho frontend." },
                publicMsg: { title: "Kiểm tra Inbox Public", desc: "Đọc tin nhắn chỉ cần địa chỉ email (không cần token)." }
            },
            common: {
                reqBody: "Request Body",
                reqEx: "Ví dụ Request",
                respEx: "Ví dụ Response",
                queryParams: "Query Parameters",
                param: "Tham số",
                type: "Kiểu",
                desc: "Mô tả",
                reqAuth: "Cần Auth",
                note: "Lưu ý: Các Alias thuộc sở hữu của User đăng ký sẽ KHÔNG thể truy cập ở đây."
            }
        },
        en: {
            intro: {
                title: "Introduction",
                desc: "MailHub provides a RESTful API for programmatically creating and managing temporary email addresses. It follows standard HTTP response codes and returns JSON encoded responses.",
                baseUrl: "Base URL"
            },
            auth: {
                title: "Authentication",
                desc: "MailHub uses 3 types of authentication depending on the context:",
                anonTitle: "Anonymous Token",
                anonDesc: "Used for temporary email sessions. Returned when you create a new address.",
                apiKeyTitle: "API Key (Recommended)",
                apiKeyDesc: "Permanent key for scripts & backend integration. Never expires.",
                jwtTitle: "User JWT",
                jwtDesc: "For registered/logged-in users.",
                authOptions: "Authentication Options (Choose one):",
                headerRequired: "Header Required:"
            },
            sections: {
                gettingStarted: "Getting Started",
                intro: "Introduction",
                auth: "Authentication",
                anonMail: "Anonymous Mail",
                listDomains: "List Domains",
                createAddress: "Create Address",
                listMessages: "List Messages",
                userManage: "User Management",
                register: "Register Account",
                login: "User Login",
                system: "System",
                pubConfig: "Public Config",
                pubInbox: "Public Inbox"
            },
            endpoints: {
                register: { title: "Register User", desc: "Create a permanent account to manage custom domains and aliases." },
                login: { title: "Login", desc: "Authenticate to receive a Bearer Token for authorized requests." },
                domains: { title: "List Public Domains", desc: "Retrieve a list of available domains for creating temporary emails." },
                create: { title: "Create Address", desc: "Generate a new temporary email address. You can optionally specify a username and domain." },
                messages: { title: "List Messages", desc: "Fetch emails for the current identity. Supports pagination." },
                messageDetail: { title: "Get Message Content", desc: "Retrieve the full body (HTML/Text) and headers of a specific message." },
                deleteMessage: { title: "Delete Message", desc: "Permanently delete a message." },
                config: { title: "Get Public Config", desc: "Returns public configuration variables for the frontend." },
                publicMsg: { title: "Check Inbox Publicly", desc: "Retrieve messages using just the email address." }
            },
            common: {
                reqBody: "Request Body",
                reqEx: "Example Request",
                respEx: "Response Example",
                queryParams: "Query Parameters",
                param: "Param",
                type: "Type",
                desc: "Description",
                reqAuth: "Requires Auth",
                note: "NOTE: Aliases owned by registered users cannot be accessed here."
            }
        }
    };

    const text = language === 'vi' ? tDocs.vi : tDocs.en;
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(""), 2000);
    };

    const CodeBlock = ({ code, language = "json", id }: { code: string; language?: string; id: string }) => (
        <div className="relative group brutalist-card !bg-[#13111c] text-[#e4d4f4] font-mono text-sm overflow-hidden shadow-[4px_4px_0px_hsl(var(--primary))] border-zinc-800">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1625] border-b border-white/5">
                <span className="text-xs text-purple-300/70 font-bold tracking-wider">{language.toUpperCase()}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-purple-300/70 hover:text-white"
                    onClick={() => copyToClipboard(code, id)}
                >
                    {copied === id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </Button>
            </div>
            <div className="p-4 overflow-x-auto text-[#efe6fd]">
                <pre>
                    <code className={`language-${language}`}>{code}</code>
                </pre>
            </div>
        </div>
    );

    const Endpoint = ({ method, path, title, description, requiresAuth, authType }: any) => {
        const fullUrl = `${API_URL}${path}`;

        return (
            <div className="space-y-4 pt-6 first:pt-0">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        {title}
                        {requiresAuth && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 uppercase font-bold">
                                {text.common.reqAuth}
                            </span>
                        )}
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-sm w-full">
                        <span className={`px-2 py-1 rounded text-white font-bold text-xs uppercase shadow-sm shrink-0
                            ${method === 'GET' ? 'bg-blue-500' :
                                method === 'POST' ? 'bg-green-500' :
                                    method === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'}`}>
                            {method}
                        </span>
                        <div className="flex-1 flex items-center justify-between bg-muted rounded border border-border/50 overflow-hidden">
                            <span className="px-2 py-1 text-foreground font-bold truncate" title={fullUrl}>
                                <span className="text-muted-foreground opacity-50">{API_URL}</span>
                                <span>{path}</span>
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 rounded-none hover:bg-zinc-200/50"
                                onClick={() => copyToClipboard(fullUrl, `url-${path}`)}
                                title="Copy Full URL"
                            >
                                {copied === `url-${path}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <p className="text-muted-foreground">{description}</p>
                {authType === 'anon' && (
                    <div className="flex items-center gap-2 text-xs bg-orange-50/50 text-orange-700 px-3 py-2 rounded border border-orange-200/50">
                        <Key className="w-3 h-3" />
                        {text.auth.headerRequired} <code className="font-bold">X-Anon-Token: &lt;token&gt;</code>
                    </div>
                )}
                {authType === 'bearer' && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50/50 text-blue-700 px-3 py-2 rounded border border-blue-200/50">
                        <Shield className="w-3 h-3" />
                        {text.auth.headerRequired} <code className="font-bold">Authorization: Bearer &lt;jwt&gt;</code>
                    </div>
                )}
                {authType === 'apikey' && (
                    <div className="flex items-center gap-2 text-xs bg-purple-50/50 text-purple-700 px-3 py-2 rounded border border-purple-200/50">
                        <Key className="w-3 h-3" />
                        {text.auth.headerRequired} <code className="font-bold">X-Api-Key: &lt;key&gt;</code>
                    </div>
                )}
                {authType === 'universal' && (
                    <div className="flex flex-col gap-2 text-xs bg-zinc-50/50 text-zinc-700 px-3 py-2 rounded border border-zinc-200/50">
                        <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            <strong>{text.auth.authOptions}</strong>
                        </div>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                            <li>{text.auth.anonTitle}: <code className="font-bold">X-Anon-Token: &lt;token&gt;</code></li>
                            <li>{text.auth.apiKeyTitle}: <code className="font-bold">X-Api-Key: &lt;key&gt;</code></li>
                            <li>{text.auth.jwtTitle}: <code className="font-bold">Authorization: Bearer &lt;jwt&gt;</code></li>
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16">
                <div className="max-w-[1400px] w-full mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/">
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                                <ArrowLeft className="w-5 h-5 text-foreground" />
                            </Button>
                        </Link>
                        <Book className="w-5 h-5 text-foreground" />
                        <span className="font-bold text-lg tracking-tight">MailHub API</span>
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">v1.0</span>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2 px-2 h-8 text-foreground/80 hover:text-foreground">
                                    <Globe className="w-4 h-4" />
                                    <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-border">
                                <DropdownMenuItem onClick={() => setLanguage('vi')} className="cursor-pointer">
                                    Tiếng Việt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                                    English
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{text.intro.baseUrl}:</span>
                            <code className="bg-muted px-2 py-1 rounded text-foreground font-mono text-xs border border-border">{API_URL}</code>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
                {/* Sidebar Navigation */}
                <aside className="w-64 hidden lg:block border-r border-border h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto py-8 pr-6 bg-background/50">
                    <nav className="space-y-8">
                        <div className="space-y-3">
                            <h4 className="font-black uppercase text-xs tracking-wider text-muted-foreground pl-4">{text.sections.gettingStarted}</h4>
                            <ul className="space-y-1 border-l border-border ml-4">
                                <li><a href="#intro" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.intro}</a></li>
                                <li><a href="#auth" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.auth}</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black uppercase text-xs tracking-wider text-muted-foreground pl-4">{text.sections.anonMail}</h4>
                            <ul className="space-y-1 border-l border-border ml-4">
                                <li><a href="#get-domains" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.listDomains}</a></li>
                                <li><a href="#create-address" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.createAddress}</a></li>
                                <li><a href="#get-messages" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.listMessages}</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black uppercase text-xs tracking-wider text-muted-foreground pl-4">{text.sections.userManage}</h4>
                            <ul className="space-y-1 border-l border-border ml-4">
                                <li><a href="#register" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.register}</a></li>
                                <li><a href="#login" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.login}</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black uppercase text-xs tracking-wider text-muted-foreground pl-4">{text.sections.system}</h4>
                            <ul className="space-y-1 border-l border-border ml-4">
                                <li><a href="#public-config" className="block pl-4 py-1 text-sm text-foreground/80 hover:text-primary hover:font-bold border-l-2 border-transparent hover:border-primary -ml-[2px] transition-all">{text.sections.pubConfig}</a></li>
                                <li><a href="#public-access" className="block pl-4 py-1 text-sm text-blue-600 hover:text-blue-500 hover:font-bold border-l-2 border-transparent hover:border-blue-500 -ml-[2px] transition-all">{text.sections.pubInbox}</a></li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 py-8 lg:px-12 space-y-16 overflow-y-auto">

                    {/* Introduction */}
                    <section id="intro" className="space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tight">{text.intro.title}</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {text.intro.desc}
                            </p>
                        </div>
                        <div className="brutalist-card p-6 border-l-4 border-l-primary bg-primary/5">
                            <h3 className="font-bold flex items-center gap-2 mb-2">
                                <Terminal className="w-5 h-5" /> {text.intro.baseUrl}
                            </h3>
                            <code className="text-sm">{API_URL}</code>
                        </div>
                    </section>

                    {/* Authentication */}
                    <section id="auth" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.auth.title}</h2>
                        </div>
                        <p className="text-muted-foreground">
                            {text.auth.desc}
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="brutalist-card p-6 space-y-3">
                                <div className="p-2 bg-orange-100 w-fit rounded-lg border-2 border-orange-200">
                                    <Key className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="font-bold text-lg">{text.auth.anonTitle}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {text.auth.anonDesc}
                                </p>
                                <div className="bg-muted p-2 rounded text-xs font-mono">
                                    X-Anon-Token: &lt;your_token_here&gt;
                                </div>
                            </div>

                            <div className="brutalist-card p-6 space-y-3 border-l-4 border-l-purple-500">
                                <div className="p-2 bg-purple-100 w-fit rounded-lg border-2 border-purple-200">
                                    <Key className="w-6 h-6 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-lg">{text.auth.apiKeyTitle}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {text.auth.apiKeyDesc}
                                </p>
                                <div className="bg-muted p-2 rounded text-xs font-mono">
                                    X-Api-Key: mh_a1b2c3d4...
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Auth API */}
                    <section id="api-auth" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.sections.userManage}</h2>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6" id="register">
                                <Endpoint
                                    method="POST"
                                    path="/auth/register"
                                    title={text.endpoints.register.title}
                                    description={text.endpoints.register.desc}
                                />
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.reqBody}</span>
                                    <CodeBlock
                                        id="register-req"
                                        code={`{
  "email": "user@example.com",
  "password": "securePrice123"
}`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-6" id="login">
                                <Endpoint
                                    method="POST"
                                    path="/auth/login"
                                    title={text.endpoints.login.title}
                                    description={text.endpoints.login.desc}
                                />
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                    <CodeBlock
                                        id="login-res"
                                        code={`{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...", // Use as Bearer Token
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "role": "user"
    }
  }
}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Domains */}
                    <section id="get-domains" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.sections.listDomains}</h2>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Endpoint
                                    method="GET"
                                    path="/anon/domains"
                                    title={text.endpoints.domains.title}
                                    description={text.endpoints.domains.desc}
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="domains-res"
                                    code={`{
  "success": true,
  "data": [
    "mailhub.net",
    "tempmail.org"
  ]
}`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Create Address */}
                    <section id="create-address" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.sections.anonMail}</h2>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <Endpoint
                                    method="POST"
                                    path="/anon/address"
                                    title={text.endpoints.create.title}
                                    description={text.endpoints.create.desc}
                                />

                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.reqBody} (Optional)</span>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {language === 'vi' ?
                                            "Để trống body ({}) hoặc bỏ qua field để tạo địa chỉ ngẫu nhiên." :
                                            "Send empty body ({}) or omit fields to generate a random address."}
                                    </p>
                                    <CodeBlock
                                        id="create-req"
                                        code={`{
  "local_part": "custom_user",
  "domain": "mailhub.net"
}`}
                                    />
                                    <div className="mt-4">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Random Example</span>
                                        <CodeBlock
                                            id="create-req-random"
                                            code={`{}`}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="create-res"
                                    code={`{
  "success": true,
  "data": {
    "address": "custom_user@mailhub.net",
    "token": "eyJhbGciOiJIUzI1NiIsIn...", // Save this!
    "expires_at": "2024-12-31T23:59:59Z"
  }
}`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Get Messages */}
                    <section id="get-messages" className="space-y-6 border-t border-border pt-12">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <Endpoint
                                    method="GET"
                                    path="/anon/messages"
                                    title={text.endpoints.messages.title}
                                    description={text.endpoints.messages.desc}
                                    requiresAuth
                                    authType="universal"
                                />

                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.queryParams}</span>
                                    <div className="brutalist-card p-0 overflow-hidden text-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-muted-foreground font-mono text-xs">
                                                <tr>
                                                    <th className="p-2 border-r border-border">{text.common.param}</th>
                                                    <th className="p-2 border-r border-border">{text.common.type}</th>
                                                    <th className="p-2">{text.common.desc}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border font-bold">alias_id</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">uuid</td>
                                                    <td className="p-2">
                                                        {language === 'vi' ?
                                                            'Bắt buộc (hoặc dùng email) nếu dùng API Key hoặc User Token.' :
                                                            'Required (or use email) if using API Key or User Token.'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border font-bold">email</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">string</td>
                                                    <td className="p-2">
                                                        {language === 'vi' ?
                                                            'Thay thế cho alias_id. Định danh inbox bằng địa chỉ email.' :
                                                            'Alternative to alias_id. Target inbox by email address.'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border">limit</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">int</td>
                                                    <td className="p-2">Wait messages per page (default: 20)</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border">page</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">int</td>
                                                    <td className="p-2">Page number</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.reqEx}</span>
                                        <div className="bg-muted p-3 rounded-lg font-mono text-xs space-y-2">
                                            <div className="text-muted-foreground">// Get by Email</div>
                                            <div className="text-blue-500">GET /api/anon/messages?email=user@mailhub.net</div>
                                            <div className="text-muted-foreground mt-2">// Get by Alias ID</div>
                                            <div className="text-blue-500">GET /api/anon/messages?alias_id=550e8400-e29b...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="messages-res"
                                    code={`{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "msg_123456",
        "sender": "friend@example.com",
        "subject": "Hello World",
        "snippet": "This is a test message...",
        "received_at": "2024-03-20T10:00:00Z",
        "is_read": false,
        "is_starred": true
      }
    ],
    "total": 1
  }
}`}
                                />
                            </div>
                        </div>

                        {/* Get Single Message */}
                        <div className="grid lg:grid-cols-2 gap-8 pt-8 border-t border-border/50">
                            <div className="space-y-6">
                                <Endpoint
                                    method="GET"
                                    path="/anon/messages/:id"
                                    title={text.endpoints.messageDetail.title}
                                    description={text.endpoints.messageDetail.desc}
                                    requiresAuth
                                    authType="universal"
                                />

                                <div className="space-y-2 mt-4">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.queryParams}</span>
                                    <div className="brutalist-card p-0 overflow-hidden text-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-muted-foreground font-mono text-xs">
                                                <tr>
                                                    <th className="p-2 border-r border-border">{text.common.param}</th>
                                                    <th className="p-2 border-r border-border">{text.common.type}</th>
                                                    <th className="p-2">{text.common.desc}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border font-bold">alias_id</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">uuid</td>
                                                    <td className="p-2">
                                                        {language === 'vi' ?
                                                            'Optional (hoặc dùng email). Giúp xác thực ownership.' :
                                                            'Optional (or use email). Helps verify ownership.'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border font-bold">email</td>
                                                    <td className="p-2 font-mono text-muted-foreground border-r border-border">string</td>
                                                    <td className="p-2">
                                                        {language === 'vi' ?
                                                            'Optional. Định danh inbox nếu không có alias_id.' :
                                                            'Optional. Identify inbox if alias_id is missing.'}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.reqEx}</span>
                                        <div className="bg-muted p-3 rounded-lg font-mono text-xs space-y-2">
                                            <div className="text-muted-foreground">// Get by Email</div>
                                            <div className="text-blue-500">GET /api/anon/messages/msg_123?email=user@mailhub.net</div>
                                            <div className="text-muted-foreground mt-2">// Get by Alias ID</div>
                                            <div className="text-blue-500">GET /api/anon/messages/msg_123?alias_id=550e...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="message-detail-res"
                                    code={`{
  "success": true,
  "data": {
    "id": "msg_123456",
    "subject": "Hello World",
    "body_text": "This is the plain text content.",
    "body_html": "<div>This is the <b>HTML</b> content.</div>",
    "headers": {
      "From": "friend@example.com",
      "To": "me@mailhub.net"
    },
    "attachments": []
  }
}`}
                                />
                            </div>
                        </div>

                        {/* Delete Message */}
                        <div className="grid lg:grid-cols-2 gap-8 pt-8 border-t border-border/50">
                            <div className="space-y-6">
                                <Endpoint
                                    method="DELETE"
                                    path="/anon/messages/:id"
                                    title={text.endpoints.deleteMessage.title}
                                    description={text.endpoints.deleteMessage.desc}
                                    requiresAuth
                                    authType="universal"
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="delete-res"
                                    code={`{
  "success": true,
  "data": null
}`}
                                />
                            </div>
                        </div>
                    </section>


                    {/* Public Config */}
                    <section id="public-config" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.sections.system}</h2>
                        </div>
                        <p className="text-muted-foreground">
                            {text.endpoints.config.desc}
                        </p>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Endpoint
                                    method="GET"
                                    path="/system/config"
                                    title={text.endpoints.config.title}
                                    description={text.endpoints.config.desc}
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="config-res"
                                    code={`{
  "success": true,
  "data": {
    "open_registration": true,
    "version": "1.0.0",
    "domains": [
      "mailhub.net",
      "tempmail.org"
    ],
    "message_retention_days": 1
  }
}`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Public Access */}
                    <section id="public-access" className="space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-2xl font-black">{text.sections.pubInbox}</h2>
                        </div>
                        <p className="text-muted-foreground">
                            {text.endpoints.publicMsg.desc}
                            <span className="text-red-500 font-bold ml-1">
                                {text.common.note}
                            </span>
                        </p>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Endpoint
                                    method="GET"
                                    path="/public/messages"
                                    title={text.endpoints.publicMsg.title}
                                    description={text.endpoints.publicMsg.desc}
                                />
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.queryParams}</span>
                                    <div className="brutalist-card p-0 overflow-hidden text-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-muted-foreground font-mono text-xs">
                                                <tr>
                                                    <th className="p-2 border-r border-border">{text.common.param}</th>
                                                    <th className="p-2">{text.common.desc}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                <tr>
                                                    <td className="p-2 font-mono border-r border-border">email</td>
                                                    <td className="p-2">Full email address (e.g. user@domain.com)</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{text.common.respEx}</span>
                                <CodeBlock
                                    id="public-res"
                                    code={`{
  "success": true,
  "data": {
    "emails": [...],
    "total": 5
  }
}`}
                                />
                            </div>
                        </div>
                    </section>


                    <div className="h-20"></div>
                </main>
            </div>
        </div >
    );
};

export default Docs;
