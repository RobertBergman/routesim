import type {
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry
} from '../simulation/TopologyModels';

export interface RoutingEngine {
  protocol: string; // e.g., 'static', 'rip', 'ospf', 'bgp', 'isis'

  init(device: Device, topology: TopologyManager): void;

  handleInterfaceChange(event: InterfaceEvent): void;

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void;

  getRoutingTable(): RoutingEntry[];

  shutdown(): void;
}

// Exporting types for convenience if needed elsewhere, though direct import is preferred
export type {
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry
};
