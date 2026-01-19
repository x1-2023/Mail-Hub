import { Settings, Check, Palette, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, Theme, getThemeName } from "@/contexts/ThemeContext";

const themes: Theme[] = ["lavender", "hacker", "paper", "ocean", "popart"];

export const SettingsDropdown = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="brutalist-button shadow-none bg-card hover:bg-muted p-2">
          <Settings className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="brutalist-card bg-card min-w-[200px]">
        {/* Language Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Languages className="w-4 h-4" />
          {t("settings.language")}
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => setLanguage("vi")}
          className="font-semibold cursor-pointer flex items-center justify-between"
        >
          {t("language.vi")}
          {language === "vi" && <Check className="w-4 h-4 text-accent" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className="font-semibold cursor-pointer flex items-center justify-between"
        >
          {t("language.en")}
          {language === "en" && <Check className="w-4 h-4 text-accent" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Palette className="w-4 h-4" />
          {t("settings.theme")}
        </DropdownMenuLabel>
        {themes.map((t) => (
          <DropdownMenuItem 
            key={t}
            onClick={() => setTheme(t)}
            className="font-semibold cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full border border-border theme-preview-${t}`} />
              {getThemeName(t, language)}
            </span>
            {theme === t && <Check className="w-4 h-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
