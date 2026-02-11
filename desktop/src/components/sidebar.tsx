import {
  FolderOpen,
  ChevronRight,
  Image,
  FolderClosed,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PhotographMeta } from "@/api/types";
import { useState, useMemo } from "react";

interface FileTreeNode {
  name: string;
  path: string;
  childrenMap: Map<string, FileTreeNode>;
  children: FileTreeNode[];
  images: PhotographMeta[];
}

function createNode(name: string, path: string): FileTreeNode {
  return { name, path, childrenMap: new Map(), children: [], images: [] };
}

function buildTree(images: PhotographMeta[]): FileTreeNode[] {
  const root = createNode("", "");

  for (const img of images) {
    const parts = img.path.split(/[/\\]/).filter(Boolean).slice(0, -1);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let child = current.childrenMap.get(part);
      if (!child) {
        child = createNode(part, parts.slice(0, i + 1).join("/"));
        current.childrenMap.set(part, child);
        current.children.push(child);
      }
      current = child;
    }
    current.images.push(img);
  }

  // Find the deepest common ancestor to avoid showing the full path
  let node = root;
  while (node.children.length === 1 && node.images.length === 0) {
    node = node.children[0];
  }

  // If the common ancestor has no meaningful name, return its children directly
  if (!node.name && node.children.length > 0) {
    return node.children;
  }

  return node.children.length > 0 || node.images.length > 0 ? [node] : [];
}

function TreeNode({
  node,
  depth,
  onSelectImage,
}: {
  node: FileTreeNode;
  depth: number;
  onSelectImage: (img: PhotographMeta) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  const hasContent = node.children.length > 0 || node.images.length > 0;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-accent rounded-sm text-left"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        {expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FolderClosed className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {expanded && hasContent && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onSelectImage={onSelectImage} />
          ))}
          {node.images.map((img) => (
            <button
              key={img.path}
              onClick={() => onSelectImage(img)}
              className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-accent rounded-sm text-left"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <Image className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{img.filename}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  images,
  onImport,
  onSelectImage,
}: {
  images: PhotographMeta[];
  onImport: () => void;
  onSelectImage: (img: PhotographMeta) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const tree = useMemo(() => buildTree(images), [images]);

  return (
    <div
      className={`border-r flex flex-col bg-background shrink-0 transition-[width] duration-200 ${collapsed ? "w-12" : "w-60"}`}
    >
      <div className={`flex items-center gap-1 p-2 ${collapsed ? "flex-col" : ""}`}>
        <Button
          onClick={() => setCollapsed(!collapsed)}
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        {collapsed ? (
          <Button
            onClick={onImport}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onImport}
            variant="outline"
            className="flex-1 justify-start gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Import
          </Button>
        )}
      </div>

      {!collapsed && tree.length > 0 && (
        <ScrollArea className="flex-1">
          <div className="pb-4">
            {tree.map((node) => (
              <TreeNode key={node.path} node={node} depth={0} onSelectImage={onSelectImage} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
