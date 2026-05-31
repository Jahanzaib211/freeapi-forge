'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
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
import RoadmapSection from '@/components/forge/roadmap-section';
import DockerStack from '@/components/forge/docker-stack';
import P2PNetwork from '@/components/forge/p2p-network';
import PricingSection from '@/components/forge/pricing-section';
import LaunchRewards from '@/components/forge/launch-rewards';
import MirrorTest from '@/components/forge/mirror-test';
import {
  AlertTriangle, Shield, Cpu, Database, Globe, Layers, Zap,
  Terminal, HardDrive, Server, Network, GitBranch, Boxes,
  Activity, BarChart3, Clock, CheckCircle2, ExternalLink,
  ArrowDown, ArrowUp, Menu, X, ChevronDown, MessageSquare, Keyboard, Star
} from 'lucide-react';

// ─── SCROLL REVEAL SECTION ───────────────────────────────────────────
function ScrollRevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px 0px 0px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SCROLL PROGRESS BAR ─────────────────────────────────────────────
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <div className="fixed top-14 left-0 right-0 z-40 h-[2px]">
      <div
        className="h-full bg-[#00FFB2] transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ─── BACK TO TOP BUTTON ──────────────────────────────────────────────
function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return (
    <motion.button
      onClick={scrollToTop}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/30 text-[#00FFB2] flex items-center justify-center hover:bg-[#00FFB2]/20 hover:border-[#00FFB2]/50 transition-colors cursor-pointer"
      aria-label="Back to top"
    >
      <ArrowUp size={18} />
    </motion.button>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const navItems: { label: string; href: string }[] = [
    { label: 'Graph', href: '#graph' },
    { label: 'Layers', href: '#layers' },
    { label: 'Build', href: '#build' },
    { label: 'Roadmap', href: '#roadmap' },
    { label: 'Discord', href: '#discord' },
    { label: 'Docker', href: '#docker' },
    { label: 'P2P', href: '#p2p' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Rewards', href: '#rewards' },
    { label: 'Mirror', href: '#mirror' },
    { label: 'Database', href: '#database' },
    { label: 'SPOF', href: '#spof' },
    { label: 'Tech', href: '#tech' },
  ];

  useEffect(() => {
    const scrollHandler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // IntersectionObserver for active section tracking
    const sectionIds = navItems.map(item => item.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -75% 0px', threshold: 0 }
    );
    // Small delay to ensure DOM elements exist
    const timer = setTimeout(() => {
      sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const sectionIds = navItems.map(item => item.href.slice(1));
      const currentIdx = sectionIds.indexOf(activeSection);

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        const nextIdx = currentIdx < sectionIds.length - 1 ? currentIdx + 1 : 0;
        const el = document.getElementById(sectionIds[nextIdx]);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : sectionIds.length - 1;
        const el = document.getElementById(sectionIds[prevIdx]);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
        setShowHelp(false);
      } else if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('node-search-input') as HTMLInputElement;
        if (searchInput) {
          const graphSection = document.getElementById('graph');
          if (graphSection) graphSection.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => searchInput.focus(), 400);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSection]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.getElementById(href.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-border' : 'bg-transparent'
    }`}>
      {/* Bottom glow line when scrolled */}
      {scrolled && <div className="nav-glow-line" />}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00FFB2]/10 flex items-center justify-center">
            <Zap size={18} className="text-[#00FFB2]" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">Forge Studio</span>
            <span className="text-[10px] text-muted-foreground/60 ml-2 hidden sm:inline">Dependency Tree v2.5</span>
          </div>
        </div>

        {/* Desktop nav + help button */}
        <div className="hidden lg:flex items-center gap-1.5">
          {navItems.map(item => {
            const isActive = activeSection === item.href.slice(1);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`relative px-2 py-1.5 text-[11px] rounded-md transition-all duration-200 font-medium ${
                  isActive
                    ? 'text-[#00FFB2] bg-[#00FFB2]/10'
                    : 'text-foreground/60 hover:text-[#00FFB2] hover:bg-[#00FFB2]/5'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00FFB2]" />
                )}
              </a>
            );
          })}
          {/* Keyboard shortcuts help */}
          <div className="relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 text-muted-foreground/50 hover:text-[#00FFB2] hover:bg-[#00FFB2]/5 rounded-md transition-colors"
              title="Keyboard shortcuts"
            >
              <Keyboard size={14} />
            </button>
            {showHelp && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a0f]/95 backdrop-blur-xl border border-border rounded-lg p-3 space-y-2 z-50 shadow-xl">
                <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Keyboard Shortcuts</h4>
                {[
                  { keys: '↑ / ↓  or  j / k', desc: 'Navigate sections' },
                  { keys: 'Esc', desc: 'Close menus' },
                  { keys: '/  or  Ctrl+K', desc: 'Search nodes' },
                ].map(s => (
                  <div key={s.keys} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{s.desc}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-foreground/70 font-mono text-[9px]">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden text-muted-foreground w-10 h-10 flex items-center justify-center">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const isActive = activeSection === item.href.slice(1);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`block px-3 py-2.5 text-sm rounded transition-colors font-medium ${
                      isActive
                        ? 'text-[#00FFB2] bg-[#00FFB2]/10'
                        : 'text-foreground/60 hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-20 pb-12 sm:pt-28 md:pt-32 md:pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-dots opacity-30" />
      {/* Gradient overlay for visual depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f] pointer-events-none" />
      {/* Faint network nodes decoration */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none animate-network-shift" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="network-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1" fill="#00FFB2" />
            <circle cx="0" cy="0" r="0.5" fill="#38BDF8" />
            <circle cx="60" cy="0" r="0.5" fill="#38BDF8" />
            <circle cx="0" cy="60" r="0.5" fill="#38BDF8" />
            <circle cx="60" cy="60" r="0.5" fill="#38BDF8" />
            <line x1="30" y1="30" x2="0" y2="0" stroke="#00FFB2" strokeWidth="0.3" />
            <line x1="30" y1="30" x2="60" y2="0" stroke="#00FFB2" strokeWidth="0.3" />
            <line x1="30" y1="30" x2="0" y2="60" stroke="#00FFB2" strokeWidth="0.3" />
            <line x1="30" y1="30" x2="60" y2="60" stroke="#00FFB2" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#network-dots)" />
      </svg>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00FFB2] rounded-full opacity-[0.02] blur-[120px] animate-hero-gradient" />
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
          <Badge variant="outline" className="mb-4 text-[10px] h-6 border-[#00FFB2]/30 text-[#00FFB2] bg-[#00FFB2]/5 relative overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FFB2]/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
            <Activity size={12} className="mr-1 animate-forge-pulse relative z-10" />
            <span className="relative z-10">AI Lab Level — 20 DevOps Engineers Mapped</span>
          </Badge>
          {/* Glow behind title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[300px] md:w-[500px] h-[80px] bg-[#00FFB2] rounded-full opacity-[0.08] blur-[60px]" />
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1] relative">
            Forge Studio{' '}
            <span className="text-[#00FFB2]" style={{ textShadow: '0 0 40px rgba(0,255,178,0.3)' }}>Dependency Tree</span>
          </h1>
          <p className="mt-4 text-[15px] md:text-lg text-foreground/85 max-w-2xl mx-auto leading-relaxed">
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
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-3xl mx-auto"
        >
          {[
            { label: 'Components', value: TREE_STATS.totalNodes, icon: <Boxes size={18} />, color: '#00FFB2' },
            { label: 'Connections', value: TREE_STATS.totalEdges, icon: <Network size={18} />, color: '#38BDF8' },
            { label: 'Layers', value: TREE_STATS.totalLayers, icon: <Layers size={18} />, color: '#C084FC' },
            { label: 'SPOFs', value: TREE_STATS.spofCount, icon: <AlertTriangle size={18} />, color: '#EF4444' },
            { label: 'DB Tables', value: TREE_STATS.dbTables, icon: <Database size={18} />, color: '#F59E0B' },
            { label: 'Build Weeks', value: TREE_STATS.totalBuildWeeks, icon: <Clock size={18} />, color: '#F472B6' },
          ].map((stat) => (
            <AnimatedStatCard key={stat.label} stat={stat} />
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <button
            onClick={() => {
              const el = document.getElementById('graph');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="cta-glow group flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00FFB2]/10 border border-[#00FFB2]/20 text-[#00FFB2] text-xs font-semibold hover:bg-[#00FFB2]/20 hover:border-[#00FFB2]/40 hover:text-sm transition-all duration-300 cursor-pointer"
          >
            Explore Graph
            <ArrowDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
          <a
            href="#roadmap"
            onClick={(e) => { e.preventDefault(); const el = document.getElementById('roadmap'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
            className="group flex items-center gap-1.5 text-muted-foreground/60 text-xs font-medium hover:text-[#00FFB2] transition-colors duration-200 cursor-pointer"
          >
            View Roadmap
            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </a>
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
      <ChevronDown size={16} className="text-muted-foreground/30 mx-2 animate-[forge-pulse_2s_ease-in-out_infinite]" />
      <div className="h-px flex-1 max-w-[200px] bg-gradient-to-l from-transparent to-[#00FFB2]/20" />
    </div>
  );
}

// ─── OVERVIEW STRIP ──────────────────────────────────────────────────────
function OverviewStrip() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden transition-all duration-300 shadow-md hover:scale-[1.02] hover:border-[#00FFB2]/30 hover:shadow-[0_8px_32px_rgba(0,255,178,0.15)]">
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

        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden transition-all duration-300 shadow-md hover:scale-[1.02] hover:border-[#38BDF8]/30 hover:shadow-[0_8px_32px_rgba(56,189,248,0.15)]">
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
              <p>• <span className="text-foreground/80">Ports</span>: 5051 (app + WS + metrics), 5434 (PG), 6379 (Redis), 6333 (Qdrant)</p>
              <p>• <span className="text-foreground/80">Discord</span>: Bot gateway (WebSocket), slash commands, webhooks, role automation</p>
              <p>• <span className="text-foreground/80">One-line install</span>: curl | bash → http://localhost:5051</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden transition-all duration-300 shadow-md hover:scale-[1.02] hover:border-[#C084FC]/30 hover:shadow-[0_8px_32px_rgba(192,132,252,0.15)]">
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
    const duration = 1400;
    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * stat.value));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [stat.value]);

  return (
    <Card
      className="bg-card/60 backdrop-blur border-border/50 card-inner-highlight hover:-translate-y-0.5 transition-all duration-300 cursor-default overflow-hidden"
      style={{
        boxShadow: hovered
          ? `0 0 20px ${stat.color}20, 0 0 40px ${stat.color}08, inset 0 1px 0 rgba(255,255,255,0.03), inset 0 0 0 1px ${stat.color}30`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        borderColor: hovered ? `${stat.color}50` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Stat accent bar */}
      <div className="stat-accent-bar" style={{ background: `linear-gradient(to-right, ${stat.color}, transparent)` }} />
      <CardContent className="p-3 text-center">
        <motion.div
          className="flex justify-center mb-1"
          style={{ color: stat.color }}
          animate={{ scale: hovered ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <div style={{ filter: `drop-shadow(0 0 4px ${stat.color}40)` }}>{stat.icon}</div>
        </motion.div>
        <div className="text-xl md:text-2xl font-black tabular-nums" style={{ color: stat.color }}>
          {count}
        </div>
        <div className="text-[9px] md:text-[10px] font-medium" style={{ color: `${stat.color}99` }}>{stat.label}</div>
      </CardContent>
    </Card>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-20 bg-[#0a0a0f]">
      <div className="h-px bg-gradient-to-r from-transparent via-[#00FFB2]/30 to-transparent animate-footer-glow" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10">
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
      <ScrollProgressBar />

      <main className="flex-1">
        <Hero />
        <OverviewStrip />
        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Interactive Architecture Graph */}
        <ScrollRevealSection>
          <section id="graph" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground forge-section-header">
                <Network size={18} className="text-[#00FFB2]" />
                Interactive Architecture Graph
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Click nodes to inspect. Drag to pan. Use controls to filter by layer, edge type, or critical path. {TREE_STATS.totalNodes} nodes, {TREE_STATS.totalEdges} connections.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: 'Search Nodes', color: '#00FFB2' },
                  { label: 'Mini-Map', color: '#38BDF8' },
                  { label: 'Quick Filters', color: '#C084FC' },
                  { label: 'Data Flow', color: '#FBBF24' },
                  { label: 'Keyboard Nav', color: '#F472B6' },
                ].map(f => (
                  <Badge key={f.label} variant="outline" className="text-[8px] h-4 border-border/50" style={{ borderColor: f.color + '40', color: f.color }}>
                    {f.label}
                  </Badge>
                ))}
              </div>
            </div>
            <ArchGraph />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Layer Breakdown */}
        <ScrollRevealSection>
          <section id="layers" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <LayerBreakdown />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Build Order */}
        <ScrollRevealSection>
          <section id="build" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <BuildOrder />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Roadmap & Milestones */}
        <ScrollRevealSection>
          <section id="roadmap" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <RoadmapSection />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Discord Integration */}
        <ScrollRevealSection>
          <section id="discord" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <DiscordSection />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Docker Stack */}
        <ScrollRevealSection>
          <section id="docker" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <DockerStack />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* P2P Network */}
        <ScrollRevealSection>
          <section id="p2p" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <P2PNetwork />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Pricing & Licensing */}
        <ScrollRevealSection>
          <section id="pricing" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <PricingSection />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Launch Rewards */}
        <ScrollRevealSection>
          <section id="rewards" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <LaunchRewards />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Mirror Test */}
        <ScrollRevealSection>
          <section id="mirror" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <MirrorTest />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Database Schemas */}
        <ScrollRevealSection>
          <section id="database" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <DatabaseSchemas />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* SPOF & Risk */}
        <ScrollRevealSection>
          <section id="spof" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <SpofAnalysis />
          </section>
        </ScrollRevealSection>

        <ScrollRevealSection><SectionDivider /></ScrollRevealSection>

        {/* Tech Matrix */}
        <ScrollRevealSection>
          <section id="tech" className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <TechMatrix />
          </section>
        </ScrollRevealSection>

        {/* Bottom spacing for footer */}
        <div className="h-12" />
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
}
