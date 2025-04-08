// Define preset topology interfaces
export interface PresetNode {
  id: string;
  name: string;
}

export interface PresetLink {
  source: string;
  target: string;
  sourceInterface: string;
  targetInterface: string;
}

export interface PresetTopology {
  name: string;
  description: string;
  nodes: PresetNode[];
  links: PresetLink[];
}

// Define preset topologies
export const presetTopologies: PresetTopology[] = [
  {
    name: 'Star',
    description: 'Central hub with connected spokes',
    nodes: [
      { id: 'hub', name: 'Hub' },
      { id: 'spoke1', name: 'Spoke1' },
      { id: 'spoke2', name: 'Spoke2' },
      { id: 'spoke3', name: 'Spoke3' },
      { id: 'spoke4', name: 'Spoke4' }
    ],
    links: [
      { source: 'hub', target: 'spoke1', sourceInterface: 'eth0', targetInterface: 'eth0' },
      { source: 'hub', target: 'spoke2', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'hub', target: 'spoke3', sourceInterface: 'eth2', targetInterface: 'eth0' },
      { source: 'hub', target: 'spoke4', sourceInterface: 'eth3', targetInterface: 'eth0' }
    ]
  },
  {
    name: 'Ring',
    description: 'Nodes connected in a circle',
    nodes: [
      { id: 'node1', name: 'Node1' },
      { id: 'node2', name: 'Node2' },
      { id: 'node3', name: 'Node3' },
      { id: 'node4', name: 'Node4' }
    ],
    links: [
      { source: 'node1', target: 'node2', sourceInterface: 'eth0', targetInterface: 'eth0' },
      { source: 'node2', target: 'node3', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'node3', target: 'node4', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'node4', target: 'node1', sourceInterface: 'eth1', targetInterface: 'eth1' }
    ]
  },
  {
    name: 'Mesh',
    description: 'Fully connected network',
    nodes: [
      { id: 'node1', name: 'Node1' },
      { id: 'node2', name: 'Node2' },
      { id: 'node3', name: 'Node3' },
      { id: 'node4', name: 'Node4' }
    ],
    links: [
      { source: 'node1', target: 'node2', sourceInterface: 'eth0', targetInterface: 'eth0' },
      { source: 'node1', target: 'node3', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'node1', target: 'node4', sourceInterface: 'eth2', targetInterface: 'eth0' },
      { source: 'node2', target: 'node3', sourceInterface: 'eth1', targetInterface: 'eth1' },
      { source: 'node2', target: 'node4', sourceInterface: 'eth2', targetInterface: 'eth1' },
      { source: 'node3', target: 'node4', sourceInterface: 'eth2', targetInterface: 'eth2' }
    ]
  },
  {
    name: 'Tree',
    description: 'Hierarchical network layout',
    nodes: [
      { id: 'root', name: 'Root' },
      { id: 'child1', name: 'Child1' },
      { id: 'child2', name: 'Child2' },
      { id: 'leaf1', name: 'Leaf1' },
      { id: 'leaf2', name: 'Leaf2' },
      { id: 'leaf3', name: 'Leaf3' }
    ],
    links: [
      { source: 'root', target: 'child1', sourceInterface: 'eth0', targetInterface: 'eth0' },
      { source: 'root', target: 'child2', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'child1', target: 'leaf1', sourceInterface: 'eth1', targetInterface: 'eth0' },
      { source: 'child1', target: 'leaf2', sourceInterface: 'eth2', targetInterface: 'eth0' },
      { source: 'child2', target: 'leaf3', sourceInterface: 'eth1', targetInterface: 'eth0' }
    ]
  }
];
