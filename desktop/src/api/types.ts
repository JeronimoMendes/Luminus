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

export interface ScanResult {
	images: PhotographMeta[];
}
