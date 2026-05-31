'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Network, Shield, Server, Cpu, Globe, ArrowRightLeft,
  Lock, Activity, TrendingUp, Users, CreditCard
} from 'lucide-react';

const providerHierarchy = [
  {
    tier: 'Cloud Providers',
    color: '#A78BFA',
    icon: <Globe size={16} />,
    desc: 'OpenAI, DeepSeek, Groq, Together, OpenRouter',
    latency: '50-200ms',
    cost: '$0.50-$30/1M tokens',
    reliability: '99.9% SLA',
    fallback: '→ Local → Other Forge instances',
  },
  {
    tier: 'Local Inference',
    color: '#00FFB2',
    icon: <Cpu size={16} />,
    desc: 'Ollama, llama.cpp, GGUF models on your GPU',
    latency: '<10ms',
    cost: 'Free (electricity)',
    reliability: 'GPU-dependent',
    fallback: '→ Cloud → Other Forge instances',
  },
  {
    tier: 'Other Forge Instances',
    color: '#F472B6',
    icon: <Network size={16} />,
    desc: 'Peer-to-peer compute marketplace',
    latency: '50-500ms',
    cost: 'Credit-based (market rate)',
    reliability: 'Reputation-scored',
    fallback: '→ Cloud → Local',
  },
];

const p2pFeatures = [
  {
    title: 'Peer Discovery',
    icon: <Network size={14} />,
    color: '#38BDF8',
    items: [
      'mDNS + DHT-based discovery on LAN',
      'Bootstrap nodes for WAN discovery',
      'Health checks every 30 seconds',
      'Automatic peer list rotation',
    ],
  },
  {
    title: 'Trust & Reputation',
    icon: <Shield size={14} />,
    color: '#00FFB2',
    items: [
      'Reputation score 0-1000 (uptime, latency, accuracy)',
      'Mutual TLS with certificate pinning',
      'HMAC-signed request verification',
      'Staking/bonding for bad actor prevention',
    ],
  },
  {
    title: 'Credit System',
    icon: <CreditCard size={14} />,
    color: '#FBBF24',
    items: [
      'Earn credits: sell GPU time, host models',
      'Spend credits: use remote inference',
      'Credits ↔ USD via Stripe',
      'Transparent pricing on marketplace',
    ],
  },
];

const flowDiagram = [
  { step: '1', label: 'Client requests inference', icon: <Users size={12} />, color: '#A78BFA' },
  { step: '2', label: 'Proxy checks: Cloud → Local → P2P', icon: <Server size={12} />, color: '#38BDF8' },
  { step: '3', label: 'Circuit breaker routes to best peer', icon: <Network size={12} />, color: '#00FFB2' },
  { step: '4', label: 'TLS handshake + HMAC verification', icon: <Lock size={12} />, color: '#FBBF24' },
  { step: '5', label: 'Stream response via P2P tunnel', icon: <Activity size={12} />, color: '#F472B6' },
  { step: '6', label: 'Update reputation + credit ledger', icon: <CreditCard size={12} />, color: '#EF4444' },
];

export default function P2PNetwork() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Network size={18} className="text-[#F472B6]" />
          Forge-to-Forge P2P Network
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Provider hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {providerHierarchy.map((prov, i) => (
          <motion.div
            key={prov.tier}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card/60 backdrop-blur overflow-hidden h-full"
              style={{ borderTopColor: prov.color, borderTopWidth: '2px' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: prov.color + '15', color: prov.color }}>
                    {prov.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{prov.tier}</h3>
                    <p className="text-[9px] text-muted-foreground">{prov.desc}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-mono text-foreground/70">{prov.latency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-mono text-foreground/70">{prov.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reliability</span>
                    <span className="font-mono text-foreground/70">{prov.reliability}</span>
                  </div>
                  <div className="pt-1 border-t border-border">
                    <span className="text-muted-foreground">Fallback: </span>
                    <span className="text-[#00FFB2]">{prov.fallback}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Supply/Demand pricing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={14} className="text-[#FBBF24]" />
              Supply & Demand Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 rounded bg-[#00FFB2]/5 border border-[#00FFB2]/10">
                <div className="text-[9px] font-bold text-[#00FFB2]">Supply Side (Earn)</div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  • GPU hours sold → credits<br />
                  • Model hosting → per-request credits<br />
                  • High uptime → reputation bonus<br />
                  • Low latency → priority routing bonus
                </div>
              </div>
              <div className="p-2 rounded bg-[#F472B6]/5 border border-[#F472B6]/10">
                <div className="text-[9px] font-bold text-[#F472B6]">Demand Side (Spend)</div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  • Pay credits for remote inference<br />
                  • Bid system for popular models<br />
                  • Price cap based on cloud rates<br />
                  • Free tier: limited P2P requests
                </div>
              </div>
              <div className="p-2 rounded bg-[#FBBF24]/5 border border-[#FBBF24]/10">
                <div className="text-[9px] font-bold text-[#FBBF24]">Market Mechanics</div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  • Credits ↔ Stripe (1 credit = $0.01)<br />
                  • 80% to provider, 20% to Forge<br />
                  • Auto-withdrawal at threshold<br />
                  • Real-time price board
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* P2P Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {p2pFeatures.map((feat, i) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
          >
            <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-bold flex items-center gap-2" style={{ color: feat.color }}>
                  {feat.icon}
                  {feat.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {feat.items.map(item => (
                    <div key={item} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: feat.color }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Request flow */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft size={14} className="text-[#38BDF8]" />
              P2P Request Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap items-center gap-1">
              {flowDiagram.map((step, i) => (
                <div key={step.step} className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black" style={{ backgroundColor: step.color }}>
                      {step.step}
                    </div>
                    <span className="text-[9px] text-foreground/70 hidden sm:inline">{step.label}</span>
                  </div>
                  {i < flowDiagram.length - 1 && (
                    <span className="text-muted-foreground/30 mx-0.5 hidden sm:inline">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
