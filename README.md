# RouteSim - Web-Based Routing Simulator

## Overview

RouteSim is a web-based network routing simulator designed to provide a flexible environment for creating network topologies and observing the behavior of various routing protocols. It features a modular architecture allowing different routing engines (Static, RIP, OSPF, IS-IS, BGP) to be attached to simulated devices.

This project is developed with the assistance of Cline, an expert AI software engineer. Due to Cline's stateless nature, project context is maintained meticulously in the `memory-bank/` directory, ensuring continuity across development sessions.

## Features

### Implemented
*   **Topology Management:** Create/delete network devices (routers).
*   **Interface Management:** Add/delete interfaces to devices.
*   **Link Management:** Create/delete links between interfaces on different devices.
*   **Modular Routing Engines:** Framework for pluggable routing engines.
    *   **OSPF, IS-IS, BGP:** Implemented with simplified, RFC-aligned logic (neighbor discovery, message handling, DB maintenance, route computation).
    *   **Static:** Basic implementation for adding/removing static routes.
*   **Backend API:** Express.js server providing REST endpoints for topology and basic protocol management.
*   **Frontend UI:** React application using Material UI for:
    *   Adding devices, interfaces, and links via forms (using dropdowns for link creation).
    *   Basic SVG visualization of the network topology (circular layout).
*   **Centralized State Management:** Frontend state managed in `App.tsx`.
*   **Memory Bank:** Persistent project context for Cline (`memory-bank/`).

### Planned / Next Steps
*   **Real-time Updates:** Implement WebSocket communication for live topology and routing table updates.
*   **RIP Protocol:** Complete the implementation of the RIP routing engine.
*   **Delete Functionality:** Implement API and UI for deleting devices, links, interfaces, and protocols.
*   **Protocol Configuration:** Expand API and UI for detailed configuration of routing protocols (e.g., OSPF areas, BGP AS numbers, static route details).
*   **UI Enhancements:**
    *   Display routing tables and protocol status in the UI.
    *   Improve topology visualization (potentially using Cytoscape.js).
*   **Testing:** Significantly improve unit/integration test coverage for core routing engines.
*   **Core Logic:** Implement TODOs in `TopologyModels.ts` (`sendPacket`, `getLocalPrefixes`, `updateRoutingTable`).

## Tech Stack

*   **Core Logic:** TypeScript
*   **Backend:** Node.js, Express.js, TypeScript, WebSocket (`ws`)
*   **Frontend:** React.js, TypeScript, Material UI, Vite
*   **Testing:** Jest
*   **Development:** Git, ESLint, Prettier

## Project Structure

This project uses a monorepo structure managed by npm workspaces (defined in the root `package.json`):

```
/
├── backend/        # Express.js backend server
│   ├── src/
│   └── package.json
├── core/           # Core simulation logic, routing engines, topology models
│   ├── src/
│   │   ├── routing/
│   │   └── simulation/
│   └── package.json
├── frontend/       # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── memory-bank/    # Cline's persistent context documentation
│   ├── activeContext.md
│   ├── productContext.md
│   ├── progress.md
│   ├── projectbrief.md
│   ├── systemPatterns.md
│   └── techContext.md
├── .clinerules     # Cline's operational rules for this project
├── .gitignore
├── README.md       # This file
└── package.json    # Root package file defining workspaces
```

## Getting Started

### Prerequisites
*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RobertBergman/routesim.git
    cd routesim
    ```
2.  **Install dependencies for all workspaces:**
    ```bash
    npm install
    ```

### Running the Application

1.  **Build the `core` package (required by backend):**
    ```bash
    npm run build -w core
    ```
    *(Run this whenever changes are made to the `core` package)*

2.  **Start the backend server:**
    ```bash
    npm run dev -w backend
    ```
    *(The backend server will typically run on `http://localhost:3001`)*

3.  **Start the frontend development server:**
    ```bash
    npm run dev -w frontend
    ```
    *(The frontend will typically be available at `http://localhost:5173`)*

4.  Open your browser to the frontend URL (e.g., `http://localhost:5173`).

## Memory Bank & Cline Context

This project utilizes a unique development process involving **Cline**, an AI assistant, and a **Memory Bank**.

*   **Cline:** An expert AI software engineer assisting with development. Cline has no persistent memory between sessions.
*   **Memory Bank (`memory-bank/`):** A directory containing Markdown files that serve as Cline's persistent memory. Cline reads these files at the start of *every* session to restore full project context. These files are crucial for project continuity and must be kept up-to-date.
*   **`.clinerules`:** Defines specific operational rules Cline must follow within this project.

This system ensures that development can proceed efficiently and accurately despite Cline's stateless nature.

## Known Issues

*   Lack of test coverage for core routing engines.
*   RIP protocol not implemented.
*   Real-time updates via WebSocket not implemented.
*   Delete operations not implemented.
*   Detailed protocol configuration not implemented.
*   Routing table/status not displayed in UI.
*   `TopologyGraph` uses basic SVG, not Cytoscape.js.

See `memory-bank/progress.md` for more details.
