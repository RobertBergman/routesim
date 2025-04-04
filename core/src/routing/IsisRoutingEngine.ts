import {
  RoutingEngine,
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry,
} from './RoutingEngine';

export class IsisRoutingEngine implements RoutingEngine {
  protocol = 'isis';

  private device!: Device;
  private topology!: TopologyManager;
  private routingTable: RoutingEntry[] = [];

  private adjacencies: Map<string, boolean> = new Map(); // interfaceId -> adjacency state
  private lsdb: Map<string, any> = new Map(); // systemId -> LSP data

  init(device: Device, topology: TopologyManager): void {
    this.device = device;
    this.topology = topology;
    console.log(`[IsisRoutingEngine] Initialized on device ${device.name}`);
    // Initialize IS-IS-specific state
    this.adjacencies.clear();
    this.lsdb.clear();
    this.routingTable = [];
    // Start hello timers (not implemented here)
  }

  handleInterfaceChange(event: InterfaceEvent): void {
    console.log(`[IsisRoutingEngine] Interface change: ${event.interfaceId} is ${event.status}`);
    if (event.status === 'down') {
      this.adjacencies.set(event.interfaceId, false);
      // Withdraw LSPs if needed
    } else if (event.status === 'up') {
      this.adjacencies.set(event.interfaceId, false);
      // Send hello to initiate adjacency
      this.sendHello(event.interfaceId);
    }
  }

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void {
    console.log(`[IsisRoutingEngine] Received packet of type ${packet.type} on interface ${ingressInterface.name}`);
    if (packet.type === 'isis-hello') {
      this.processHello(packet.payload, ingressInterface);
    } else if (packet.type === 'isis-lsp') {
      this.processLsp(packet.payload);
    }
  }

  getRoutingTable(): RoutingEntry[] {
    return this.routingTable;
  }

  shutdown(): void {
    console.log(`[IsisRoutingEngine] Shutdown`);
    this.routingTable = [];
    this.adjacencies.clear();
    this.lsdb.clear();
  }

  private sendHello(interfaceId: string) {
    console.log(`[IsisRoutingEngine] Sending IS-IS Hello on interface ${interfaceId}`);
    // Craft IS-IS Hello packet
    const helloPacket: Packet = {
      type: 'isis-hello',
      payload: {
        systemId: this.device.name,
        interfaceId,
      },
    };
    this.device.sendPacket(interfaceId, helloPacket);
  }

  private processHello(payload: any, ingressInterface: NetworkInterface) {
    console.log(`[IsisRoutingEngine] Processing IS-IS Hello from ${payload.systemId}`);
    this.adjacencies.set(ingressInterface.name, true); // Use name as the identifier
    // After adjacency, flood LSPs
    this.floodLsp();
  }

  private floodLsp() {
    const lspPayload = {
      systemId: this.device.name,
      prefixes: this.device.getLocalPrefixes(),
      sequenceNumber: Date.now(), // Simplified seq num
    };
    this.lsdb.set(this.device.name, lspPayload);
    for (const [ifaceId, isUp] of this.adjacencies.entries()) {
      if (isUp) {
        const lspPacket: Packet = {
          type: 'isis-lsp',
          payload: lspPayload,
        };
        this.device.sendPacket(ifaceId, lspPacket);
      }
    }
  }

  private processLsp(payload: any) {
    console.log(`[IsisRoutingEngine] Processing IS-IS LSP from ${payload.systemId}`);
    const existing = this.lsdb.get(payload.systemId);
    if (!existing || payload.sequenceNumber > existing.sequenceNumber) {
      this.lsdb.set(payload.systemId, payload);
      this.recomputeRoutes();
      // Flood to neighbors except ingress (simplified: flood to all)
      for (const [ifaceId, isUp] of this.adjacencies.entries()) {
        if (isUp) {
          const lspPacket: Packet = {
            type: 'isis-lsp',
            payload,
          };
          this.device.sendPacket(ifaceId, lspPacket);
        }
      }
    }
  }

  private recomputeRoutes() {
    console.log(`[IsisRoutingEngine] Recomputing IS-IS routes using SPF`);
    // Build graph from LSDB
    const graph: Map<string, { neighbors: string[]; prefixes: string[] }> = new Map();
    for (const [sysId, lsp] of this.lsdb.entries()) {
      graph.set(sysId, {
        neighbors: lsp.neighbors || [],
        prefixes: lsp.prefixes || [],
      });
    }

    // Dijkstra's algorithm
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const visited: Set<string> = new Set();

    distances.set(this.device.name, 0);
    const queue: Set<string> = new Set(graph.keys());

    while (queue.size > 0) {
      let u: string | null = null;
      let minDist = Infinity;
      for (const node of queue) {
        const dist = distances.get(node) ?? Infinity;
        if (dist < minDist) {
          minDist = dist;
          u = node;
        }
      }
      if (u === null) break;
      queue.delete(u);
      visited.add(u);

      const neighbors = graph.get(u)?.neighbors || [];
      for (const v of neighbors) {
        if (visited.has(v)) continue;
        const alt = (distances.get(u) ?? Infinity) + 10; // Simplified metric
        if (alt < (distances.get(v) ?? Infinity)) {
          distances.set(v, alt);
          previous.set(v, u);
        }
      }
    }

    // Build routing table
    const newTable: RoutingEntry[] = [];
    for (const [sysId, node] of graph.entries()) {
      if (sysId === this.device.name) continue;
      const prefixes = node.prefixes;
      let nextHop = sysId;
      let prev = previous.get(sysId);
      while (prev && prev !== this.device.name) {
        nextHop = prev;
        prev = previous.get(prev);
      }
      for (const prefix of prefixes) {
        newTable.push({
          destination: prefix,
          nextHop,
          metric: distances.get(sysId) ?? 10,
          protocol: 'isis',
          administrativeDistance: 115,
        });
      }
    }
    this.routingTable = newTable;
  }
}
