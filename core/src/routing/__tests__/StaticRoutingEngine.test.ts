import { StaticRoutingEngine } from '../StaticRoutingEngine';
import type { Device, TopologyManager, InterfaceEvent, Packet, NetworkInterface, RoutingEntry } from '../../simulation/TopologyModels';

describe('StaticRoutingEngine', () => {
  let engine: StaticRoutingEngine;
  const mockDevice = {} as Device;
  const mockTopology = {} as TopologyManager;

  beforeEach(() => {
    engine = new StaticRoutingEngine();
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
