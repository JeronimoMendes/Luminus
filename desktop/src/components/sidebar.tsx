import { HardDrive, ImageIcon, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = "library" | "semantic";

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-lg transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : disabled
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <div className="w-64 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img src="/orb.png" alt="Luminus" className="h-7 w-7 rounded-full" />
        <span className="text-[15px] font-semibold text-sidebar-foreground tracking-tight">Luminus</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-4 pb-4">
          {/* Search section */}
          <div>
            <SectionLabel>Search</SectionLabel>
            <div className="space-y-0.5">
              <NavButton
                icon={ImageIcon}
                label="Library"
                active={activeNav === "library"}
                onClick={() => onNavChange("library")}
              />
            </div>
          </div>

          {/* Projects section */}
          <div>
            <SectionLabel>Projects</SectionLabel>
            <div className="space-y-0.5">
              <NavButton icon={Plus} label="New Project" disabled />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-sidebar-foreground truncate">Local Storage</p>
          <p className="text-[11px] text-muted-foreground truncate">On this device</p>
        </div>
      </div>
    </div>
  );
}
