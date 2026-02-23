import { Button } from "@/components/ui/button";

interface ContentHeaderProps {
  photoCount: number;
  videoCount: number;
}

export function ContentHeader({ photoCount, videoCount }: ContentHeaderProps) {
  const parts: string[] = [];
  if (photoCount > 0) parts.push(`${photoCount.toLocaleString()} photo${photoCount !== 1 ? "s" : ""}`);
  if (videoCount > 0) parts.push(`${videoCount.toLocaleString()} video${videoCount !== 1 ? "s" : ""}`);
  const subtitle = parts.length > 0 ? parts.join(", ") : "No media";

  return (
    <div className="flex items-start justify-between px-8 pt-6 pb-4">
      <div>
        <h2 className="text-[25px] font-semibold text-foreground leading-tight">Library</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        <div className="w-10 h-0.5 bg-warm-accent rounded-full mt-2" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" className="text-muted-foreground rounded-lg" disabled>
          Select
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg border-[#9b8f7f2e]" disabled>
          Add to Project
        </Button>
      </div>
    </div>
  );
}
