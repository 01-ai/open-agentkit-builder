# Open Agent Builder

<div align="center">
  <h3>🎨 Visual Workflow AI Agent Builder Platform</h3>
  <p>Replicating OpenAI AgentBuilder - Build AI workflows through drag-and-drop interface</p>
</div>

## ✨ Features

- 🎯 **Visual Canvas** - Intuitive drag-and-drop interface based on React Flow
- 🧩 **Rich Nodes** - 8 node types to meet various workflow requirements
- 💾 **Local Storage** - Lightweight file-based database, no additional installation needed
- ⚡️ **Rapid Prototyping** - Next.js 15+ App Router for extremely fast development experience
- 🎨 **Modern UI** - shadcn/ui component library, beautiful and easy to use
- 📦 **Open Source Friendly** - Clear code structure, easy to extend

## 🚀 Quick Start

### Requirements

- Node.js 18+
- pnpm (required)

### Installation

```bash
# Clone the repository
git clone https://github.com/01-ai/open-agentkit-builder.git
cd open-agentkit-builder

# Install dependencies (must use pnpm)
pnpm install

# Start the development server
pnpm dev
```

Visit [http://localhost:3300/agent-builder/](http://localhost:3300/agent-builder/) to get started.

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + Tailwind CSS
- **Canvas**: React Flow (@xyflow/react)
- **Database**: Local JSON files
- **Package Manager**: pnpm

## 🧩 Node Types

| Icon | Node Type      | Description                          |
| ---- | -------------- | ------------------------------------ |
| 🎬   | Start Node     | Entry point of the workflow          |
| 🤖   | LLM Call       | Call large language models           |
| 🔀   | Condition      | Branch execution based on conditions |
| 🔄   | Loop           | Repeat certain operations            |
| ✋   | User Approval  | Wait for user confirmation           |
| 🔍   | File Search    | Retrieve relevant documents          |
| ⚙️   | Data Transform | Transform data formats               |
| 🏁   | End Node       | Exit point of the workflow           |

## 📖 Usage Guide

### 1. Create a Workflow

Click the "New Workflow" button on the homepage, and the system will automatically create a new workflow and navigate to the editor.

### 2. Add Nodes

Select the desired node type from the node library on the left panel and click to add it to the canvas.

### 3. Connect Nodes

Drag the connection points of nodes to connect them to other nodes and build your workflow.

### 4. Save Workflow

After editing, click the "Save" button in the top right corner to save the workflow locally.

## 🗂️ Project Structure

```
open-agent-builder/
├── app/
│   ├── (with-sidebar)/         # Pages with sidebar
│   ├── (without-sidebar)/       # Pages without sidebar
│   │   └── edit/               # Workflow editor
│   └── layout.tsx              # Root layout
├── components/
│   └── ui/                     # shadcn UI components
├── lib/
│   ├── code-generator.ts       # Code generator
│   ├── nodes/                  # Node definitions
│   ├── export/                 # Workflow import/export
│   └── utils.ts                # Utility functions
├── types/
│   └── workflow.ts             # Workflow type definitions
├── templates/                  # Workflow templates
├── tests/                      # Unit tests
└── public/                     # Static assets
```

## 🛠️ Development

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test
```

## 🗺️ Roadmap

### ✅ Phase 1 (Completed)

- [x] Basic project architecture
- [x] Workflow list and management
- [x] Visual canvas editor
- [x] Rich node types
- [x] Workflow save/load
- [x] Workflow import/export
- [x] Code generation functionality

### 🚧 Phase 2 (Planned)

- [ ] Detailed node configuration panel optimization
- [ ] Custom node styles
- [ ] Enhanced workflow validation
- [ ] Collaborative editing support

### 🔮 Phase 3 (Future)

- [ ] OpenAI API integration
- [ ] Workflow execution engine
- [ ] Real-time execution status tracking
- [ ] Multi-user support

## 📝 Development Standards

- **Package Manager**: Must use pnpm
- **Code Style**: Follow ESLint configuration
- **Commit Format**: Follow Conventional Commits
- **Component Style**: Prefer functional components
- **Language**: Use English for code comments and variable names

## 🤝 Contributing

We welcome Issues and Pull Requests!

Before submitting a PR, please make sure:

- Code follows project standards
- Passes all tests: `pnpm test`
- Passes linting: `pnpm lint`
- Code is formatted: `pnpm format`

## 📄 License

This project is licensed under MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

- [OpenAI AgentBuilder](https://openai.com) - Original inspiration
- [React Flow](https://reactflow.dev/) - Powerful canvas library
- [shadcn/ui](https://ui.shadcn.com/) - Excellent component library
- [Next.js](https://nextjs.org/) - Best React framework

---

Made with ❤️ by the community
