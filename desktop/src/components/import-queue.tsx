import { listen } from "@tauri-apps/api/event";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ScanStarted {
	totalImages: number;
}

interface ScanUpdate {
	currentBatch: number;
	totalBatches: number;
	imagesScanned: number;
	imagesToScan: number;
}

interface ScanState {
	active: boolean;
	totalImages: number;
	currentBatch: number;
	totalBatches: number;
	imagesScanned: number;
	imagesToScan: number;
}

const initialState: ScanState = {
	active: false,
	totalImages: 0,
	currentBatch: 0,
	totalBatches: 0,
	imagesScanned: 0,
	imagesToScan: 0,
};

interface ImportQueueProps {
	onScanProgress?: () => void;
}

export function ImportQueue({ onScanProgress }: ImportQueueProps) {
	const [state, setState] = useState<ScanState>(initialState);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const unlistenStarted = listen<ScanStarted>("scan-started", (e) => {
			setState({
				active: true,
				totalImages: e.payload.totalImages,
				currentBatch: 0,
				totalBatches: 0,
				imagesScanned: 0,
				imagesToScan: e.payload.totalImages,
			});
			setCollapsed(false);
		});

		const unlistenUpdate = listen<ScanUpdate>("scan-update", (e) => {
			setState((prev) => ({
				...prev,
				currentBatch: e.payload.currentBatch,
				totalBatches: e.payload.totalBatches,
				imagesScanned: e.payload.imagesScanned,
				imagesToScan: e.payload.imagesToScan,
			}));
		});

		return () => {
			unlistenStarted.then((fn) => fn());
			unlistenUpdate.then((fn) => fn());
		};
	}, []);

	// Notify parent whenever progress updates
	useEffect(() => {
		if (state.imagesScanned > 0) {
			onScanProgress?.();
		}
	}, [state.imagesScanned, onScanProgress]);

	const {
		imagesScanned,
		totalImages,
		currentBatch,
		totalBatches,
		imagesToScan,
	} = state;
	const progressPct = totalImages > 0 ? (imagesScanned / totalImages) * 100 : 0;
	const isDone = imagesScanned === totalImages && totalImages > 0;

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
						{imagesToScan} left
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
							{totalImages} files
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
					All {totalImages} files imported successfully
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
	if (imagesScanned > 0) summaryParts.push(`${imagesScanned} loaded`);
	if (totalBatches > 0)
		summaryParts.push(`batch ${currentBatch}/${totalBatches}`);
	const summaryText = summaryParts.join(" — ");

	return (
		<div className="rounded-[14px] bg-white border border-[#E5E3DD] p-3 w-full shadow-[0_10px_24px_rgba(0,0,0,0.12)] flex flex-col gap-2.5">
			<div className="flex items-center justify-between w-full">
				<span className="text-sm font-semibold text-[#1F1D19]">
					Importing Photos
				</span>
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-semibold text-[#7B7569]">
						{totalImages} files
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

			{currentBatch > 0 && currentBatch < totalBatches && (
				<div className="flex items-center justify-between w-full">
					<span className="text-xs font-semibold text-[#1F1D19]">
						Processing batch {currentBatch + 1} of {totalBatches}
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

			{imagesToScan > 0 && (
				<span className="text-[11px] font-medium text-[#7B7569]">
					{imagesToScan} files remaining
				</span>
			)}

			<span className="text-[10px] font-medium text-[#8C857A]">
				Processing continues in background while you browse
			</span>
		</div>
	);
}
