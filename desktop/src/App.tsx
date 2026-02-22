import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContentHeader } from "@/components/content-header";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { ImageGrid } from "@/components/image-grid";
import { ImportQueue } from "@/components/import-queue";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import {
	loadSettings,
	SETTINGS_CHANGED_EVENT,
	type SearchSettings,
} from "@/settings";
import { api } from "./api";
import type { PhotographMeta } from "./api/types";

const emptyFilters: Filters = { camera: [], lens: [], iso: [] };

function App() {
	const [images, setImages] = useState<PhotographMeta[]>([]);
	const [selectedImage, setSelectedImage] = useState<PhotographMeta | null>(
		null,
	);
	const [search, setSearch] = useState("");
	const [filterOpen, setFilterOpen] = useState(false);
	const [filters, setFilters] = useState<Filters>(emptyFilters);
	const [settings, setSettings] = useState<SearchSettings>(loadSettings);
	const [activeNav, setActiveNav] = useState<"library" | "semantic">("library");
	const clearSelected = useCallback(() => setSelectedImage(null), []);
	const isSearchActive = search.trim().length > 0;

	const filterOptions = useMemo(() => {
		const cameras = new Set<string>();
		const lenses = new Set<string>();
		const isos = new Set<string>();
		for (const img of images) {
			const cam = [img.camera_maker, img.camera_model]
				.filter(Boolean)
				.join(" ");
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
			const cam = [img.camera_maker, img.camera_model]
				.filter(Boolean)
				.join(" ");
			const lens = [img.lens_maker, img.lens_model].filter(Boolean).join(" ");
			if (filters.camera.length > 0 && !filters.camera.includes(cam))
				return false;
			if (filters.lens.length > 0 && !filters.lens.includes(lens)) return false;
			if (filters.iso.length > 0 && !filters.iso.includes(img.iso))
				return false;
			return true;
		});
	}, [images, filters]);

	const activeFilterCount =
		filters.camera.length + filters.lens.length + filters.iso.length;

	const loadImages = useCallback(async () => {
		const all = await api.getAllImages();
		setImages(all);
	}, []);

	useEffect(() => {
		loadImages();
	}, [loadImages]);

	useEffect(() => {
		const unlisten = listen<SearchSettings>(SETTINGS_CHANGED_EVENT, (event) => {
			setSettings(event.payload);
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const query = search.trim();
		if (!query) {
			loadImages().catch(console.error);
			return;
		}

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			try {
				const results = await api.query_photograph(
					query,
					settings.queryLimit,
					settings.distanceThreshold,
				);
				setImages(results);
			} catch (e) {
				console.error("query_photograph failed:", e);
			}
		}, 600);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [search, settings, loadImages]);

	const handleScanProgress = useCallback(() => {
		loadImages();
	}, [loadImages]);

	const handlePickFolder = async () => {
		const selected = await open({ directory: true });
		if (selected) {
			await api.scanFolder(selected);
			await loadImages();
		}
	};

	return (
		<main className="h-screen flex bg-background">
			<Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
			<div className="relative flex-1 min-w-0 h-full flex flex-col overflow-hidden">
				<TopBar
					search={search}
					onSearchChange={setSearch}
					filterOpen={filterOpen}
					onFilterToggle={() => setFilterOpen((v) => !v)}
					activeFilterCount={activeFilterCount}
					onImport={handlePickFolder}
				/>
				<div className="flex-1 min-h-0 bg-card relative">
					<ContentHeader photoCount={filteredImages.length} />
					{filteredImages.length > 0 ? (
						<div className="h-[calc(100%-88px)]">
							<ImageGrid
								images={filteredImages}
								selected={selectedImage}
								onSelect={setSelectedImage}
								onClose={clearSelected}
								preserveSearchOrder={isSearchActive}
							/>
						</div>
					) : isSearchActive ? (
						<div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
							No results for &ldquo;{search}&rdquo;
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
							<p>No photos yet</p>
							<p className="text-xs">Click Import to add your first photos</p>
						</div>
					)}
					<div className="absolute bottom-4 right-4 w-[430px] z-50">
						<ImportQueue onScanProgress={handleScanProgress} />
					</div>
					<FilterPanel
						open={filterOpen}
						onClose={() => setFilterOpen(false)}
						filters={filters}
						onFiltersChange={setFilters}
						options={filterOptions}
					/>
				</div>
			</div>
		</main>
	);
}

export default App;
