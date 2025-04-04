# System Patterns

## Architecture Overview
Cline relies on a persistent, file-based Memory Bank to maintain project context across stateless sessions. The Memory Bank is organized as a hierarchy of Markdown files, each serving a distinct purpose, enabling layered understanding and efficient context restoration.

## Key Components
- **projectbrief.md**: Defines core project requirements and goals.
- **productContext.md**: Explains the purpose, problems solved, and user experience.
- **systemPatterns.md**: Documents architecture, design patterns, and relationships.
- **techContext.md**: Details technologies, environment, and dependencies.
- **activeContext.md**: Captures current focus, recent changes, and next steps.
- **progress.md**: Tracks status, known issues, and project evolution.

## Design Patterns
- **Hierarchical Context Loading**: Files build upon each other, from foundational to specific.
- **Single Source of Truth**: Memory Bank serves as the definitive project knowledge base.
- **Explicit Initialization**: Cline always reads all Memory Bank files before any task.
- **Incremental Updates**: Files are updated after significant changes or on request.
- **Separation of Concerns**: Each file has a clear, focused purpose.

## Component Relationships
- `projectbrief.md` anchors the entire context.
- `productContext.md`, `systemPatterns.md`, and `techContext.md` elaborate on the brief.
- `activeContext.md` synthesizes current state from all above.
- `progress.md` records ongoing status and issues.
- Additional files can extend this structure as needed.

## Critical Implementation Paths
- **Session Start**: Read all Memory Bank files → restore full context.
- **Task Execution**: Use context to guide precise, efficient work.
- **Session End / Major Change**: Update relevant Memory Bank files.
- **Explicit User Request**: Review and update all files comprehensively.

## Routing Engine Architecture

### Overview
- The routing engine framework enables each device to run one or more routing protocol engines simultaneously.
- Engines are **modular** and **pluggable**, allowing flexible protocol combinations per device.
- Engines operate independently but update a shared routing table on the device.
- The design supports multi-protocol environments, extensibility, and future features like route redistribution.

---

### `RoutingEngine` Interface

All protocol engines implement a common interface:

```typescript
interface RoutingEngine {
  protocol: string; // e.g., 'static', 'rip', 'ospf', 'bgp', 'isis'
  init(device: Device, topology: TopologyManager): void;
  handleInterfaceChange(event: InterfaceEvent): void;
  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void;
  getRoutingTable(): RoutingEntry[];
  shutdown(): void;
}
```

- **`init`**: Initialize engine with device context and topology reference.
- **`handleInterfaceChange`**: React to link/interface status changes (`InterfaceEvent` defined in `TopologyModels.ts`).
- **`handlePacket`**: Process incoming routing protocol packets (`Packet`, `NetworkInterface` defined in `TopologyModels.ts`).
- **`getRoutingTable`**: Return current computed routes for this protocol (array of `RoutingEntry` defined in `TopologyModels.ts`).
- **`shutdown`**: Cleanup resources on device removal.

---

### Integration with Devices

- Each **Device** maintains a list of active `RoutingEngine` instances.
- Engines update their own protocol-specific routing tables.
- The device **aggregates** routes from all engines, applying longest prefix match and administrative distance rules.
- Engines can be enabled, disabled, or reconfigured dynamically.

---

### Event-Driven Operation

- **Topology Events**: Link or interface status changes trigger `handleInterfaceChange`.
- **Packet Events**: Incoming routing protocol packets trigger `handlePacket`.
- **Timers**: Engines manage their own timers (e.g., RIP updates, OSPF hellos).
- **Route Updates**: Engines recompute routes and notify the device when changes occur.

---

### Protocol Engine Implementations

Each protocol extends the `RoutingEngine` interface:

- **StaticRoutingEngine**
  - Manages static routes configured by the user.
- **RipRoutingEngine**
  - Implements RIP distance-vector protocol (RFC 1058).
- **OspfRoutingEngine**
  - Implements OSPF link-state protocol (RFC 2328).
  - Handles hello exchange, neighbor management, LSA generation and flooding.
  - Maintains a link-state database (LSDB) with sequence numbers.
  - Runs Dijkstra's SPF algorithm on the LSDB graph to compute shortest paths.
- **BgpRoutingEngine**
  - Implements BGP path-vector protocol (RFC 4271).
  - Manages peer sessions, OPEN and KEEPALIVE exchanges.
  - Parses UPDATE messages and maintains Adj-RIB-In.
  - Selects best paths based on local preference, AS path length, and MED.
- **IsisRoutingEngine**
  - Implements IS-IS link-state protocol.
  - Handles hello exchange, adjacency management, LSP generation and flooding.
  - Maintains a link-state database with sequence numbers.
  - Runs Dijkstra's SPF algorithm on the LSDB graph to compute shortest paths.

Each engine:
- Maintains protocol-specific state (neighbors, peers, timers, databases).
- Handles protocol message parsing, generation, and flooding.
- Computes routes based on protocol algorithms (SPF or best path selection).
- Updates the device routing table accordingly.

---

### Extensibility

- New protocols can be added by implementing the `RoutingEngine` interface.
- Engines operate independently, enabling multi-protocol simulation.
- Future support for **route redistribution** between engines is planned.
- Engines can expose protocol-specific configuration and status.

---

### Benefits

- **Isolation:** Protocol logic is encapsulated, simplifying development and testing.
- **Flexibility:** Any combination of protocols can run on a device.
- **Realism:** Supports complex enterprise routing scenarios.
- **Maintainability:** Clear interfaces and separation of concerns.
- **Scalability:** Designed to handle many devices and protocols efficiently.

---

### Summary

This modular routing engine framework enables realistic, flexible, and extensible simulation of enterprise routing environments, supporting multiple protocols per device with clean integration and event-driven operation.
