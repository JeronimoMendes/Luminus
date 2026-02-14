import { FolderPlus, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
	search: string;
	onSearchChange: (value: string) => void;
	filterOpen: boolean;
	onFilterToggle: () => void;
	activeFilterCount: number;
	onImport: () => void;
}

export function TopBar({
	search,
	onSearchChange,
	filterOpen,
	onFilterToggle,
	activeFilterCount,
	onImport,
}: TopBarProps) {
	return (
		<div className="h-16 shrink-0 flex items-center justify-between px-4 bg-[#f6f2ea] border-b border-[#d7d0c580]">
			{/* Left spacer */}
			<div className="w-32" />

			{/* Center search */}
			<div className="relative flex-1 max-w-[480px]">
				<Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search your photos with AI..."
					autoComplete="off"
					className="w-full rounded-2xl bg-[#F1ECE3] border border-[#D9D5CB] pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-warm-accent/30 transition-shadow"
				/>
			</div>

			{/* Right actions */}
			<div className="flex items-center gap-2 w-32 justify-end">
				<button
					type="button"
					onClick={onFilterToggle}
					className={`relative flex items-center justify-center h-9 w-9 rounded-xl border transition-colors ${
						filterOpen || activeFilterCount > 0
							? "bg-warm-accent text-white border-warm-accent"
							: "bg-[#ece7dd] border-[#9b8f7f2e] text-foreground hover:bg-accent"
					}`}
				>
					<SlidersHorizontal className="h-4 w-4" />
					{activeFilterCount > 0 && (
						<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warm-accent text-[10px] font-medium text-white">
							{activeFilterCount}
						</span>
					)}
				</button>
				<Button
					onClick={onImport}
					className="bg-warm-accent hover:bg-warm-accent/90 text-white rounded-xl gap-2 h-9 px-4"
				>
					<FolderPlus className="h-4 w-4" />
					Import
				</Button>
			</div>
		</div>
	);
}
