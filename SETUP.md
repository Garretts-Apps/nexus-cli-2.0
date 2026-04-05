# Nexus CLI — Setup & Installation

A powerful terminal-based IDE and development assistant.

## Quick Start

### Clone & Run
```bash
git clone https://github.com/geaglin/nexus-cli-2.0.git
cd nexus-cli-2.0
bun install
bun start
```

Or with npm:
```bash
git clone https://github.com/geaglin/nexus-cli-2.0.git
cd nexus-cli-2.0
npm install
npm start
```

## Install Globally (as `nexus` command)

### With Bun
```bash
bun install -g nexus-cli-2.0
nexus
```

### With npm
```bash
npm install -g nexus-cli-2.0
nexus
```

## Available Commands

After installation, you have access to:

```bash
nexus              # Start the interactive Nexus CLI
npm test           # Run all 172 tests
npm run lint       # Run ESLint
npm run build      # Build for production
```

## Development

### Install Dependencies
```bash
bun install
# or
npm install
```

### Run in Development
```bash
bun src/main.tsx
# or
npm start
```

### Run Tests
```bash
bun test
# or
npm test
```

### Type Checking
```bash
npx tsc --noEmit
```

## Project Structure

```
src/
├── commands/          # CLI commands and workflows
├── components/        # React/Ink UI components
├── hooks/            # React hooks
├── services/         # Core services (API, analytics, MCP)
├── tools/            # Tool implementations
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── main.tsx          # Application entry point

bin/
└── nexus.js          # CLI entry point

Configuration files:
- package.json        # Package metadata and scripts
- tsconfig.json       # TypeScript configuration
- bunfig.toml         # Bun configuration
- .eslintrc.cjs       # ESLint configuration
```

## Technology Stack

- **Runtime**: Bun (or Node.js with npm)
- **Language**: TypeScript (strict mode)
- **UI Framework**: React with Ink
- **Testing**: Vitest
- **Linting**: ESLint

## Features

- **Interactive Terminal UI** — Full-featured terminal interface with syntax highlighting
- **File Management** — Read, write, edit, and search files with glob and grep support
- **Bash Integration** — Execute commands with full terminal emulation
- **Architecture Support** — Multi-language and framework support
- **Memory Management** — Persistent memory and session state
- **Tools & Extensibility** — Comprehensive tool ecosystem
- **Configuration** — Flexible configuration system

## Support

For issues or questions, check the project repository: https://github.com/geaglin/nexus-cli-2.0
