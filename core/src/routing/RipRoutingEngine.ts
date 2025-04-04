import {
  RoutingEngine,
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry,
} from './RoutingEngine';

export class RipRoutingEngine implements RoutingEngine {
  protocol = 'rip';

  private device!: Device;
  private topology!: TopologyManager;
  private routingTable: RoutingEntry[] = [];

  init(device: Device, topology: TopologyManager): void {
    this.device = device;
    this.topology = topology;
    console.log(`[RipRoutingEngine] Initialized on device ${device.name}`);
    // Initialize RIP-specific state here (neighbors, timers, etc.)
  }

  handleInterfaceChange(event: InterfaceEvent): void {
    console.log(`[RipRoutingEngine] Interface change: ${event.interfaceId} is ${event.status}`);
    // React to interface status changes (e.g., neighbor loss)
  }

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void {
    console.log(`[RipRoutingEngine] Received packet of type ${packet.type} on interface ${ingressInterface.name}`);
    // Parse RIP packets and update routing table accordingly
  }

  getRoutingTable(): RoutingEntry[] {
    return this.routingTable;
  }

  shutdown(): void {
    console.log(`[RipRoutingEngine] Shutdown`);
    this.routingTable = [];
    // Cleanup timers, neighbors, etc.
  }

  // Future: methods for sending RIP updates, managing neighbors, timers, etc.
}
