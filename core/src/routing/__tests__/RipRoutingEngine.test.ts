import { RipRoutingEngine } from '../RipRoutingEngine';
import type { Device, TopologyManager, InterfaceEvent, Packet, NetworkInterface, RoutingEntry } from '../../simulation/TopologyModels';

describe('RipRoutingEngine', () => {
  let engine: RipRoutingEngine;
  const mockDevice = {} as Device;
  const mockTopology = {} as TopologyManager;

  beforeEach(() => {
    engine = new RipRoutingEngine();
    engine.init(mockDevice, mockTopology);
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
