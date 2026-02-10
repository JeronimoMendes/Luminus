export interface ImageInfo {
  path: string;
  filename: string;
  size_bytes: number;
  dimensions: [number, number] | null;
  camera_model: string;
  lens_model: string;
  aperture: string;
  iso: string;
  exposure: string;
}

export interface ScanResult {
  images: ImageInfo[];
}