import React, { useState, useEffect, useRef } from 'react';
import { Device, Link } from '../App';

interface TopologyGraphProps {
  devices: Device[];
  links: Link[];
  onDeleteNode?: (deviceId: string) => void;
  layout?: 'circle' | 'star' | 'grid' | 'tree';
  onPositionsChange?: (positions: Record<string, { x: number, y: number }>) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  // Store initial positions of all selected nodes when dragging multiple
  initialPositions: Record<string, NodePosition>;
}

interface SelectionBoxState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const TopologyGraph: React.FC<TopologyGraphProps> = ({ 
  devices, 
  links, 
  onDeleteNode,
  layout = 'circle',
  onPositionsChange
}) => {
  // Change from single selection to multi-selection
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    initialPositions: {}
  });
  
  // For box selection
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Keep track of previous layout to detect changes
  const prevLayoutRef = useRef(layout);

  // Initialize positions when new devices are added
  useEffect(() => {
    // This effect only runs when devices array changes (new devices added or removed)
    setNodePositions(prev => {
      const newPositions = { ...prev };
      
      // Set initial positions for new devices only (those not in prev)
      devices.forEach((device, index) => {
        // If we already have a position for this device, skip it
        if (newPositions[device.id]) return;
        
        // If device has a saved position from App state, use it
        if (device.position) {
          newPositions[device.id] = device.position;
          return;
        }
        
        // Otherwise calculate position based on current layout
        const pos = getLayoutPosition(index, devices.length);
        newPositions[device.id] = pos;
      });
      
      // Remove positions for devices that no longer exist
      Object.keys(newPositions).forEach(id => {
        if (!devices.some(d => d.id === id)) {
          delete newPositions[id];
        }
      });
      
      return newPositions;
    });
  }, [devices]); // Depends only on devices changing, not layout or positions
  
  // Handle layout changes separately
  useEffect(() => {
    const layoutChanged = prevLayoutRef.current !== layout;
    
    // Only run this if the layout has actually changed
    if (layoutChanged) {
      // Update reference to current layout
      prevLayoutRef.current = layout;
      
      // If layout changes, recalculate positions for ALL nodes
      setNodePositions(prev => {
        const newPositions = { ...prev };
        
        devices.forEach((device, index) => {
          // Calculate new position based on layout
          const pos = getLayoutPosition(index, devices.length);
          newPositions[device.id] = pos;
        });
        
        return newPositions;
      });
    }
  }, [layout, devices]); // Only depends on layout changes
  
  // Notify parent when positions change (for persistence)
  useEffect(() => {
    // Skip initial render and empty positions
    if (Object.keys(nodePositions).length > 0 && !dragState.isDragging) {
      onPositionsChange?.(nodePositions);
    }
  }, [nodePositions, dragState.isDragging, onPositionsChange]);

  // Different layout patterns for calculating initial node positions
  const layouts = {
    // Default layout - circular
    circle: (index: number, total: number) => {
      const radius = 200;
      const centerX = 400;
      const centerY = 300;
      const angle = (2 * Math.PI * index) / Math.max(total, 1);
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    },
    // Star layout - one node in center, others around
    star: (index: number, total: number) => {
      const radius = 200;
      const centerX = 400;
      const centerY = 300;
      
      // First node is center
      if (index === 0) {
        return { x: centerX, y: centerY };
      }
      
      // Other nodes around in a circle
      const adjustedIndex = index - 1;
      const angle = (2 * Math.PI * adjustedIndex) / Math.max(total - 1, 1);
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    },
    // Grid layout - nodes in a grid pattern
    grid: (index: number, total: number) => {
      const centerX = 400;
      const centerY = 300;
      const spacing = 120;
      
      // Calculate grid dimensions
      const cols = Math.ceil(Math.sqrt(total));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        x: centerX + (col - (cols - 1) / 2) * spacing,
        y: centerY + (row - (Math.ceil(total / cols) - 1) / 2) * spacing
      };
    },
    // Tree layout - hierarchical
    tree: (index: number, total: number) => {
      const centerX = 400;
      const centerY = 200;
      const levelHeight = 120;
      const levelWidth = 150;
      
      if (total <= 1) return { x: centerX, y: centerY };
      
      // For simplicity, assume it's a binary tree
      const depth = Math.floor(Math.log2(index + 1));
      const position = index + 1 - Math.pow(2, depth);
      const levelNodes = Math.pow(2, depth);
      const x = centerX + (position - levelNodes / 2 + 0.5) * levelWidth;
      const y = centerY + depth * levelHeight;
      
      return { x, y };
    }
  };
  
  // Get initial position based on selected layout
  const getLayoutPosition = (index: number, total: number) => {
    const layoutFn = layouts[layout] || layouts.circle;
    return layoutFn(index, total);
  };
  
  // Get current position for a node (either calculated or user-dragged)
  const getNodePosition = (deviceId: string, index: number, total: number) => {
    if (nodePositions[deviceId]) {
      return nodePositions[deviceId];
    }
    return getLayoutPosition(index, total);
  };
  
  // Zoom handlers
  const handleZoomIn = () => {
    setViewBox(prev => ({
      ...prev,
      scale: prev.scale * 0.8,
      width: prev.width * 0.8,
      height: prev.height * 0.8
    }));
  };
  
  const handleZoomOut = () => {
    setViewBox(prev => ({
      ...prev,
      scale: prev.scale * 1.25,
      width: prev.width * 1.25,
      height: prev.height * 1.25
    }));
  };
  
  const handleReset = () => {
    setViewBox({ x: 0, y: 0, width: 800, height: 600, scale: 1 });
  };
  
  // Pan handling with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      // Ctrl+wheel = zoom
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    } else {
      // Regular wheel = pan
      setViewBox(prev => ({
        ...prev,
        x: prev.x + e.deltaX,
        y: prev.y + e.deltaY
      }));
    }
  };

  // Canvas panning state
  const [panState, setPanState] = useState({
    isPanning: false,
    startX: 0,
    startY: 0
  });

  // Canvas panning handlers
  const handleCanvasPanStart = (e: React.MouseEvent) => {
    // Don't start panning if we're already dragging a node
    if (dragState.isDragging) return;
    
    // Only start panning if using middle mouse button or Alt+left click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPanState({
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY
      });
      document.body.style.cursor = 'move';
    }
    // Start box selection if left click without Alt or Ctrl (not on a node)
    else if (e.button === 0 && !e.altKey && !e.ctrlKey && !(e.target as HTMLElement).closest('g')) {
      // Only if not clicking on a node
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      
      // Convert client coordinates to SVG coordinates
      const x = (e.clientX - svgRect.left) * (viewBox.width / svgRect.width) + viewBox.x;
      const y = (e.clientY - svgRect.top) * (viewBox.height / svgRect.height) + viewBox.y;
      
      setSelectionBox({
        isSelecting: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
      
      // If not holding Ctrl, clear previous selection
      if (!e.ctrlKey) {
        setSelectedNodes([]);
      }
    }
  };

  const handleCanvasPanMove = (e: React.MouseEvent) => {
    if (panState.isPanning) {
      const dx = e.clientX - panState.startX;
      const dy = e.clientY - panState.startY;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - (dx * prev.scale),
        y: prev.y - (dy * prev.scale)
      }));
      
      setPanState({
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY
      });
    }
    
    // Update selection box if we're box selecting
    if (selectionBox.isSelecting) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      
      // Convert client coordinates to SVG coordinates
      const x = (e.clientX - svgRect.left) * (viewBox.width / svgRect.width) + viewBox.x;
      const y = (e.clientY - svgRect.top) * (viewBox.height / svgRect.height) + viewBox.y;
      
      setSelectionBox(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    }
  };
  
  const handleCanvasPanEnd = () => {
    if (panState.isPanning) {
      setPanState({
        isPanning: false,
        startX: 0,
        startY: 0
      });
      document.body.style.cursor = '';
    }
    
    // Finish box selection if we were selecting
    if (selectionBox.isSelecting) {
      // Calculate selection box dimensions
      const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
      const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
      const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
      const y2 = Math.max(selectionBox.startY, selectionBox.currentY);
      
      // Find all nodes inside the selection box
      const selectedIds = devices
        .filter(device => {
          const pos = getNodePosition(device.id, devices.indexOf(device), devices.length);
          return pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2;
        })
        .map(device => device.id);
      
      // Update selection
      setSelectedNodes(prev => {
        const newSelection = [...prev];
        
        // Add newly selected nodes
        selectedIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        
        return newSelection;
      });
      
      // Reset selection box
      setSelectionBox({
        isSelecting: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    }
  };

  // Node selection handler
  const handleNodeClick = (e: React.MouseEvent, deviceId: string) => {
    // If Ctrl key is pressed, toggle selection
    if (e.ctrlKey) {
      setSelectedNodes(prev => {
        const index = prev.indexOf(deviceId);
        if (index >= 0) {
          // Remove from selection if already selected
          return prev.filter(id => id !== deviceId);
        } else {
          // Add to selection if not selected
          return [...prev, deviceId];
        }
      });
    } else {
      // Otherwise, select just this node
      setSelectedNodes([deviceId]);
    }
  };

  // Node drag handlers
  const handleDragStart = (e: React.MouseEvent, deviceId: string) => {
    // Prevent handling if this is a right-click
    if (e.button !== 0) return;
    
    e.stopPropagation(); // Prevent bubble up to canvas handlers
    
    // Select the node if not already selected
    if (!selectedNodes.includes(deviceId) && !e.ctrlKey) {
      setSelectedNodes([deviceId]);
    }
    
    // Get current position for all selected nodes
    const initialPositions: Record<string, NodePosition> = {};
    selectedNodes.forEach(id => {
      const index = devices.findIndex(d => d.id === id);
      if (index >= 0) {
        initialPositions[id] = nodePositions[id] || getLayoutPosition(index, devices.length);
      }
    });
    
    // Record specific start position for the dragged node
    const nodePos = nodePositions[deviceId] || { x: 0, y: 0 };
    
    // Calculate mouse position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const mouseX = (e.clientX - svgRect.left) * (viewBox.width / svgRect.width) + viewBox.x;
    const mouseY = (e.clientY - svgRect.top) * (viewBox.height / svgRect.height) + viewBox.y;
    
    // Set drag state
    setDragState({
      isDragging: true,
      nodeId: deviceId, // This is the node being directly dragged
      startX: mouseX,
      startY: mouseY,
      offsetX: nodePos.x - mouseX,
      offsetY: nodePos.y - mouseY,
      initialPositions
    });
    
    // Set cursor style
    document.body.style.cursor = 'grabbing';
  };
  
  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.nodeId) return;
    
    // Calculate mouse position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const mouseX = (e.clientX - svgRect.left) * (viewBox.width / svgRect.width) + viewBox.x;
    const mouseY = (e.clientY - svgRect.top) * (viewBox.height / svgRect.height) + viewBox.y;
    
    // Calculate delta movement from drag start
    const dx = mouseX - dragState.startX;
    const dy = mouseY - dragState.startY;
    
    // Update positions for all selected nodes
    setNodePositions(prev => {
      const newPositions = { ...prev };
      
      // Only update positions for selected nodes
      selectedNodes.forEach(nodeId => {
        const initialPos = dragState.initialPositions[nodeId];
        if (initialPos) {
          newPositions[nodeId] = {
            x: initialPos.x + dx,
            y: initialPos.y + dy
          };
        }
      });
      
      return newPositions;
    });
  };
  
  const handleDragEnd = () => {
    // Reset drag state
    setDragState({
      isDragging: false,
      nodeId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      initialPositions: {}
    });
    
    // Reset cursor style
    document.body.style.cursor = '';
  };
  
  // Handle node right-click (for deletion)
  const handleNodeRightClick = (e: React.MouseEvent, deviceId: string) => {
    e.preventDefault(); // Prevent default context menu
    
    // Check if the device is in the current selection
    if (selectedNodes.includes(deviceId) && selectedNodes.length > 1) {
      // If multiple nodes are selected, ask if the user wants to delete all selected nodes
      if (window.confirm(`Delete ${selectedNodes.length} selected devices and all their connected links?`)) {
        // Call onDeleteNode for each selected node
        selectedNodes.forEach(id => {
          onDeleteNode?.(id);
        });
        
        // Clear selection
        setSelectedNodes([]);
      }
    } else {
      // If only one node is selected or the right-clicked node isn't in the selection,
      // just delete that one node
      if (window.confirm(`Delete device ${deviceId} and all connected links?`)) {
        onDeleteNode?.(deviceId);
        
        // Remove from selection if it was selected
        setSelectedNodes(prev => prev.filter(id => id !== deviceId));
      }
    }
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#e0e0e0',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseDown={handleCanvasPanStart}
      onMouseMove={(e) => {
        if (dragState.isDragging) handleDragMove(e);
        if (panState.isPanning) handleCanvasPanMove(e);
        if (selectionBox.isSelecting) handleCanvasPanMove(e);
      }}
      onMouseUp={(e) => {
        handleDragEnd();
        handleCanvasPanEnd();
      }}
      onMouseLeave={(e) => {
        handleDragEnd();
        handleCanvasPanEnd();
      }}
    >
      {/* Zoom controls */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '12px' }}>-</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={viewBox.scale}
            onChange={(e) => {
              const scale = parseFloat(e.target.value);
              setViewBox(prev => ({
                ...prev,
                scale,
                width: 800 / scale,
                height: 600 / scale
              }));
            }}
            style={{ width: '100px' }}
          />
          <span style={{ fontSize: '12px' }}>+</span>
        </div>
        
        {/* Pan controls */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gap: '2px',
          marginTop: '5px'
        }}>
          {/* Top row */}
          <div></div>
          <button 
            onClick={() => setViewBox(prev => ({...prev, y: prev.y - 50}))}
            style={{ width: '30px', height: '30px', cursor: 'pointer', padding: 0 }}>
            ↑
          </button>
          <div></div>
          
          {/* Middle row */}
          <button 
            onClick={() => setViewBox(prev => ({...prev, x: prev.x - 50}))}
            style={{ width: '30px', height: '30px', cursor: 'pointer', padding: 0 }}>
            ←
          </button>
          <button 
            onClick={handleReset}
            style={{ width: '30px', height: '30px', cursor: 'pointer', padding: 0 }}>
            ↺
          </button>
          <button 
            onClick={() => setViewBox(prev => ({...prev, x: prev.x + 50}))}
            style={{ width: '30px', height: '30px', cursor: 'pointer', padding: 0 }}>
            →
          </button>
          
          {/* Bottom row */}
          <div></div>
          <button 
            onClick={() => setViewBox(prev => ({...prev, y: prev.y + 50}))}
            style={{ width: '30px', height: '30px', cursor: 'pointer', padding: 0 }}>
            ↓
          </button>
          <div></div>
        </div>
        
        <div style={{ marginTop: '5px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Hold Alt + Left click or<br/>
          Middle mouse button to pan
        </div>
        
        <div style={{ marginTop: '5px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Ctrl + Click to select multiple<br/>
          Drag to box-select
        </div>
      </div>
      
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onWheel={handleWheel}
      >
        {/* Draw links as lines */}
        {links.map(link => {
          const sourceDevice = devices.find(d => d.id === link.sourceDeviceId);
          const targetDevice = devices.find(d => d.id === link.targetDeviceId);
          const sourceIndex = devices.findIndex(d => d.id === link.sourceDeviceId);
          const targetIndex = devices.findIndex(d => d.id === link.targetDeviceId);
          
          if (!sourceDevice || !targetDevice) return null;
          
          const sourcePos = getNodePosition(sourceDevice.id, sourceIndex, devices.length);
          const targetPos = getNodePosition(targetDevice.id, targetIndex, devices.length);
          
          return (
            <line 
              key={`link-${link.id}`}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#666"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Draw selection box if active */}
        {selectionBox.isSelecting && (
          <rect
            x={Math.min(selectionBox.startX, selectionBox.currentX)}
            y={Math.min(selectionBox.startY, selectionBox.currentY)}
            width={Math.abs(selectionBox.currentX - selectionBox.startX)}
            height={Math.abs(selectionBox.currentY - selectionBox.startY)}
            fill="rgba(66, 133, 244, 0.2)"
            stroke="rgba(66, 133, 244, 0.8)"
            strokeWidth="1"
          />
        )}
        
        {/* Draw nodes as circles */}
        {devices.map((device, index) => {
          const position = getNodePosition(device.id, index, devices.length);
          const isSelected = selectedNodes.includes(device.id);
          
          return (
            <g 
              key={`device-${device.id}`}
              onClick={(e) => handleNodeClick(e, device.id)}
              onContextMenu={(e) => handleNodeRightClick(e, device.id)}
              onMouseDown={(e) => handleDragStart(e, device.id)}
              style={{ cursor: dragState.isDragging && selectedNodes.includes(device.id) ? 'grabbing' : 'grab' }}
            >
              <circle
                cx={position.x}
                cy={position.y}
                r={30}
                fill="#1976d2"
                stroke={isSelected ? '#ff9800' : '#333'}
                strokeWidth={isSelected ? 4 : 2}
              />
              <text
                x={position.x}
                y={position.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="14px"
              >
                {device.name || device.id}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Info text */}
      {devices.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#666',
        }}>
          <p>No devices in topology</p>
          <p>Add devices and links to visualize the network</p>
          <p>Right-click a device to delete it</p>
        </div>
      )}
    </div>
  );
};

export default TopologyGraph;
