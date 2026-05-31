'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { TREE_STATS, LAYERS, NODES, EDGES, DB_TABLES, BUILD_PHASES, LANGUAGE_COLORS } from '@/lib/forge-tree-data';
import ArchGraph from '@/components/forge/arch-graph';
import LayerBreakdown from '@/components/forge/layer-breakdown';
import BuildOrder from '@/components/forge/build-order';
import { DatabaseSchemas, SpofAnalysis, TechMatrix } from '@/components/forge/detail-sections';
import DiscordSection from '@/components/forge/discord-section';
import DockerStack from '@/components/forge/docker-stack';
import P2PNetwork from '@/components/forge/p2p-network';
import PricingSection from '@/components/forge/pricing-section';
import LaunchRewards from '@/components/forge/launch-rewards';
import MirrorTest from '@/components/forge/mirror-test';
import {
  AlertTriangle, Shield, Cpu, Database, Globe, Layers, Zap,
  Terminal, HardDrive, Server, Network, GitBranch, Boxes,
  Activity, BarChart3, Clock, CheckCircle2, ExternalLink,
  ArrowDown, Menu, X, ChevronDown, MessageSquare
} from 'lucide-react';

// ─── NAVBAR ──────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navItems = [
    { label: 'Graph', href: '#graph' },
    { label: 'Layers', href: '#layers' },
    { label: 'Build', href: '#build' },
    { label: 'Discord', href: '#discord' },
    { label: 'Docker', href: '#docker' },
    { label: 'P2P', href: '#p2p' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Rewards', href: '#rewards' },
    { label: 'Database', href: '#database' },
    { label: 'SPOF', href: '#spof' },
    { label: 'Tech', href: '#tech' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00FFB2]/10 flex items-center justify-center">
            <Zap size={18} className="text-[#00FFB2]" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">Forge Studio</span>
            <span className="text-[10px] text-muted-foreground/60 ml-2 hidden sm:inline">Dependency Tree v2.0</span>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-[#00FFB2] hover:bg-[#00FFB2]/5 rounded-md transition-all duration-200"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden text-muted-foreground">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-border"
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-28 pb-12 md:pt-32 md:pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00FFB2] rounded-full opacity-[0.02] blur-[120px]" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#38BDF8] rounded-full opacity-[0.02] blur-[100px]" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-[#A78BFA] rounded-full opacity-[0.02] blur-[100px]" />

      <div className="relative max-w-[1400px] mx-auto px-4 md:px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Badge variant="outline" className="mb-4 text-[10px] h-6 border-[#00FFB2]/30 text-[#00FFB2] bg-[#00FFB2]/5">
            <Activity size={12} className="mr-1 animate-forge-pulse" />
            AI Lab Level — 20 DevOps Engineers Mapped
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-tight">
            Forge Studio
            <br />
            <span className="text-[#00FFB2]">Dependency Tree</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Complete architecture map: <span className="text-foreground/90 font-semibold">{TREE_STATS.totalNodes} components</span>,{' '}
            <span className="text-foreground/90 font-semibold">{TREE_STATS.totalEdges} connections</span>,{' '}
            <span className="text-foreground/90 font-semibold">{TREE_STATS.totalLayers} layers</span>,{' '}
            <span className="text-foreground/90 font-semibold">{TREE_STATS.dbTables} database tables</span>,{' '}
            <span className="text-foreground/90 font-semibold">Discord integration</span>,{' '}
            <span className="text-foreground/90 font-semibold">P2P marketplace</span>.
            <br className="hidden md:block" />
            From Ubuntu kernel to cloud users — every dependency mapped, every SPOF identified, every risk quantified.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-3xl mx-auto"
        >
          {[
            { label: 'Components', value: TREE_STATS.totalNodes, icon: <Boxes size={16} />, color: '#00FFB2' },
            { label: 'Connections', value: TREE_STATS.totalEdges, icon: <Network size={16} />, color: '#38BDF8' },
            { label: 'Layers', value: TREE_STATS.totalLayers, icon: <Layers size={16} />, color: '#C084FC' },
            { label: 'SPOFs', value: TREE_STATS.spofCount, icon: <AlertTriangle size={16} />, color: '#EF4444' },
            { label: 'DB Tables', value: TREE_STATS.dbTables, icon: <Database size={16} />, color: '#F59E0B' },
            { label: 'Build Weeks', value: TREE_STATS.totalBuildWeeks, icon: <Clock size={16} />, color: '#F472B6' },
          ].map((stat) => (
            <AnimatedStatCard key={stat.label} stat={stat} />
          ))}
        </motion.div>

        {/* Language & License summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mt-6"
        >
          {Object.entries(LANGUAGE_COLORS).filter(([lang]) => NODES.some(n => n.language === lang)).map(([lang, color]) => {
            const count = NODES.filter(n => n.language === lang).length;
            return (
              <Badge key={lang} variant="outline" className="text-[10px] h-6 border-border bg-secondary/50">
                <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
                <span className="capitalize">{lang}</span>
                <span className="text-muted-foreground ml-1">{count}</span>
              </Badge>
            );
          })}
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Badge variant="outline" className="text-[10px] h-6 bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]">
            MIT {TREE_STATS.mitComponents}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-6 bg-[#A78BFA]/5 border-[#A78BFA]/20 text-[#A78BFA]">
            BSL 1.1 {TREE_STATS.bslComponents}
          </Badge>
        </motion.div>
      </div>
    </section>
  );
}

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <div className="py-4 flex items-center justify-center">
      <div className="h-px flex-1 max-w-[200px] bg-gradient-to-r from-transparent to-[#00FFB2]/20" />
      <ChevronDown size={16} className="text-muted-foreground/30 mx-2" />
      <div className="h-px flex-1 max-w-[200px] bg-gradient-to-l from-transparent to-[#00FFB2]/20" />
    </div>
  );
}

// ─── OVERVIEW STRIP ──────────────────────────────────────────────────────
function OverviewStrip() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#00FFB2] to-[#38BDF8]" />
          <CardContent className="p-4">
            <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
              <Zap size={14} className="text-[#00FFB2]" />
              Architecture Summary
            </h3>
            <div className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
              <p>• <span className="text-foreground/80">9-layer architecture</span> from Ubuntu kernel to cloud users</p>
              <p>• <span className="text-foreground/80">Hybrid language stack</span>: TypeScript (90%) + Rust (resource manager) + Go (TUI)</p>
              <p>• <span className="text-foreground/80">Open core licensing</span>: MIT proxy core, BSL 1.1 for everything else</p>
              <p>• <span className="text-foreground/80">Zero LiteLLM dependency</span> — native circuit breaker + fallback routing</p>
              <p>• <span className="text-foreground/80">Mirror Test</span> — Forge hosts, monitors, and improves itself</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#38BDF8] to-[#C084FC]" />
          <CardContent className="p-4">
            <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
              <Server size={14} className="text-[#38BDF8]" />
              Infrastructure Stack
            </h3>
            <div className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
              <p>• <span className="text-foreground/80">Docker Compose</span>: app, PG17, Redis7, Qdrant, Prometheus, Grafana</p>
              <p>• <span className="text-foreground/80">GPU monitoring</span>: nvidia-dcgm-exporter → Prometheus → Grafana</p>
              <p>• <span className="text-foreground/80">Telemetry</span>: WebSocket + :5051/metrics + MQTT + 30-day SQLite</p>
              <p>• <span className="text-foreground/80">Ports</span>: 5050 (app), 5051 (metrics), 5052 (WS), 5432 (PG), 6379 (Redis), 6333 (Qdrant)</p>
              <p>• <span className="text-foreground/80">One-line install</span>: curl | bash → http://localhost:5051</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#C084FC] to-[#F472B6]" />
          <CardContent className="p-4">
            <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
              <Shield size={14} className="text-[#C084FC]" />
              Security Posture
            </h3>
            <div className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
              <p>• <span className="text-foreground/80">HMAC-SHA256</span> request signing with device fingerprinting</p>
              <p>• <span className="text-foreground/80">Immutable audit trail</span> — write-only, hash chain (blockchain style)</p>
              <p>• <span className="text-foreground/80">eBPF intrusion detection</span> on GPU servers (not user machines)</p>
              <p>• <span className="text-foreground/80">Mandatory Access Control</span> — attribute-based policies (MAC)</p>
              <p>• <span className="text-foreground/80">Encrypted secrets</span> — AES-256-GCM, TLS-only, strict CORS</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── ANIMATED STAT CARD ───────────────────────────────────────────
function AnimatedStatCard({ stat }: { stat: { label: string; value: number; icon: React.ReactNode; color: string } }) {
  const [count, setCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const increment = stat.value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= stat.value) {
        setCount(stat.value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [stat.value]);

  return (
    <Card
      className="bg-card/60 backdrop-blur border-border transition-all duration-300 cursor-default"
      style={{
        boxShadow: hovered ? `0 0 20px ${stat.color}15, 0 0 40px ${stat.color}08` : 'none',
        borderColor: hovered ? `${stat.color}40` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardContent className="p-3 text-center">
        <motion.div
          className="flex justify-center mb-1"
          style={{ color: stat.color }}
          animate={{ scale: hovered ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {stat.icon}
        </motion.div>
        <div className="text-xl md:text-2xl font-black tabular-nums" style={{ color: stat.color }}>
          {count}
        </div>
        <div className="text-[9px] md:text-[10px] text-muted-foreground font-medium">{stat.label}</div>
      </CardContent>
    </Card>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-[#0a0a0f]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#00FFB2]/10 flex items-center justify-center">
              <Zap size={12} className="text-[#00FFB2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground">Forge Studio</span>
              <span className="text-[10px] text-muted-foreground ml-2">Dependency Tree</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground/50 text-center">
            github.com/Jahanzaib211/forge-studio · alilabsx.com
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[8px] h-4 border-[#00FFB2]/20 text-[#00FFB2]/50">
              MIT Proxy + BSL 1.1
            </Badge>
            <Badge variant="outline" className="text-[8px] h-4 border-border text-muted-foreground/50">
              {TREE_STATS.totalNodes} components · {TREE_STATS.totalEdges} edges
            </Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] bg-dots text-[#e0e0e0]">
      <Navbar />

      <main className="flex-1">
        <Hero />
        <OverviewStrip />
        <SectionDivider />

        {/* Interactive Architecture Graph */}
        <section id="graph" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Network size={18} className="text-[#00FFB2]" />
              Interactive Architecture Graph
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Click nodes to inspect. Drag to pan. Use controls to filter by layer, edge type, or critical path. {TREE_STATS.totalNodes} nodes, {TREE_STATS.totalEdges} connections.
            </p>
          </div>
          <ArchGraph />
        </section>

        <SectionDivider />

        {/* Layer Breakdown */}
        <section id="layers" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <LayerBreakdown />
        </section>

        <SectionDivider />

        {/* Build Order */}
        <section id="build" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <BuildOrder />
        </section>

        <SectionDivider />

        {/* Discord Integration */}
        <section id="discord" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <DiscordSection />
        </section>

        <SectionDivider />

        {/* Docker Stack */}
        <section id="docker" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <DockerStack />
        </section>

        <SectionDivider />

        {/* P2P Network */}
        <section id="p2p" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <P2PNetwork />
        </section>

        <SectionDivider />

        {/* Pricing & Licensing */}
        <section id="pricing" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <PricingSection />
        </section>

        <SectionDivider />

        {/* Launch Rewards */}
        <section id="rewards" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <LaunchRewards />
        </section>

        <SectionDivider />

        {/* Mirror Test */}
        <section id="mirror" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <MirrorTest />
        </section>

        <SectionDivider />

        {/* Database Schemas */}
        <section id="database" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <DatabaseSchemas />
        </section>

        <SectionDivider />

        {/* SPOF & Risk */}
        <section id="spof" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <SpofAnalysis />
        </section>

        <SectionDivider />

        {/* Tech Matrix */}
        <section id="tech" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <TechMatrix />
        </section>

        {/* Bottom spacing for footer */}
        <div className="h-12" />
      </main>

      <Footer />
    </div>
  );
}
