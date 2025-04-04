import React, { useEffect, useRef, useState, ReactElement } from 'react';
import { Typography } from '@mui/material';
import { Device, Link } from '../App'; // Import types from App

// Remove local Device and Link interface definitions
// interface Device { ... }
// interface Link { ... }

interface TopologyGraphProps {
  devices: Device[];
  links: Link[];
}

// Update component signature to accept props
const TopologyGraph: React.FC<TopologyGraphProps> = ({ devices, links }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Remove local devices and links state, use props instead
  // const [devices, setDevices] = useState<Device[]>([]);
  // const [links, setLinks] = useState<Link[]>([]);
  const [networkGraph, setNetworkGraph] = useState<ReactElement | null>(null);

  // Function to create a simple SVG representation of the topology
  const renderSvgTopology = () => {
    const containerWidth = 800;
    const containerHeight = 600;
    const nodeRadius = 30;
    
    // Place nodes in a circular layout
    const nodePositions: {[key: string]: {x: number, y: number}} = {};
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const radius = Math.min(centerX, centerY) - nodeRadius - 20;
    
    devices.forEach((device, index) => {
      const angle = (2 * Math.PI * index) / Math.max(devices.length, 1);
      nodePositions[device.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Create SVG nodes
    const nodes = devices.map(device => {
      const pos = nodePositions[device.id];
      return (
        <g key={`node-${device.id}`}>
          <circle 
            cx={pos.x} 
            cy={pos.y} 
            r={nodeRadius} 
            fill="#1976d2" 
            stroke="#333" 
            strokeWidth="2" 
          />
          <text 
            x={pos.x} 
            y={pos.y} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white"
            fontSize="14px"
          >
            {device.name || device.id}
          </text>
        </g>
      );
    });

    // Create SVG edges
    const edges = links.map((link, idx) => {
      // Use correct property names from imported Link type
      const sourcePos = nodePositions[link.sourceDeviceId];
      const targetPos = nodePositions[link.targetDeviceId];

      if (!sourcePos || !targetPos) return null;
      
      return (
        <line 
          key={`edge-${idx}`}
          x1={sourcePos.x} 
          y1={sourcePos.y} 
          x2={targetPos.x} 
          y2={targetPos.y}
          stroke="#666" 
          strokeWidth="2" 
        />
      );
    });

    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
        style={{ 
          background: "#e0e0e0", 
          border: "1px solid #ccc",
          maxWidth: "100%",
          maxHeight: "100%"
        }}
      >
        {edges}
        {nodes}
      </svg>
    );
  };

  // Remove fetchDevices, fetchLinks, and related useEffect
  // const fetchDevices = async () => { ... };
  // const fetchLinks = async () => { ... };
  // useEffect(() => { fetchDevices(); fetchLinks(); }, []);

  // Update SVG when data changes (props change)
  useEffect(() => {
    if (devices.length > 0 || links.length > 0) {
      setNetworkGraph(renderSvgTopology());
    } else {
      setNetworkGraph(null);
    }
  }, [devices, links]);

  return (
    <div
      id="topology-container"
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#e0e0e0',
        border: '1px solid #ccc',
        // position: 'absolute', // Removed
        // top: 0, // Removed
        // left: 0, // Removed
        // right: 0, // Removed
        // bottom: 0, // Removed
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {networkGraph || (
        <div style={{
          textAlign: 'center',
          color: '#666',
        }}>
          <Typography variant="h6">No devices in topology</Typography>
          <Typography variant="body2">
            Add devices and links to visualize the network
          </Typography>
        </div>
      )}
    </div>
  );
};

export default TopologyGraph;
