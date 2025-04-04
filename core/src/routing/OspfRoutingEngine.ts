import {
  RoutingEngine,
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry,
} from './RoutingEngine';

export class OspfRoutingEngine implements RoutingEngine {
  protocol = 'ospf';

  private device!: Device;
  private topology!: TopologyManager;
  private routingTable: RoutingEntry[] = [];

  private neighbors: Map<string, boolean> = new Map(); // interfaceId -> neighbor state
  private lsdb: Map<string, any> = new Map(); // routerId -> LSA data

  init(device: Device, topology: TopologyManager): void {
    this.device = device;
    this.topology = topology;
    console.log(`[OspfRoutingEngine] Initialized on device ${device.name}`);
    this.neighbors.clear();
    this.lsdb.clear();
    this.routingTable = [];
    // Start hello timers (not implemented here)
  }

  handleInterfaceChange(event: InterfaceEvent): void {
    console.log(`[OspfRoutingEngine] Interface change: ${event.interfaceId} is ${event.status}`);
    if (event.status === 'down') {
      this.neighbors.set(event.interfaceId, false);
      // Withdraw LSAs if needed
    } else if (event.status === 'up') {
      this.neighbors.set(event.interfaceId, false);
      this.sendHello(event.interfaceId);
    }
  }

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void {
    console.log(`[OspfRoutingEngine] Received packet of type ${packet.type} on interface ${ingressInterface.name}`);
    if (packet.type === 'ospf-hello') {
      this.processHello(packet.payload, ingressInterface);
    } else if (packet.type === 'ospf-lsa') {
      this.processLsa(packet.payload);
    }
  }

  getRoutingTable(): RoutingEntry[] {
    return this.routingTable;
  }

  shutdown(): void {
    console.log(`[OspfRoutingEngine] Shutdown`);
    this.routingTable = [];
    this.neighbors.clear();
    this.lsdb.clear();
  }

  private sendHello(interfaceId: string) {
    console.log(`[OspfRoutingEngine] Sending OSPF Hello on interface ${interfaceId}`);
    const helloPacket: Packet = {
      type: 'ospf-hello',
      payload: {
        routerId: this.device.name,
        interfaceId,
      },
    };
    this.device.sendPacket(interfaceId, helloPacket);
  }

  private processHello(payload: any, ingressInterface: NetworkInterface) {
    console.log(`[OspfRoutingEngine] Processing OSPF Hello from ${payload.routerId}`);
    this.neighbors.set(ingressInterface.name, true); // Use name as the identifier
    this.floodLsa();
  }

  private floodLsa() {
    const lsaPayload = {
      routerId: this.device.name,
      prefixes: this.device.getLocalPrefixes(),
      neighbors: Array.from(this.neighbors.entries())
        .filter(([_, up]) => up)
        .map(([ifaceId, _]) => ifaceId),
      sequenceNumber: Date.now(),
    };
    this.lsdb.set(this.device.name, lsaPayload);
    for (const [ifaceId, isUp] of this.neighbors.entries()) {
      if (isUp) {
        const lsaPacket: Packet = {
          type: 'ospf-lsa',
          payload: lsaPayload,
        };
        this.device.sendPacket(ifaceId, lsaPacket);
      }
    }
  }

  private processLsa(payload: any) {
    console.log(`[OspfRoutingEngine] Processing OSPF LSA from ${payload.routerId}`);
    const existing = this.lsdb.get(payload.routerId);
    if (!existing || payload.sequenceNumber > existing.sequenceNumber) {
      this.lsdb.set(payload.routerId, payload);
      this.recomputeRoutes();
      for (const [ifaceId, isUp] of this.neighbors.entries()) {
        if (isUp) {
          const lsaPacket: Packet = {
            type: 'ospf-lsa',
            payload,
          };
          this.device.sendPacket(ifaceId, lsaPacket);
        }
      }
    }
  }

  private recomputeRoutes() {
    console.log(`[OspfRoutingEngine] Recomputing OSPF routes using SPF`);
    const graph: Map<string, { neighbors: string[]; prefixes: string[] }> = new Map();
    for (const [routerId, lsa] of this.lsdb.entries()) {
      graph.set(routerId, {
        neighbors: lsa.neighbors || [],
        prefixes: lsa.prefixes || [],
      });
    }

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
        const alt = (distances.get(u) ?? Infinity) + 10;
        if (alt < (distances.get(v) ?? Infinity)) {
          distances.set(v, alt);
          previous.set(v, u);
        }
      }
    }

    const newTable: RoutingEntry[] = [];
    for (const [routerId, node] of graph.entries()) {
      if (routerId === this.device.name) continue;
      const prefixes = node.prefixes;
      let nextHop = routerId;
      let prev = previous.get(routerId);
      while (prev && prev !== this.device.name) {
        nextHop = prev;
        prev = previous.get(prev);
      }
      for (const prefix of prefixes) {
        newTable.push({
          destination: prefix,
          nextHop,
          metric: distances.get(routerId) ?? 10,
          protocol: 'ospf',
          administrativeDistance: 110,
        });
      }
    }
    this.routingTable = newTable;
  }
}
