import React, { useState, useEffect } from 'react';
import { Typography, TextField, Button, MenuItem, Select, FormControl, InputLabel, List, ListItem, ListItemText } from '@mui/material';
import { Device } from '../App'; // Import Device type from App

// Remove local Device interface definition
// interface Device {
//   id: string;
//   name: string;
// }

// Keep local Interface type for now, might refine later based on App's Device.interfaces structure
interface Interface {
  name: string;
  // Add other properties like ipAddresses if needed
}

interface InterfacePanelProps {
  devices: Device[]; // Receive devices from App.tsx
  // Define the addInterface prop
  addInterface: (deviceId: string, interfaceName: string) => Promise<void>;
}

// Update component signature to accept props, including addInterface
const InterfacePanel: React.FC<InterfacePanelProps> = ({ devices, addInterface }) => {
  // Remove local devices state, use prop instead
  // const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [interfaceName, setInterfaceName] = useState('');
  // Remove local interfaces state, derive from props instead
  // const [interfaces, setInterfaces] = useState<Interface[]>([]);

  // Remove fetchDevices, fetchInterfaces, and related useEffects
  // const fetchDevices = async () => { ... };
  // const fetchInterfaces = async (deviceId: string) => { ... };
  // useEffect(() => { fetchDevices(); }, []);
  // useEffect(() => { ... }, [selectedDevice]);

  // Update handleAddInterface to use the addInterface prop
  const handleAddInterface = async () => {
    if (!selectedDevice || !interfaceName.trim()) return;
    // Call the addInterface function passed via props
    await addInterface(selectedDevice, interfaceName.trim());
    // Clear the input field after attempting to add
    setInterfaceName('');
    // State update (seeing the new interface in the list) will happen via App.tsx's state update
  };

  // Derive interfaces to display from the selected device in the devices prop
  const displayedInterfaces = devices.find(d => d.id === selectedDevice)?.interfaces || [];

  return (
    <>
      <Typography variant="h6" gutterBottom mt={2}>Add Interface</Typography>
      <FormControl fullWidth size="small" margin="dense">
        <InputLabel>Device</InputLabel>
        <Select
          value={selectedDevice}
          label="Device"
          onChange={(e) => setSelectedDevice(e.target.value as string)}
        >
          {devices.map((dev) => (
            <MenuItem key={dev.id} value={dev.id}>
              {dev.name || dev.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Interface Name"
        value={interfaceName}
        onChange={(e) => setInterfaceName(e.target.value)}
        size="small"
        fullWidth
        margin="dense"
        disabled={!selectedDevice}
      />
      <Button
        variant="contained"
        fullWidth
        onClick={handleAddInterface}
        disabled={!selectedDevice || !interfaceName.trim()}
        sx={{ mt: 1 }}
      >
        Add Interface
      </Button>

      <Typography variant="h6" gutterBottom mt={2}>Interfaces</Typography>
      <List dense>
        {/* Map over derived interfaces */}
        {displayedInterfaces.map((intf, idx) => (
          <ListItem key={`${selectedDevice}-${intf.name}-${idx}`}> {/* Use a more robust key */}
            <ListItemText primary={intf.name} />
            {/* Optionally display IP addresses: secondary={intf.ipAddresses.join(', ')} */}
          </ListItem>
        ))}
        {selectedDevice && displayedInterfaces.length === 0 && (
          <ListItem>
            <ListItemText secondary="No interfaces on this device." />
          </ListItem>
        )}
        {!selectedDevice && (
           <ListItem>
            <ListItemText secondary="Select a device to view interfaces." />
          </ListItem>
        )}
      </List>
    </>
  );
};

export default InterfacePanel;
