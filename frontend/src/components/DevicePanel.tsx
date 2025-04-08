import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Divider,
  Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import { Device, Link as LinkType } from '../App';

interface DevicePanelProps {
  devices: Device[];
  links: LinkType[];
  addDevice: (deviceName: string) => Promise<void>;
}

const DevicePanel: React.FC<DevicePanelProps> = ({ devices, links, addDevice }) => {
  const [newName, setNewName] = useState('');

  const handleAddClick = () => {
    if (!newName.trim()) return;
    addDevice(newName.trim());
    setNewName('');
  };

  // Helper: count links for a device
  const countDeviceLinks = (deviceId: string) =>
    links.filter(
      (l) => l.sourceDeviceId === deviceId || l.targetDeviceId === deviceId
    ).length;

  // Helper: check if interface is linked
  const isInterfaceLinked = (deviceId: string, intfName: string) =>
    links.some(
      (l) =>
        (l.sourceDeviceId === deviceId && l.sourceInterfaceName === intfName) ||
        (l.targetDeviceId === deviceId && l.targetInterfaceName === intfName)
    );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Add Device</Typography>
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
        onClick={handleAddClick}
        sx={{ mb: 2 }}
        disabled={!newName.trim()}
      >
        Add Device
      </Button>

      <Typography variant="h6" gutterBottom>Devices</Typography>
      {devices.map((device) => (
        <Accordion key={device.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">{device.name}</Typography>
                <Typography variant="caption">ID: {device.id}</Typography>
              </Box>
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label={`Interfaces: ${device.interfaces.length}`} />
                <Chip size="small" label={`Links: ${countDeviceLinks(device.id)}`} />
                {/* Placeholder for protocol badges */}
                {/* <Chip size="small" label="OSPF" color="primary" /> */}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" gutterBottom>Interfaces</Typography>
            <List dense disablePadding>
              {device.interfaces.map((intf) => (
                <ListItem key={intf.name} disableGutters>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{intf.name}</span>
                        {isInterfaceLinked(device.id, intf.name) && (
                          <Tooltip title="Connected to link">
                            <LinkIcon fontSize="small" color="success" />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={intf.ipAddresses.join(', ')}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" gutterBottom>Routing Table</Typography>
            <pre style={{ margin: 0, maxHeight: 100, overflowY: 'auto' }}>
{}
            </pre>
            <Typography variant="subtitle2" gutterBottom>Protocol Status</Typography>
            <pre style={{ margin: 0, maxHeight: 100, overflowY: 'auto' }}>
{}
            </pre>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default DevicePanel;
