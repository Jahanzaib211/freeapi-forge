'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NODES, EDGES, LAYERS, EDGE_COLORS, LANGUAGE_COLORS, STATUS_STYLES, RISK_STYLES,
  type ForgeNode, type ForgeEdge, type EdgeType
} from '@/lib/forge-tree-data';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from '@/components/ui/tooltip';
import {
  AlertTriangle, CheckCircle2, Zap, ExternalLink, ArrowDown,
  ArrowRight, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw,
  Layers, Shield, Cpu, HardDrive, Database, Globe, Terminal,
  Workflow, Boxes, ChevronDown
} from 'lucide-react';

// Layout constants
const CANVAS_W = 1800;
const CANVAS_H = 1500;
const NODE_W = 152;
const NODE_H = 38;
const NODE_GAP = 14;
const LAYER_GAP = 150;
const LAYER_START_Y = 70;

interface LayoutNode extends ForgeNode {
  x: number;
  y: number;
}

function computeLayout(): LayoutNode[] {
  const layerGroups: Map<number, ForgeNode[]> = new Map();
  for (const node of NODES) {
    const group = layerGroups.get(node.layer) || [];
    group.push(node);
    layerGroups.set(node.layer, group);
  }

  return NODES.map(node => {
    const group = layerGroups.get(node.layer) || [];
    const idx = group.indexOf(node);
    const totalW = group.length * NODE_W + (group.length - 1) * NODE_GAP;
    const startX = (CANVAS_W - totalW) / 2;
    return {
      ...node,
      x: startX + idx * (NODE_W + NODE_GAP),
      y: LAYER_START_Y + node.layer * LAYER_GAP,
    };
  });
}

const layoutNodes = computeLayout();

function edgePath(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const dy = Math.abs(y2 - y1);
  const cy = dy * 0.45;
  return `M ${x1} ${y1} C ${x1} ${y1 + cy}, ${x2} ${y2 - cy}, ${x2} ${y2}`;
}

// Icons per language
function LanguageIcon({ lang }: { lang: string }) {
  const color = LANGUAGE_COLORS[lang as keyof typeof LANGUAGE_COLORS] || '#94A3B8';
  switch (lang) {
    case 'typescript': return <Cpu size={12} style={{ color }} />;
    case 'rust': return <Zap size={12} style={{ color }} />;
    case 'go': return <Terminal size={12} style={{ color }} />;
    case 'sql': return <Database size={12} style={{ color }} />;
    case 'yaml': return <Boxes size={12} style={{ color }} />;
    case 'external': return <Globe size={12} style={{ color }} />;
    case 'binary': return <HardDrive size={12} style={{ color }} />;
    default: return <Boxes size={12} style={{ color }} />;
  }
}

function EdgeTypeIcon({ type }: { type: EdgeType }) {
  switch (type) {
    case 'data': return <ArrowDown size={10} className="text-[#00FFB2]" />;
    case 'api': return <ArrowRight size={10} className="text-[#38BDF8]" />;
    case 'file': return <HardDrive size={10} className="text-[#FBBF24]" />;
    case 'process': return <Cpu size={10} className="text-[#FB923C]" />;
    case 'depends': return <ArrowDown size={10} className="text-[#94A3B8]" />;
    case 'network': return <Globe size={10} className="text-[#C084FC]" />;
    case 'event': return <Zap size={10} className="text-[#F472B6]" />;
    default: return <ArrowDown size={10} className="text-[#6B7280]" />;
  }
}

