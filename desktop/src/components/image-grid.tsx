import { convertFileSrc } from "@tauri-apps/api/core";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { PhotographMeta } from "@/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageGridProps {
	images: PhotographMeta[];
	selected: PhotographMeta | null;
	onSelect: (img: PhotographMeta) => void;
	onClose: () => void;
	preserveSearchOrder?: boolean;
}

function groupByDate(
	images: PhotographMeta[],
): { label: string; date: string; images: PhotographMeta[] }[] {
	const groups = new Map<string, PhotographMeta[]>();

	for (const img of images) {
		const dateKey = img.datetime
			? img.datetime.split(/[T ]/)[0] || "Unknown"
			: "Unknown";
		const existing = groups.get(dateKey);
		if (existing) {
			existing.push(img);
		} else {
			groups.set(dateKey, [img]);
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
		return { label, date: dateKey, images: imgs };
	});
}

function PhotoCard({
	img,
	onClick,
}: {
	img: PhotographMeta;
	onClick: () => void;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<div
			className="relative h-[198px] shrink-0 cursor-pointer overflow-hidden rounded-[14px] bg-muted"
			style={{
				aspectRatio:
					img.width && img.height ? `${img.width}/${img.height}` : "3/2",
			}}
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<motion.img
				layoutId={img.path}
				src={convertFileSrc(img.path)}
				alt={img.filename}
				className="h-full w-full object-cover"
				loading="lazy"
			/>
			{hovered && (
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent flex items-end px-3 pb-2">
					<span className="text-white text-xs font-medium truncate">
						{img.filename}
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
								{images.map((img) => (
									<PhotoCard
										key={img.path}
										img={img}
										onClick={() => onSelect(img)}
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
										{group.images.map((img) => (
											<PhotoCard
												key={img.path}
												img={img}
												onClick={() => onSelect(img)}
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
						<motion.img
							layoutId={selected.path}
							src={convertFileSrc(selected.path)}
							alt={selected.filename}
							className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
							onClick={(e) => e.stopPropagation()}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
						/>
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
							{(selected.camera_model || selected.lens_model) && (
								<p className="text-xs text-white/60">
									{[selected.camera_model, selected.lens_model]
										.filter(Boolean)
										.join(" · ")}
								</p>
							)}
							{(selected.aperture || selected.iso || selected.exposure) && (
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
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</LayoutGroup>
	);
}
