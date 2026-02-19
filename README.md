![Luminus Banner](./assets/banner.png)

Luminus is a photography workspace that makes your entire library discoverable through semantic search, so you can move from memory to selection in seconds.

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

### Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd luminus
   ```

2. **Install frontend dependencies**

   ```bash
   cd desktop
   bun install
   ```

3. **Run in development mode**

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
