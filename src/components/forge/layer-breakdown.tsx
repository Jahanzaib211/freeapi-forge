'use client';

import { LAYERS, NODES, EDGES, LANGUAGE_COLORS, STATUS_STYLES, TREE_STATS, type ForgeLayer, type ForgeNode } from '@/lib/forge-tree-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Cpu, Zap, Terminal, Database, Globe, Boxes, HardDrive, Shield, AlertTriangle, CheckCircle2, ExternalLink, Layers } from 'lucide-react';

function LanguageIcon({ lang }: { lang: string }) {
  const color = LANGUAGE_COLORS[lang as keyof typeof LANGUAGE_COLORS] || '#94A3B8';
  const props = { size: 14, style: { color } };
  switch (lang) {
    case 'typescript': return <Cpu {...props} />;
    case 'rust': return <Zap {...props} />;
    case 'go': return <Terminal {...props} />;
    case 'sql': return <Database {...props} />;
    case 'yaml': return <Boxes {...props} />;
    case 'external': return <Globe {...props} />;
    case 'binary': return <HardDrive {...props} />;
    default: return <Boxes {...props} />;
  }
}

export default function LayerBreakdown() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight forge-section-header">
          <Layers size={18} className="text-[#00FFB2]" />
          Layer Architecture
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {LAYERS.map((layer, i) => {
          const nodes = NODES.filter(n => n.layer === layer.id);
          const edges = EDGES.filter(e => {
            const from = NODES.find(n => n.id === e.from);
            const to = NODES.find(n => n.id === e.to);
            return from?.layer === layer.id || to?.layer === layer.id;
          });

          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="bg-card/60 backdrop-blur border-border hover:border-opacity-80 transition-all duration-300 group overflow-hidden hover:shadow-lg hover:shadow-black/20 shadow-sm">
                <div className="h-0.5 transition-opacity duration-300 group-hover:opacity-100 opacity-60" style={{ backgroundColor: layer.color }} />
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold" style={{ color: layer.color }}>
                      {layer.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 border-border text-muted-foreground">
                      L{layer.id}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{layer.subtitle}</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {/* Stats */}
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{nodes.length} components</span>
                    <span>·</span>
                    <span>{edges.length} edges</span>
                    <span>·</span>
                    <span>{nodes.filter(n => n.spof).length > 0 ? `${nodes.filter(n => n.spof).length} SPOF` : 'no SPOF'}</span>
                  </div>

                  {/* Component list */}
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {nodes.map(node => (
                      <div
                        key={node.id}
                        className="flex items-center gap-2 py-1 px-2 rounded bg-secondary/30 hover:bg-secondary/60 transition-colors group/item"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_STYLES[node.status].dot}`} />
                        <LanguageIcon lang={node.language} />
                        <span className="text-[11px] text-foreground/80 truncate flex-1">{node.shortName || node.name}</span>
                        {node.spof && (
                          <Shield size={10} className="text-red-400 flex-shrink-0" />
                        )}
                        {node.risk === 'critical' && (
                          <AlertTriangle size={10} className="text-red-400 flex-shrink-0" />
                        )}
                        {node.port && (
                          <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">:{node.port}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
