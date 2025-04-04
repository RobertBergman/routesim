import {
  RoutingEngine,
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry,
} from './RoutingEngine';

export class StaticRoutingEngine implements RoutingEngine {
  protocol = 'static';

  private device!: Device;
  private topology!: TopologyManager;
  private staticRoutes: RoutingEntry[] = [];

  init(device: Device, topology: TopologyManager): void {
    this.device = device;
    this.topology = topology;
    console.log(`[StaticRoutingEngine] Initialized on device ${device.name}`);
  }

  handleInterfaceChange(event: InterfaceEvent): void {
    console.log(`[StaticRoutingEngine] Interface change: ${event.interfaceId} is ${event.status}`);
    // Static routes typically unaffected by interface status, but could remove routes if desired
  }

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void {
    console.log(`[StaticRoutingEngine] Received packet of type ${packet.type} on interface ${ingressInterface.name}`);
    // Static routing does not process routing protocol packets
  }

  getRoutingTable(): RoutingEntry[] {
    return this.staticRoutes;
  }

  shutdown(): void {
    console.log(`[StaticRoutingEngine] Shutdown`);
    this.staticRoutes = [];
  }

  // Additional methods to add/remove static routes
  addStaticRoute(route: RoutingEntry): void {
    this.staticRoutes.push(route);
  }

  removeStaticRoute(destination: string): void {
    this.staticRoutes = this.staticRoutes.filter(r => r.destination !== destination);
  }
}
