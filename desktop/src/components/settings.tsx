import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { loadSettings, persistSettings, type SearchSettings } from "@/settings";

interface DraftSettings {
	distanceThreshold: string;
	queryLimit: string;
}

function toDraft(s: SearchSettings): DraftSettings {
	return {
		distanceThreshold: String(s.distanceThreshold),
		queryLimit: String(s.queryLimit),
	};
}

function fromDraft(d: DraftSettings): SearchSettings | null {
	const dist = parseFloat(d.distanceThreshold);
	const limit = parseInt(d.queryLimit);
	if (isNaN(dist) || dist <= 0 || isNaN(limit) || limit < 1) return null;
	return { distanceThreshold: dist, queryLimit: limit };
}

export function SettingsPage() {
	const [saved, setSaved] = useState<SearchSettings>(loadSettings);
	const [draft, setDraft] = useState<DraftSettings>(() =>
		toDraft(loadSettings()),
	);

	const parsed = fromDraft(draft);
	const hasChanges =
		parsed !== null &&
		(parsed.distanceThreshold !== saved.distanceThreshold ||
			parsed.queryLimit !== saved.queryLimit);

	const [showCheck, setShowCheck] = useState(false);
	const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (checkTimer.current) clearTimeout(checkTimer.current);
		};
	}, []);

	const handleSave = () => {
		if (!parsed || !hasChanges) return;
		setSaved(parsed);
		persistSettings(parsed);
		if (checkTimer.current) clearTimeout(checkTimer.current);
		setShowCheck(true);
		checkTimer.current = setTimeout(() => setShowCheck(false), 1500);
	};

	return (
		<div className="bg-background text-foreground p-6 h-screen select-none">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-lg font-semibold">Settings</h1>
				<button
					disabled={!hasChanges && !showCheck}
					onClick={handleSave}
					className={`inline-flex items-center gap-1.5 justify-center rounded-md text-sm font-medium h-8 px-3 shadow-xs transition-colors disabled:pointer-events-none ${
						showCheck
							? "bg-green-600 text-white"
							: "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					}`}
				>
					<AnimatePresence mode="wait">
						{showCheck ? (
							<motion.span
								key="check"
								className="inline-flex items-center gap-1.5"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
							>
								<Check className="h-4 w-4" />
								Saved
							</motion.span>
						) : (
							<motion.span
								key="save"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								Save changes
							</motion.span>
						)}
					</AnimatePresence>
				</button>
			</div>
			<div className="space-y-4">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Search
				</h2>
				<div className="grid gap-3">
					<label className="grid gap-1.5">
						<span className="text-sm font-medium">Distance threshold</span>
						<span className="text-xs text-muted-foreground">
							Maximum distance for vector similarity (lower = stricter)
						</span>
						<input
							type="text"
							inputMode="decimal"
							value={draft.distanceThreshold}
							onChange={(e) =>
								setDraft((d) => ({ ...d, distanceThreshold: e.target.value }))
							}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
					</label>
					<label className="grid gap-1.5">
						<span className="text-sm font-medium">Query limit</span>
						<span className="text-xs text-muted-foreground">
							Maximum number of results to return
						</span>
						<input
							type="text"
							inputMode="numeric"
							value={draft.queryLimit}
							onChange={(e) =>
								setDraft((d) => ({ ...d, queryLimit: e.target.value }))
							}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
					</label>
				</div>
			</div>
		</div>
	);
}
