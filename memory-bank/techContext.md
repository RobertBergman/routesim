# Tech Context

# Tech Stack for Routing Simulator

This document outlines the recommended technology stack for building a web-based routing simulator that implements Static, RIP, OSPF, IS-IS, and BGP routing protocols for IPv4 and IPv6, adhering to RFC standards.

## Frontend
- **React.js**: A popular JavaScript library for building interactive, component-based user interfaces. It’s well-suited for a web-based simulator with dynamic visualizations (e.g., network topology, route tables).
  - **Reason**: Provides a responsive and modular UI, making it easy to update routing tables, visualize network states, and handle user inputs.
- **TypeScript**: Adds static typing to JavaScript, improving code reliability and maintainability, especially for complex logic like routing algorithms.
  - **Reason**: Ensures type safety for protocol data structures (e.g., IPv4/IPv6 addresses, route metrics).
- **SVG / Visualization Library**:
  - **Current:** Direct SVG rendering (`TopologyGraph.tsx`) provides a basic circular layout visualization.
  - **Future Option:** Libraries like **D3.js** or **Cytoscape.js** could be integrated for more advanced, interactive graph visualizations. Cytoscape.js is particularly well-suited for network graphs.
- **Material UI**: Used for UI components (Buttons, Panels, Layout).
  - **Reason**: Provides pre-built components for faster UI development. (Note: Tailwind CSS was initially suggested but Material UI is currently used).

## Backend
- **Node.js with Express**: A lightweight JavaScript runtime and framework for building the server-side application.
  - **Reason**: Allows seamless integration with the frontend (JavaScript-based) and handles real-time simulation requests efficiently.
- **TypeScript**: Used on the backend as well for consistency and robustness.
  - **Reason**: Ensures type-safe handling of routing protocol logic and packet structures.
- **WebSocket**: For real-time communication between the frontend and backend (e.g., updating routing tables or simulating protocol convergence).
  - **Reason**: Routing protocols often require real-time updates (e.g., OSPF link-state floods, BGP route advertisements).

## Core Simulator Logic
- **Custom Routing Engine (JavaScript/TypeScript)**: Implement the routing protocols (Static, RIP, OSPF, IS-IS, BGP) as modular classes or functions adhering to RFCs (e.g., RFC 1058 for RIP, RFC 2328 for OSPF, RFC 4271 for BGP).
  - **Reason**: JavaScript’s flexibility allows you to simulate protocol behavior in a web environment, with TypeScript ensuring correctness.
- **ip-address Library**: A JavaScript library for parsing and manipulating IPv4 and IPv6 addresses.
  - **Reason**: Simplifies handling of IP address calculations (e.g., subnetting, prefix matching) required by routing protocols.
- **Graph Data Structure**: Use a library like `graphlib` or implement a custom graph to represent the network topology.
  - **Reason**: Protocols like OSPF and IS-IS rely on graph-based shortest-path algorithms (e.g., Dijkstra’s or SPF).

## Data Storage
- **In-Memory Storage (e.g., JavaScript Objects or Redis)**: Store network topology, routing tables, and protocol states during simulation.
  - **Reason**: Fast access for real-time simulation; Redis can be added for scalability or persistence if needed.
- **JSON**: For configuration files (e.g., defining initial network topology, static routes).
  - **Reason**: Human-readable and easy to integrate with a web-based tool.

## Testing
- **Jest**: A JavaScript testing framework for unit tests.
  - **Reason**: Ensures routing protocol implementations match RFC behavior (e.g., RIP distance-vector updates, BGP path selection).
- **Postman or cURL**: For testing API endpoints if the simulator exposes a RESTful interface.
  - **Reason**: Validates backend functionality independently of the frontend.

## Deployment
- **Docker**: Containerize the application for consistent development and deployment.
  - **Reason**: Simplifies setup across environments and ensures portability.
- **Vercel or Netlify**: For hosting the frontend and serverless backend functions.
  - **Reason**: Easy deployment for web-based applications with built-in scaling.
- **AWS EC2 or DigitalOcean (optional)**: For a dedicated server if simulation requires significant computation or persistence.
  - **Reason**: Provides flexibility for resource-intensive simulations.

## Development Tools
- **Git**: Version control for collaborative development.
- **ESLint + Prettier**: Code linting and formatting for consistency.
- **Webpack or Vite**: Bundling and development server for the frontend.
  - **Reason**: Vite offers faster development builds, while Webpack provides more customization.

## Why This Stack?
- **Web-Based Focus**: React.js, Node.js, and WebSocket ensure a responsive, real-time web experience.
- **RFC Compliance**: TypeScript and custom logic allow precise implementation of protocol standards.
- **Scalability**: Modular design and optional tools like Redis or Docker support future expansion (e.g., multi-user simulations).
- **Ease of Use**: JavaScript ecosystem simplifies full-stack development and integration.

This stack balances performance, maintainability, and adherence to your project’s requirements. Adjust based on specific needs (e.g., heavier computation may favor a backend in Python or Go).

## Development Setup
- Memory Bank located in `memory-bank/` directory.
- Cline operates from `/Users/berg276/claude/routesim` as working directory.
- Uses CLI commands for file operations, builds, and server management.
- Reads all Memory Bank files at session start.
- Updates files via targeted replacements or full overwrites as needed.

## Technical Constraints
- Cline is stateless between sessions; relies entirely on Memory Bank.
- Cannot change working directory; must specify full paths for external operations.
- Must wait for explicit confirmation after each tool use.
- Operates within macOS shell environment (`/bin/zsh`).
- Auto-formatting may alter file content post-write; must use final saved state for edits.

## Dependencies
- Markdown-compatible editor/viewer (VSCode).
- Node.js runtime for CLI and MCP servers.
- Network connectivity for MCP server interactions.
- File system permissions to read/write project files.

## Tool Usage Patterns
- **write_to_file**: For creating or overwriting entire files.
- **replace_in_file**: For targeted, minimal edits.
- **read_file**: To load file contents.
- **search_files**: To locate patterns or definitions.
- **list_files**: To explore directory structure.
- **execute_command**: To run shell commands.
- **MCP tools**: To extend capabilities via connected servers.

## Operational Rules
- All operational rules, workflows, and best practices are explicitly documented in `cline-rules.md`.
- This file codifies Cline's session start procedures, task execution workflows, and documentation update processes.
- It defines constraints, tool usage guidelines, and response formatting standards.
- Cline must adhere strictly to these rules to ensure consistent, high-quality, and context-aware operation.
- The rules complement the Memory Bank by governing how context is restored, maintained, and utilized during development.

## Routing Engine Architecture
- Devices incorporate pluggable routing engines implementing a common interface.
- Engines include Static, RIP, OSPF, BGP, IS-IS, or custom protocols.
- Engines operate independently but update a shared routing table on each device.
- This modular design supports multi-protocol simulation and future extensibility.
