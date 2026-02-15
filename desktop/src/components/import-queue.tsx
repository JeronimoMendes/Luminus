import { listen } from "@tauri-apps/api/event";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PhotographMeta } from "@/api/types";

interface ScanStarted {
	totalImages: number;
}

interface ScanUpdate {
	currentImagePath: string;
	imagesScanned: PhotographMeta[];
	imagesToScan: PhotographMeta[];
}

interface ScanState {
	active: boolean;
	totalImages: number;
	currentImagePath: string;
	scanned: PhotographMeta[];
	remaining: PhotographMeta[];
}

const initialState: ScanState = {
	active: false,
	totalImages: 0,
	currentImagePath: "",
	scanned: [],
	remaining: [],
};

function filenameFromPath(path: string) {
	return path.split(/[/\\]/).pop() ?? path;
}

interface ImportQueueProps {
	onScanProgress?: (scanned: PhotographMeta[]) => void;
}

export function ImportQueue({ onScanProgress }: ImportQueueProps) {
	const [state, setState] = useState<ScanState>(initialState);
	const [collapsed, setCollapsed] = useState(false);
	const prevScannedCount = useRef(0);

	useEffect(() => {
		const unlistenStarted = listen<ScanStarted>("scan-started", (e) => {
			setState({
				active: true,
				totalImages: e.payload.totalImages,
				currentImagePath: "",
				scanned: [],
				remaining: [],
			});
			setCollapsed(false);
			prevScannedCount.current = 0;
		});

		const unlistenUpdate = listen<ScanUpdate>("scan-update", (e) => {
			setState((prev) => ({
				...prev,
				currentImagePath: e.payload.currentImagePath,
				scanned: e.payload.imagesScanned,
				remaining: e.payload.imagesToScan,
			}));
		});

		return () => {
			unlistenStarted.then((fn) => fn());
			unlistenUpdate.then((fn) => fn());
		};
	}, []);

	// Notify parent with completed photos whenever a new one finishes
	useEffect(() => {
		if (state.scanned.length > prevScannedCount.current) {
			prevScannedCount.current = state.scanned.length;
			onScanProgress?.(state.scanned);
		}
	}, [state.scanned, onScanProgress]);

	const scannedCount = state.scanned.length;
	const remainingCount = state.remaining.length;
	const processingCount = state.currentImagePath ? 1 : 0;
	const queuedCount = Math.max(0, remainingCount - processingCount);
	const totalFiles = state.totalImages;
	const progressPct =
		totalFiles > 0 ? ((scannedCount + processingCount) / totalFiles) * 100 : 0;

	const lastLoaded =
		state.scanned.length > 0 ? state.scanned[state.scanned.length - 1] : null;

	const isDone = scannedCount === totalFiles && totalFiles > 0;

	const dismiss = () => setState(initialState);

	if (!state.active) return null;

	// --- Collapsed Complete ---
	if (collapsed && isDone) {
		return (
			<button
				type="button"
				className="flex items-center justify-between rounded-[14px] bg-white border border-[#E5E3DD] px-3 h-11 w-full shadow-[0_8px_18px_rgba(0,0,0,0.1)] cursor-pointer"
				onClick={() => setCollapsed(false)}
			>
				<span className="text-xs font-semibold text-[#1F1D19]">
					All Photos Imported
				</span>
				<div className="flex items-center gap-2">
					<ChevronUp className="w-3 h-3 text-[#6F695E]" />
					<button
						type="button"
						className="w-5 h-5 rounded-[10px] bg-[#F3F1EC] flex items-center justify-center"
						onClick={(e) => {
							e.stopPropagation();
							dismiss();
						}}
					>
						<X className="w-3 h-3 text-[#6F695E]" />
					</button>
				</div>
			</button>
		);
	}

	// --- Collapsed In-Progress ---
	if (collapsed) {
		return (
			<button
				type="button"
				className="flex items-center justify-between rounded-[14px] bg-white border border-[#E5E3DD] px-3 h-11 w-full shadow-[0_8px_18px_rgba(0,0,0,0.1)] cursor-pointer"
				onClick={() => setCollapsed(false)}
			>
				<span className="text-xs font-semibold text-[#1F1D19]">
					Importing Photos
				</span>
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-semibold text-[#7B7569]">
						{queuedCount + processingCount} left
					</span>
					<ChevronUp className="w-3 h-3 text-[#6F695E]" />
				</div>
			</button>
		);
	}

	// --- Expanded Complete ---
	if (isDone) {
		return (
			<div className="rounded-[14px] bg-white border border-[#E5E3DD] p-3 w-full shadow-[0_10px_24px_rgba(0,0,0,0.12)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between w-full">
					<span className="text-sm font-semibold text-[#1F1D19]">
						All Photos Imported
					</span>
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-semibold text-[#7B7569]">
							{totalFiles} files
						</span>
						<button
							type="button"
							className="w-5 h-5 rounded-[10px] bg-[#F3F1EC] flex items-center justify-center"
							onClick={() => setCollapsed(true)}
						>
							<ChevronDown className="w-3 h-3 text-[#6F695E]" />
						</button>
						<button
							type="button"
							className="w-5 h-5 rounded-[10px] bg-[#F3F1EC] flex items-center justify-center"
							onClick={dismiss}
						>
							<X className="w-3 h-3 text-[#6F695E]" />
						</button>
					</div>
				</div>

				<span className="text-[11px] font-medium text-[#7B7569]">
					All {totalFiles} files imported successfully
				</span>

				<span className="text-xs font-semibold text-[#2B8A57]">
					Ready to review and edit
				</span>

				{/* Full green progress bar */}
				<div className="w-full h-1 rounded-full bg-[#E8E4DB]">
					<div className="h-full rounded-full bg-[#2B8A57] w-full" />
				</div>

				<span className="text-[11px] font-medium text-[#7B7569]">
					No files queued
				</span>

				<span className="text-[10px] font-medium text-[#8C857A]">
					You can close this panel when done
				</span>
			</div>
		);
	}

	// --- Expanded In-Progress ---
	const summaryParts: string[] = [];
	if (scannedCount > 0) summaryParts.push(`${scannedCount} loaded`);
	if (processingCount > 0) summaryParts.push(`${processingCount} processing`);
	if (queuedCount > 0) summaryParts.push(`${queuedCount} queued`);
	const summaryText = summaryParts.join(" - ");

	return (
		<div className="rounded-[14px] bg-white border border-[#E5E3DD] p-3 w-full shadow-[0_10px_24px_rgba(0,0,0,0.12)] flex flex-col gap-2.5">
			<div className="flex items-center justify-between w-full">
				<span className="text-sm font-semibold text-[#1F1D19]">
					Importing Photos
				</span>
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-semibold text-[#7B7569]">
						{totalFiles} files
					</span>
					<button
						type="button"
						className="w-5 h-5 rounded-[10px] bg-[#F3F1EC] flex items-center justify-center"
						onClick={() => setCollapsed(true)}
					>
						<ChevronDown className="w-3 h-3 text-[#6F695E]" />
					</button>
				</div>
			</div>

			<span className="text-[11px] font-medium text-[#7B7569]">
				{summaryText}
			</span>

			{lastLoaded && (
				<span className="text-xs font-semibold text-[#2B8A57]">
					Loaded: {filenameFromPath(lastLoaded.path)}
				</span>
			)}

			{state.currentImagePath && (
				<div className="flex items-center justify-between w-full">
					<span className="text-xs font-semibold text-[#1F1D19]">
						Processing: {filenameFromPath(state.currentImagePath)}
					</span>
					<span className="text-[11px] font-semibold text-[#7B7569]">
						{Math.round(progressPct)}%
					</span>
				</div>
			)}

			<div className="w-full h-1 rounded-full bg-[#E8E4DB]">
				<div
					className="h-full rounded-full bg-[#D4845A] transition-all duration-300"
					style={{ width: `${Math.min(progressPct, 100)}%` }}
				/>
			</div>

			{queuedCount > 0 && (
				<span className="text-[11px] font-medium text-[#7B7569]">
					Queued: {queuedCount} files waiting to process
				</span>
			)}

			<span className="text-[10px] font-medium text-[#8C857A]">
				Uploads continue in background while you browse
			</span>
		</div>
	);
}
