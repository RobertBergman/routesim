# Active Context

## Current Work Focus
- Core topology models (`Device`, `NetworkInterface`, `Link`, `TopologyManager`) implemented.
- Backend server scaffolded with REST API and WebSocket support.
- Frontend React app integrated with backend for device management.
- Frontend **supports adding, removing devices and links** via forms, with SVG-based topology visualization.
- Frontend now supports **preset topologies** (star, ring, mesh, tree) via dropdown selection.
- Maintain and update Memory Bank to reflect evolving specifications.
- **Enhance UI and expand API for protocol configuration and visualization.**

## Recent Changes
- Created core topology models (`Device`, `NetworkInterface`, `Link`, `TopologyManager`).
- **Refactored core type definitions:** Moved `RoutingEntry`, `Packet`, `InterfaceEvent` from `RoutingEngine.ts` to `TopologyModels.ts` for better organization. Fixed resulting type errors in engine implementations (using `interface.name` instead of `interface.id`).
- Implemented core routing logic for **OSPF, IS-IS, and BGP** (simplified, RFC-aligned). `StaticRoutingEngine` is basic, `RipRoutingEngine` is a stub.
- Extended `Device` class with `sendPacket`, `getLocalPrefixes`, and `addRoutingEngine` methods.
- Developed backend REST API (`backend/src/server.ts`) using Express for managing devices, interfaces, links, and basic protocol enablement. Uses `/api/topology/` prefix.
- Initialized WebSocket server (`ws`) in backend for future real-time updates.
- **Refactored frontend state management:**
  - Centralized topology state (`devices`, `links`) and API interaction logic in `App.tsx`.
  - Components (`DevicePanel`, `InterfacePanel`, `LinkPanel`, `TopologyGraph`) now receive data and action functions via props.
  - Implemented API calls in `App.tsx` for fetching initial data, adding devices, interfaces, and links. Uses optimistic updates locally.
- **Frontend UI:**
  - `SimulatorPage` orchestrates layout using Material UI (`AppBar`, `Drawer`).
  - `DevicePanel` allows adding devices (by name) and lists devices/interfaces. Placeholders for routing table/status.
  - `InterfacePanel` allows adding interfaces to a selected device.
  - `LinkPanel` uses Material UI `Select` dropdowns to create links between available interfaces on selected devices.
  - `TopologyGraph` enhanced with **interactive SVG visualization** supporting:
    - Multiple layout arrangements (circle, star, grid, tree) selectable via dropdown
    - Multi-node selection (Ctrl+click or box selection) and group manipulation
    - Drag-and-drop repositioning of single or multiple nodes
    - Canvas panning (Alt+drag or middle-mouse) and zoom controls
    - Zoom slider with mousewheel support (Ctrl+wheel to zoom, wheel to pan)
    - Node selection and bulk deletion (right-click)
- **Implemented Topology Import/Export:**
  - Added functionality in `App.tsx` to export the current topology (devices and links) to a JSON file matching the specified format.
  - Added functionality in `App.tsx` to import a topology from a JSON file, parsing it and updating the frontend state.
  - Added Import (Upload) and Export (Download) buttons with icons (`@mui/icons-material` dependency added) to the `AppBar` in `SimulatorPage.tsx`.
- **Implemented Local Storage Persistence:**
  - `App.tsx` now loads the topology state (devices and links) from browser `localStorage` on initial load.
  - `App.tsx` saves the current topology state to `localStorage` whenever devices or links change.
- **Fixed frontend WebSocket connection:** Implemented a robust WebSocket connection system in `App.tsx` with:
  - Automatic reconnection mechanism for handling connection failures
  - Better error handling that doesn't block the UI
  - Data validation to prevent errors with malformed messages
  - Proper connection state tracking
  - Graceful cleanup on component unmount

## Next Steps
- **Implement WebSocket connection** and message handling in `App.tsx` and backend for real-time updates.
- **Complete RIP implementation** in `core/src/routing/RipRoutingEngine.ts`.
- **Significantly improve test coverage** for core routing engines (OSPF, IS-IS, BGP) in `core/src/routing/__tests__/`, addressing packet types, assertions, mocks, and private access. Add tests for Static engine methods.
- **Implement delete functionality** for interface and protocol in backend API and frontend actions/UI.
- **Improve frontend performance:** Optimize rendering and event handling.
- **Enhance frontend UI:** Display routing tables/protocol status in `DevicePanel`.
- **Expand backend API** for detailed protocol configuration (e.g., setting OSPF areas, BGP AS numbers).
- **Implement TODOs** in `core/src/simulation/TopologyModels.ts` (`sendPacket`, `getLocalPrefixes`, `updateRoutingTable`).
- Continuously update Memory Bank documentation.

## Active Decisions
- Use Markdown for all persistent memory files.
- Organize Memory Bank hierarchically for layered context.
- Always read all Memory Bank files before any task.
- Update files incrementally or comprehensively as needed.

## Important Patterns & Preferences
- Prefer targeted edits (`replace_in_file`) over full overwrites.
- Use final saved file content as reference for all future changes.
- Maintain clear separation of concerns across Memory Bank files.
- Document insights, decisions, and changes promptly.

## Learnings & Insights
- Persistent, structured memory is critical for stateless AI agents.
- Hierarchical context enables efficient restoration and precise work.
- Clear operational rules ensure consistency and quality.
- **Routing engines (OSPF, BGP, IS-IS) are implemented** with clean, modular code adhering to the `RoutingEngine` interface. Static engine is basic, RIP is a stub.
- **Core RFC behaviors** (neighbor discovery, message handling, DB maintenance, route computation) are present but simplified (e.g., no detailed state machines, authentication, multi-area/level, complex timers, full BGP policy).
- **Type definitions** for core models and routing engine interface are now consistent.
- **Frontend state refactoring** completed successfully.
- **Backend API** provides necessary CRUD operations for topology and basic protocol management.
- **TopologyGraph layout issue** fixed by removing absolute positioning.
- **LinkPanel UI** improved with dropdowns.
- **Code review identified significant gaps in test coverage** for core routing engines.
