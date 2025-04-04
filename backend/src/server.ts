import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { TopologyManager } from '../../core/src/simulation/TopologyModels';
import type { Request, Response, RequestHandler } from 'express';

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

/** TOPOLOGY MANAGEMENT **/

// List devices
app.get('/api/topology/devices', (req: Request, res: Response) => {
  const devices = Array.from(TopologyManager.instance.devices.values()).map(d => ({
    id: d.id,
    name: d.name,
    interfaces: Array.from(d.interfaces.keys()),
  }));
  res.json(devices);
});

// Delete device
app.delete('/api/topology/devices/:deviceId', (req: Request, res: Response) => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  TopologyManager.instance.removeDevice(req.params.deviceId);
  res.json({ message: 'Device deleted' });
});

app.post('/api/topology/devices', (((req: Request, res: Response) => {
  const { id, name } = req.body;
  // Use name as ID if ID is not provided. Ensure name is provided.
  const deviceId = id || name;
  if (!deviceId) {
    return res.status(400).json({ error: 'Device name (or id) is required' });
  }
  if (TopologyManager.instance.devices.has(deviceId)) {
      return res.status(400).json({ error: `Device with id/name '${deviceId}' already exists` });
  }

  const device = TopologyManager.instance.addDevice(deviceId);
  // Ensure the device name is set, defaulting to the ID if name wasn't explicitly provided
  device.name = name || deviceId;

  console.log(`Device added: ID=${device.id}, Name=${device.name}`); // Add logging
  // Return the simplified device structure expected by the frontend
  return res.status(201).json({
    id: device.id,
    name: device.name,
    interfaces: Array.from(device.interfaces.keys()), // Return empty interfaces array initially
   });
}) as unknown) as RequestHandler);

/** INTERFACE MANAGEMENT **/

import type { ParsedQs } from 'qs';

// List interfaces on a device
app.get('/api/topology/devices/:deviceId/interfaces', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const interfaces = Array.from(device.interfaces.values()).map(intf => ({
    name: intf.name,
    ipAddresses: intf.ipAddresses,
    status: intf.status,
    link: intf.link ? true : false,
  }));
  res.json(interfaces);
});

// Add interface to a device
app.post('/api/topology/devices/:deviceId/interfaces', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'Interface name required' }); return; }
  if (device.interfaces.has(name)) {
    res.status(400).json({ error: 'Interface already exists' }); return;
  }
  const intf = device.addInterface(name);
  res.json({ name: intf.name });
});

// Update interface config (IPs, status)
app.put('/api/topology/devices/:deviceId/interfaces/:ifName', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const intf = device.getInterface(req.params.ifName);
  if (!intf) { res.status(404).json({ error: 'Interface not found' }); return; }

  const { ipAddresses, status } = req.body;
  if (ipAddresses) {
    intf.ipAddresses = ipAddresses;
  }
  if (status) {
    intf.setStatus(status);
  }
  res.json({ message: 'Interface updated' });
});

// Delete interface from device
app.delete('/api/topology/devices/:deviceId/interfaces/:ifName', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const intf = device.getInterface(req.params.ifName);
  if (!intf) { res.status(404).json({ error: 'Interface not found' }); return; }
  if (intf.link) {
    TopologyManager.instance.removeLink(intf.link);
  }
  device.interfaces.delete(req.params.ifName);
  res.json({ message: 'Interface deleted' });
});

/** LINK MANAGEMENT **/

// List all links
app.get('/api/topology/links', (req: Request, res: Response): void => {
  const links = Array.from(TopologyManager.instance.links).map(link => ({
    interfaceA: {
      deviceId: getDeviceIdByInterface(link.interfaceA),
      name: link.interfaceA.name,
    },
    interfaceB: {
      deviceId: getDeviceIdByInterface(link.interfaceB),
      name: link.interfaceB.name,
    },
    status: link.status,
  }));
  res.json(links);
});

// Helper to find device ID by interface reference
function getDeviceIdByInterface(intf: import('../../core/src/simulation/TopologyModels').NetworkInterface): string | null {
  for (const [devId, dev] of TopologyManager.instance.devices.entries()) {
    for (const iface of dev.interfaces.values()) {
      if (iface === intf) return devId;
    }
  }
  return null;
}

// Helper to find device by name
function findDeviceByName(name: string): import('../../core/src/simulation/TopologyModels').Device | undefined {
    return Array.from(TopologyManager.instance.devices.values()).find(d => d.name === name);
}

