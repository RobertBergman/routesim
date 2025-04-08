import React, { useState } from 'react';
import {
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import { Device, Link as LinkType } from '../App';

interface AddLinkData {
  sourceDeviceName: string;
  sourceInterfaceName: string;
  targetDeviceName: string;
  targetInterfaceName: string;
}

interface LinkPanelProps {
  devices: Device[];
  links: LinkType[];
  addLink: (linkData: AddLinkData) => Promise<void>;
}

const LinkPanel: React.FC<LinkPanelProps> = ({ devices, links, addLink }) => {
  const [selectedDeviceAId, setSelectedDeviceAId] = useState('');
  const [selectedInterfaceAName, setSelectedInterfaceAName] = useState('');
  const [selectedDeviceBId, setSelectedDeviceBId] = useState('');
  const [selectedInterfaceBName, setSelectedInterfaceBName] = useState('');

  const interfacesA = devices.find(d => d.id === selectedDeviceAId)?.interfaces.filter(intf => !links.some(link =>
    (link.sourceDeviceId === selectedDeviceAId && link.sourceInterfaceName === intf.name) ||
    (link.targetDeviceId === selectedDeviceAId && link.targetInterfaceName === intf.name)
  )) || [];

  const interfacesB = devices.find(d => d.id === selectedDeviceBId)?.interfaces.filter(intf => !links.some(link =>
    (link.sourceDeviceId === selectedDeviceBId && link.sourceInterfaceName === intf.name) ||
    (link.targetDeviceId === selectedDeviceBId && link.targetInterfaceName === intf.name)
  )) || [];

  const handleCreateLink = () => {
    const deviceA = devices.find(d => d.id === selectedDeviceAId);
    const deviceB = devices.find(d => d.id === selectedDeviceBId);
    if (!deviceA || !selectedInterfaceAName || !deviceB || !selectedInterfaceBName) return;

    addLink({
      sourceDeviceName: deviceA.name,
      sourceInterfaceName: selectedInterfaceAName,
      targetDeviceName: deviceB.name,
      targetInterfaceName: selectedInterfaceBName,
    });

    setSelectedDeviceAId('');
    setSelectedInterfaceAName('');
    setSelectedDeviceBId('');
    setSelectedInterfaceBName('');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom mt={2}>Create Link</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Device A</InputLabel>
          <Select
            value={selectedDeviceAId}
            label="Device A"
            onChange={(e) => {
              const id = e.target.value as string;
              setSelectedDeviceAId(id);
              setSelectedInterfaceAName('');
              if (id === selectedDeviceBId) {
                setSelectedDeviceBId('');
                setSelectedInterfaceBName('');
              }
            }}
          >
            {devices.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!selectedDeviceAId}>
          <InputLabel>Interface A</InputLabel>
          <Select
            value={selectedInterfaceAName}
            label="Interface A"
            onChange={(e) => setSelectedInterfaceAName(e.target.value as string)}
          >
            {interfacesA.length === 0 && selectedDeviceAId && (
              <MenuItem value="" disabled>No available interfaces</MenuItem>
            )}
            {interfacesA.map((intf) => (
              <MenuItem key={intf.name} value={intf.name}>{intf.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Device B</InputLabel>
          <Select
            value={selectedDeviceBId}
            label="Device B"
            onChange={(e) => {
              const id = e.target.value as string;
              setSelectedDeviceBId(id);
              setSelectedInterfaceBName('');
              if (id === selectedDeviceAId) {
                setSelectedDeviceAId('');
                setSelectedInterfaceAName('');
              }
            }}
          >
            {devices.map((d) => (
              <MenuItem key={d.id} value={d.id} disabled={d.id === selectedDeviceAId}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!selectedDeviceBId}>
          <InputLabel>Interface B</InputLabel>
          <Select
            value={selectedInterfaceBName}
            label="Interface B"
            onChange={(e) => setSelectedInterfaceBName(e.target.value as string)}
          >
            {interfacesB.length === 0 && selectedDeviceBId && (
              <MenuItem value="" disabled>No available interfaces</MenuItem>
            )}
            {interfacesB.map((intf) => (
              <MenuItem key={intf.name} value={intf.name}>{intf.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          fullWidth
          onClick={handleCreateLink}
          disabled={
            !selectedDeviceAId ||
            !selectedInterfaceAName ||
            !selectedDeviceBId ||
            !selectedInterfaceBName
          }
        >
          Create Link
        </Button>
      </Box>

      <Typography variant="h6" gutterBottom>Links</Typography>
      {links.map((link) => (
        <Accordion key={link.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon fontSize="small" />
                  <Typography variant="body2">
                    {link.sourceDeviceId}:{link.sourceInterfaceName} ↔ {link.targetDeviceId}:{link.targetInterfaceName}
                  </Typography>
                </Box>
                <Typography variant="caption">ID: {link.id}</Typography>
              </Box>
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label={`Source: ${link.sourceDeviceId}`} />
                <Chip size="small" label={`Target: ${link.targetDeviceId}`} />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">Source Interface: {link.sourceInterfaceName}</Typography>
            <Typography variant="body2">Target Interface: {link.targetInterfaceName}</Typography>
            {/* Future: link properties, delete button */}
          </AccordionDetails>
        </Accordion>
      ))}
      {links.length === 0 && (
        <Typography variant="body2" color="text.secondary">No links created yet.</Typography>
      )}
    </Box>
  );
};

export default LinkPanel;
