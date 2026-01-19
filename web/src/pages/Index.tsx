import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { InboxContent } from "@/components/InboxContent";
import { TempAddressCard } from "@/components/TempAddressCard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <LeftSidebar />
          <div className="flex-1 space-y-4">
            {/* Temp Address Card - Only show on mobile/tablet */}
            <TempAddressCard className="lg:hidden" />
            <InboxContent />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
