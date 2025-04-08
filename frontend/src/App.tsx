import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import SimulatorPage from './pages/SimulatorPage';
import { Device as CoreDevice, Link as CoreLink, NetworkInterface as CoreInterface } from '../../core/src/simulation/TopologyModels'; // Adjust path if needed

// --- Frontend State Types ---
export interface DeviceInterface { // Renamed from inline object for clarity
  name: string;
  ipAddresses: string[];
  linkId?: string;
}
export interface Device {
  id: string;
  name: string;
  interfaces: DeviceInterface[]; // Use the defined interface type
  position?: { x: number, y: number }; // Optional position for topology display
}

export interface Link {
  id: string; // Need a unique ID for links, maybe generated on backend or frontend
  sourceDeviceId: string;
  sourceInterfaceName: string;
  targetDeviceId: string;
  targetInterfaceName: string;
}

// --- Import/Export JSON Types ---
// Matches the format provided in the task description
interface JsonNode {
  id: string;
  name: string;
  type?: string; // Optional fields from example
  model?: string; // Optional fields from example
}

interface JsonLink {
  source: string; // Device ID
  target: string; // Device ID
  sourceInterface: string;
  targetInterface: string;
  speed?: string; // Optional fields from example
  type?: string; // Optional fields from example
}

interface TopologyJson {
  nodes: JsonNode[];
  links: JsonLink[];
}

