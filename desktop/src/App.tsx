import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { ImageGrid } from "@/components/image-grid";
import { api } from "./api";
import type { PhotographMeta } from "./api/types";
import { useEffect, useState } from "react";

function App() {
  const [images, setImages] = useState<PhotographMeta[]>([]);

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
    <main className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 p-3 border-b">
        <Button onClick={handlePickFolder} variant="outline">
          Pick Folder to Import
        </Button>
        {images.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {images.length} images
          </span>
        )}
      </div>
      {images.length > 0 && <ImageGrid images={images} />}
    </main>
  );
}

export default App;