export default function ArchGraph() {
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<boolean[]>(
    LAYERS.map(() => true)
  );
  const [showLabels, setShowLabels] = useState(true);
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterEdgeType, setFilterEdgeType] = useState<EdgeType | 'all'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragState, setIsDragState] = useState(false);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const visibleNodeIds = useMemo(() => {
    return new Set(
      layoutNodes.filter(n => visibleLayers[n.layer]).map(n => n.id)
    );
  }, [visibleLayers]);

  const filteredNodes = useMemo(() => {
    return layoutNodes.filter(n => {
      if (!visibleNodeIds.has(n.id)) return false;
      if (filterCritical && n.risk !== 'critical' && !n.spof) return false;
      return true;
    });
  }, [visibleNodeIds, filterCritical]);

  const filteredEdges = useMemo(() => {
    return EDGES.filter(e => {
      if (!visibleNodeIds.has(e.from) || !visibleNodeIds.has(e.to)) return false;
      if (filterCritical && !e.critical) return false;
      if (filterEdgeType !== 'all' && e.type !== filterEdgeType) return false;
      return true;
    });
  }, [visibleNodeIds, filterCritical, filterEdgeType]);

  const handleNodeClick = useCallback((node: LayoutNode) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      setHighlightedEdges([]);
    } else {
      setSelectedNode(node);
      const connected = EDGES
        .filter(e => e.from === node.id || e.to === node.id)
        .map(e => e.id);
      setHighlightedEdges(connected);
    }
  }, [selectedNode]);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNode(nodeId);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      if ((e.target as HTMLElement).dataset.bg === 'true') {
        isDragging.current = true;
        setIsDragState(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = (e.clientX - lastPos.current.x) / zoom;
      const dy = (e.clientY - lastPos.current.y) / zoom;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsDragState(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(0.55);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setHighlightedEdges([]);
    setFilterCritical(false);
    setFilterEdgeType('all');
    setVisibleLayers(LAYERS.map(() => true));
  }, []);

  const toggleLayer = useCallback((layerId: number) => {
    setVisibleLayers(prev => {
      const next = [...prev];
      next[layerId] = !next[layerId];
      return next;
    });
  }, []);

  // Auto-center on mount
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const scale = Math.min(w / CANVAS_W, 0.7);
      setZoom(scale);
      setPan({ x: 0, y: 10 });
    }
  }, []);

  const upstreamIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    EDGES.filter(e => e.to === selectedNode.id).forEach(e => ids.add(e.from));
    return ids;
  }, [selectedNode]);

  const downstreamIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    EDGES.filter(e => e.from === selectedNode.id).forEach(e => ids.add(e.to));
    return ids;
  }, [selectedNode]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Controls Panel */}
        <div className="lg:w-64 flex-shrink-0 space-y-3">
          {/* Zoom Controls */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">View Controls</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors">
                <Plus size={14} />
              </button>
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors">
                <Minus size={14} />
              </button>
              <button onClick={resetView} className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors flex-1 text-xs text-muted-foreground">
                <RotateCcw size={14} className="inline mr-1" />Reset
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</div>
          </div>

          {/* Filter Controls */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={filterCritical}
                onChange={e => setFilterCritical(e.target.checked)}
                className="rounded accent-[#00FFB2]"
              />
              <AlertTriangle size={12} className="text-red-400" /> Critical path only
            </label>
            <select
              value={filterEdgeType}
              onChange={e => setFilterEdgeType(e.target.value as EdgeType | 'all')}
              className="w-full bg-secondary text-xs p-1.5 rounded border border-border"
            >
              <option value="all">All edge types</option>
              <option value="data">Data flow</option>
              <option value="api">API call</option>
              <option value="file">File access</option>
              <option value="process">Process spawn</option>
              <option value="network">Network</option>
              <option value="event">Event</option>
              <option value="depends">Dependency</option>
            </select>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={e => setShowLabels(e.target.checked)}
                className="rounded accent-[#00FFB2]"
              />
              Show edge labels
            </label>
          </div>

          {/* Layer Toggles */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Layers size={12} className="inline mr-1" />Layers
            </h3>
            {LAYERS.map(layer => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-2 text-xs w-full text-left p-1 rounded transition-colors ${
                  visibleLayers[layer.id] ? 'bg-secondary' : 'bg-secondary/30 opacity-50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                <span className="truncate flex-1">{layer.name}</span>
                <span className="text-muted-foreground">{NODES.filter(n => n.layer === layer.id).length}</span>
              </button>
            ))}
          </div>

          {/* Edge Legend */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edge Types</h3>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-[10px]">
                  <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Language Legend */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Languages</h3>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(LANGUAGE_COLORS).map(([lang, color]) => (
                <div key={lang} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="capitalize">{lang}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={containerRef}
            className="relative bg-[#0a0a0f] border border-border rounded-lg overflow-hidden"
            style={{ height: '700px', cursor: isDragState ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 bg-grid opacity-50" />

            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="absolute"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              {/* Background rect for mouse events */}
              <rect data-bg="true" x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="transparent" />

              {/* Layer backgrounds */}
              {LAYERS.map(layer => {
                if (!visibleLayers[layer.id]) return null;
                const y = LAYER_START_Y + layer.id * LAYER_GAP - 10;
                return (
                  <g key={layer.id}>
                    <rect
                      x="20" y={y} width={CANVAS_W - 40} height={LAYER_GAP - 4}
                      fill={layer.bgColor} rx="8"
                    />
                    <text
                      x="36" y={y + 18}
                      fill={layer.color} fontSize="11" fontWeight="600"
                      opacity="0.7"
                    >
                      {layer.name.toUpperCase()}
                    </text>
                    <text
                      x="36" y={y + 30}
                      fill={layer.color} fontSize="9" opacity="0.4"
                    >
                      {layer.subtitle}
                    </text>
                  </g>
                );
              })}

              {/* Edges */}
              {filteredEdges.map(edge => {
                const fromNode = layoutNodes.find(n => n.id === edge.from);
                const toNode = layoutNodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const path = edgePath(fromNode, toNode);
                const color = EDGE_COLORS[edge.type];
                const isHighlighted = highlightedEdges.length === 0 || highlightedEdges.includes(edge.id);
                const isDimmed = highlightedEdges.length > 0 && !highlightedEdges.includes(edge.id);

                return (
                  <g key={edge.id}>
                    {/* Glow for critical highlighted edges */}
                    {edge.critical && isHighlighted && (
                      <path
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        opacity={0.15}
                        className="animate-glow-line"
                      />
                    )}
                    <path
                      d={path}
                      fill="none"
                      stroke={color}
                      strokeWidth={edge.critical ? 1.5 : 0.8}
                      opacity={isDimmed ? 0.08 : (edge.critical ? 0.7 : 0.35)}
                      strokeDasharray={edge.critical ? undefined : '4 3'}
                      className={edge.critical && isHighlighted ? 'animate-forge-flow' : ''}
                    />
                    {/* Arrow head */}
                    <circle
                      cx={toNode.x + NODE_W / 2}
                      cy={toNode.y}
                      r={edge.critical ? 2.5 : 1.5}
                      fill={color}
                      opacity={isDimmed ? 0.08 : 0.6}
                    />
                    {/* Edge label */}
                    {showLabels && edge.label && isHighlighted && (
                      <text
                        x={(fromNode.x + NODE_W / 2 + toNode.x + NODE_W / 2) / 2}
                        y={(fromNode.y + NODE_H + toNode.y) / 2 + 3}
                        fill={color}
                        fontSize="7"
                        textAnchor="middle"
                        opacity={0.5}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map(node => {
                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode?.id === node.id;
                const isUpstream = upstreamIds.has(node.id);
                const isDownstream = downstreamIds.has(node.id);
                const langColor = LANGUAGE_COLORS[node.language] || '#94A3B8';
                const statusStyle = STATUS_STYLES[node.status];

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => handleNodeHover(node.id)}
                    onMouseLeave={() => handleNodeHover(null)}
                  >
                    {/* SPOF indicator glow */}
                    {node.spof && (
                      <rect
                        x={node.x - 2} y={node.y - 2}
                        width={NODE_W + 4} height={NODE_H + 4}
                        fill="none" stroke="#EF4444" strokeWidth="1"
                        opacity="0.3" rx="10"
                      />
                    )}
                    {/* Selected/upstream/downstream highlights */}
                    {isSelected && (
                      <rect
                        x={node.x - 3} y={node.y - 3}
                        width={NODE_W + 6} height={NODE_H + 6}
                        fill="none" stroke="#00FFB2" strokeWidth="2"
                        opacity="0.8" rx="11"
                        className="animate-forge-pulse"
                      />
                    )}
                    {(isUpstream || isDownstream) && !isSelected && (
                      <rect
                        x={node.x - 2} y={node.y - 2}
                        width={NODE_W + 4} height={NODE_H + 4}
                        fill="none" stroke="#00FFB2" strokeWidth="1.5"
                        opacity="0.4" rx="10"
                      />
                    )}
                    {/* Node body */}
                    <rect
                      x={node.x} y={node.y}
                      width={NODE_W} height={NODE_H}
                      rx="6"
                      fill={isHovered || isSelected ? '#1a1a2e' : '#12121f'}
                      stroke={isHovered || isSelected ? langColor : '#2a2a3e'}
                      strokeWidth={isHovered || isSelected ? 1.5 : 0.8}
                    />
                    {/* Status dot */}
                    <circle
                      cx={node.x + 10} cy={node.y + NODE_H / 2}
                      r="3"
                      fill={statusStyle.color}
                      opacity={0.8}
                    />
                    {/* Language icon */}
                    <foreignObject x={node.x + 16} y={node.y + 10} width={16} height={16}>
                      <LanguageIcon lang={node.language} />
                    </foreignObject>
                    {/* Node name */}
                    <text
                      x={node.x + 32} y={node.y + 22}
                      fill={isHovered || isSelected ? '#e2e8f0' : '#94a3b8'}
                      fontSize="10"
                      fontWeight={isSelected ? '600' : '400'}
                    >
                      {node.shortName || node.name}
                    </text>
                    {/* SPOF badge */}
                    {node.spof && (
                      <text
                        x={node.x + NODE_W - 8} y={node.y + 10}
                        fill="#EF4444" fontSize="7" textAnchor="middle"
                        fontWeight="700"
                      >
                        SPOF
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Zoom info overlay */}
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/50 font-mono">
              {filteredNodes.length} nodes · {filteredEdges.length} edges
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:w-80 flex-shrink-0">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedNode.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{selectedNode.description}</p>
                  </div>
                  <button onClick={() => { setSelectedNode(null); setHighlightedEdges([]); }} className="text-muted-foreground hover:text-foreground">
                    <ChevronRight size={14} />
                  </button>
                </div>

                <Separator className="bg-border" />

                {/* Status & Risk */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] h-5 gap-1" style={{ borderColor: STATUS_STYLES[selectedNode.status].color, color: STATUS_STYLES[selectedNode.status].color }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[selectedNode.status].dot}`} />
                    {STATUS_STYLES[selectedNode.status].label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] h-5 ${RISK_STYLES[selectedNode.risk].bg}`}>
                    {selectedNode.risk === 'critical' && <AlertTriangle size={10} className="mr-1" />}
                    {RISK_STYLES[selectedNode.risk].label} risk
                  </Badge>
                  {selectedNode.spof && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-400 border-red-500/30">
                      <Shield size={10} className="mr-1" /> SPOF
                    </Badge>
                  )}
                  {selectedNode.license && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-secondary text-muted-foreground">
                      {selectedNode.license}
                    </Badge>
                  )}
                </div>

                {/* Layer */}
                <div className="text-[10px]">
                  <span className="text-muted-foreground">Layer: </span>
                  <span className="font-medium" style={{ color: LAYERS[selectedNode.layer].color }}>
                    {LAYERS[selectedNode.layer].name}
                  </span>
                </div>

                {/* Port */}
                {selectedNode.port && (
                  <div className="text-[10px]">
                    <span className="text-muted-foreground">Port: </span>
                    <span className="font-mono text-[#00FFB2]">:{selectedNode.port}</span>
                  </div>
                )}

                {/* Tech Stack */}
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tech Stack</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tech.map(t => (
                      <Badge key={t} variant="outline" className="text-[9px] h-4 bg-secondary/50 text-muted-foreground border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="flex items-center gap-2 text-[10px]">
                  <LanguageIcon lang={selectedNode.language} />
                  <span className="capitalize font-medium" style={{ color: LANGUAGE_COLORS[selectedNode.language] }}>
                    {selectedNode.language}
                  </span>
                </div>

                <Separator className="bg-border" />

                {/* Connections */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Dependencies ({upstreamIds.size})
                  </h4>
                  {upstreamIds.size === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No dependencies (root)</p>}
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {EDGES.filter(e => e.to === selectedNode.id).map(e => {
                      const src = layoutNodes.find(n => n.id === e.from);
                      if (!src) return null;
                      return (
                        <div key={e.id} className="flex items-center gap-1 text-[10px]">
                          <EdgeTypeIcon type={e.type} />
                          <span className="text-muted-foreground">{src.shortName || src.name}</span>
                          <span className="text-muted-foreground/40 ml-auto">{e.type}</span>
                        </div>
                      );
                    })}
                  </div>

                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Dependents ({downstreamIds.size})
                  </h4>
                  {downstreamIds.size === 0 && <p className="text-[10px] text-muted-foreground/50 italic">No dependents (leaf)</p>}
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {EDGES.filter(e => e.from === selectedNode.id).map(e => {
                      const tgt = layoutNodes.find(n => n.id === e.to);
                      if (!tgt) return null;
                      return (
                        <div key={e.id} className="flex items-center gap-1 text-[10px]">
                          <EdgeTypeIcon type={e.type} />
                          <span className="text-muted-foreground">{tgt.shortName || tgt.name}</span>
                          <span className="text-muted-foreground/40 ml-auto">{e.type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card/80 backdrop-blur border border-border rounded-lg p-4"
              >
                <div className="text-center py-8">
                  <Workflow size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Click any node to inspect</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Shows dependencies, tech stack, risk level, and connections</p>
                </div>
                <Separator className="bg-border my-3" />
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/50 rounded p-2 text-center">
                      <div className="text-lg font-bold text-[#00FFB2]">{NODES.length}</div>
                      <div className="text-[9px] text-muted-foreground">Components</div>
                    </div>
                    <div className="bg-secondary/50 rounded p-2 text-center">
                      <div className="text-lg font-bold text-[#38BDF8]">{EDGES.length}</div>
                      <div className="text-[9px] text-muted-foreground">Connections</div>
                    </div>
                    <div className="bg-secondary/50 rounded p-2 text-center">
                      <div className="text-lg font-bold text-[#EF4444]">{NODES.filter(n => n.spof).length}</div>
                      <div className="text-[9px] text-muted-foreground">SPOFs</div>
                    </div>
                    <div className="bg-secondary/50 rounded p-2 text-center">
                      <div className="text-lg font-bold text-[#A78BFA]">{LAYERS.length}</div>
                      <div className="text-[9px] text-muted-foreground">Layers</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