// Create a link between two interfaces using names
app.post('/api/topology/links', (req: Request, res: Response): void => {
  const { sourceDeviceName, sourceInterfaceName, targetDeviceName, targetInterfaceName } = req.body;

  if (!sourceDeviceName || !sourceInterfaceName || !targetDeviceName || !targetInterfaceName) {
    res.status(400).json({ error: 'Missing required fields: sourceDeviceName, sourceInterfaceName, targetDeviceName, targetInterfaceName' });
    return;
  }

  // Find devices by name
  const devA = findDeviceByName(sourceDeviceName);
  const devB = findDeviceByName(targetDeviceName);
  if (!devA || !devB) {
    res.status(404).json({ error: `Device not found (Source: ${sourceDeviceName}, Target: ${targetDeviceName})` });
    return;
  }

  // Get interfaces by name
  const intfA = devA.getInterface(sourceInterfaceName);
  const intfB = devB.getInterface(targetInterfaceName);
  if (!intfA || !intfB) {
    res.status(404).json({ error: `Interface not found (Source: ${sourceInterfaceName} on ${sourceDeviceName}, Target: ${targetInterfaceName} on ${targetDeviceName})` });
    return;
  }

  // Check if interfaces are already linked
  if (intfA.link || intfB.link) {
    res.status(400).json({ error: 'One or both interfaces already linked' });
    return;
  }

  try {
    const link = TopologyManager.instance.connectInterfaces(intfA, intfB);
    console.log(`Link created between ${devA.name}/${intfA.name} and ${devB.name}/${intfB.name}`);
    // Generate a simple ID for the frontend, as the core Link model doesn't have one
    const generatedLinkId = `${devA.id}:${intfA.name}<->${devB.id}:${intfB.name}`;
    // Respond with simplified link info (using IDs, as frontend Link type expects IDs)
    res.status(201).json({
        id: generatedLinkId,
        sourceDeviceId: devA.id,
        sourceInterfaceName: intfA.name,
        targetDeviceId: devB.id,
        targetInterfaceName: intfB.name,
    });
  } catch (error) {
      console.error("Error creating link:", error);
      res.status(500).json({ error: "Internal server error creating link" });
  }
});

// Delete a link between two interfaces (using names for lookup)
app.delete('/api/topology/links', (req: Request, res: Response): void => {
  // Note: Deleting links might be easier via link ID if available,
  // or by specifying just one device/interface pair of the link.
  // Using names requires finding both devices and interfaces first.
  const { sourceDeviceName, sourceInterfaceName, targetDeviceName, targetInterfaceName } = req.body; // Or adjust based on how deletion is triggered

  if (!sourceDeviceName || !sourceInterfaceName) { // Need at least one side to find the link
      res.status(400).json({ error: 'Missing required fields for link deletion (e.g., sourceDeviceName, sourceInterfaceName)' });
      return;
  }

  const devA = findDeviceByName(sourceDeviceName);
  // const devB = findDeviceByName(targetDeviceName); // Don't strictly need devB if we find link via devA/intfA
  if (!devA) { res.status(404).json({ error: `Device '${sourceDeviceName}' not found` }); return; }

  const intfA = devA.getInterface(sourceInterfaceName);
  // const intfB = devB ? devB.getInterface(targetInterfaceName) : undefined; // Don't strictly need intfB
  if (!intfA) { res.status(404).json({ error: `Interface '${sourceInterfaceName}' not found on device '${sourceDeviceName}'` }); return; }

  const link = intfA.link;
  // Optional: Add check if targetDeviceName/targetInterfaceName were provided and match link.interfaceB
  // if (targetDeviceName && targetInterfaceName) {
  //    const devB = findDeviceByName(targetDeviceName);
  //    const intfB = devB?.getInterface(targetInterfaceName);
  //    if (!link || link.interfaceB !== intfB) { /* Link mismatch */ }
  // }

  // Check if the interface is actually linked
  if (!link) {
      res.status(404).json({ error: `Link not found on interface '${sourceInterfaceName}' of device '${sourceDeviceName}'` });
      return;
  }

  TopologyManager.instance.removeLink(link);
  console.log(`Link removed involving ${devA.name}/${intfA.name}`);
  res.json({ message: 'Link deleted' });
});

/** PROTOCOL CONFIGURATION **/

// List protocols on a device
app.get('/api/topology/devices/:deviceId/protocols', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const protocols = device.routingEngines.map(engine => engine.constructor.name);
  res.json(protocols);
});

// Add protocol to a device
app.post('/api/topology/devices/:deviceId/protocols', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const { protocol } = req.body;
  if (!protocol) { res.status(400).json({ error: 'Protocol name required' }); return; }

  let engine: import('../../core/src/routing/RoutingEngine').RoutingEngine | null = null;
  switch (protocol.toLowerCase()) {
    case 'static':
      engine = new (require('../../core/src/routing/StaticRoutingEngine').StaticRoutingEngine)();
      break;
    case 'rip':
      engine = new (require('../../core/src/routing/RipRoutingEngine').RipRoutingEngine)();
      break;
    case 'ospf':
      engine = new (require('../../core/src/routing/OspfRoutingEngine').OspfRoutingEngine)();
      break;
    case 'isis':
      engine = new (require('../../core/src/routing/IsisRoutingEngine').IsisRoutingEngine)();
      break;
    case 'bgp':
      engine = new (require('../../core/src/routing/BgpRoutingEngine').BgpRoutingEngine)();
      break;
    default:
      res.status(400).json({ error: 'Unsupported protocol' }); return;
  }

  if (engine) {
    device.addRoutingEngine(engine);
    res.json({ message: 'Protocol added' });
  } else {
    res.status(400).json({ error: 'Failed to create protocol engine' }); return;
  }
});

// Delete protocol from device
app.delete('/api/topology/devices/:deviceId/protocols/:protocolName', (req: Request, res: Response): void => {
  const device = TopologyManager.instance.getDevice(req.params.deviceId);
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
  const protoName = req.params.protocolName.toLowerCase();
  const index = device.routingEngines.findIndex(
    e => e.constructor.name.toLowerCase().includes(protoName)
  );
  if (index === -1) { res.status(404).json({ error: 'Protocol not found' }); return; }
  device.routingEngines.splice(index, 1);
  res.json({ message: 'Protocol removed' });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // TODO: Handle simulation control messages
  });

  ws.send(JSON.stringify({ message: 'Connected to routing simulator backend' }));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
