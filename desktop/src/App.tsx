import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { api } from "./api";
import type { ScanResult } from "./api/types";

import { useState } from "react";

function App() {
  const [folderPath, setFolderPath] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      const res = await api.scanFolder(selected);
      setFolderPath(selected);
      setScanResult(res);
    }
  };

  return (
    <main className="container">
      <button onClick={handlePickFolder}>Pick Folder to Import</button>
      {folderPath && <div>Selected folder: {folderPath}</div>}
      {scanResult && (
        <div>
          <p>Found {scanResult.images.length} images</p>
          <ul>
            {scanResult.images.map((img) => (
              <li key={img.path}>
                <strong>{img.filename}</strong>
                {img.dimensions && <span> — {img.dimensions[0]}x{img.dimensions[1]}</span>}
                <span> — {(img.size_bytes / 1024).toFixed(1)} KB</span>
                {img.camera_model && <span> — {img.camera_model}</span>}
                {img.lens_model && <span> — {img.lens_model}</span>}
                {img.aperture && <span> — f/{img.aperture}</span>}
                {img.iso && <span> — ISO {img.iso}</span>}
                {img.exposure && <span> — {img.exposure}s</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

export default App;
