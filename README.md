![Luminus Banner](./assets/banner.png)

Luminus is a photography workspace that makes your entire library discoverable through semantic search, so you can move from memory to selection in seconds.

![demo](./assets/demo.gif)

It features:

  1. Semantic search that surfaces images by content and meaning
  
Roadmap:
  1. Workflow with photography projects
  2. Support RAW files
  

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Bun](https://bun.sh/) (package manager)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (optional)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd luminus
   ```

3. **Download CLIP model from hugging face and convert to ONNX**

  ```bash
  uvx --from "optimum[onnxruntime]" optimum-cli export onnx --model laion/CLIP-ViT-B-32-laion2B-s34B-b79K .models/laion-CLIP-ViT-B-32-laion2B-s34B-b79K
  ```

2. **Install frontend dependencies**

   ```bash
   cd desktop
   bun install
   ```

4. **Run in development mode**

   ```bash
   cargo tauri dev
   ```

### Useful commands

```bash
# Build for production
bun tauri build

# Lint frontend
npx @biomejs/biome check --write src/

# Lint + format Rust (from desktop/src-tauri/)
cargo fmt
cargo clippy -- -D warnings
```

## Disclaimer

The non learning parts of this project (UI, DB CRUD, etc.) were developed with heavy assistance from AI coding tools, primarily [Claude Code](https://claude.ai/code) and [OpenAI Codex](https://openai.com/index/openai-codex/). The ML/AI components (model selection, embedding pipeline, and inference logic) were designed and implemented by hand with guidance by online resources and tools.
