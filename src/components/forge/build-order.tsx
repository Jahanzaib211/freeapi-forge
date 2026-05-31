'use client';

import { BUILD_PHASES, type BuildPhase } from '@/lib/forge-tree-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, GitBranch, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function BuildOrder() {
  const totalWeeks = BUILD_PHASES.reduce((s, p) => s + p.weeks, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight">Build Order — {totalWeeks} Weeks</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-[#00FFB2] via-[#38BDF8] to-[#A78BFA] opacity-30 hidden md:block" />

        <div className="space-y-4">
          {BUILD_PHASES.map((phase, i) => (
            <motion.div
              key={phase.phase}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex gap-4 md:gap-6">
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 hidden md:flex">
                  <div className="w-10 h-10 rounded-full bg-card border-2 border-[#00FFB2] flex items-center justify-center z-10">
                    <span className="text-xs font-bold text-[#00FFB2]">{phase.phase}</span>
                  </div>
                </div>

                {/* Phase card */}
                <Card className="bg-card/60 backdrop-blur border-border flex-1 overflow-hidden group hover:border-[#00FFB2]/30 transition-colors">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[10px] font-bold text-[#00FFB2] bg-[#00FFB2]/10 px-1.5 py-0.5 rounded">P{phase.phase}</span>
                          <h3 className="text-sm font-bold text-foreground">{phase.name}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{phase.weeks} week{phase.weeks > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[9px] h-5 bg-secondary text-muted-foreground">
                          <Clock size={10} className="mr-1" />{phase.weeks}w
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-5 bg-secondary text-muted-foreground">
                          <Package size={10} className="mr-1" />{phase.components.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Components */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {phase.components.map(comp => (
                        <Badge key={comp} variant="outline" className="text-[10px] h-5 bg-[#00FFB2]/5 text-[#00FFB2] border-[#00FFB2]/20">
                          {comp}
                        </Badge>
                      ))}
                    </div>

                    {/* Deliverables */}
                    <div className="mb-2">
                      <h4 className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deliverables</h4>
                      <div className="flex flex-wrap gap-1">
                        {phase.deliverables.map(d => (
                          <div key={d} className="flex items-center gap-1 text-[10px] text-foreground/70">
                            <CheckCircle2 size={9} className="text-[#00FFB2]" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div className="mb-2">
                      <h4 className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requires</h4>
                      <div className="flex flex-wrap gap-1">
                        {phase.dependencies.map(d => (
                          <Badge key={d} variant="outline" className="text-[9px] h-4 bg-secondary/50 text-muted-foreground border-border">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Parallel work */}
                    {phase.parallel && (
                      <div>
                        <h4 className="text-[9px] font-semibold text-[#38BDF8] uppercase tracking-wider mb-1">
                          <GitBranch size={9} className="inline mr-1" />Parallel Track
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {phase.parallel.map(p => (
                            <Badge key={p} variant="outline" className="text-[9px] h-4 bg-[#38BDF8]/5 text-[#38BDF8] border-[#38BDF8]/20">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Total timeline bar */}
      <Card className="bg-card/60 backdrop-blur border-border mt-6 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xs font-semibold text-foreground">Cumulative Timeline</h4>
            <span className="text-[10px] text-muted-foreground">{totalWeeks} weeks total</span>
          </div>
          <div className="flex h-6 rounded overflow-hidden gap-px">
            {BUILD_PHASES.map(phase => (
              <div
                key={phase.phase}
                className="flex items-center justify-center text-[8px] font-bold text-black/70 hover:opacity-80 transition-opacity cursor-default"
                style={{
                  width: `${(phase.weeks / totalWeeks) * 100}%`,
                  backgroundColor: LAYER_COLORS[phase.phase - 1] || '#00FFB2',
                  minWidth: '40px',
                }}
                title={`P${phase.phase}: ${phase.name} (${phase.weeks}w)`}
              >
                {phase.weeks}w
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

const LAYER_COLORS = [
  '#00FFB2', '#DEA584', '#C084FC', '#38BDF8',
  '#FBBF24', '#F472B6', '#A78BFA', '#94A3B8',
  '#34D399', '#FB923C',
];
