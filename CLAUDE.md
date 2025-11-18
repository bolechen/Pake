# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Philosophy

- **Incremental progress over big bangs**: Break complex tasks into manageable stages
- **Learn from existing code**: Understand patterns before implementing new features
- **Clear intent over clever code**: Prioritize readability and maintainability
- **Simple over complex**: Keep all implementations simple and straightforward - prioritize solving problems and ease of maintenance over complex solutions

## Claude Code Eight Honors and Eight Shames

- **Shame** in guessing APIs, **Honor** in careful research
- **Shame** in vague execution, **Honor** in seeking confirmation
- **Shame** in assuming business logic, **Honor** in human verification
- **Shame** in creating interfaces, **Honor** in reusing existing ones
- **Shame** in skipping validation, **Honor** in proactive testing
- **Shame** in breaking architecture, **Honor** in following specifications
- **Shame** in pretending to understand, **Honor** in honest ignorance
- **Shame** in blind modification, **Honor** in careful refactoring

## Project Overview

Pake transforms any webpage into a lightweight desktop app using Rust and Tauri. It's significantly lighter than Electron (~5M vs ~100M+) with better performance.

**Core Architecture:**

- **CLI Tool** (`bin/`): TypeScript-based command interface
- **Tauri App** (`src-tauri/`): Rust desktop framework
- **Injection System**: Custom CSS/JS injection for webpages

## Development Workflow

1. **Understand**: Study existing patterns in codebase
2. **Plan**: Break complex work into 3-5 stages
3. **Test**: Write tests first (when applicable)
4. **Implement**: Minimal working solution
5. **Refactor**: Optimize and clean up

**Key Commands:**

```bash
# Core development
pnpm i                    # Install dependencies
pnpm run dev             # Development with hot reload (CLI + Tauri coordination)
pnpm run cli:build       # Build CLI tool for production
pnpm test                # Build CLI + run comprehensive tests

# Build variations
pnpm run build           # Production build (current platform)
pnpm run build:debug     # Debug build
pnpm run build:mac       # Universal macOS build (x86_64 + arm64)
pnpm run build:config    # Configure Tauri environment

# Testing
node tests/index.js      # Direct test execution with options
node dist/cli.js https://example.com --name TestApp --debug  # CLI testing

# Code quality
pnpm run format          # Format code (Prettier + Rust fmt)
pnpm run format:check    # Check formatting without fixing
```

**Testing:**

- Always run `pnpm test` before committing
- Test runner supports selective testing: `node tests/index.js --unit --integration --quick`
- For CLI testing: `node dist/cli.js https://example.com --name TestApp --debug`
- For app functionality testing: Use `pnpm run dev` for hot reload
- Environment variable `PAKE_CREATE_APP=1` enables app creation tests

## Core Components

- **CLI Tool** (`bin/`): TypeScript-based command interface with builders and options processing
  - `cli.ts` - Main CLI entry point using Commander.js
  - `dev.ts` - Development mode entry with hot reload coordination
  - `builders/` - Platform-specific app builders (macOS, Windows, Linux)
  - `options/` - CLI argument parsing and validation
  - `utils/` - Utility functions and helpers
- **Tauri App** (`src-tauri/`): Rust desktop application framework
  - `src/lib.rs` - Main Rust application entry point
  - `src/app/` - Window management, configuration, invoke handlers
  - `src/inject/event.js` - Custom event handlers, shortcuts, downloads
- **Configuration System**: Dynamic configuration via environment variables and config files
  - `pake.json` - Pake-specific app configuration
  - `tauri.conf.json` - Tauri framework configuration
  - Platform-specific configs (windows/macos/linux)
  - `scripts/configure-tauri.mjs` - Dynamic configuration generator
- **Build System**: Rollup for TypeScript bundling, Cargo for Rust compilation

## Documentation Guidelines

- **Main README**: Common parameters only
- **CLI Documentation** (`docs/cli-usage.md`): ALL parameters with examples
- **Rare parameters**: Full docs in CLI usage, minimal in main README
- **NO technical documentation files**: Do not create separate technical docs, design docs, or implementation notes - keep technical details in memory/conversation only

## Platform Specifics

- **macOS**: `.icns` icons, universal builds with `--multi-arch`
- **Windows**: `.ico` icons, requires Visual Studio Build Tools
- **Linux**: `.png` icons, multiple formats (deb, AppImage, rpm)

## Quality Standards

**Code Standards:**

- Prefer composition over inheritance
- Use explicit types over implicit
- Write self-documenting code
- Follow existing patterns consistently
- **NO Chinese comments** - Use English only
- **NO unnecessary comments** - For simple, obvious code, let the code speak for itself

**Git Guidelines:**

- **NEVER commit automatically** - User handles all git operations
- **NEVER generate commit messages** - User writes their own
- Only make code changes, user decides when/how to commit
- Always test before user commits

## Branch Strategy

- `dev` - Active development, target for PRs
- `main` - Release branch for stable versions

## Architecture Patterns

**Hybrid TypeScript/Rust Architecture:**

- **CLI Layer**: TypeScript provides user-friendly command interface with argument parsing
- **Tauri Backend**: Rust handles performance-critical desktop operations
- **WebView Integration**: Uses system webview for rendering web content
- **Configuration Pipeline**: Environment variables → config files → runtime configuration

**Key Design Decisions:**

- Hot reload coordination between CLI development and Tauri app
- Platform-specific builders with unified CLI interface
- Dynamic configuration generation based on environment variables
- Icon generation and processing pipeline for different platforms

## Prerequisites

- Node.js ≥18.0.0 (≥22.0.0 recommended)
- Rust ≥1.78.0 (≥1.85.0 recommended)
- Platform build tools (see CONTRIBUTING.md)
- Package manager: pnpm (required for workspace configuration)
