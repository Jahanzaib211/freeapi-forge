'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, Rocket, Star } from 'lucide-react';

const MILESTONES = [
  {
    phase: 'Phase 1 — Foundation',
    status: 'complete' as const,
    title: 'Core Infrastructure',
    weeks: 'Week 1-3',
    items: [
      'Express + tRPC server setup',
      'PostgreSQL + Drizzle ORM schema',
      'Redis session cache + rate limiting',
      'Basic authentication (JWT + HMAC)',
    ],
  },
  {
    phase: 'Phase 2 — AI Core',
    status: 'complete' as const,
    title: 'AI Pipeline & LLM Proxy',
    weeks: 'Week 3-6',
    items: [
      'Native LLM proxy (OpenAI, Anthropic, Ollama)',
      'Circuit breaker + fallback routing',
      'Streaming responses (SSE)',
      'Token counting + cost tracking',
    ],
  },
  {
    phase: 'Phase 3 — Multi-Model',
    status: 'complete' as const,
    title: 'Model Management',
    weeks: 'Week 5-7',
    items: [
      'Model registry with metadata',
      'A/B testing framework',
      'Model health monitoring',
      'Fallback chains',
    ],
  },
  {
    phase: 'Phase 4 — Frontend',
    status: 'active' as const,
    title: 'Web UI & Dashboard',
    weeks: 'Week 7-10',
    items: [
      'React dashboard with real-time metrics',
      'Chat interface with model selection',
      'Admin panel for model management',
      'Dark theme responsive design',
    ],
  },
  {
    phase: 'Phase 5 — Observability',
    status: 'planned' as const,
    title: 'Monitoring & Telemetry',
    weeks: 'Week 9-12',
    items: [
      'Prometheus + Grafana dashboards',
      'Structured logging (Pino)',
      'GPU monitoring (nvidia-dcgm)',
      'Alert system (Discord + Webhooks)',
    ],
  },
  {
    phase: 'Phase 6 — Discord',
    status: 'planned' as const,
    title: 'Discord Integration',
    weeks: 'Week 11-12.5',
    items: [
      'Bot gateway (WebSocket)',
      'Slash commands registry',
      'AI chat bridge',
      'Role automation & webhooks',
    ],
  },
  {
    phase: 'Phase 7 — P2P',
    status: 'future' as const,
    title: 'P2P Marketplace',
    weeks: 'Week 13-15',
    items: [
      'WebRTC direct model sharing',
      'Peer reputation system',
      'Usage metering + settlement',
      'Discovery protocol',
    ],
  },
  {
    phase: 'Phase 8 — Security',
    status: 'future' as const,
    title: 'Hardening & Audit',
    weeks: 'Week 15-16',
    items: [
      'eBPF intrusion detection',
      'Immutable audit trail (hash chain)',
      'Mandatory Access Control (MAC)',
      'Security audit & penetration test',
    ],
  },
];

const statusConfig = {
  complete: { icon: CheckCircle2, color: '#00FFB2', label: 'Complete', bg: 'bg-[#00FFB2]/5', border: 'border-[#00FFB2]/20' },
  active: { icon: Rocket, color: '#FBBF24', label: 'In Progress', bg: 'bg-[#FBBF24]/5', border: 'border-[#FBBF24]/20' },
  planned: { icon: Clock, color: '#38BDF8', label: 'Planned', bg: 'bg-[#38BDF8]/5', border: 'border-[#38BDF8]/20' },
  future: { icon: Circle, color: '#6B7280', label: 'Future', bg: 'bg-secondary', border: 'border-border' },
};

export default function RoadmapSection() {
  return (
    <div>
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Star size={18} className="text-[#FBBF24]" />
          Roadmap & Milestones
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          8-phase, 16-week development roadmap from foundation to production.
          Phases 1-3 complete, Phase 4 in progress.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[#00FFB2] via-[#FBBF24] via-[#38BDF8] to-border" />

        <div className="space-y-4">
          {MILESTONES.map((milestone, i) => {
            const config = statusConfig[milestone.status];
            const Icon = config.icon;
            return (
              <div key={i} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-3 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: config.color, backgroundColor: `${config.color}10` }}
                >
                  <Icon size={14} style={{ color: config.color }} />
                </div>

                <Card className={`border ${config.border} ${config.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
                          {milestone.phase}
                        </span>
                        <h3 className="text-sm font-bold text-foreground">{milestone.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] h-5 ${config.border}`} style={{ color: config.color }}>
                          {config.label}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono">{milestone.weeks}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {milestone.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground">Overall Progress</span>
          <span className="text-[10px] font-bold text-[#00FFB2]">37.5% (3 of 8 phases)</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#00FFB2] via-[#FBBF24] to-[#38BDF8] transition-all duration-1000" style={{ width: '37.5%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-muted-foreground/50">Week 0</span>
          <span className="text-[8px] text-muted-foreground/50">Week 8</span>
          <span className="text-[8px] text-muted-foreground/50">Week 16</span>
        </div>
      </div>
    </div>
  );
}
