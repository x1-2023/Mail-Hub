import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-foreground relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="text-[20rem] font-black leading-none absolute -top-20 -left-20">404</div>
        <div className="text-[20rem] font-black leading-none absolute bottom-0 right-0">LOST</div>
      </div>

      <div className="z-10 text-center max-w-lg">
        <div className="brutalist-card bg-card border-4 border-black dark:border-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-center mb-6">
            <AlertTriangle className="w-24 h-24 text-primary animate-pulse" />
          </div>

          <h1 className="text-6xl font-black mb-2 tracking-tighter uppercase">404</h1>
          <h2 className="text-2xl font-bold mb-6 bg-primary text-primary-foreground inline-block px-2">
            PAGE NOT FOUND
          </h2>

          <p className="text-muted-foreground font-mono mb-8 text-lg">
            The coordinates you provided point to a void. Nothing exists here but silence and lost bits.
            <br />
            (Or maybe you usually don't have permission to be here?)
          </p>

          <Button
            onClick={() => navigate("/")}
            className="w-full h-14 text-lg font-bold uppercase tracking-wide border-2 border-black dark:border-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all bg-primary text-primary-foreground"
          >
            <ArrowLeft className="mr-2 w-6 h-6" />
            Escape back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
