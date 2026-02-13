import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { ImageGrid } from "@/components/image-grid";
import { Sidebar } from "@/components/sidebar";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { loadSettings, SETTINGS_CHANGED_EVENT, type SearchSettings } from "@/settings";
import { api } from "./api";
import type { PhotographMeta } from "./api/types";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { SlidersHorizontal, Sparkles } from "lucide-react";

const emptyFilters: Filters = { camera: [], lens: [], iso: [] };

function App() {
  const [images, setImages] = useState<PhotographMeta[]>([]);
  const [selectedImage, setSelectedImage] = useState<PhotographMeta | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [settings, setSettings] = useState<SearchSettings>(loadSettings);
  const clearSelected = useCallback(() => setSelectedImage(null), []);

  const filterOptions = useMemo(() => {
    const cameras = new Set<string>();
    const lenses = new Set<string>();
    const isos = new Set<string>();
    for (const img of images) {
      const cam = [img.camera_maker, img.camera_model].filter(Boolean).join(" ");
      if (cam) cameras.add(cam);
      const lens = [img.lens_maker, img.lens_model].filter(Boolean).join(" ");
      if (lens) lenses.add(lens);
      if (img.iso) isos.add(img.iso);
    }
    return {
      cameras: [...cameras].sort(),
      lenses: [...lenses].sort(),
      isos: [...isos].sort((a, b) => Number(a) - Number(b)),
    };
  }, [images]);

  const filteredImages = useMemo(() => {
    const hasFilters =
      filters.camera.length > 0 ||
      filters.lens.length > 0 ||
      filters.iso.length > 0;
    if (!hasFilters) return images;
    return images.filter((img) => {
      const cam = [img.camera_maker, img.camera_model].filter(Boolean).join(" ");
      const lens = [img.lens_maker, img.lens_model].filter(Boolean).join(" ");
      if (filters.camera.length > 0 && !filters.camera.includes(cam)) return false;
      if (filters.lens.length > 0 && !filters.lens.includes(lens)) return false;
      if (filters.iso.length > 0 && !filters.iso.includes(img.iso)) return false;
      return true;
    });
  }, [images, filters]);

  const activeFilterCount =
    filters.camera.length + filters.lens.length + filters.iso.length;

  const loadImages = async () => {
    const all = await api.getAllImages();
    setImages(all);
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    const unlisten = listen<SearchSettings>(SETTINGS_CHANGED_EVENT, (event) => {
      setSettings(event.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!search.trim()) {
      loadImages().catch(console.error);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.query_photograph(search.trim(), settings.queryLimit, settings.distanceThreshold);
        setImages(results);
      } catch (e) {
        console.error("query_photograph failed:", e);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, settings]);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      await api.scanFolder(selected);
      await loadImages();
    }
  };

  return (
    <main className="h-screen flex bg-background">
      <Sidebar images={images} onImport={handlePickFolder} onSelectImage={setSelectedImage} />
      <div className="relative flex-1 min-w-0 h-full overflow-hidden">
        <motion.div
          className="absolute top-3 left-1/2 z-10 flex items-center gap-2"
          initial={{ opacity: 0, y: -10, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="relative group">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300 z-10 pointer-events-none" />
            <motion.input
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search"
              autoComplete="off"
              className="rounded-full border border-border bg-background/80 backdrop-blur-md pl-9 pr-4 py-1.5 text-sm shadow-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              initial={{ width: "12rem" }}
              whileFocus={{ width: "18rem" }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          </div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`relative flex items-center justify-center h-8 w-8 rounded-full border shadow-lg backdrop-blur-md transition-colors ${
              filterOpen || activeFilterCount > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 border-border text-foreground hover:bg-accent"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </motion.div>
        {filteredImages.length > 0 ? (
          <>
            <ImageGrid
              images={filteredImages}
              selected={selectedImage}
              onSelect={setSelectedImage}
              onClose={clearSelected}
            />
            <FilterPanel
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              filters={filters}
              onFiltersChange={setFilters}
              options={filterOptions}
            />
          </>
        ) : search.trim() ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No results for "{search}"
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default App;
