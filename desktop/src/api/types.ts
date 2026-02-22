export interface PhotographMeta {
	path: string;
	filename: string;
	datetime: string;
	width: number | null;
	height: number | null;
	camera_maker: string;
	camera_model: string;
	lens_maker: string;
	lens_model: string;
	aperture: string;
	iso: string;
	exposure: string;
}

export interface VideoMeta {
	path: string;
	filename: string;
	datetime: string | null;
	width: number | null;
	height: number | null;
	duration_secs: number | null;
	fps: number | null;
	video_codec: string | null;
	audio_codec: string | null;
	bitrate: number | null;
	thumbnail_path: string | null;
}

export type MediaItem =
	| (PhotographMeta & { type: "image" })
	| (VideoMeta & { type: "video" });

export interface ScanResult {
	images: PhotographMeta[];
	videos: VideoMeta[];
}
