import { BgpRoutingEngine } from '../BgpRoutingEngine';
import type { Device, TopologyManager, InterfaceEvent, Packet, NetworkInterface, RoutingEntry } from '../../simulation/TopologyModels';

describe('BgpRoutingEngine', () => {
  let engine: BgpRoutingEngine;
  const mockDevice = {} as Device;
  const mockTopology = {} as TopologyManager;

  beforeEach(() => {
    engine = new BgpRoutingEngine();
    engine.init(mockDevice, mockTopology);
  });

  it('should process a BGP OPEN message without errors', () => {
    const openPacket = {
      type: 'bgp',
      payload: {
        type: 'OPEN',
        asNumber: 65001,
        routerId: '1.1.1.1',
      },
    };
    expect(() => engine.handlePacket(openPacket, {} as any)).not.toThrow();
  });

  // TODO: This test requires simulating a valid BGP session before UPDATEs are accepted.
  // it('should process a BGP UPDATE message and add a route', () => {
  //   const updatePacket = {
  //     type: 'bgp',
  //     payload: {
  //       type: 'UPDATE',
  //       prefix: '10.0.0.0/24',
  //       nextHop: '192.0.2.1',
  //       asPath: [65001],
  //       localPref: 100,
  //       med: 0,
  //     },
  //   };
  //   expect(() => engine.handlePacket(updatePacket, {} as any)).not.toThrow();
  //   const table = engine.getRoutingTable();
  //   expect(table.some(r => r.destination === '10.0.0.0/24')).toBe(true);
  // });

  it('should select the best path based on local preference', () => {
    (engine as any).adjRibIn = new Map([
      ['peer1', [
        { prefix: '10.0.0.0/24', nextHop: '192.0.2.1', asPath: [65001], localPref: 200, med: 0 },
        { prefix: '10.0.0.0/24', nextHop: '192.0.2.2', asPath: [65002], localPref: 100, med: 0 },
      ]],
    ]);
    (engine as any).recomputeRoutes();
    const table = engine.getRoutingTable();
    expect(table.length).toBe(1);
    expect(table[0].nextHop).toBe('192.0.2.1');
  });

  it('should initialize without errors', () => {
    expect(engine).toBeDefined();
  });

  it('should return an empty routing table initially', () => {
    const table = engine.getRoutingTable();
    expect(Array.isArray(table)).toBe(true);
    expect(table.length).toBe(0);
  });
});
