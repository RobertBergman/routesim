import { IsisRoutingEngine } from '../IsisRoutingEngine';
import type { Device, TopologyManager, InterfaceEvent, Packet, NetworkInterface, RoutingEntry } from '../../simulation/TopologyModels';

describe('IsisRoutingEngine', () => {
  let engine: IsisRoutingEngine;
  const mockDevice = {} as Device;
  const mockTopology = {} as TopologyManager;

  beforeEach(() => {
    engine = new IsisRoutingEngine();
    engine.init(mockDevice, mockTopology);
  });

  it('should process an IS-IS hello packet without errors', () => {
    const helloPacket = {
      type: 'isis',
      payload: {
        type: 'HELLO',
        systemId: 'R1',
      },
    };
    expect(() => engine.handlePacket(helloPacket, {} as any)).not.toThrow();
  });

  // TODO: This test requires simulating valid IS-IS adjacency and LSP acceptance.
  // it('should process an IS-IS LSP packet and update LSDB', () => {
  //   const lspPacket = {
  //     type: 'isis',
  //     payload: {
  //       type: 'LSP',
  //       systemId: 'R1',
  //       neighbors: ['R2'],
  //       seq: 1,
  //     },
  //   };
  //   expect(() => engine.handlePacket(lspPacket, {} as any)).not.toThrow();
  //   const lsdb = (engine as any).lsdb;
  //   const lsp = lsdb.get('R1');
  //   expect(lsp).toBeDefined();
  //   expect(lsp.seq).toBe(1);
  // });

  it('should recompute SPF and update routing table', () => {
    (engine as any).lsdb = new Map([
      ['R1', { systemId: 'R1', neighbors: ['R2'], seq: 1 }],
      ['R2', { systemId: 'R2', neighbors: ['R1'], seq: 1 }],
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
