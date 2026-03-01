import { convertFileSrc } from "@tauri-apps/api/core";
import { Pause, Play } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageGridProps {
	images: MediaItem[];
	selected: MediaItem | null;
	onSelect: (item: MediaItem) => void;
	onClose: () => void;
	preserveSearchOrder?: boolean;
}

/** Group sorted timestamps into continuous ranges (gap ≤ threshold). */
function groupFrameRanges(
	frames: number[],
	gap = 2,
): { start: number; end: number }[] {
	if (frames.length === 0) return [];
	const sorted = [...frames].sort((a, b) => a - b);
	const ranges: { start: number; end: number }[] = [];
	let start = sorted[0];
	let end = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] - end <= gap) {
			end = sorted[i];
		} else {
			ranges.push({ start, end });
			start = sorted[i];
			end = sorted[i];
		}
	}
	ranges.push({ start, end });
	return ranges;
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

function VideoModalPlayer({
	selected,
}: {
	selected: MediaItem & { type: "video" };
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isPlaying, setIsPlaying] = useState(true);
	const [isDragging, setIsDragging] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

	const frames = selected.matching_frames;
	const hasFrames = frames && frames.length > 0 && duration > 0;

	const seekTo = useCallback(
		(time: number) => {
			if (videoRef.current) {
				videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
			}
		},
		[duration],
	);

	const computeTimeFromX = useCallback(
		(clientX: number) => {
			const track = trackRef.current;
			if (!track || duration === 0) return 0;
			const rect = track.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (clientX - rect.left) / rect.width),
			);
			return ratio * duration;
		},
		[duration],
	);

	const togglePlay = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		if (v.paused) v.play();
		else v.pause();
	}, []);

	// Drag handlers
	useEffect(() => {
		if (!isDragging) return;
		const onMove = (e: MouseEvent) => {
			seekTo(computeTimeFromX(e.clientX));
		};
		const onUp = () => setIsDragging(false);
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [isDragging, seekTo, computeTimeFromX]);

	// Auto-hide controls
	const resetHideTimer = useCallback(() => {
		setShowControls(true);
		clearTimeout(hideTimeout.current);
		hideTimeout.current = setTimeout(() => {
			if (videoRef.current && !videoRef.current.paused) {
				setShowControls(false);
			}
		}, 2500);
	}, []);

	useEffect(() => {
		return () => clearTimeout(hideTimeout.current);
	}, []);

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div
			className="flex flex-col items-center"
			onClick={(e) => e.stopPropagation()}
			onMouseMove={resetHideTimer}
		>
			<motion.video
				ref={videoRef}
				autoPlay
				preload="auto"
				src={convertFileSrc(selected.path)}
				onLoadedMetadata={() => {
					if (videoRef.current) setDuration(videoRef.current.duration);
				}}
				onTimeUpdate={() => {
					if (videoRef.current && !isDragging)
						setCurrentTime(videoRef.current.currentTime);
				}}
				onPlay={() => setIsPlaying(true)}
				onPause={() => {
					setIsPlaying(false);
					setShowControls(true);
				}}
				onEnded={() => {
					setIsPlaying(false);
					setShowControls(true);
				}}
				onClick={togglePlay}
				className="max-h-[75vh] max-w-[90vw] rounded-t-lg cursor-pointer"
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.95 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
			/>

			{/* Custom controls */}
			<div
				className={`w-full max-w-[90vw] bg-black/60 backdrop-blur-sm rounded-b-lg px-3 py-2 flex items-center gap-3 transition-opacity duration-200 ${
					showControls || !isPlaying ? "opacity-100" : "opacity-0"
				}`}
			>
				<button
					type="button"
					onClick={togglePlay}
					className="text-white hover:text-white/80 shrink-0"
				>
					{isPlaying ? <Pause size={18} /> : <Play size={18} />}
				</button>

				<span className="text-xs text-white tabular-nums shrink-0">
					{formatDuration(currentTime)} / {formatDuration(duration)}
				</span>

				{/* Scrubber track */}
				<div
					ref={trackRef}
					className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group"
					onMouseDown={(e) => {
						setIsDragging(true);
						seekTo(computeTimeFromX(e.clientX));
					}}
				>
					{/* Progress fill */}
					<div
						className="absolute inset-y-0 left-0 bg-white/60 rounded-full pointer-events-none"
						style={{ width: `${progress}%` }}
					/>

					{/* Thumb */}
					<div
						className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
						style={{ left: `${progress}%` }}
					/>

					{/* Markers — continuous ranges */}
					{hasFrames &&
						groupFrameRanges(frames).map((range) => {
							const leftPct = (range.start / duration) * 100;
							const widthPct = Math.max(
								0.5,
								((range.end - range.start) / duration) * 100,
							);
							return (
								<button
									key={range.start}
									type="button"
									className="absolute top-1/2 -translate-y-1/2 h-2 bg-amber-400 hover:bg-amber-300 rounded-sm cursor-pointer border-0 p-0 opacity-50"
									style={{
										left: `${leftPct}%`,
										width: `${widthPct}%`,
										minWidth: "4px",
									}}
									onClick={(e) => {
										e.stopPropagation();
										seekTo(range.start);
									}}
									title={
										range.start === range.end
											? formatDuration(range.start)
											: `${formatDuration(range.start)} - ${formatDuration(range.end)}`
									}
								/>
							);
						})}
				</div>
			</div>
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
							<VideoModalPlayer selected={selected} />
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
