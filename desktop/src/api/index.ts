import { invoke } from "@tauri-apps/api/core";
import type { PhotographMeta, ScanResult } from "./types";

export const tauriApi = {
    scanFolder: (dirPath: string) => invoke<ScanResult>('scan_folder', { dirPath }),
    getAllImages: () => invoke<PhotographMeta[]>('get_all_images'),
}

export const api = tauriApi;