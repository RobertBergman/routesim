import React, { useState } from 'react';
import { Typography, TextField, Button, List, ListItem, ListItemText, Divider, Paper } from '@mui/material';
import { Device } from '../App'; // Import Device type from App

// Remove local Device interface definition as we import it now
// interface Device {
//   id: string;
//   name: string;
//   interfaces: string[];
// }

interface DevicePanelProps {
  devices: Device[]; // Use Device type from App
  addDevice: (deviceName: string) => Promise<void>;
  // Add deleteDevice prop later if needed
}

// Update component signature to accept props
const DevicePanel: React.FC<DevicePanelProps> = ({ devices, addDevice }) => { // addDevice prop is now correctly destructured
  // Remove local devices state, it will come from props
  // const [devices, setDevices] = useState<Device[]>([]);

  // Remove newId state, backend should handle ID generation
  // const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState(''); // Keep state for the input field

  // Remove local fetchDevices, addDevice, deleteDevice functions and useEffect
  // const fetchDevices = async () => { ... };
  // const addDevice = async () => { ... }; // This conflicts with the prop name
  // const deleteDevice = async (id: string) => { ... };
  // React.useEffect(() => { fetchDevices(); }, []);

  // New handler for the add button click
  const handleAddClick = () => {
    if (!newName.trim()) return;
    addDevice(newName.trim()); // Call the addDevice function passed via props
    setNewName(''); // Clear the input field
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>Add Device</Typography>
      {/* Remove Device ID field */}
      {/* <TextField
        label="Device ID"
        value={newId}
        onChange={(e) => setNewId(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 1 }}
      /> */}
      <TextField
        label="Device Name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 1 }}
      />
      <Button
        variant="contained"
        fullWidth
        onClick={handleAddClick} // Use the new handler
        sx={{ mb: 2 }}
        disabled={!newName.trim()} // Disable based on newName
      >
        Add Device
      </Button>

      <Typography variant="h6" gutterBottom>Devices</Typography>
      <List dense>
        {/* Use devices prop directly */}
        {devices.map((device) => (
          <React.Fragment key={device.id}>
            <ListItem
              // Remove delete button for now, add later with prop function
              // secondaryAction={
              //   <Button color="error" onClick={() => deleteDevice(device.id)}>
              //     Delete
              //   </Button>
              // }
            >
              <ListItemText
                primary={`${device.name} (ID: ${device.id})`}
                // Update secondary text based on the imported Device interface structure
                secondary={`Interfaces: ${device.interfaces.map(intf => intf.name).join(', ') || 'None'}`}
              />
            </ListItem>
            {/* Keep Routing Table/Status display structure, data will be added later */}
            <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
              <Typography variant="subtitle2">Routing Table:</Typography>
              <pre style={{ margin: 0, maxHeight: 100, overflowY: 'auto' }}>
{}
              </pre>
              <Typography variant="subtitle2">Protocol Status:</Typography>
              <pre style={{ margin: 0, maxHeight: 100, overflowY: 'auto' }}>
{}
              </pre>
            </Paper>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </>
  );
};

export default DevicePanel;
