import { convertFileSrc } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ImageInfo } from "@/api/types";
import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

interface ImageGridProps {
  images: ImageInfo[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [selected, setSelected] = useState<ImageInfo | null>(null);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, close]);

  return (
    <LayoutGroup>
      <div className={selected ? "blur-sm transition-all" : "transition-all"}>
        <ScrollArea className="h-[calc(100vh-80px)] w-full">
          <div className="columns-3 gap-2 p-2 lg:columns-4 xl:columns-5">
            {images.map((img) => (
              <div
                key={img.path}
                className="mb-2 break-inside-avoid overflow-hidden cursor-pointer"
                onClick={() => setSelected(img)}
              >
                <motion.img
                  layoutId={img.path}
                  src={convertFileSrc(img.path)}
                  alt={img.filename}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            onClick={close}
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.3 }}
          >
            <motion.img
              layoutId={selected.path}
              src={convertFileSrc(selected.path)}
              alt={selected.filename}
              className="max-h-[80vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <motion.div
              className="mt-4 text-center text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold">{selected.filename}</p>
              {selected.dimensions && (
                <p className="text-xs text-white/60">
                  {selected.dimensions[0]}×{selected.dimensions[1]}
                </p>
              )}
              {(selected.camera_model || selected.lens_model) && (
                <p className="text-xs text-white/60">
                  {[selected.camera_model, selected.lens_model].filter(Boolean).join(" · ")}
                </p>
              )}
              {(selected.aperture || selected.iso || selected.exposure) && (
                <p className="text-xs text-white/60">
                  {[
                    selected.aperture && `f/${selected.aperture}`,
                    selected.iso && `ISO ${selected.iso}`,
                    selected.exposure && `${selected.exposure}s`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
