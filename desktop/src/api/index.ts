import { invoke } from "@tauri-apps/api/core";
import type { PhotographMeta, ScanResult, VideoMeta } from "./types";

export const tauriApi = {
	scanFolder: (dirPath: string) =>
		invoke<ScanResult>("scan_folder", { dirPath }),
	getAllImages: () => invoke<PhotographMeta[]>("get_all_images"),
	getAllVideos: () => invoke<VideoMeta[]>("get_all_videos"),
	query_photograph: (query: string, k: number, distance: number) =>
		invoke<PhotographMeta[]>("query_photograph", { query, k, distance }),
};

export const api = tauriApi;
