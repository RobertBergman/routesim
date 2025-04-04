import {
  RoutingEngine,
  Device,
  TopologyManager,
  InterfaceEvent,
  Packet,
  NetworkInterface,
  RoutingEntry,
} from './RoutingEngine';

export class BgpRoutingEngine implements RoutingEngine {
  protocol = 'bgp';

  private device!: Device;
  private topology!: TopologyManager;
  private routingTable: RoutingEntry[] = [];

  private peers: Map<string, { state: string; timers: { holdTimer?: NodeJS.Timeout; keepaliveTimer?: NodeJS.Timeout } }> = new Map();
  private adjRibIn: Map<string, any[]> = new Map(); // peerId -> received routes
  private adjRibOut: Map<string, any[]> = new Map(); // peerId -> advertised routes

  init(device: Device, topology: TopologyManager): void {
    this.device = device;
    this.topology = topology;
    console.log(`[BgpRoutingEngine] Initialized on device ${device.name}`);
    this.peers.clear();
    this.adjRibIn.clear();
    this.adjRibOut.clear();
    this.routingTable = [];
    // Initialize timers and peer states
  }

  handleInterfaceChange(event: InterfaceEvent): void {
    console.log(`[BgpRoutingEngine] Interface change: ${event.interfaceId} is ${event.status}`);
    // Could trigger peer resets if interface down
  }

  handlePacket(packet: Packet, ingressInterface: NetworkInterface): void {
    console.log(`[BgpRoutingEngine] Received packet of type ${packet.type} on interface ${ingressInterface.name}`);
    if (packet.type === 'bgp-open') {
      this.processOpen(packet.payload, ingressInterface);
    } else if (packet.type === 'bgp-keepalive') {
      this.processKeepalive(packet.payload, ingressInterface);
    } else if (packet.type === 'bgp-update') {
      this.processUpdate(packet.payload, ingressInterface);
    }
  }

  getRoutingTable(): RoutingEntry[] {
    return this.routingTable;
  }

  shutdown(): void {
    console.log(`[BgpRoutingEngine] Shutdown`);
    this.routingTable = [];
    this.peers.clear();
    this.adjRibIn.clear();
    this.adjRibOut.clear();
  }

  private processOpen(payload: any, ingressInterface: NetworkInterface) {
    console.log(`[BgpRoutingEngine] Processing BGP OPEN from ${payload.peerId}`);
    // Set peer state to Established and start timers
    this.peers.set(payload.peerId, {
      state: 'Established',
      timers: {},
    });
    this.startHoldTimer(payload.peerId);
    this.startKeepaliveTimer(payload.peerId, ingressInterface);

    const keepalive: Packet = {
      type: 'bgp-keepalive',
      payload: { peerId: this.device.name },
    };
    this.device.sendPacket(ingressInterface.name, keepalive); // Use name as the identifier
  }

  private processKeepalive(payload: any, ingressInterface: NetworkInterface) {
    console.log(`[BgpRoutingEngine] Processing BGP KEEPALIVE from ${payload.peerId}`);
    const peer = this.peers.get(payload.peerId);
    if (peer) {
      this.resetHoldTimer(payload.peerId);
    }
  }

  private processUpdate(payload: any, ingressInterface: NetworkInterface) {
    console.log(`[BgpRoutingEngine] Processing BGP UPDATE from ${payload.peerId}`);
    const routes = payload.routes || [];
    this.adjRibIn.set(payload.peerId, routes);
    this.recomputeRoutes();
  }

  private startHoldTimer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (peer.timers.holdTimer) clearTimeout(peer.timers.holdTimer);
    peer.timers.holdTimer = setTimeout(() => {
      console.log(`[BgpRoutingEngine] Hold timer expired for peer ${peerId}`);
      this.peers.delete(peerId);
      this.recomputeRoutes();
    }, 90000); // 90 seconds default hold time
  }

  private resetHoldTimer(peerId: string) {
    this.startHoldTimer(peerId);
  }

  private startKeepaliveTimer(peerId: string, ingressInterface: NetworkInterface) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (peer.timers.keepaliveTimer) clearInterval(peer.timers.keepaliveTimer);
    peer.timers.keepaliveTimer = setInterval(() => {
      console.log(`[BgpRoutingEngine] Sending KEEPALIVE to ${peerId}`);
      const keepalive: Packet = {
        type: 'bgp-keepalive',
      payload: { peerId: this.device.name },
    };
    this.device.sendPacket(ingressInterface.name, keepalive); // Use name as the identifier
  }, 30000); // 30 seconds default keepalive interval
}

  private recomputeRoutes() {
    console.log(`[BgpRoutingEngine] Recomputing BGP best paths`);
    const bestRoutes: Map<string, { route: any; peerId: string }> = new Map();

    for (const [peerId, routes] of this.adjRibIn.entries()) {
      for (const route of routes) {
        const prefix = route.prefix;
        const existing = bestRoutes.get(prefix);
        if (!existing) {
          bestRoutes.set(prefix, { route, peerId });
        } else {
          const better = this.compareRoutes(route, existing.route);
          if (better) {
            bestRoutes.set(prefix, { route, peerId });
          }
        }
      }
    }

    const newTable: RoutingEntry[] = [];
    for (const [prefix, { route }] of bestRoutes.entries()) {
      newTable.push({
        destination: prefix,
        nextHop: route.nextHop,
        metric: route.metric || 0,
        protocol: 'bgp',
        administrativeDistance: 20,
      });
    }
    this.routingTable = newTable;
  }

  private compareRoutes(a: any, b: any): boolean {
    // Simplified BGP best path selection
    if (a.localPref !== b.localPref) {
      return (a.localPref || 100) > (b.localPref || 100);
    }
    if ((a.asPath?.length || 0) !== (b.asPath?.length || 0)) {
      return (a.asPath?.length || 0) < (b.asPath?.length || 0);
    }
    if ((a.med || 0) !== (b.med || 0)) {
      return (a.med || 0) < (b.med || 0);
    }
    return false; // prefer existing
  }
}
