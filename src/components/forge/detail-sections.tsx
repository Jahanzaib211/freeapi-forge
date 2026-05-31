'use client';

import { DB_TABLES, NODES, SPOF_NODES, CRITICAL_EDGES, RISK_CRITICAL, TREE_STATS, LAYERS, EDGES } from '@/lib/forge-tree-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import {
  Database, Shield, AlertTriangle, CheckCircle2, XCircle,
  Table2, HardDrive, Server, Cpu, Layers, GitBranch, Network
} from 'lucide-react';

const storeColors: Record<string, string> = {
  'PostgreSQL': '#336791',
  'Redis': '#DC382D',
  'Qdrant': '#DC2F5E',
  'SQLite': '#003B57',
};

export function DatabaseSchemas() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight">Database Schemas</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Store overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'PostgreSQL 17+', tables: DB_TABLES.filter(t => t.store === 'PostgreSQL').length, color: '#336791' },
          { name: 'Redis 7+', tables: DB_TABLES.filter(t => t.store === 'Redis').length, color: '#DC382D' },
          { name: 'Qdrant', tables: DB_TABLES.filter(t => t.store === 'Qdrant').length, color: '#DC2F5E' },
          { name: 'SQLite', tables: DB_TABLES.filter(t => t.store === 'SQLite').length, color: '#003B57' },
        ].map(store => (
          <Card key={store.name} className="bg-card/60 backdrop-blur border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: store.color + '20' }}>
                <Database size={16} style={{ color: store.color }} />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">{store.name}</div>
                <div className="text-[10px] text-muted-foreground">{store.tables} tables</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {DB_TABLES.map((table, i) => (
          <motion.div
            key={table.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="bg-card/60 backdrop-blur border-border overflow-hidden group hover:border-opacity-80 transition-colors">
              <div className="h-0.5" style={{ backgroundColor: storeColors[table.store] || '#666' }} />
              <CardHeader className="pb-1 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold font-mono text-foreground">{table.name}</CardTitle>
                  {table.critical && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-red-500/10 text-red-400 border-red-500/30">
                      <AlertTriangle size={8} className="mr-0.5" />Critical
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] h-4 border-border text-muted-foreground">
                    <Database size={8} className="mr-0.5" />{table.store}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">{table.purpose}</span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="space-y-0.5 font-mono text-[9px]">
                  {table.columns.map(col => (
                    <div key={col.name} className="flex items-center gap-2 text-muted-foreground/80">
                      <span className="w-24 truncate text-foreground/70">{col.name}</span>
                      <span className="text-[#FBBF24]">{col.type}</span>
                      {col.note && (
                        <span className="text-muted-foreground/40 truncate">— {col.note}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SpofAnalysis() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Shield size={18} className="text-red-400" />
          SPOF & Risk Analysis
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-[#EF4444]">{SPOF_NODES.length}</div>
            <div className="text-[10px] text-muted-foreground">Single Points of Failure</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-[#FB923C]">{RISK_CRITICAL.length}</div>
            <div className="text-[10px] text-muted-foreground">Critical Risk Nodes</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-[#FBBF24]">{CRITICAL_EDGES.length}</div>
            <div className="text-[10px] text-muted-foreground">Critical Edges</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-[#00FFB2]">{TREE_STATS.mitComponents}</div>
            <div className="text-[10px] text-muted-foreground">MIT Components</div>
          </CardContent>
        </Card>
      </div>

      {/* SPOF list */}
      <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle size={14} />
            Single Points of Failure — Mitigation Required
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {SPOF_NODES.map(node => {
              const downstream = EDGES.filter(e => e.from === node.id);
              return (
                <div key={node.id} className="flex items-start gap-3 p-2 rounded bg-red-500/5 border border-red-500/10">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{node.name}</span>
                      <Badge variant="outline" className="text-[8px] h-4 bg-red-500/10 text-red-400 border-red-500/30">
                        {node.risk} risk
                      </Badge>
                      <Badge variant="outline" className="text-[8px] h-4 bg-secondary text-muted-foreground">
                        {LAYERS[node.layer].name}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{node.description}</p>
                    <div className="text-[9px] text-muted-foreground/50 mt-1">
                      {downstream.length} downstream connection{downstream.length !== 1 ? 's' : ''}
                      {node.port ? ` · Port :${node.port}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mitigation strategies */}
      <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-[#00FFB2] flex items-center gap-2">
            <CheckCircle2 size={14} />
            Mitigation Strategies
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2 text-[11px]">
            {[
              { target: 'PostgreSQL', strategy: 'Hot standby replica + automatic failover (Patroni)', icon: <Database size={12} /> },
              { target: 'Redis', strategy: 'Sentinel-based HA with automatic failover', icon: <Server size={12} /> },
              { target: 'Express Server', strategy: 'PM2 cluster mode (multi-core), nginx health check + restart', icon: <Server size={12} /> },
              { target: 'Inference Proxy', strategy: 'Circuit breaker auto-fallback to secondary providers', icon: <Network size={12} /> },
              { target: 'Circuit Breaker', strategy: 'Redis persistence (AOF), fallback to in-memory if Redis down', icon: <Shield size={12} /> },
              { target: 'JWT Auth', strategy: 'Redis cache + PostgreSQL fallback, short-lived tokens with refresh', icon: <Shield size={12} /> },
              { target: 'forge-resource', strategy: 'Watchdog process auto-restarts binary, graceful degradation', icon: <Cpu size={12} /> },
              { target: 'Ubuntu Host', strategy: 'Docker restart policies, systemd watchdog, backup to secondary host', icon: <HardDrive size={12} /> },
              { target: 'Security Layer', strategy: 'Audit trail is write-only (append-only), hash chain tamper detection', icon: <Shield size={12} /> },
              { target: 'Billing', strategy: 'Stripe webhook retry logic, idempotency keys, manual override', icon: <Database size={12} /> },
            ].map(mit => (
              <div key={mit.target} className="flex items-start gap-2 p-2 rounded bg-[#00FFB2]/5 border border-[#00FFB2]/10">
                <div className="text-[#00FFB2] mt-0.5">{mit.icon}</div>
                <div>
                  <span className="font-bold text-foreground">{mit.target}</span>
                  <span className="text-muted-foreground"> — {mit.strategy}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function TechMatrix() {
  const langGroups = NODES.reduce((acc, node) => {
    if (!acc[node.language]) acc[node.language] = [];
    acc[node.language].push(node);
    return acc;
  }, {} as Record<string, typeof NODES>);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight">Technology Matrix</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(langGroups).map(([lang, nodes]) => {
          const color = Object.entries({ typescript: '#3178C6', rust: '#DEA584', go: '#00ADD8', sql: '#F59E0B', yaml: '#6B7280', external: '#A78BFA', binary: '#EF4444' }).find(([k]) => k === lang)?.[1] || '#94A3B8';
          return (
            <Card key={lang} className="bg-card/60 backdrop-blur border-border overflow-hidden">
              <div className="h-0.5" style={{ backgroundColor: color }} />
              <CardHeader className="pb-1 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold capitalize" style={{ color }}>
                    {lang}
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] h-4 border-border text-muted-foreground">
                    {nodes.length} components
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-0.5">
                  {nodes.map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-[10px] py-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${n.status === 'ready' ? 'bg-[#00FFB2]' : n.status === 'building' ? 'bg-[#FBBF24]' : n.status === 'planned' ? 'bg-[#38BDF8]' : 'bg-[#A78BFA]'}`} />
                      <span className="text-foreground/70 truncate flex-1">{n.shortName || n.name}</span>
                      <span className="text-muted-foreground/40">{n.status}</span>
                      {n.port && <span className="text-muted-foreground/40 font-mono">:{n.port}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
