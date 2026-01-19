import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "vi" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Header
    "header.inbox": "Hộp Thư",
    "sidebar.create": "TẠO",
    "header.starred": "Đánh Dấu",
    "header.apiDocs": "Tài Liệu API",
    "header.login": "Đăng Nhập",
    "header.register": "Đăng Ký",
    "header.myEmails": "Email Của Tôi",
    "header.changePassword": "Đổi Mật Khẩu",
    "header.logout": "Đăng Xuất",
    "header.anonymous": "ẨN DANH",
    "header.myApi": "API Của Tôi",
    "header.admin": "QUẢN TRỊ",

    // Sidebar
    "sidebar.availableDomains": "Tên Miền Khả Dụng",
    "sidebar.yourTempAddress": "ĐỊA CHỈ TẠM THỜI",
    "sidebar.copy": "SAO CHÉP",
    "sidebar.random": "NGẪU NHIÊN",
    "sidebar.active": "ĐANG HOẠT ĐỘNG",
    "sidebar.total": "Tổng",
    "sidebar.unread": "Chưa Đọc",
    "sidebar.starred": "Đánh Dấu",
    "sidebar.myAddresses": "ĐỊA CHỈ CỦA TÔI",
    "sidebar.searchAddresses": "Tìm kiếm địa chỉ...",
    "sidebar.searchManage": "Tìm kiếm và quản lý địa chỉ email tạm thời",
    "sidebar.messages": "tin nhắn",
    "sidebar.close": "Đóng",
    "sidebar.adminPanel": "BẢNG ĐIỀU KHIỂN",
    "sidebar.loggedIn": "ĐÃ ĐĂNG NHẬP",
    "sidebar.expires": "Hết hạn",
    "sidebar.noMatches": "Không tìm thấy kết quả.",
    "sidebar.noHistory": "Chưa có lịch sử.",
    "sidebar.prev": "Trước",
    "sidebar.next": "Sau",
    "sidebar.page": "Trang",
    "sidebar.of": "của",
    "sidebar.creating": "ĐANG TẠO...",
    "sidebar.newIdentity": "TẠO MỚI",
    "sidebar.generateNew": "Tạo địa chỉ mới",
    "sidebar.enterUsername": "Nhập tên user...",

    // Inbox
    "inbox.searchEmails": "Tìm kiếm email...",
    "inbox.refresh": "Làm Mới",
    "inbox.selectEmail": "CHỌN MỘT EMAIL ĐỂ XEM NỘI DUNG",
    "inbox.clickEmail": "Nhấp vào email để đọc tin nhắn",
    "inbox.from": "Từ",
    "inbox.reply": "Trả Lời",
    "inbox.forward": "Chuyển Tiếp",
    "inbox.delete": "Xóa",
    "inbox.back": "Quay lại",
    "inbox.toMe": "tới: tôi",
    "inbox.star": "Gắn sao",
    "inbox.unstar": "Bỏ gắn sao",
    "inbox.noContent": "Không có nội dung",
    "inbox.noMessages": "Không có tin nhắn",
    "inbox.prev": "Trước",
    "inbox.next": "Sau",
    "inbox.page": "Trang",
    "inbox.of": "của",
    "inbox.confirmDelete": "Xóa tin nhắn này?",
    "inbox.selectMessage": "Chọn tin nhắn để đọc",

    // Notifications
    "notifications.title": "THÔNG BÁO",
    "notifications.markAllRead": "Đánh dấu tất cả đã đọc",
    "notifications.noNotifications": "Không có thông báo",

    // Misc
    "toast.copied": "Đã sao chép vào clipboard!",
    "toast.randomGenerated": "Đã tạo địa chỉ ngẫu nhiên mới!",

    // Language
    "language.select": "TIẾNG VIỆT",
    "language.vi": "Tiếng Việt",
    "language.en": "English",

    // Settings
    "settings.language": "Ngôn ngữ",
    "settings.theme": "Giao diện",

    // Auth
    "auth.login": "Đăng Nhập",
    "auth.register": "Đăng Ký",
    "auth.email": "Email",
    "auth.emailPlaceholder": "Nhập email của bạn",
    "auth.password": "Mật Khẩu",
    "auth.passwordPlaceholder": "Nhập mật khẩu",
    "auth.confirmPassword": "Xác Nhận Mật Khẩu",
    "auth.confirmPasswordPlaceholder": "Nhập lại mật khẩu",
    "auth.forgotPassword": "Quên mật khẩu?",
    "auth.loginButton": "Đăng Nhập",
    "auth.registerButton": "Tạo Tài Khoản",
    "auth.orContinueWith": "Hoặc tiếp tục với",
    "auth.backToHome": "Quay Lại",
    "auth.loginSuccess": "Đăng nhập thành công!",
    "auth.registerSuccess": "Tạo tài khoản thành công!",
    "auth.passwordMismatch": "Mật khẩu không khớp",
    "error.selectDomain": "Vui lòng chọn tên miền",
  },
  en: {
    // Header
    "header.inbox": "Inbox",
    "sidebar.create": "CREATE",
    "header.starred": "Starred",
    "header.apiDocs": "API Docs",
    "header.login": "Login",
    "header.register": "Register",
    "header.myEmails": "My Emails",
    "header.changePassword": "Change Password",
    "header.logout": "Logout",
    "header.anonymous": "ANON",
    "header.myApi": "My API",
    "header.admin": "ADMIN",

    // Sidebar
    "sidebar.availableDomains": "Available Domains",
    "sidebar.yourTempAddress": "YOUR TEMP ADDRESS",
    "sidebar.copy": "COPY",
    "sidebar.random": "RANDOM",
    "sidebar.active": "ACTIVE",
    "sidebar.total": "Total",
    "sidebar.unread": "Unread",
    "sidebar.starred": "Starred",
    "sidebar.myAddresses": "MY ADDRESSES",
    "sidebar.searchAddresses": "Search addresses...",
    "sidebar.searchManage": "Search and manage your temporary email addresses",
    "sidebar.messages": "messages",
    "sidebar.close": "Close",
    "sidebar.adminPanel": "ADMIN PANEL",
    "sidebar.loggedIn": "LOGGED IN",
    "sidebar.expires": "Expires",
    "sidebar.noMatches": "No matches found.",
    "sidebar.noHistory": "No history yet.",
    "sidebar.prev": "Prev",
    "sidebar.next": "Next",
    "sidebar.page": "Page",
    "sidebar.of": "of",
    "sidebar.creating": "CREATING...",
    "sidebar.newIdentity": "NEW IDENTITY",
    "sidebar.generateNew": "Generate New Address",
    "sidebar.enterUsername": "Enter username...",

    // Inbox
    "inbox.searchEmails": "Search emails...",
    "inbox.refresh": "Refresh",
    "inbox.selectEmail": "SELECT AN EMAIL TO VIEW",
    "inbox.clickEmail": "Click on an email to read the message",
    "inbox.from": "From",
    "inbox.reply": "Reply",
    "inbox.forward": "Forward",
    "inbox.delete": "Delete",
    "inbox.back": "Back",
    "inbox.toMe": "to: me",
    "inbox.star": "Star",
    "inbox.unstar": "Unstar",
    "inbox.noContent": "No content",
    "inbox.noMessages": "No messages",
    "inbox.prev": "Previous",
    "inbox.next": "Next",
    "inbox.page": "Page",
    "inbox.of": "of",
    "inbox.confirmDelete": "Delete this message?",
    "inbox.selectMessage": "Select a message to read",

    // Notifications
    "notifications.title": "NOTIFICATIONS",
    "notifications.markAllRead": "Mark all as read",
    "notifications.noNotifications": "No notifications",

    // Misc
    "toast.copied": "Address copied to clipboard!",
    "toast.randomGenerated": "New random address generated!",

    // Language
    "language.select": "ENGLISH",
    "language.vi": "Tiếng Việt",
    "language.en": "English",

    // Settings
    "settings.language": "Language",
    "settings.theme": "Theme",

    // Auth
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.emailPlaceholder": "Enter your email",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "Enter your password",
    "auth.confirmPassword": "Confirm Password",
    "auth.confirmPasswordPlaceholder": "Re-enter your password",
    "auth.forgotPassword": "Forgot password?",
    "auth.loginButton": "Sign In",
    "auth.registerButton": "Create Account",
    "auth.orContinueWith": "Or continue with",
    "auth.backToHome": "Go Back",
    "auth.loginSuccess": "Logged in successfully!",
    "auth.registerSuccess": "Account created successfully!",
    "auth.passwordMismatch": "Passwords do not match",
    "error.selectDomain": "Please select a domain",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("mailhub-language");
    return (saved as Language) || "vi";
  });

  useEffect(() => {
    localStorage.setItem("mailhub-language", language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
