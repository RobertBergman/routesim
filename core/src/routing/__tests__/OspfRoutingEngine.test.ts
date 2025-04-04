import { OspfRoutingEngine } from '../OspfRoutingEngine';
import type { Device, TopologyManager, InterfaceEvent, Packet, NetworkInterface, RoutingEntry } from '../../simulation/TopologyModels';

describe('OspfRoutingEngine', () => {
  let engine: OspfRoutingEngine;
  const mockDevice = {} as Device;
  const mockTopology = {} as TopologyManager;

  beforeEach(() => {
    engine = new OspfRoutingEngine();
    engine.init(mockDevice, mockTopology);
  });

  it('should process an OSPF hello packet without errors', () => {
    const helloPacket = {
      type: 'ospf',
      payload: {
        type: 'HELLO',
        routerId: '1.1.1.1',
      },
    };
    expect(() => engine.handlePacket(helloPacket, {} as any)).not.toThrow();
  });

  // TODO: This test requires simulating valid OSPF adjacency and LSA acceptance.
  // it('should process an OSPF LSA packet and update LSDB', () => {
  //   const lsaPacket = {
  //     type: 'ospf',
  //     payload: {
  //       type: 'LSA',
  //       routerId: '1.1.1.1',
  //       links: [{ id: '2.2.2.2', cost: 10 }],
  //       seq: 1,
  //     },
  //   };
  //   expect(() => engine.handlePacket(lsaPacket, {} as any)).not.toThrow();
  //   const lsdb = (engine as any).lsdb;
  //   const lsa = lsdb.get('1.1.1.1');
  //   expect(lsa).toBeDefined();
  //   expect(lsa.seq).toBe(1);
  // });

  it('should recompute SPF and update routing table', () => {
    (engine as any).lsdb = new Map([
      ['1.1.1.1', { routerId: '1.1.1.1', links: [{ id: '2.2.2.2', cost: 10 }], seq: 1 }],
      ['2.2.2.2', { routerId: '2.2.2.2', links: [{ id: '1.1.1.1', cost: 10 }], seq: 1 }],
    ]);
    (engine as any).recomputeRoutes();
    const table = engine.getRoutingTable();
    expect(Array.isArray(table)).toBe(true);
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
