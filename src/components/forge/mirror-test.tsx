'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { RefreshCw, Code, BookOpen, Activity, Rocket, Eye } from 'lucide-react';

const mirrorSteps = [
  {
    id: 1,
    name: 'Read Source',
    desc: 'Forge reads its own GitHub repo via GitHub Explorer',
    icon: <Code size={14} />,
    color: '#A78BFA',
  },
  {
    id: 2,
    name: 'Store Docs',
    desc: 'Analyze code structure, store docs in Native Vault',
    icon: <BookOpen size={14} />,
    color: '#38BDF8',
  },
  {
    id: 3,
    name: 'Modify Workflows',
    desc: 'Use Forge Builder to improve own workflow definitions',
    icon: <RefreshCw size={14} />,
    color: '#00FFB2',
  },
  {
    id: 4,
    name: 'Monitor Self',
    desc: 'Telemetry tracks Forge running inside Forge (inception)',
    icon: <Eye size={14} />,
    color: '#FBBF24',
  },
  {
    id: 5,
    name: 'Redeploy',
    desc: 'Auto-deploy optimized version via process manager',
    icon: <Rocket size={14} />,
    color: '#F472B6',
  },
];

const mirrorPrinciples = [
  { title: 'Self-Referential', desc: 'Forge manages its own development lifecycle', color: '#A78BFA' },
  { title: 'Closed Loop', desc: 'Read → Analyze → Modify → Deploy → Monitor → Repeat', color: '#38BDF8' },
  { title: 'Bootstrap Proof', desc: 'If Forge can build itself, it can build anything', color: '#00FFB2' },
  { title: 'Meta-Cognition', desc: 'Understanding its own architecture for self-improvement', color: '#FBBF24' },
];

const dependencies = [
  { name: 'GitHub Repo Explorer', status: 'planned', color: '#38BDF8' },
  { name: 'Native Vault', status: 'planned', color: '#A78BFA' },
  { name: 'Forge Builder', status: 'ready', color: '#00FFB2' },
  { name: 'Telemetry Streaming', status: 'planned', color: '#FBBF24' },
  { name: 'Process Manager', status: 'ready', color: '#F472B6' },
  { name: 'Inference Lab', status: 'ready', color: '#34D399' },
];

export default function MirrorTest() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <RefreshCw size={18} className="text-[#F472B6]" />
          Mirror Test — Self-Hosting Proof
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Concept explanation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#A78BFA] via-[#00FFB2] to-[#F472B6]" />
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The <span className="text-foreground/80 font-bold">Mirror Test</span> is the ultimate proof that
              Forge Studio is a complete AI lab control center. Forge reads its own source code,
              analyzes its architecture, modifies its own workflows, monitors its own telemetry, and
              redeploys itself — all using the same tools it provides to users. If Forge can build
              itself, it can build anything.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Circular diagram */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground">Self-Referential Loop</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Visual circular diagram using CSS */}
            <div className="flex flex-col items-center">
              {/* Circular container */}
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 rounded-full border-2 border-dashed border-[#F472B6]/30 flex items-center justify-center"
                    >
                      <RefreshCw size={20} className="text-[#F472B6]" />
                    </motion.div>
                    <div className="text-[9px] text-foreground/50 mt-2 font-bold">FORGE</div>
                    <div className="text-[8px] text-muted-foreground/40">manages itself</div>
                  </div>
                </div>

                {/* Step nodes around the circle */}
                {mirrorSteps.map((step, i) => {
                  const angle = (i * 72 - 90) * (Math.PI / 180);
                  const radius = 42;
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="absolute"
                      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="flex flex-col items-center gap-0.5 w-16 md:w-20">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg"
                          style={{ borderColor: step.color, backgroundColor: step.color + '15', color: step.color }}
                        >
                          {step.icon}
                        </div>
                        <span className="text-[7px] md:text-[8px] font-bold text-foreground/70 text-center leading-tight">
                          {step.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Animated arrow indicators between steps */}
                {mirrorSteps.map((step, i) => {
                  const nextIdx = (i + 1) % mirrorSteps.length;
                  const angle = (i * 72 - 90 + 36) * (Math.PI / 180);
                  const radius = 42;
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);

                  return (
                    <motion.div
                      key={`arrow-${i}`}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                      className="absolute"
                      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: step.color, opacity: 0.6 }} />
                    </motion.div>
                  );
                })}
              </div>

              {/* Step descriptions below */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 w-full">
                {mirrorSteps.map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="p-2 rounded border border-border bg-secondary/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-black" style={{ backgroundColor: step.color }}>
                        {step.id}
                      </span>
                      <span className="text-[9px] font-bold text-foreground">{step.name}</span>
                    </div>
                    <p className="text-[8px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two columns: Principles + Dependencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Design principles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground">Design Principles</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {mirrorPrinciples.map(p => (
                  <div key={p.title} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <div>
                      <div className="text-[10px] font-bold text-foreground">{p.title}</div>
                      <div className="text-[9px] text-muted-foreground">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dependencies */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground">Required Components</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {dependencies.map(dep => (
                  <div key={dep.name} className="flex items-center gap-2 text-[10px] p-1.5 rounded hover:bg-secondary/20 transition-colors">
                    <Activity size={10} className="text-muted-foreground" />
                    <span className="flex-1 text-foreground/70">{dep.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] h-4 ${dep.status === 'ready' ? 'bg-[#00FFB2]/10 text-[#00FFB2] border-[#00FFB2]/20' : 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20'}`}
                    >
                      {dep.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 rounded bg-[#F472B6]/5 border border-[#F472B6]/10">
                <div className="text-[9px] text-muted-foreground">
                  <span className="text-[#F472B6] font-bold">Status:</span> 3/6 components ready.
                  Requires Phase 3 (MCP Explorer + Vault), Phase 4 (Telemetry), and Phase 6 (GitHub Explorer).
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
