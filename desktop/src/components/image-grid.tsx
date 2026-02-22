import { convertFileSrc } from "@tauri-apps/api/core";
import { Play } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { MediaItem } from "@/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageGridProps {
	images: MediaItem[];
	selected: MediaItem | null;
	onSelect: (item: MediaItem) => void;
	onClose: () => void;
	preserveSearchOrder?: boolean;
}

function formatDuration(secs: number): string {
	const m = Math.floor(secs / 60);
	const s = Math.floor(secs % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function groupByDate(
	items: MediaItem[],
): { label: string; date: string; items: MediaItem[] }[] {
	const groups = new Map<string, MediaItem[]>();

	for (const item of items) {
		const dateKey = item.datetime
			? item.datetime.split(/[T ]/)[0] || "Unknown"
			: "Unknown";
		const existing = groups.get(dateKey);
		if (existing) {
			existing.push(item);
		} else {
			groups.set(dateKey, [item]);
		}
	}

	const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));

	return sorted.map(([dateKey, imgs]) => {
		let label = dateKey;
		if (dateKey !== "Unknown") {
			try {
				const d = new Date(`${dateKey}T00:00:00`);
				if (!Number.isNaN(d.getTime())) {
					label = d.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					});
				}
			} catch {
				/* keep raw key */
			}
		}
		return { label, date: dateKey, items: imgs };
	});
}

function MediaCard({
	item,
	onClick,
}: {
	item: MediaItem;
	onClick: () => void;
}) {
	const [hovered, setHovered] = useState(false);

	const width = item.width;
	const height = item.height;
	const aspectRatio = width && height ? `${width}/${height}` : "3/2";

	if (item.type === "video") {
		const thumbSrc = item.thumbnail_path
			? convertFileSrc(item.thumbnail_path)
			: null;

		return (
			<div
				className="relative h-[198px] shrink-0 cursor-pointer overflow-hidden rounded-[14px] bg-muted"
				style={{ aspectRatio }}
				onClick={onClick}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
				{thumbSrc ? (
					<img
						src={thumbSrc}
						alt={item.filename}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="h-full w-full bg-muted flex items-center justify-center">
						<Play className="w-8 h-8 text-muted-foreground" />
					</div>
				)}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="bg-black/40 rounded-full p-2">
						<Play className="w-5 h-5 text-white fill-white" />
					</div>
				</div>
				{item.duration_secs != null && (
					<div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
						{formatDuration(item.duration_secs)}
					</div>
				)}
				{hovered && (
					<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent flex items-end px-3 pb-2">
						<span className="text-white text-xs font-medium truncate">
							{item.filename}
						</span>
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className="relative h-[198px] shrink-0 cursor-pointer overflow-hidden rounded-[14px] bg-muted"
			style={{ aspectRatio }}
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<motion.img
				layoutId={item.path}
				src={convertFileSrc(item.path)}
				alt={item.filename}
				className="h-full w-full object-cover"
				loading="lazy"
			/>
			{hovered && (
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent flex items-end px-3 pb-2">
					<span className="text-white text-xs font-medium truncate">
						{item.filename}
					</span>
				</div>
			)}
		</div>
	);
}

export function ImageGrid({
	images,
	selected,
	onSelect,
	onClose,
	preserveSearchOrder = false,
}: ImageGridProps) {
	const groups = useMemo(
		() => (preserveSearchOrder ? [] : groupByDate(images)),
		[images, preserveSearchOrder],
	);

	useEffect(() => {
		if (!selected) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [selected, onClose]);

	return (
		<LayoutGroup>
			<div
				className={`h-full ${selected ? "blur-sm transition-all" : "transition-all"}`}
			>
				<ScrollArea className="h-full w-full">
					{preserveSearchOrder ? (
						<div className="px-8 pb-8">
							<div className="flex flex-wrap gap-2">
								{images.map((item) => (
									<MediaCard
										key={item.path}
										item={item}
										onClick={() => onSelect(item)}
									/>
								))}
							</div>
						</div>
					) : (
						<div className="px-8 pb-8 space-y-6">
							{groups.map((group) => (
								<div key={group.date}>
									<h3 className="text-[13px] font-semibold text-muted-foreground mb-3">
										{group.label}
									</h3>
									<div className="flex flex-wrap gap-2">
										{group.items.map((item) => (
											<MediaCard
												key={item.path}
												item={item}
												onClick={() => onSelect(item)}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</div>

			<AnimatePresence>
				{selected && (
					<motion.div
						className="fixed inset-0 z-50 flex flex-col items-center justify-center"
						onClick={onClose}
						initial={{ backgroundColor: "rgba(0,0,0,0)" }}
						animate={{ backgroundColor: "rgba(0,0,0,0.6)" }}
						exit={{ backgroundColor: "rgba(0,0,0,0)" }}
						transition={{ duration: 0.3 }}
					>
						{selected.type === "video" ? (
							<motion.video
								controls
								autoPlay
								preload="auto"
								src={convertFileSrc(selected.path)}
								className="max-h-[80vh] max-w-[90vw] rounded-lg"
								onClick={(e) => e.stopPropagation()}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ type: "spring", stiffness: 300, damping: 30 }}
							/>
						) : (
							<motion.img
								layoutId={selected.path}
								src={convertFileSrc(selected.path)}
								alt={selected.filename}
								className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
								onClick={(e) => e.stopPropagation()}
								transition={{ type: "spring", stiffness: 300, damping: 30 }}
							/>
						)}
						<motion.div
							className="mt-4 text-center text-white"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							transition={{ delay: 0.15, duration: 0.25 }}
							onClick={(e) => e.stopPropagation()}
						>
							<p className="text-sm font-semibold">{selected.filename}</p>
							{selected.width && selected.height && (
								<p className="text-xs text-white/60">
									{selected.width}×{selected.height}
								</p>
							)}
							{selected.type === "image" &&
								(selected.camera_model || selected.lens_model) && (
									<p className="text-xs text-white/60">
										{[selected.camera_model, selected.lens_model]
											.filter(Boolean)
											.join(" · ")}
									</p>
								)}
							{selected.type === "image" &&
								(selected.aperture || selected.iso || selected.exposure) && (
									<p className="text-xs text-white/60">
										{[
											selected.aperture && `f/${selected.aperture}`,
											selected.iso && `ISO ${selected.iso}`,
											selected.exposure && `${selected.exposure}s`,
										]
											.filter(Boolean)
											.join(" · ")}
									</p>
								)}
							{selected.type === "video" && selected.duration_secs != null && (
								<p className="text-xs text-white/60">
									{formatDuration(selected.duration_secs)}
									{selected.video_codec && ` · ${selected.video_codec}`}
								</p>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</LayoutGroup>
	);
}
