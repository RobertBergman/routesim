import express, { Request, Response, RequestHandler } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { TopologyManager, Device, Link, NetworkInterface } from '../../core/src/simulation/TopologyModels';
import { networkInterfaces } from 'os';
import fs from 'fs';
import path from 'path';

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Function to get local IP addresses for external connections
function getLocalIpAddresses(): string[] {
  const interfaces = networkInterfaces();
  const ipAddresses: string[] = [];
  
  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    if (interfaceInfo) {
      for (const info of interfaceInfo) {
        // Only include IPv4 addresses that aren't loopback (127.0.0.1)
        if (info.family === 'IPv4' && !info.internal) {
          ipAddresses.push(info.address);
        }
      }
    }
  }
  
  return ipAddresses;
}

// Topology Storage directory
const TOPOLOGY_DIR = path.join(__dirname, '../../topologies');
// Ensure the directory exists
if (!fs.existsSync(TOPOLOGY_DIR)) {
  fs.mkdirSync(TOPOLOGY_DIR, { recursive: true });
}

// Create HTTP server and WebSocket server
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  // Add WebSocket server options for handling external connections 
  perMessageDeflate: false, // Disable per-message deflate to avoid some issues
  clientTracking: true, // Enable client tracking for managing connections
});

// Ensure CORS headers for WebSocket
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Set to store connected WebSocket clients
const connectedClients = new Set<WebSocket>();

// Access the singleton instance of TopologyManager
const topologyManager = TopologyManager.instance;

// Create some initial test devices and links for testing
function createInitialTopology() {
  // Create devices
  const router1 = topologyManager.addDevice('Router1');
  const router2 = topologyManager.addDevice('Router2');
  
  // Create interfaces
  const r1if1 = router1.addInterface('eth0');
  const r2if1 = router2.addInterface('eth0');
  
  // Create a link between the interfaces
  topologyManager.connectInterfaces(r1if1, r2if1);
  
  console.log(`Initial topology created with ${topologyManager.devices.size} devices and ${topologyManager.links.size} links`);
}

// Initialize test topology
// createInitialTopology();

// Convert the topology to a format suitable for the frontend
function getSerializableTopology() {
  // Convert Map to Array and then map each device
  const devices = Array.from(topologyManager.devices.values()).map((device: Device) => ({
    id: device.id,
    name: device.name,
    interfaces: Array.from(device.interfaces.values()).map((intf: NetworkInterface) => intf.name)
  }));
  
  // Convert Set to Array and then map each link
  const links = Array.from(topologyManager.links).map((link: Link) => {
    // Find devices for interfaces by searching through all devices
    let deviceA: Device | undefined;
    let deviceB: Device | undefined;
    
    // Look through all devices to find which one contains these interfaces
    for (const device of topologyManager.devices.values()) {
      if (device.interfaces.has(link.interfaceA.name)) {
        deviceA = device;
      }
      if (device.interfaces.has(link.interfaceB.name)) {
        deviceB = device;
      }
      
      // Break early if both found
      if (deviceA && deviceB) break;
    }
    
    return {
      interfaceA: {
        deviceId: deviceA ? deviceA.id : "unknown",
        name: link.interfaceA.name
      },
      interfaceB: {
        deviceId: deviceB ? deviceB.id : "unknown",
        name: link.interfaceB.name
      }
    };
  });
  
  return { devices, links };
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);
  
  // Handle incoming messages
  ws.on('message', (messageData) => {
    try {
      const message = JSON.parse(messageData.toString());
      console.log(`Received message type: ${message.type}`);
      
      switch (message.type) {
        case 'request_topology':
          // Send current topology state using the topology manager
          const topology = getSerializableTopology();
          
          ws.send(JSON.stringify({
            type: 'initial_topology',
            data: topology
          }));
          break;
          
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });
});

// Function to broadcast topology updates to all clients
function broadcastTopologyUpdate() {
  const topology = getSerializableTopology();
  
  const message = JSON.stringify({
    type: 'topology_update',
    data: topology
  });
  
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// API routes
// --- Topology API Routes ---

// GET /api/topology - Get the current topology
app.get('/api/topology', (req: Request, res: Response) => {
  try {
    const topology = getSerializableTopology();
    res.json(topology);
  } catch (error) {
    console.error('Error getting topology:', error);
    res.status(500).json({ error: 'Failed to get topology' });
  }
});

// POST /api/topology/devices - Add a new device
app.post('/api/topology/devices', ((req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    // Generate a unique ID if not provided
    const deviceId = req.body.id || `device-${Date.now()}`;
    const device = topologyManager.addDevice(deviceId);
    device.name = name;
    
    // Convert to frontend device format
    const responseDevice = {
      id: device.id,
      name: device.name,
      interfaces: []
    };
    
    // Broadcast update to all WebSocket clients
    broadcastTopologyUpdate();
    
    res.status(201).json(responseDevice);
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ error: 'Failed to add device' });
  }
}) as RequestHandler);

