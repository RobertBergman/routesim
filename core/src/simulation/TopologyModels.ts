/**
 * Core topology models for the routing simulation.
 * Defines Device, NetworkInterface, Link, and TopologyManager classes.
 */

import type { RoutingEngine } from '../routing/RoutingEngine';

// --- Core Simulation Types ---

// Represents a routing table entry
export interface RoutingEntry {
  destination: string; // e.g., '192.168.1.0/24'
  nextHop: string;     // e.g., '192.168.1.1'
  metric: number;
  protocol: string;    // e.g., 'static', 'rip'
  administrativeDistance: number;
}

// Represents a network packet
export interface Packet {
  type: string; // Protocol type (e.g., 'RIP', 'OSPF', 'BGP')
  payload: any; // Protocol-specific data
  sourceIp?: string;
  destinationIp?: string;
  // Add other common packet properties as needed
}

// Represents an event related to an interface status change
export interface InterfaceEvent {
  interfaceId: string; // Usually the interface name
  status: 'up' | 'down';
  // Add other event properties as needed (e.g., deviceId)
}


// --- Core Simulation Classes ---

// Represents a network interface on a device
export class NetworkInterface {
  name: string;
  ipAddresses: string[]; // Support multiple IPs (IPv4/IPv6)
  status: 'up' | 'down';
  link: Link | null;

  constructor(name: string) {
    this.name = name;
    this.ipAddresses = [];
    this.status = 'down';
    this.link = null;
  }

  setStatus(status: 'up' | 'down') {
    this.status = status;
    // Notify connected link or device if needed
  }

  addIpAddress(ip: string) {
    if (!this.ipAddresses.includes(ip)) {
      this.ipAddresses.push(ip);
    }
  }

  removeIpAddress(ip: string) {
    this.ipAddresses = this.ipAddresses.filter(addr => addr !== ip);
  }
}

// Represents a link connecting two interfaces
export class Link {
  interfaceA: NetworkInterface;
  interfaceB: NetworkInterface;
  status: 'up' | 'down';

  constructor(interfaceA: NetworkInterface, interfaceB: NetworkInterface) {
    this.interfaceA = interfaceA;
    this.interfaceB = interfaceB;
    this.status = 'up';

    interfaceA.link = this;
    interfaceB.link = this;
  }

  setStatus(status: 'up' | 'down') {
    this.status = status;
    this.interfaceA.setStatus(status);
    this.interfaceB.setStatus(status);
  }
}

// Represents a network device (router)
export class Device {
  id: string;

  sendPacket(interfaceId: string, packet: Packet): void {
    console.log(`[Device ${this.id}] Sending packet on interface ${interfaceId}:`, packet);
    // TODO: Implement packet delivery to connected device
  }

  getLocalPrefixes(): string[] {
    // TODO: Return actual connected prefixes
    return [];
  }
  name: string;
  interfaces: Map<string, NetworkInterface>;
  routingEngines: RoutingEngine[];
  routingTable: RoutingEntry[];

  constructor(id: string, name?: string) {
    this.id = id;
    this.name = name ?? id;
    this.interfaces = new Map();
    this.routingEngines = [];
    this.routingTable = [];
  }

  addInterface(name: string): NetworkInterface {
    const intf = new NetworkInterface(name);
    this.interfaces.set(name, intf);
    return intf;
  }

  getInterface(name: string): NetworkInterface | undefined {
    return this.interfaces.get(name);
  }

  addRoutingEngine(engine: RoutingEngine) {
    if (!this.routingEngines.some(e => e.protocol === engine.protocol)) {
      this.routingEngines.push(engine);
      engine.init(this, TopologyManager.instance);
      console.log(`[Device ${this.id}] Added routing engine: ${engine.protocol}`);
    } else {
      console.warn(`[Device ${this.id}] Routing engine ${engine.protocol} already exists.`);
    }
  }

  updateRoutingTable() {
    // Aggregate routes from all engines
    const allRoutes: RoutingEntry[] = [];
    for (const engine of this.routingEngines) {
      allRoutes.push(...engine.getRoutingTable());
    }
    // TODO: Apply administrative distance, longest prefix match, etc.
    this.routingTable = allRoutes;
  }
}

// Manages the entire network topology
export class TopologyManager {
  private static _instance: TopologyManager;
  devices: Map<string, Device>;
  links: Set<Link>;

  private constructor() {
    this.devices = new Map();
    this.links = new Set();
  }

  static get instance(): TopologyManager {
    if (!this._instance) {
      this._instance = new TopologyManager();
    }
    return this._instance;
  }

  addDevice(id: string): Device {
    const device = new Device(id);
    this.devices.set(id, device);
    return device;
  }

  getDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  connectInterfaces(intfA: NetworkInterface, intfB: NetworkInterface): Link {
    const link = new Link(intfA, intfB);
    this.links.add(link);
    return link;
  }

  removeLink(link: Link) {
    link.interfaceA.link = null;
    link.interfaceB.link = null;
    this.links.delete(link);
  }

  removeDevice(id: string) {
    const device = this.devices.get(id);
    if (!device) return;
    for (const intf of device.interfaces.values()) {
      if (intf.link) {
        this.removeLink(intf.link);
      }
    }
    this.devices.delete(id);
  }
}
