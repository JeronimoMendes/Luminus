import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { ImageGrid } from "@/components/image-grid";
import { api } from "./api";
import type { ScanResult } from "./api/types";
import { useState } from "react";

function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      const res = await api.scanFolder(selected);
      setScanResult(res);
    }
  };

  return (
    <main className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 p-3 border-b">
        <Button onClick={handlePickFolder} variant="outline">
          Pick Folder to Import
        </Button>
        {scanResult && (
          <span className="text-sm text-muted-foreground">
            {scanResult.images.length} images
          </span>
        )}
      </div>
      {scanResult && <ImageGrid images={scanResult.images} />}
    </main>
  );
}

export default App;
