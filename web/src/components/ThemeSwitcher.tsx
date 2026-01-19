
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
    { name: "Lavender", value: "lavender", color: "bg-purple-300" },
    { name: "Hacker", value: "hacker", color: "bg-green-500" },
    { name: "Ocean", value: "ocean", color: "bg-blue-400" },
    { name: "Brutalist", value: "popart", color: "bg-yellow-400" },
];

export function ThemeSwitcher() {
    const [, setTheme] = useState("lavender");

    useEffect(() => {
        const savedTheme = localStorage.getItem("mh_theme") || "lavender";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
    }, []);

    const changeTheme = (newTheme: string) => {
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("mh_theme", newTheme);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-[2px_2px_0px_rgba(0,0,0,1)] z-50">
                    <Palette className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
                {themes.map((t) => (
                    <DropdownMenuItem key={t.value} onClick={() => changeTheme(t.value)}>
                        <div className={`w-3 h-3 rounded-full mr-2 ${t.color}`} />
                        {t.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
