import { useEffect } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("mh_token");
    if (!token) {
      navigate("/auth");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b-4 border-black dark:border-white pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase mb-2">Admin Panel</h1>
            <p className="text-muted-foreground uppercase text-sm tracking-wider font-bold">
              MailHub System Management
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                window.location.href = "/";
              }}
              className="font-bold border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <Home className="mr-2 h-4 w-4" />
              EXIT TO HOME
            </Button>
          </div>
        </div>

        {/* Tab System */}
        <AdminTabs />
      </div>
    </div>
  );
};

export default Admin;
