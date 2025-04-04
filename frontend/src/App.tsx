import React, { useState, useEffect, useCallback } from 'react';
import SimulatorPage from './pages/SimulatorPage';
import { Device as CoreDevice, Link as CoreLink, NetworkInterface as CoreInterface } from '../../core/src/simulation/TopologyModels'; // Adjust path if needed

// Simplified types for frontend state management
// We might not need all details from Core types on the frontend initially
export interface Device {
  id: string;
  name: string;
  interfaces: { name: string; ipAddresses: string[]; linkId?: string }[]; // Simplified interfaces
}

export interface Link {
  id: string; // Need a unique ID for links, maybe generated on backend or frontend
  sourceDeviceId: string;
  sourceInterfaceName: string;
  targetDeviceId: string;
  targetInterfaceName: string;
}

const API_BASE_URL = 'http://localhost:3001/api'; // Assuming backend runs on 3001

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial topology data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch devices (assuming backend returns simplified Device structure)
        const deviceRes = await fetch(`${API_BASE_URL}/topology/devices`);
        if (!deviceRes.ok) throw new Error(`Failed to fetch devices: ${deviceRes.statusText}`);
        const devicesData: Device[] = await deviceRes.json(); // Adjust type if backend returns CoreDevice
        setDevices(devicesData);

        // Fetch links (assuming backend returns simplified Link structure)
        const linkRes = await fetch(`${API_BASE_URL}/topology/links`);
        if (!linkRes.ok) throw new Error(`Failed to fetch links: ${linkRes.statusText}`);
        const linksData: Link[] = await linkRes.json(); // Adjust type if backend returns CoreLink
        setLinks(linksData);

      } catch (err) {
        console.error("Error fetching topology:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // TODO: useEffect for WebSocket connection setup and message handling
  useEffect(() => {
    // Placeholder for WebSocket logic
    console.log("WebSocket connection would be established here.");
    // const ws = new WebSocket('ws://localhost:3001'); // Assuming WS server on same port

    // ws.onmessage = (event) => {
    //   const message = JSON.parse(event.data);
    //   console.log('WebSocket message received:', message);
    //   switch (message.type) {
    //     case 'topology_update':
    //       // Refetch or update state based on message payload
    //       // Example: setDevices(message.payload.devices); setLinks(message.payload.links);
    //       break;
    //     case 'device_added':
    //       // setDevices(prev => [...prev, message.payload]);
    //       break;
    //     // Add cases for device_removed, link_added, link_removed, interface_added, etc.
    //   }
    // };

    // ws.onerror = (error) => {
    //   console.error('WebSocket error:', error);
    //   setError('WebSocket connection error');
    // };

    // ws.onclose = () => {
    //   console.log('WebSocket connection closed');
    // };

    // return () => {
    //   ws.close(); // Cleanup WebSocket connection on component unmount
    // };
  }, []); // Runs once on mount

  // --- Action Functions (to be passed down) ---

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

  // TODO: Add functions for removeDevice, removeLink, etc.

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
      addInterface={addInterface} // Pass addInterface down
      // Pass other state/functions as needed
    />
  );
}

export default App;
