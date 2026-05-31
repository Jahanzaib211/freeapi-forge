'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Check, X, Crown, Zap, Users, Building2, Sparkles } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    color: '#94A3B8',
    icon: <Zap size={18} />,
    desc: 'For personal exploration',
    features: [
      { name: '100 API calls/month', included: true },
      { name: 'Read-only explorers', included: true },
      { name: 'System monitoring only', included: true },
      { name: '1 team member', included: true },
      { name: 'Community support', included: true },
      { name: 'Full explorers', included: false },
      { name: 'Automation & workflows', included: false },
      { name: 'Telemetry dashboards', included: false },
      { name: 'Audit logs', included: false },
      { name: 'SSO integration', included: false },
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    color: '#00FFB2',
    icon: <Sparkles size={18} />,
    desc: 'For individual power users',
    features: [
      { name: 'Unlimited API calls', included: true },
      { name: 'Full explorers (AI Lab, MCP, Vault)', included: true },
      { name: 'Automation & Forge Builder', included: true },
      { name: 'Telemetry dashboards', included: true },
      { name: 'Custom providers', included: true },
      { name: 'Guardrails (PII, injection)', included: true },
      { name: 'Virtual keys with limits', included: true },
      { name: 'Priority support', included: true },
      { name: 'Team sharing', included: false },
      { name: 'SSO integration', included: false },
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$15',
    period: '/user/month',
    color: '#38BDF8',
    icon: <Users size={18} />,
    desc: 'For teams & organizations',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Team sharing & roles', included: true },
      { name: 'Audit logs (hash chain)', included: true },
      { name: 'SSO / SAML integration', included: true },
      { name: 'Budget tracking per team', included: true },
      { name: 'Access groups & policies', included: true },
      { name: 'Org-level analytics', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'BSL license waiver', included: false },
    ],
    cta: 'Start Team Trial',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    color: '#A78BFA',
    icon: <Building2 size={18} />,
    desc: 'Self-hosted BSL license',
    badge: '$990/year (save 17%)',
    features: [
      { name: 'Everything in Team', included: true },
      { name: 'Self-hosted BSL 1.1 license', included: true },
      { name: 'Unlimited organizations', included: true },
      { name: 'Custom branding', included: true },
      { name: 'On-premise deployment', included: true },
      { name: 'SLA guarantee (99.9%)', included: true },
      { name: 'Dedicated engineer support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Security hardening', included: true },
      { name: 'Mirror Test access', included: true },
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const licenseBreakdown = [
  { component: 'LLM Proxy', license: 'MIT', reason: 'Core routing — open forever' },
  { component: 'Circuit Breaker', license: 'MIT', reason: 'Infra utility — open forever' },
  { component: 'Fallback Router', license: 'MIT', reason: 'Infra utility — open forever' },
  { component: 'Express Server', license: 'BSL 1.1', reason: 'Application framework' },
  { component: 'tRPC Layer', license: 'BSL 1.1', reason: 'Type-safe API layer' },
  { component: 'AI Lab Hub', license: 'BSL 1.1', reason: 'Core product feature' },
  { component: 'Forge Builder', license: 'BSL 1.1', reason: 'Core product feature' },
  { component: 'MCP Fabric', license: 'BSL 1.1', reason: 'Core product feature' },
  { component: 'Native Vault', license: 'BSL 1.1', reason: 'Differentiator feature' },
  { component: 'P2P Network', license: 'BSL 1.1', reason: 'Economic moat' },
  { component: 'Security Layer', license: 'BSL 1.1', reason: 'Security hardening' },
  { component: 'Billing', license: 'BSL 1.1', reason: 'Revenue component' },
  { component: 'Tasks & Rewards', license: 'BSL 1.1', reason: 'Engagement system' },
  { component: 'Buyback Flywheel', license: 'BSL 1.1', reason: 'Economic engine' },
];

export default function PricingSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Crown size={18} className="text-[#FBBF24]" />
          Pricing & Licensing
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Pricing tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className={`bg-card/60 backdrop-blur overflow-hidden h-full flex flex-col ${tier.highlight ? 'border-[#00FFB2]/40 shadow-lg shadow-[#00FFB2]/5' : 'border-border'}`}>
              {tier.highlight && <div className="h-0.5 bg-gradient-to-r from-[#00FFB2] via-[#38BDF8] to-[#C084FC]" />}
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tier.color + '15', color: tier.color }}>
                      {tier.icon}
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">{tier.name}</CardTitle>
                  </div>
                  {tier.badge && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/30">
                      {tier.badge}
                    </Badge>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black" style={{ color: tier.color }}>{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tier.desc}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex-1 flex flex-col">
                <div className="space-y-1.5 flex-1">
                  {tier.features.map(f => (
                    <div key={f.name} className="flex items-start gap-2 text-[10px]">
                      {f.included ? (
                        <Check size={12} className="text-[#00FFB2] mt-0.5 flex-shrink-0" />
                      ) : (
                        <X size={12} className="text-muted-foreground/30 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-foreground/70' : 'text-muted-foreground/30'}>{f.name}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold transition-colors"
                  style={{
                    backgroundColor: tier.highlight ? tier.color + '15' : tier.color + '10',
                    color: tier.color,
                    border: `1px solid ${tier.color}30`,
                  }}
                >
                  {tier.cta}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* BSL vs MIT licensing breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Shield size={14} className="text-[#A78BFA]" />
              Licensing Breakdown — MIT Core + BSL 1.1 Features
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Proxy core stays MIT. Everything else transitions to BSL 1.1 after launch.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {licenseBreakdown.map(comp => (
                <div key={comp.component} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-secondary/30">
                  <span className="font-mono text-foreground/70 w-32 truncate">{comp.component}</span>
                  <Badge variant="outline" className={`text-[8px] h-4 flex-shrink-0 ${comp.license === 'MIT' ? 'bg-[#00FFB2]/10 text-[#00FFB2] border-[#00FFB2]/30' : 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/30'}`}>
                    {comp.license}
                  </Badge>
                  <span className="text-muted-foreground/50 flex-1 truncate">{comp.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

function Shield(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  );
}
