import type { PhotographMeta } from "@/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { convertFileSrc } from "@tauri-apps/api/core";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";

interface ImageGridProps {
  images: PhotographMeta[];
  selected: PhotographMeta | null;
  onSelect: (img: PhotographMeta) => void;
  onClose: () => void;
}

export function ImageGrid({ images, selected, onSelect, onClose }: ImageGridProps) {
  useEffect(() => {
    if (!selected) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, onClose]);

  return (
    <LayoutGroup>
      <div className={`h-full ${selected ? "blur-sm transition-all" : "transition-all"}`}>
        <ScrollArea className="h-full w-full">
          <div className="columns-3 gap-2 p-2 lg:columns-4 xl:columns-5">
            {images.map((img) => (
              <div
                key={img.path}
                className="mb-2 break-inside-avoid overflow-hidden cursor-pointer"
                onClick={() => onSelect(img)}
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
            onClick={onClose}
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
              {selected.width && selected.height && (
                <p className="text-xs text-white/60">
                  {selected.width}×{selected.height}
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
