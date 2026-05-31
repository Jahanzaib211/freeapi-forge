'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Trophy, Star, Medal, Crown, Gift, Users, Zap, Clock } from 'lucide-react';

const rewardTiers = [
  {
    name: 'Bronze',
    days: 7,
    color: '#CD7F32',
    bgColor: 'rgba(205,127,50,0.1)',
    borderColor: 'rgba(205,127,50,0.3)',
    icon: <Medal size={20} />,
    points: '100 pts',
    unlocks: ['Profile badge', 'Early access to new features', 'Community role'],
    referralReq: null,
    bonusReq: null,
  },
  {
    name: 'Silver',
    days: 15,
    color: '#C0C0C0',
    bgColor: 'rgba(192,192,192,0.1)',
    borderColor: 'rgba(192,192,192,0.3)',
    icon: <Star size={20} />,
    points: '500 pts',
    unlocks: ['Silver badge', 'Extended model access', 'Priority queue', 'Beta features'],
    referralReq: null,
    bonusReq: null,
  },
  {
    name: 'Gold',
    days: 25,
    color: '#FFD700',
    bgColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.3)',
    icon: <Trophy size={20} />,
    points: '1,500 pts',
    unlocks: ['Gold badge', 'Full API access', 'Forge Builder advanced', 'Custom providers', 'Vault search'],
    referralReq: null,
    bonusReq: null,
  },
  {
    name: 'Platinum',
    days: 30,
    color: '#E5E4E2',
    bgColor: 'rgba(229,228,226,0.1)',
    borderColor: 'rgba(229,228,226,0.4)',
    icon: <Crown size={20} />,
    points: '5,000 pts',
    unlocks: ['Platinum badge', 'Lifetime Pro features', 'P2P marketplace access', 'Mirror Test early access', 'Founder NFT', 'Revenue share'],
    referralReq: '5 referrals',
    bonusReq: '3 bonus tasks',
  },
];

const bonusActions = [
  { action: 'Daily login', points: 5, type: 'recurring', icon: <Clock size={12} />, color: '#00FFB2' },
  { action: 'Complete first workflow', points: 50, type: 'one-time', icon: <Zap size={12} />, color: '#38BDF8' },
  { action: 'Connect 3 MCP servers', points: 100, type: 'one-time', icon: <Star size={12} />, color: '#C084FC' },
  { action: 'Create 5 vault notes', points: 75, type: 'one-time', icon: <Medal size={12} />, color: '#FBBF24' },
  { action: 'Refer a friend', points: 200, type: 'per-referral', icon: <Users size={12} />, color: '#F472B6' },
  { action: 'Rate 5 MCP servers', points: 25, type: 'one-time', icon: <Gift size={12} />, color: '#A78BFA' },
  { action: 'Run first inference', points: 25, type: 'one-time', icon: <Zap size={12} />, color: '#34D399' },
  { action: 'Custom provider setup', points: 50, type: 'one-time', icon: <Star size={12} />, color: '#FB923C' },
  { action: 'Export error logs CSV', points: 10, type: 'one-time', icon: <Clock size={12} />, color: '#94A3B8' },
  { action: 'Setup guardrails rules', points: 30, type: 'one-time', icon: <Gift size={12} />, color: '#EF4444' },
];

const pointValues = [
  { tier: 'Points value', desc: '1 point = $0.01 credit toward Pro subscription', color: '#FBBF24' },
  { tier: 'Referral bonus', desc: 'Each referral = 200 pts + referrer gets 200 pts', color: '#F472B6' },
  { tier: 'Streak multiplier', desc: '7-day streak = 2x daily points', color: '#00FFB2' },
  { tier: 'Badge perks', desc: 'Higher badges unlock exclusive features', color: '#A78BFA' },
];

export default function LaunchRewards() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Trophy size={18} className="text-[#FFD700]" />
          Launch Rewards Program
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Visual ladder */}
      <div className="relative">
        {/* Ladder line */}
        <div className="absolute left-4 top-4 bottom-4 w-px hidden md:block" style={{
          background: `linear-gradient(to bottom, #CD7F32, #C0C0C0, #FFD700, #E5E4E2)`,
          opacity: 0.3
        }} />

        <div className="space-y-3 md:pl-10">
          {rewardTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className="bg-card/60 backdrop-blur overflow-hidden group hover:translate-x-1 transition-transform duration-200"
                style={{ borderLeftColor: tier.color, borderLeftWidth: '3px' }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center md:absolute md:-left-[52px]" style={{ backgroundColor: tier.bgColor, color: tier.color, border: `1px solid ${tier.borderColor}` }}>
                        {tier.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          {tier.name}
                          <Badge variant="outline" className="text-[8px] h-4 font-mono" style={{ backgroundColor: tier.bgColor, color: tier.color, borderColor: tier.borderColor }}>
                            Day {tier.days}
                          </Badge>
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tier.points} total points</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tier.referralReq && (
                        <Badge variant="outline" className="text-[8px] h-4 bg-[#F472B6]/10 text-[#F472B6] border-[#F472B6]/20">
                          <Users size={8} className="mr-0.5" />{tier.referralReq}
                        </Badge>
                      )}
                      {tier.bonusReq && (
                        <Badge variant="outline" className="text-[8px] h-4 bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20">
                          <Gift size={8} className="mr-0.5" />{tier.bonusReq}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tier.unlocks.map(unlock => (
                      <div key={unlock} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: tier.bgColor, color: tier.color }}>
                        <Zap size={8} />
                        <span>{unlock}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Two columns: Bonus actions + Points system */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bonus actions table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Gift size={14} className="text-[#F472B6]" />
                Bonus Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1">
                {bonusActions.map(action => (
                  <div key={action.action} className="flex items-center gap-2 text-[10px] py-1 px-2 rounded hover:bg-secondary/30 transition-colors">
                    <div style={{ color: action.color }}>{action.icon}</div>
                    <span className="flex-1 text-foreground/70">{action.action}</span>
                    <Badge variant="outline" className="text-[7px] h-3.5 font-mono border-border text-muted-foreground">
                      {action.type}
                    </Badge>
                    <span className="font-bold font-mono w-12 text-right" style={{ color: action.color }}>
                      +{action.points}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Points system */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Zap size={14} className="text-[#FBBF24]" />
                Points System
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {pointValues.map(pv => (
                  <div key={pv.tier} className="p-2.5 rounded-lg border border-border">
                    <div className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pv.color }} />
                      {pv.tier}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 ml-3">{pv.desc}</p>
                  </div>
                ))}

                <div className="mt-3 p-3 rounded-lg bg-[#00FFB2]/5 border border-[#00FFB2]/15">
                  <div className="text-[10px] font-bold text-[#00FFB2] mb-1">Points Required per Tier</div>
                  <div className="space-y-1">
                    {[
                      { tier: 'Bronze', pts: 100, color: '#CD7F32', pct: 2 },
                      { tier: 'Silver', pts: 500, color: '#C0C0C0', pct: 10 },
                      { tier: 'Gold', pts: 1500, color: '#FFD700', pct: 30 },
                      { tier: 'Platinum', pts: 5000, color: '#E5E4E2', pct: 100 },
                    ].map(t => (
                      <div key={t.tier} className="flex items-center gap-2">
                        <span className="text-[9px] w-14" style={{ color: t.color }}>{t.tier}</span>
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                        </div>
                        <span className="text-[8px] font-mono text-muted-foreground w-10 text-right">{t.pts}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
