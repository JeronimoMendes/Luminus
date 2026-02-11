import { open } from "@tauri-apps/plugin-dialog";
import { ImageGrid } from "@/components/image-grid";
import { Sidebar } from "@/components/sidebar";
import { api } from "./api";
import type { PhotographMeta } from "./api/types";
import { useEffect, useState, useCallback } from "react";

function App() {
  const [images, setImages] = useState<PhotographMeta[]>([]);
  const [selectedImage, setSelectedImage] = useState<PhotographMeta | null>(null);
  const clearSelected = useCallback(() => setSelectedImage(null), []);

  const loadImages = async () => {
    const all = await api.getAllImages();
    setImages(all);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      await api.scanFolder(selected);
      await loadImages();
    }
  };

  return (
    <main className="h-screen flex bg-background">
      <Sidebar images={images} onImport={handlePickFolder} onSelectImage={setSelectedImage} />
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {images.length > 0 && (
          <ImageGrid
            images={images}
            selected={selectedImage}
            onSelect={setSelectedImage}
            onClose={clearSelected}
          />
        )}
      </div>
    </main>
  );
}

export default App;