// --- Constants ---
const API_BASE_URL = 'http://localhost:3001/api'; // Assuming backend runs on 3001
const LOCAL_STORAGE_KEY = 'routeSimTopology';

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true); // Ref to track initial load vs subsequent updates
  const wsRef = useRef<WebSocket | null>(null); // Ref to hold the WebSocket instance

  // Load topology from Local Storage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        console.log("Loading saved topology from Local Storage...");
        const parsed = JSON.parse(saved);
        if (parsed.devices && parsed.links) {
          setDevices(parsed.devices);
          setLinks(parsed.links);
        } else {
          console.warn("Saved topology missing devices or links, starting empty.");
          setDevices([]);
          setLinks([]);
        }
      } else {
        console.log("No saved topology found, starting empty.");
        setDevices([]);
        setLinks([]);
      }
    } catch (err) {
      console.error("Error loading topology from Local Storage:", err);
      setDevices([]);
      setLinks([]);
    }
    setLoading(false);
    isInitialLoad.current = false;
  }, []); // Empty dependency array: Runs only once on mount

  // Save topology to Local Storage whenever devices or links change (after initial load)
  useEffect(() => {
    // Only save after the initial load is complete
    if (!isInitialLoad.current && !loading) {
      try {
        console.log("Saving topology to Local Storage...");
        const topologyToSave = JSON.stringify({ devices, links });
        localStorage.setItem(LOCAL_STORAGE_KEY, topologyToSave);
      } catch (err) {
        console.error("Error saving topology to Local Storage:", err);
        // Optionally notify the user or handle the error
        setError("Failed to save topology state.");
      }
    }
  }, [devices, links, loading]); // Dependency array: Runs when devices, links, or loading state change

  // WebSocket connection setup with reconnection mechanism
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const connectWebSocket = () => {
      const socketUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:3001' 
        : `ws://${window.location.hostname}:3001`;
      
      console.log("Attempting WebSocket connection to:", socketUrl);
      
      // Prevent multiple connections
      if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
        console.log("WebSocket connection already exists or is connecting.");
        return;
      }
      
      try {
        wsRef.current = new WebSocket(socketUrl);
        const ws = wsRef.current; // Use local variable for easier access in handlers
        
        // Connection established
        ws.onopen = () => {
          console.log('WebSocket connection established');
          setWsConnected(true);
          setError(null);
          
          // Request current topology state
          ws.send(JSON.stringify({ type: 'request_topology' }));
          
          // Clear any reconnection timeouts
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };
        
        // Message received
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message.type);
            
            switch (message.type) {
              case 'initial_topology':
              case 'topology_update': {
                if (!message.data || !message.data.devices || !message.data.links) {
                  console.warn('Received invalid topology data:', message.data);
                  return;
                }
                
                // Process devices from topology data
                const topologyDevices = message.data.devices.map((d: any) => {
                  // Find existing device to preserve position if it exists
                  const existingDevice = devices.find(ed => ed.id === d.id);
                  
                  // Convert interfaces array of names to array of interface objects
                  const interfaces: DeviceInterface[] = d.interfaces.map((interfaceName: string) => ({
                    name: interfaceName,
                    ipAddresses: [] // We'll need to fetch interface details separately if needed
                  }));
                  
                  return {
                    id: d.id,
                    name: d.name,
                    interfaces,
                    position: existingDevice?.position // Preserve position if device already exists
                  };
                });
                
                // Process links
                const topologyLinks = message.data.links.map((link: any) => {
                  return {
                    id: `${link.interfaceA.deviceId}:${link.interfaceA.name}-${link.interfaceB.deviceId}:${link.interfaceB.name}`,
                    sourceDeviceId: link.interfaceA.deviceId,
                    sourceInterfaceName: link.interfaceA.name,
                    targetDeviceId: link.interfaceB.deviceId,
                    targetInterfaceName: link.interfaceB.name
                  };
                });
                
                // Update state with the received topology
                setDevices(topologyDevices);
                setLinks(topologyLinks);
                break;
              }
              // Add cases for other message types if needed
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Don't set error state immediately to avoid blocking UI
          // setError('WebSocket connection error');
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          setWsConnected(false);
          
          // Attempt to reconnect after a delay, unless the component is unmounting
          if (!event.wasClean) {
            console.log('Scheduling reconnection attempt...');
            reconnectTimeoutRef.current = window.setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 2000); // 2 second delay
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setWsConnected(false);
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Cleanup function - runs when component unmounts or before re-running effect
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        console.log("Closing WebSocket connection on component cleanup.");
        // Set a flag to indicate intentional close (to avoid reconnection attempts)
        const ws = wsRef.current;
        
        // Only close if not already closed or closing
        if (ws.readyState < WebSocket.CLOSING) {
          ws.close(1000, "Component unmounting");
        }
        wsRef.current = null;
      }
    };
  }, []); // Runs once on mount (or twice in Strict Mode dev)

  // --- Action Functions (to be passed down) ---

  // --- Import/Export Handlers ---
  const handleExportTopology = useCallback(() => {
    setError(null);
    try {
      // 1. Create the JSON structure matching the required format
      const nodes: JsonNode[] = devices.map(d => ({
        id: d.id,
        name: d.name,
        // Add type/model if available in your Device state, otherwise omit or use defaults
        type: 'router', // Example default
        model: 'unknown' // Example default
      }));

      const jsonLinks: JsonLink[] = links.map(l => ({
        source: l.sourceDeviceId,
        target: l.targetDeviceId,
        sourceInterface: l.sourceInterfaceName,
        targetInterface: l.targetInterfaceName,
        // Add speed/type if available in your Link state, otherwise omit or use defaults
        speed: 'unknown', // Example default
        type: 'unknown' // Example default
      }));

      const topologyJson: TopologyJson = { nodes, links: jsonLinks };

      // 2. Create a Blob and trigger download
      const jsonString = JSON.stringify(topologyJson, null, 2); // Pretty print
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'topology.json'; // Filename for download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up
      console.log("Topology exported successfully.");

    } catch (err) {
      console.error("Error exporting topology:", err);
      setError("Failed to export topology.");
    }
  }, [devices, links]); // Depends on current devices and links

  const handleImportTopology = useCallback((file: File) => {
    setError(null);
    setLoading(true); // Indicate loading during import processing
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const parsedJson: TopologyJson = JSON.parse(content);

        // Basic Validation (check if nodes and links arrays exist)
        if (!parsedJson || !Array.isArray(parsedJson.nodes) || !Array.isArray(parsedJson.links)) {
          throw new Error("Invalid JSON format: 'nodes' and 'links' arrays are required.");
        }

        // --- Map JSON to Frontend State ---
        // Map Nodes to Devices
        const importedDevices: Device[] = parsedJson.nodes.map(node => {
          // Find existing interfaces for this device from the links data
          const deviceInterfaces: DeviceInterface[] = parsedJson.links
            .filter(link => link.source === node.id || link.target === node.id)
            .map(link => ({
              name: link.source === node.id ? link.sourceInterface : link.targetInterface,
              ipAddresses: [], // Initialize with empty IPs, backend/core handles actual IPs
              linkId: `${link.source}-${link.sourceInterface}_${link.target}-${link.targetInterface}` // Generate a simple link ID for reference
            }))
            // Deduplicate interfaces based on name
            .filter((intf, index, self) =>
              index === self.findIndex((t) => t.name === intf.name)
            );

          return {
            id: node.id,
            name: node.name,
            interfaces: deviceInterfaces,
            // Map other properties like type/model if needed in your Device state
          };
        });

        // Map Links
        const importedLinks: Link[] = parsedJson.links.map((link, index) => ({
          // Generate a unique ID for the link for frontend key prop etc.
          // Using source/target device/interface names is a simple approach
          id: `${link.source}-${link.sourceInterface}_${link.target}-${link.targetInterface}-${index}`,
          sourceDeviceId: link.source,
          sourceInterfaceName: link.sourceInterface,
          targetDeviceId: link.target,
          targetInterfaceName: link.targetInterface,
          // Map other properties like speed/type if needed in your Link state
        }));

        // --- Update State ---
        // Replace the current topology with the imported one
        setDevices(importedDevices);
        setLinks(importedLinks);
        console.log("Topology imported successfully.");
        // Note: This replaces the entire state. If you need to merge or update
        // the backend, additional logic/API calls would be required here.
        // For now, we just update the frontend state and rely on the localStorage save effect.

      } catch (err) {
        console.error("Error importing topology:", err);
        setError(err instanceof Error ? err.message : "Failed to parse or process the imported file.");
        // Optionally revert to previous state or clear state
        // For simplicity, we keep the potentially partially loaded state or let the user retry
      } finally {
        setLoading(false); // Finish loading state
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setError("Failed to read the selected file.");
      setLoading(false);
    };

    reader.readAsText(file); // Read the file as text
  }, [setDevices, setLinks, setError, setLoading]); // Dependencies


  const addDevice = useCallback(async (deviceName: string) => {
    console.log(`Attempting to add device: ${deviceName}`);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`${API_BASE_URL}/topology/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only the name, backend will use it as ID if ID is missing
        body: JSON.stringify({ name: deviceName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add device: ${response.statusText}`);
      }

      const newDevice: Device = await response.json(); // Backend returns the created device structure

      // Optimistic update (or wait for WebSocket message in future)
      setDevices(prev => [...prev, newDevice]);
      console.log(`Device ${newDevice.name} added successfully.`);

    } catch (err) {
      console.error("Error adding device:", err);
      setError(err instanceof Error ? err.message : 'Failed to add device');
    }
  }, [setDevices, setError]); // Added dependencies

  // Define the type for the data expected by the addLink function
  interface AddLinkData {
    sourceDeviceName: string;
    sourceInterfaceName: string;
    targetDeviceName: string;
    targetInterfaceName: string;
  }

  const addLink = useCallback(async (linkData: AddLinkData) => {
    console.log(`Attempting to add link:`, linkData);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`${API_BASE_URL}/topology/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send names as required by the updated backend route
        body: JSON.stringify({
            sourceDeviceName: linkData.sourceDeviceName,
            sourceInterfaceName: linkData.sourceInterfaceName,
            targetDeviceName: linkData.targetDeviceName,
            targetInterfaceName: linkData.targetInterfaceName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add link: ${response.statusText}`);
      }

      const newLink: Link = await response.json(); // Backend returns the created link structure (with generated ID)

      // Optimistic update (or wait for WebSocket message)
      setLinks(prev => [...prev, newLink]);
      console.log(`Link ${newLink.id} added successfully.`);

    } catch (err) {
      console.error("Error adding link:", err);
      setError(err instanceof Error ? err.message : 'Failed to add link');
    }
  }, [setLinks, setError]); // Added dependencies

  const addInterface = useCallback(async (deviceId: string, interfaceName: string) => {
    console.log(`Attempting to add interface ${interfaceName} to device ${deviceId}`);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/topology/devices/${deviceId}/interfaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: interfaceName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add interface: ${response.statusText}`);
      }

      const newInterfaceData = await response.json(); // Backend returns { name: string }

      // Optimistic update: Find the device and add the interface locally
      // Note: This is basic; a more robust solution might refetch or use WebSockets
      setDevices(prevDevices =>
        prevDevices.map(device => {
          if (device.id === deviceId) {
            // Check if interface already exists locally to prevent duplicates from rapid clicks
            if (!device.interfaces.some(intf => intf.name === newInterfaceData.name)) {
              return {
                ...device,
                interfaces: [...device.interfaces, { name: newInterfaceData.name, ipAddresses: [] }], // Add new interface with empty IPs
              };
            }
          }
          return device;
        })
      );
      console.log(`Interface ${newInterfaceData.name} added to device ${deviceId} successfully.`);

    } catch (err) {
      console.error("Error adding interface:", err);
      setError(err instanceof Error ? err.message : 'Failed to add interface');
    }
  }, [setDevices, setError]); // Added dependencies

  // Update node positions
  const updateNodePositions = useCallback((newPositions: Record<string, { x: number, y: number }>) => {
    setDevices(prevDevices => 
      prevDevices.map(device => ({
        ...device,
        position: newPositions[device.id] || device.position
      }))
    );
  }, []);

  // TODO: Add functions for removeDevice, removeLink, etc.

  const removeDevice = useCallback((deviceId: string) => {
    console.log(`Removing device ${deviceId} and its links`);
    setDevices(prevDevices => prevDevices.filter(d => d.id !== deviceId));
    setLinks(prevLinks => prevLinks.filter(l => l.sourceDeviceId !== deviceId && l.targetDeviceId !== deviceId));
    // Optionally, send DELETE requests to backend here
  }, []);

  if (loading) {
    return <div>Loading Topology...</div>;
  }

  if (error) {
    return <div>Error loading topology: {error}</div>;
  }

  return (
    <SimulatorPage
      devices={devices}
      links={links}
      addDevice={addDevice}
      addLink={addLink}
      addInterface={addInterface}
      handleExportTopology={handleExportTopology}
      handleImportTopology={handleImportTopology}
      removeDevice={removeDevice}
      updateNodePositions={updateNodePositions}
    />
  );
}

export default App;
