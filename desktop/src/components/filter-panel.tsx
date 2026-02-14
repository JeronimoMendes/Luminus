import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
			<h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
				{title}
			</h3>
			<div className="flex flex-wrap gap-1.5">
				{options.map((opt) => {
					const active = selected.includes(opt);
					return (
						<button
							type="button"
							key={opt}
							onClick={() => onToggle(opt)}
							className={`rounded-lg px-2.5 py-1.5 text-xs border transition-colors ${
								active
									? "bg-warm-accent text-white border-warm-accent"
									: "bg-[#ece7dd] border-[#9b8f7f2e] text-foreground hover:bg-accent"
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

	const clearAll = () => onFiltersChange({ camera: [], lens: [], iso: [] });

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						className="fixed inset-0 z-30"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					/>
					{/* Panel */}
					<motion.div
						className="absolute top-2 right-4 z-40 w-80 bg-card border border-border rounded-[14px] shadow-xl flex flex-col max-h-[calc(100%-16px)]"
						initial={{ opacity: 0, y: -8, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.96 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
					>
						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-border">
							<span className="text-sm font-semibold text-foreground">
								Filters
							</span>
							<div className="flex items-center gap-2">
								{activeCount > 0 && (
									<button
										type="button"
										onClick={clearAll}
										className="text-xs text-warm-accent hover:underline"
									>
										Clear all
									</button>
								)}
								<Button variant="ghost" size="icon-xs" onClick={onClose}>
									<X className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>

						{/* Body */}
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

						{/* Footer */}
						{activeCount > 0 && (
							<div className="flex items-center gap-2 px-4 py-3 border-t border-border">
								<Button
									variant="ghost"
									size="sm"
									className="flex-1 rounded-lg"
									onClick={clearAll}
								>
									Reset
								</Button>
								<Button
									size="sm"
									className="flex-1 rounded-lg bg-warm-accent hover:bg-warm-accent/90 text-white"
									onClick={onClose}
								>
									Apply
								</Button>
							</div>
						)}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
