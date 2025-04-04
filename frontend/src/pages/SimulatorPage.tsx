import React, { useState } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Drawer, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import DevicePanel from '../components/DevicePanel';
import LinkPanel from '../components/LinkPanel';
import InterfacePanel from '../components/InterfacePanel';
import TopologyGraph from '../components/TopologyGraph';
import { Device, Link } from '../App'; // Import types from App

const drawerWidth = 320;

// Define the type for the data expected by the addLink function
// This should match the structure used in App.tsx's addLink implementation
interface AddLinkData {
  sourceDeviceName: string;
  sourceInterfaceName: string;
  targetDeviceName: string;
  targetInterfaceName: string;
}

interface SimulatorPageProps {
  devices: Device[];
  links: Link[];
  addDevice: (deviceName: string) => Promise<void>;
  // Update addLink prop to expect the AddLinkData type (using names)
  addLink: (linkData: AddLinkData) => Promise<void>;
  // Add the new addInterface prop
  addInterface: (deviceId: string, interfaceName: string) => Promise<void>;
  // Add other props as needed (e.g., removeDevice)
}

const SimulatorPage: React.FC<SimulatorPageProps> = ({ devices, links, addDevice, addLink, addInterface }) => {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Routing Simulator
          </Typography>
          <Button color="inherit" onClick={() => setHelpOpen(true)}>
            Help
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflowY: 'auto', p: 2 }}>
          {/* Pass devices and addDevice to DevicePanel */}
          <DevicePanel devices={devices} addDevice={addDevice} />
          {/* Pass devices and addInterface to InterfacePanel */}
          <InterfacePanel devices={devices} addInterface={addInterface} />
          {/* Pass devices, links, and addLink to LinkPanel */}
          <LinkPanel devices={devices} links={links} addLink={addLink} />
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f5f5f5',
          p: 0,
          paddingTop: '64px',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          display: 'flex', // Make this a flex container
        }}
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Pass devices and links to TopologyGraph */}
          <TopologyGraph devices={devices} links={links} />
        </div>
      </Box>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Routing Simulator Help</DialogTitle>
        <DialogContent dividers>
          <DialogContentText component="div">
            <Typography variant="subtitle1" gutterBottom>Overview</Typography>
            <Typography paragraph>
              This simulator allows you to create network devices, connect them with links, and visualize routing protocol behavior.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>Device Management</Typography>
            <Typography paragraph>
              Use the "Add Device" form to create routers. Each device can have multiple interfaces and run different routing protocols.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>Link Management</Typography>
            <Typography paragraph>
              Create links by specifying two devices and their interface names. Links connect interfaces and enable routing protocol communication.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>Topology Visualization</Typography>
            <Typography paragraph>
              The main panel shows the network topology graph. Devices are nodes, and links are edges. The layout updates dynamically.
            </Typography>
            <Typography variant="subtitle1" gutterBottom>Routing Information</Typography>
            <Typography paragraph>
              Each device panel shows its routing table and protocol status, updated in real-time.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimulatorPage;
