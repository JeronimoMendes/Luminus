import { emit } from "@tauri-apps/api/event";

export interface SearchSettings {
	distanceThreshold: number;
	queryLimit: number;
}

export const defaultSettings: SearchSettings = {
	distanceThreshold: 1.4,
	queryLimit: 10,
};

export const SETTINGS_CHANGED_EVENT = "settings-changed";

const STORAGE_KEY = "search-settings";

export function loadSettings(): SearchSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (typeof parsed !== "object" || parsed === null) return defaultSettings;
			const dist = Number(parsed.distanceThreshold);
			const limit = Number(parsed.queryLimit);
			return {
				distanceThreshold:
					Number.isFinite(dist) && dist > 0
						? dist
						: defaultSettings.distanceThreshold,
				queryLimit:
					Number.isInteger(limit) && limit >= 1
						? limit
						: defaultSettings.queryLimit,
			};
		}
	} catch {}
	return defaultSettings;
}

export function persistSettings(settings: SearchSettings) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	emit(SETTINGS_CHANGED_EVENT, settings);
}
