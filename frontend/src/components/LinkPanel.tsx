import React, { useState } from 'react';
// Import necessary MUI components for Select dropdowns
import { Typography, Button, List, ListItem, ListItemText, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Device, Link } from '../App'; // Import types from App

// Re-define AddLinkData here or import if exported from SimulatorPage/App
interface AddLinkData {
  sourceDeviceName: string;
  sourceInterfaceName: string;
  targetDeviceName: string;
  targetInterfaceName: string;
}

interface LinkPanelProps {
  devices: Device[]; // Receive devices list for potential dropdowns
  links: Link[]; // Receive links list from App.tsx
  // Update addLink prop signature to expect names
  addLink: (linkData: AddLinkData) => Promise<void>; // Function to add link
}

// Update component signature to accept props
const LinkPanel: React.FC<LinkPanelProps> = ({ devices, links, addLink }) => {
  // State variables for selected device IDs and interface names
  const [selectedDeviceAId, setSelectedDeviceAId] = useState('');
  const [selectedInterfaceAName, setSelectedInterfaceAName] = useState('');
  const [selectedDeviceBId, setSelectedDeviceBId] = useState('');
  const [selectedInterfaceBName, setSelectedInterfaceBName] = useState('');

  // Get available interfaces for the selected devices
  // Filter out interfaces that might already be linked
  const interfacesA = devices.find(d => d.id === selectedDeviceAId)?.interfaces.filter(intf => !links.some(link =>
    (link.sourceDeviceId === selectedDeviceAId && link.sourceInterfaceName === intf.name) ||
    (link.targetDeviceId === selectedDeviceAId && link.targetInterfaceName === intf.name)
  )) || [];
  const interfacesB = devices.find(d => d.id === selectedDeviceBId)?.interfaces.filter(intf => !links.some(link =>
    (link.sourceDeviceId === selectedDeviceBId && link.sourceInterfaceName === intf.name) ||
    (link.targetDeviceId === selectedDeviceBId && link.targetInterfaceName === intf.name)
  )) || [];

  // Update createLink handler to use selected IDs to find names
  const handleCreateLink = () => {
    const deviceA = devices.find(d => d.id === selectedDeviceAId);
    const deviceB = devices.find(d => d.id === selectedDeviceBId);

    // Ensure all selections are made and devices are found
    if (!deviceA || !selectedInterfaceAName || !deviceB || !selectedInterfaceBName) {
      console.error("Link creation validation failed: All device and interface selections required.");
      return;
    }

    // Construct the object with names
    const linkData: AddLinkData = {
      sourceDeviceName: deviceA.name,
      sourceInterfaceName: selectedInterfaceAName,
      targetDeviceName: deviceB.name,
      targetInterfaceName: selectedInterfaceBName,
    };

    addLink(linkData); // Call the addLink function passed via props with names

    // Clear input fields/selections
    setSelectedDeviceAId('');
    setSelectedInterfaceAName('');
    setSelectedDeviceBId('');
    setSelectedInterfaceBName('');
  };


  return (
    <>
      <Typography variant="h6" gutterBottom mt={2}>Create Link</Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {/* Device A Selection */}
        <div style={{ flex: '1 1 48%' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="device-a-select-label">Device A</InputLabel>
            <Select
              labelId="device-a-select-label"
              value={selectedDeviceAId}
              label="Device A"
              onChange={(e) => {
                const newDeviceId = e.target.value as string;
                setSelectedDeviceAId(newDeviceId);
                setSelectedInterfaceAName(''); // Reset interface selection when device changes
                // Prevent selecting the same device for B if B is already selected
                if (newDeviceId === selectedDeviceBId) {
                  setSelectedDeviceBId('');
                  setSelectedInterfaceBName('');
                }
              }}
            >
              {devices.map((dev) => (
                <MenuItem key={dev.id} value={dev.id}>
                  {dev.name || dev.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {/* Interface A Selection */}
        <div style={{ flex: '1 1 48%' }}>
          <FormControl fullWidth size="small" disabled={!selectedDeviceAId}>
            <InputLabel id="interface-a-select-label">Interface A</InputLabel>
            <Select
              labelId="interface-a-select-label"
              value={selectedInterfaceAName}
              label="Interface A"
              onChange={(e) => setSelectedInterfaceAName(e.target.value as string)}
            >
              {interfacesA.length === 0 && selectedDeviceAId && (
                 <MenuItem value="" disabled>No available interfaces</MenuItem>
              )}
              {interfacesA.map((intf) => (
                <MenuItem key={intf.name} value={intf.name}>
                  {intf.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {/* Device B Selection */}
        <div style={{ flex: '1 1 48%' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="device-b-select-label">Device B</InputLabel>
            <Select
              labelId="device-b-select-label"
              value={selectedDeviceBId}
              label="Device B"
              onChange={(e) => {
                 const newDeviceId = e.target.value as string;
                 setSelectedDeviceBId(newDeviceId);
                 setSelectedInterfaceBName(''); // Reset interface selection
                 // Prevent selecting the same device as A
                 if (newDeviceId === selectedDeviceAId) {
                   setSelectedDeviceAId('');
                   setSelectedInterfaceAName('');
                 }
              }}
            >
              {devices.map((dev) => (
                 // Prevent selecting the same device as A
                <MenuItem key={dev.id} value={dev.id} disabled={dev.id === selectedDeviceAId}>
                  {dev.name || dev.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {/* Interface B Selection */}
        <div style={{ flex: '1 1 48%' }}>
          <FormControl fullWidth size="small" disabled={!selectedDeviceBId}>
            <InputLabel id="interface-b-select-label">Interface B</InputLabel>
            <Select
              labelId="interface-b-select-label"
              value={selectedInterfaceBName}
              label="Interface B"
              onChange={(e) => setSelectedInterfaceBName(e.target.value as string)}
            >
               {interfacesB.length === 0 && selectedDeviceBId && (
                 <MenuItem value="" disabled>No available interfaces</MenuItem>
              )}
              {interfacesB.map((intf) => (
                <MenuItem key={intf.name} value={intf.name}>
                  {intf.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {/* Button */}
        <div style={{ flex: '1 1 100%' }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleCreateLink}
            // Update disabled check for selections
            disabled={
              !selectedDeviceAId ||
              !selectedInterfaceAName ||
              !selectedDeviceBId ||
              !selectedInterfaceBName
            }
          >
            Create Link
          </Button>
        </div>
      </div>

      <Typography variant="h6" gutterBottom mt={2}>Links</Typography>
      <List dense>
        {links.map((link) => (
          // Use link.id which is now generated by the backend
          <ListItem key={link.id}>
            <ListItemText
              primary={`${link.sourceDeviceId}:${link.sourceInterfaceName} ↔ ${link.targetDeviceId}:${link.targetInterfaceName}`}
              secondary={`ID: ${link.id}`} // Display generated ID
            />
            {/* Add delete button later */}
          </ListItem>
        ))}
        {links.length === 0 && (
          <ListItem>
            <ListItemText secondary="No links created yet." />
          </ListItem>
        )}
      </List>
    </>
  );
};

// Ensure export default is present
export default LinkPanel;