// POST /api/topology/devices/:id/interfaces - Add an interface to a device
app.post('/api/topology/devices/:id/interfaces', ((req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Interface name is required' });
    }
    
    const device = topologyManager.getDevice(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Check if interface already exists
    if (device.interfaces.has(name)) {
      return res.status(400).json({ error: `Interface ${name} already exists on device ${id}` });
    }
    
    const newInterface = device.addInterface(name);
    
    // Broadcast update
    broadcastTopologyUpdate();
    
    res.status(201).json({ name: newInterface.name });
  } catch (error) {
    console.error('Error adding interface:', error);
    res.status(500).json({ error: 'Failed to add interface' });
  }
}) as RequestHandler);

// POST /api/topology/links - Create a link between interfaces
app.post('/api/topology/links', ((req: Request, res: Response) => {
  try {
    const { sourceDeviceName, sourceInterfaceName, targetDeviceName, targetInterfaceName } = req.body;
    
    // Validate input
    if (!sourceDeviceName || !sourceInterfaceName || !targetDeviceName || !targetInterfaceName) {
      return res.status(400).json({ 
        error: 'Source and target device and interface names are required' 
      });
    }
    
    // Find devices by name (or use ID if that's what's passed)
    let sourceDevice: Device | undefined;
    let targetDevice: Device | undefined;
    
    for (const device of topologyManager.devices.values()) {
      if (device.name === sourceDeviceName || device.id === sourceDeviceName) {
        sourceDevice = device;
      }
      if (device.name === targetDeviceName || device.id === targetDeviceName) {
        targetDevice = device;
      }
    }
    
    if (!sourceDevice) {
      return res.status(404).json({ error: `Source device ${sourceDeviceName} not found` });
    }
    if (!targetDevice) {
      return res.status(404).json({ error: `Target device ${targetDeviceName} not found` });
    }
    
    // Get interfaces
    const sourceInterface = sourceDevice.getInterface(sourceInterfaceName);
    const targetInterface = targetDevice.getInterface(targetInterfaceName);
    
    if (!sourceInterface) {
      return res.status(404).json({ 
        error: `Interface ${sourceInterfaceName} not found on device ${sourceDeviceName}` 
      });
    }
    if (!targetInterface) {
      return res.status(404).json({ 
        error: `Interface ${targetInterfaceName} not found on device ${targetDeviceName}` 
      });
    }
    
    // Check if either interface is already connected
    if (sourceInterface.link) {
      return res.status(400).json({ 
        error: `Interface ${sourceInterfaceName} on device ${sourceDeviceName} is already connected` 
      });
    }
    if (targetInterface.link) {
      return res.status(400).json({ 
        error: `Interface ${targetInterfaceName} on device ${targetDeviceName} is already connected` 
      });
    }
    
    // Create the link
    const link = topologyManager.connectInterfaces(sourceInterface, targetInterface);
    
    // Generate a response with the new link
    const responseLink = {
      id: `${sourceDevice.id}:${sourceInterfaceName}-${targetDevice.id}:${targetInterfaceName}`,
      sourceDeviceId: sourceDevice.id,
      sourceInterfaceName: sourceInterfaceName,
      targetDeviceId: targetDevice.id,
      targetInterfaceName: targetInterfaceName
    };
    
    // Broadcast update
    broadcastTopologyUpdate();
    
    res.status(201).json(responseLink);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
}) as RequestHandler);

// DELETE /api/topology/devices/:id - Remove a device
app.delete('/api/topology/devices/:id', ((req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = topologyManager.getDevice(id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    topologyManager.removeDevice(id);
    
    // Broadcast update
    broadcastTopologyUpdate();
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
}) as RequestHandler);

// Start the server - listen on all network interfaces
const serverPort = Number(PORT);
server.listen(serverPort, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  
  console.log(`Server running on port ${serverPort}`);
  console.log(`You can access the server locally at: http://localhost:${serverPort}`);
  
  if (localIps.length > 0) {
    console.log('\nTo connect from other computers on the same network, use one of:');
    localIps.forEach(ip => {
      console.log(`http://${ip}:${serverPort}`);
    });
  } else {
    console.log('\nNo network interfaces found for external connections.');
  }
  
  console.log('\nWebSocket connections available at:');
  console.log(`ws://localhost:${serverPort}`);
  localIps.forEach(ip => {
    console.log(`ws://${ip}:${serverPort}`);
  });
});

export { server };
