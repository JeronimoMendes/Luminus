import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Filters {
  camera: string[];
  lens: string[];
  iso: string[];
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  options: {
    cameras: string[];
    lenses: string[];
    isos: string[];
  };
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:bg-accent"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPanel({
  open,
  onClose,
  filters,
  onFiltersChange,
  options,
}: FilterPanelProps) {
  const activeCount =
    filters.camera.length + filters.lens.length + filters.iso.length;

  const toggle = (key: keyof Filters, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const clearAll = () =>
    onFiltersChange({ camera: [], lens: [], iso: [] });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute top-0 right-0 z-20 h-full w-72 border-l border-border bg-background/95 backdrop-blur-md shadow-xl flex flex-col"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Filters</span>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-5">
              <FilterSection
                title="Camera"
                options={options.cameras}
                selected={filters.camera}
                onToggle={(v) => toggle("camera", v)}
              />
              <FilterSection
                title="Lens"
                options={options.lenses}
                selected={filters.lens}
                onToggle={(v) => toggle("lens", v)}
              />
              <FilterSection
                title="ISO"
                options={options.isos}
                selected={filters.iso}
                onToggle={(v) => toggle("iso", v)}
              />
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
