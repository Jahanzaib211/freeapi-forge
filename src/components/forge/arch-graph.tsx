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
  Workflow, Boxes, ChevronDown, ChevronUp, Search, Filter,
  Download, Network, ZoomIn
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
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'spof' | 'ready' | 'critical'>('all');
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 700 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragState, setIsDragState] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipNode, setTooltipNode] = useState<LayoutNode | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const visibleNodeIds = useMemo(() => {
    return new Set(
      layoutNodes.filter(n => visibleLayers[n.layer]).map(n => n.id)
    );
  }, [visibleLayers]);

  // Compute matching node IDs from search query and quick filter
  const matchingNodeIds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return new Set(
      layoutNodes.filter(n => {
        // Quick filter first
        if (quickFilter === 'spof' && !n.spof) return false;
        if (quickFilter === 'ready' && n.status !== 'ready') return false;
        if (quickFilter === 'critical' && n.risk !== 'critical') return false;
        // Search query matching
        if (query) {
          return (
            n.name.toLowerCase().includes(query) ||
            (n.shortName && n.shortName.toLowerCase().includes(query)) ||
            n.tech.some(t => t.toLowerCase().includes(query)) ||
            n.description.toLowerCase().includes(query)
          );
        }
        return true;
      }).map(n => n.id)
    );
  }, [searchQuery, quickFilter]);

  const isSearchActive = searchQuery.trim().length > 0 || quickFilter !== 'all';

  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    return layoutNodes.filter(n => matchingNodeIds.has(n.id));
  }, [matchingNodeIds, isSearchActive]);

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

  const focusOnNode = useCallback((nodeId: string) => {
    const node = layoutNodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const targetX = -(node.x + NODE_W / 2) * zoom + containerW / 2;
    const targetY = -(node.y + NODE_H / 2) * zoom + containerH / 2;
    setPan({ x: targetX, y: targetY });
    setSelectedNode(node);
    const connected = EDGES
      .filter(e => e.from === node.id || e.to === node.id)
      .map(e => e.id);
    setHighlightedEdges(connected);
  }, [zoom]);

  const resetView = useCallback(() => {
    setZoom(0.55);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setHighlightedEdges([]);
    setFilterCritical(false);
    setFilterEdgeType('all');
    setVisibleLayers(LAYERS.map(() => true));
    setSearchQuery('');
    setQuickFilter('all');
  }, []);

  const exportSVG = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forge-studio-graph.svg';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, []);

  const exportPNG = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = CANVAS_W * scale;
      canvas.height = CANVAS_H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'forge-studio-graph.png';
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
    setShowExportMenu(false);
  }, []);

  const toggleLayer = useCallback((layerId: number) => {
    setVisibleLayers(prev => {
      const next = [...prev];
      next[layerId] = !next[layerId];
      return next;
    });
  }, []);

  // Auto-center on mount + track container size
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      setContainerSize({ w, h });
      const scale = Math.min(w / CANVAS_W, 0.7);
      setZoom(scale);
      setPan({ x: 0, y: 10 });
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
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
        {/* Mobile toggle for controls panel */}
        <button
          onClick={() => setControlsOpen(!controlsOpen)}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 border border-border text-xs font-medium text-foreground/60 hover:text-[#00FFB2] transition-colors w-full"
        >
          {controlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {controlsOpen ? 'Hide Controls' : 'Show Controls'}
        </button>

        {/* Controls Panel */}
        <div className={`lg:w-64 flex-shrink-0 space-y-4 ${controlsOpen ? 'block' : 'hidden lg:block'}`}>
          {/* Zoom Controls */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
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
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1.5 rounded bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Export graph"
                >
                  <Download size={14} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-[#0a0a0f]/95 backdrop-blur-xl border border-border rounded-lg p-1 z-50 shadow-xl">
                    <button
                      onClick={exportSVG}
                      className="w-full text-left text-[10px] px-2 py-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Download SVG
                    </button>
                    <button
                      onClick={exportPNG}
                      className="w-full text-left text-[10px] px-2 py-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Download PNG (2x)
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</div>
          </div>

          {/* Filter Controls */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
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

          {/* Node Search */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Search size={12} className="inline mr-1" />Search Nodes
            </h3>
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
              <input
                id="node-search-input"
                type="text"
                placeholder="Name, tech, description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-secondary text-xs pl-7 pr-7 py-1.5 rounded border border-border placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[#00FFB2]/50 focus:border-[#00FFB2]/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                >
                  <Minus size={12} />
                </button>
              )}
            </div>
            {isSearchActive && (
              <div className="text-[10px] text-muted-foreground">
                <span className="text-[#00FFB2] font-semibold">{matchingNodeIds.size}</span> of {NODES.length} nodes match
              </div>
            )}

            {/* Quick Filter Buttons */}
            <div className="space-y-1">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Filter size={10} className="inline mr-1" />Quick Filters
              </h4>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setQuickFilter('all')}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    quickFilter === 'all'
                      ? 'bg-[#00FFB2]/10 border-[#00FFB2]/30 text-[#00FFB2]'
                      : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setQuickFilter('spof')}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    quickFilter === 'spof'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  SPOF Only
                </button>
                <button
                  onClick={() => setQuickFilter('ready')}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    quickFilter === 'ready'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ready Only
                </button>
                <button
                  onClick={() => setQuickFilter('critical')}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    quickFilter === 'critical'
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Critical Risk
                </button>
              </div>
            </div>

            {/* Results List */}
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                {searchResults.map(node => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => focusOnNode(node.id)}
                      className={`flex items-center gap-1.5 w-full text-left text-[10px] px-1.5 py-1 rounded transition-colors ${
                        isSelected
                          ? 'bg-[#00FFB2]/10 text-[#00FFB2]'
                          : 'bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <circle
                        cx={6}
                        cy={6}
                        r={3}
                        fill={STATUS_STYLES[node.status].color}
                        opacity={0.8}
                      />
                      <span className="truncate flex-1">{node.shortName || node.name}</span>
                      {node.spof && <span className="text-red-400 text-[8px] font-bold">SPOF</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Layer Toggles */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
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
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edge Types</h3>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(EDGE_COLORS).map(([type, color]) => {
                const count = filteredEdges.filter(e => e.type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                      <span className="capitalize">{type}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Language Legend */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-2">
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
          {/* Stats Bar */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-card/60 border border-border rounded-t-lg border-b-0 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Boxes size={10} className="text-[#00FFB2]" />
              <span className="text-muted-foreground">Nodes:</span>
              <span className="text-foreground font-semibold tabular-nums">{filteredNodes.length}/{NODES.length}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <Network size={10} className="text-[#38BDF8]" />
              <span className="text-muted-foreground">Edges:</span>
              <span className="text-foreground font-semibold tabular-nums">{filteredEdges.length}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <Search size={10} className="text-[#C084FC]" />
              <span className="text-muted-foreground">Search:</span>
              <span className="text-foreground font-semibold">{isSearchActive ? `${matchingNodeIds.size} matches` : 'None'}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <ZoomIn size={10} className="text-muted-foreground" />
              <span className="text-muted-foreground font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
          <div
            ref={containerRef}
            className="relative bg-[#0a0a0f] border border-border border-t-0 rounded-b-lg overflow-hidden"
            style={{ height: '700px', cursor: isDragState ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 bg-grid opacity-50" />
            {/* Gradient overlays for depth */}
            <div className="graph-overlay-top" />
            <div className="graph-overlay-bottom" />

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
                        id={edge.critical ? `flow-${edge.id}` : undefined}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        opacity={0.15}
                        className="animate-glow-line"
                      />
                    )}
                    <path
                      id={edge.critical ? `flow-${edge.id}` : undefined}
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
                const isSearchMatch = !isSearchActive || matchingNodeIds.has(node.id);
                const langColor = LANGUAGE_COLORS[node.language] || '#94A3B8';
                const statusStyle = STATUS_STYLES[node.status];

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={(e) => {
                      handleNodeHover(node.id);
                      if (!selectedNode) {
                        setTooltipNode(node);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (tooltipNode?.id === node.id) {
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseLeave={() => {
                      handleNodeHover(null);
                      setTooltipNode(null);
                    }}
                    opacity={isSearchActive && !isSearchMatch ? 0.15 : 1}
                  >
                    {/* SPOF indicator glow */}
                    {node.spof && (
                      <rect
                        x={node.x - 2} y={node.y - 2}
                        width={NODE_W + 4} height={NODE_H + 4}
                        fill="none" stroke="#EF4444" strokeWidth="2"
                        opacity="0.4" rx="10"
                        className="animate-forge-pulse"
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
                    {/* Search match highlight ring */}
                    {isSearchActive && isSearchMatch && !isSelected && (
                      <rect
                        x={node.x - 2} y={node.y - 2}
                        width={NODE_W + 4} height={NODE_H + 4}
                        fill="none" stroke="#00FFB2" strokeWidth="1.2"
                        opacity="0.5" rx="9"
                      />
                    )}
                    {/* Node body */}
                    <rect
                      x={node.x} y={node.y}
                      width={NODE_W} height={NODE_H}
                      rx={node.language === 'external' ? 12 : 6}
                      fill={isHovered || isSelected ? '#1a1a2e' : '#12121f'}
                      stroke={isHovered || isSelected ? langColor : (isSearchActive && isSearchMatch ? '#00FFB2' : '#2a2a3e')}
                      strokeWidth={isHovered || isSelected ? 1.5 : (isSearchActive && isSearchMatch ? 1.2 : 0.8)}
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
                      fill={isHovered || isSelected ? '#e2e8f0' : (isSearchActive && isSearchMatch ? '#c0c8d4' : '#b8c4d0')}
                      fontSize="10.5"
                      fontWeight={isSelected || (isSearchActive && isSearchMatch) ? '600' : '500'}
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
                    {/* Ready status checkmark dot */}
                    {node.status === 'ready' && !node.spof && (
                      <circle
                        cx={node.x + NODE_W - 6}
                        cy={node.y + 6}
                        r="2.5"
                        fill="#00FFB2"
                        opacity="0.7"
                      />
                    )}
                  </g>
                );
              })}

              {/* Animated data flow particles on critical edges */}
              {filteredEdges.filter(e => e.critical).slice(0, 12).map((edge, i) => {
                const fromNode = layoutNodes.find(n => n.id === edge.from);
                const toNode = layoutNodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const cx1 = fromNode.x + NODE_W / 2;
                const cy1 = fromNode.y + NODE_H;
                const cx2 = toNode.x + NODE_W / 2;
                const cy2 = toNode.y;
                const cy = Math.abs(cy2 - cy1) * 0.45;
                return (
                  <circle key={`particle-${edge.id}-${i}`} r="2" fill={EDGE_COLORS[edge.type]} opacity="0.8">
                    <animateMotion dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.2}s`}>
                      <mpath href={`#flow-${edge.id}`} />
                    </animateMotion>
                  </circle>
                );
              })}
            </svg>

            {/* Mini Map */}
            {showMiniMap && (
              <div className="absolute bottom-3 left-3 z-10 bg-[#0a0a0f]/90 border border-border rounded-md overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-border">
                  <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-bold">Map</span>
                  <button onClick={() => setShowMiniMap(false)} className="text-muted-foreground/40 hover:text-muted-foreground">
                    <Minus size={8} />
                  </button>
                </div>
                <svg width="150" height="120" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="block cursor-crosshair" style={{ transform: `scale(${150 / CANVAS_W})`, transformOrigin: 'top left' }}
                  onClick={(e) => {
                    const svgEl = e.currentTarget;
                    const rect = svgEl.getBoundingClientRect();
                    const scaleX = CANVAS_W / (rect.width);
                    const scaleY = CANVAS_H / (rect.height);
                    const clickX = (e.clientX - rect.left) * scaleX;
                    const clickY = (e.clientY - rect.top) * scaleY;
                    const newPanX = -(clickX - (CANVAS_W / 2) * zoom);
                    const newPanY = -(clickY - (CANVAS_H / 2) * zoom);
                    setPan({ x: newPanX, y: newPanY });
                  }}
                >
                  {/* Mini edges */}
                  {filteredEdges.slice(0, 80).map(edge => {
                    const from = layoutNodes.find(n => n.id === edge.from);
                    const to = layoutNodes.find(n => n.id === edge.to);
                    if (!from || !to) return null;
                    const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H / 2;
                    const x2 = to.x + NODE_W / 2, y2 = to.y;
                    return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={EDGE_COLORS[edge.type]} strokeWidth={1} opacity={0.15} />;
                  })}
                  {/* Mini nodes */}
                  {filteredNodes.map(node => {
                    const langColor = LANGUAGE_COLORS[node.language] || '#94A3B8';
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <rect key={node.id} x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx="3"
                        fill={isSelected ? langColor : langColor + '40'} stroke={isSelected ? langColor : 'none'} strokeWidth={isSelected ? 2 : 0} />
                    );
                  })}
                  {/* Viewport indicator */}
                  <rect
                    x={-pan.x / zoom}
                    y={-pan.y / zoom}
                    width={containerSize.w / zoom}
                    height={containerSize.h / zoom}
                    fill="none"
                    stroke="#00FFB2"
                    strokeWidth={4}
                    opacity={0.4}
                    rx="6"
                  />
                </svg>
                <div style={{ width: 150, height: (150 / CANVAS_W) * CANVAS_H }} />
              </div>
            )}
            {!showMiniMap && (
              <button
                onClick={() => setShowMiniMap(true)}
                className="absolute bottom-3 left-3 z-10 w-6 h-6 rounded bg-[#0a0a0f]/90 border border-border flex items-center justify-center text-muted-foreground/40 hover:text-[#00FFB2] transition-colors backdrop-blur"
                title="Show mini-map"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="1" width="10" height="10" rx="1" />
                  <rect x="3" y="3" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                </svg>
              </button>
            )}

            {/* Hover Tooltip */}
            {tooltipNode && !selectedNode && (
              <div
                className="absolute z-20 pointer-events-none bg-[#0a0a0f]/95 backdrop-blur-xl border border-border rounded-lg p-2.5 shadow-xl max-w-[200px] animate-tooltip-in"
                style={{ left: tooltipPos.x + 15, top: tooltipPos.y + 15 }}
              >
                <div className="text-xs font-bold text-foreground">{tooltipNode.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_STYLES[tooltipNode.status].color }} />
                  <span className="text-[9px] text-muted-foreground">{STATUS_STYLES[tooltipNode.status].label}</span>
                  <span className="text-[9px] text-muted-foreground/50">·</span>
                  <span className="text-[9px]" style={{ color: LANGUAGE_COLORS[tooltipNode.language] }}>{tooltipNode.language}</span>
                </div>
                {tooltipNode.risk !== 'low' && (
                  <div className="mt-1 text-[9px] text-orange-400">
                    {tooltipNode.risk === 'critical' ? '⚠ Critical risk' : '⚡ Moderate risk'}
                  </div>
                )}
                <div className="text-[8px] text-muted-foreground/40 mt-1">Click to inspect</div>
              </div>
            )}

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
                className="bg-card/80 backdrop-blur border border-border rounded-lg p-4 space-y-3 detail-panel-active"
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
