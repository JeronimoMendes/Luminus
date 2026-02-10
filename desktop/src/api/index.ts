import { invoke } from "@tauri-apps/api/core";
import type { ScanResult } from "./types";

export const tauriApi = {
    scanFolder: (dirPath: string) => invoke<ScanResult>('scan_folder', { dirPath })
}

export const api = tauriApi;