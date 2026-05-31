'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  MessageSquare, Bot, Send, Users, Shield, Webhook,
  Hash, AtSign, Settings, Zap, Eye, AlertTriangle,
  ChevronRight, Cpu, Lock, Bell, Activity
} from 'lucide-react';

const discordColor = '#5865F2';
const discordBg = 'rgba(88,101,242,0.08)';
const discordBorder = 'rgba(88,101,242,0.25)';

const coreCapabilities = [
  {
    title: 'Server Management',
    icon: <Settings size={14} />,
    color: '#5865F2',
    desc: 'Full CRUD for Discord servers',
    items: [
      'Create/delete/rename servers (guilds)',
      'Channel categories + text/voice/stage channels',
      'Permission overrides per channel',
      'Server settings sync with Forge config',
      'Auto-channel creation from templates',
    ],
  },
  {
    title: 'Bot Control',
    icon: <Bot size={14} />,
    color: '#00FFB2',
    desc: 'Programmable bot with slash commands',
    items: [
      'Slash commands (/forge ask, /forge status, /forge models)',
      'Context menus & button interactions',
      'Auto-complete command options',
      'Permission-gated commands (admin-only)',
      'Command cooldowns & rate limiting',
    ],
  },
  {
    title: 'AI Chat Bridge',
    icon: <MessageSquare size={14} />,
    color: '#F472B6',
    desc: 'LLM-powered conversations in Discord',
    items: [
      '@Forge mention → AI response via LLM Proxy',
      'Thread-based conversations with context memory',
      'Model selection per channel (#gpt4, #claude, #local)',
      'Token usage tracking per Discord user',
      'Streaming responses via Discord editing',
    ],
  },
  {
    title: 'Webhook Automation',
    icon: <Webhook size={14} />,
    color: '#FBBF24',
    desc: 'Forge → Discord event notifications',
    items: [
      'Inference alerts (new model, GPU events)',
      'Budget threshold alerts → #finance channel',
      'Error logs → #alerts channel',
      'Build workflow completions → #dev channel',
      'Security events → #security channel',
    ],
  },
  {
    title: 'Role Automation',
    icon: <Shield size={14} />,
    color: '#38BDF8',
    desc: 'Dynamic role management based on Forge state',
    items: [
      'Auto-assign roles on Forge account link',
      'Tier-based roles (Pro, Team, Enterprise)',
      'Activity streak → role promotion',
      'Budget limit → mute/restrict role',
      'Admin audit trail for role changes',
    ],
  },
  {
    title: 'Real-time Bridge',
    icon: <Activity size={14} />,
    color: '#A78BFA',
    desc: 'Bidirectional WebSocket ↔ Discord bridge',
    items: [
      'GPU stats → live embed updates every 5s',
      'System alerts → instant Discord notifications',
      'Forge chat ↔ Discord channel sync',
      'Workflow progress → embed status updates',
      'P2P network events → community channel',
    ],
  },
];

const slashCommands = [
  { cmd: '/forge ask', desc: 'Ask the AI anything via LLM Proxy', perm: 'All users', channel: 'Any', model: 'User preference' },
  { cmd: '/forge models', desc: 'List available LLM models', perm: 'All users', channel: 'Any', model: '—' },
  { cmd: '/forge status', desc: 'Show GPU, RAM, system stats', perm: 'All users', channel: '#status', model: '—' },
  { cmd: '/forge budget', desc: 'Show team budget & usage', perm: 'Team+', channel: '#finance', model: '—' },
  { cmd: '/forge guard', desc: 'Toggle guardrails for channel', perm: 'Admin', channel: 'Config', model: '—' },
  { cmd: '/forge mcp', desc: 'List connected MCP servers', perm: 'All users', channel: '#mcp', model: '—' },
  { cmd: '/forge deploy', desc: 'Trigger workflow from Discord', perm: 'Admin', channel: '#dev', model: '—' },
  { cmd: '/forge alert', desc: 'Configure alert webhooks', perm: 'Admin', channel: 'Config', model: '—' },
  { cmd: '/forge key', desc: 'Generate virtual API key', perm: 'Pro+', channel: 'DM only', model: '—' },
  { cmd: '/forge role', desc: 'Manage Discord roles', perm: 'Admin', channel: 'Config', model: '—' },
];

const channelArchitecture = [
  { channel: '#general', type: 'Text', purpose: 'Community chat, announcements', bridge: false, icon: <Hash size={12} /> },
  { channel: '#forge-ai', type: 'Text', purpose: 'AI chat via LLM Proxy, @Forge mention', bridge: true, icon: <Bot size={12} /> },
  { channel: '#status', type: 'Text', purpose: 'Real-time system & GPU stats embeds', bridge: true, icon: <Activity size={12} /> },
  { channel: '#alerts', type: 'Text', purpose: 'Error logs, budget alerts, security events', bridge: true, icon: <AlertTriangle size={12} /> },
  { channel: '#dev', type: 'Text', purpose: 'Workflow triggers, build completions', bridge: true, icon: <Zap size={12} /> },
  { channel: '#finance', type: 'Text', purpose: 'Budget tracking, billing alerts', bridge: false, icon: <Send size={12} /> },
  { channel: '#mcp', type: 'Text', purpose: 'MCP server status & commands', bridge: false, icon: <Cpu size={12} /> },
  { channel: '🔊 forge-voice', type: 'Voice', purpose: 'Voice channel for TTS responses', bridge: false, icon: <MessageSquare size={12} /> },
  { channel: '🔒 admin-only', type: 'Private', purpose: 'Admin commands, role management, audit', bridge: false, icon: <Lock size={12} /> },
];

const integrationFlow = [
  { step: '1', label: 'Forge User links Discord', icon: <Users size={12} />, color: '#5865F2' },
  { step: '2', label: 'Bot joins server', icon: <Bot size={12} />, color: '#00FFB2' },
  { step: '3', label: 'Channels auto-created', icon: <Hash size={12} />, color: '#38BDF8' },
  { step: '4', label: 'Webhooks configured', icon: <Webhook size={12} />, color: '#FBBF24' },
  { step: '5', label: 'AI bridge active', icon: <AtSign size={12} />, color: '#F472B6' },
  { step: '6', label: 'Roles auto-assigned', icon: <Shield size={12} />, color: '#A78BFA' },
  { step: '7', label: 'Real-time sync live', icon: <Activity size={12} />, color: '#EF4444' },
];

const securityMeasures = [
  { measure: 'Token Encryption', desc: 'Bot tokens stored AES-256 encrypted in PostgreSQL', icon: <Lock size={12} />, color: '#00FFB2' },
  { measure: 'Command Audit', desc: 'Every bot command logged to discord_logs table', icon: <Eye size={12} />, color: '#38BDF8' },
  { measure: 'Rate Limiting', desc: 'Per-user rate limits via Redis (10 cmds/min)', icon: <Shield size={12} />, color: '#FBBF24' },
  { measure: 'Permission Checks', desc: 'Sync with Forge RBAC before executing commands', icon: <Users size={12} />, color: '#F472B6' },
  { measure: 'IP Whitelist', desc: 'Only Forge server IP can send webhooks', icon: <AlertTriangle size={12} />, color: '#EF4444' },
  { measure: 'Content Filter', desc: 'Guardrails PII/injection filtering on AI responses', icon: <Bell size={12} />, color: '#A78BFA' },
];

export default function DiscordSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: discordBg }}>
            <MessageSquare size={14} className="text-[#5865F2]" />
          </div>
          Discord API Integration
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Overview banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#5865F2] via-[#F472B6] to-[#00FFB2]" />
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-foreground/80 font-bold">Full automated Discord control</span> for every Forge user.
              Connect your Discord server with one click — Forge deploys a bot, creates channels, sets up webhooks,
              and bridges your AI lab directly into your community.{' '}
              <span className="text-foreground/80">@Forge</span> in any channel for AI chat,{' '}
              <span className="text-foreground/80">/forge</span> slash commands for system control,
              real-time GPU stats in embeds, and automated alerts — all from Discord.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="text-[9px] h-5 border-[#5865F2]/30 bg-[#5865F2]/5 text-[#5865F2]">
                <Bot size={10} className="mr-1" />Discord.js v14
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 border-[#00FFB2]/30 bg-[#00FFB2]/5 text-[#00FFB2]">
                <Zap size={10} className="mr-1" />10 Slash Commands
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 border-[#F472B6]/30 bg-[#F472B6]/5 text-[#F472B6]">
                <MessageSquare size={10} className="mr-1" />AI Chat Bridge
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 border-[#FBBF24]/30 bg-[#FBBF24]/5 text-[#FBBF24]">
                <Webhook size={10} className="mr-1" />Event Webhooks
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 border-[#38BDF8]/30 bg-[#38BDF8]/5 text-[#38BDF8]">
                <Activity size={10} className="mr-1" />Real-time Bridge
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 border-[#A78BFA]/30 bg-[#A78BFA]/5 text-[#A78BFA]">
                <Shield size={10} className="mr-1" />Role Automation
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Setup flow */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <ChevronRight size={14} className="text-[#5865F2]" />
              1-Click Setup Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap items-center gap-1">
              {integrationFlow.map((step, i) => (
                <div key={step.step} className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black" style={{ backgroundColor: step.color }}>
                      {step.step}
                    </div>
                    <span className="text-[9px] text-foreground/70 hidden sm:inline">{step.label}</span>
                  </div>
                  {i < integrationFlow.length - 1 && (
                    <span className="text-muted-foreground/30 mx-0.5 hidden sm:inline">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Core capabilities grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {coreCapabilities.map((cap, i) => (
          <motion.div
            key={cap.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
          >
            <Card className="bg-card/60 backdrop-blur overflow-hidden h-full"
              style={{ borderTopColor: cap.color, borderTopWidth: '2px' }}>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: cap.color + '15', color: cap.color }}>
                    {cap.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground">{cap.title}</CardTitle>
                    <p className="text-[8px] text-muted-foreground">{cap.desc}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {cap.items.map(item => (
                    <div key={item} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cap.color }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Slash commands table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Bot size={14} className="text-[#00FFB2]" />
              Slash Commands Registry
            </CardTitle>
            <p className="text-[9px] text-muted-foreground">10 commands · Permission-gated · Cooldown-protected</p>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Header */}
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/50 pb-1 border-b border-border">
                  <span className="w-28">Command</span>
                  <span className="flex-1">Description</span>
                  <span className="w-16 text-center">Permission</span>
                  <span className="w-16 text-center">Channel</span>
                </div>
                {/* Rows */}
                <div className="space-y-0.5 mt-1">
                  {slashCommands.map(cmd => (
                    <div key={cmd.cmd} className="flex items-center gap-2 text-[10px] py-1 px-1 rounded hover:bg-secondary/30 transition-colors">
                      <code className="w-28 text-[#5865F2] font-mono font-bold truncate">{cmd.cmd}</code>
                      <span className="flex-1 text-muted-foreground truncate">{cmd.desc}</span>
                      <Badge variant="outline" className={`text-[7px] h-3.5 w-16 justify-center ${cmd.perm === 'Admin' ? 'bg-red-500/10 text-red-400 border-red-500/30' : cmd.perm === 'Pro+' ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30' : cmd.perm === 'Team+' ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                        {cmd.perm}
                      </Badge>
                      <span className="w-16 text-center text-muted-foreground/50 text-[9px]">{cmd.channel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two columns: Channel Architecture + Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Channel Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Hash size={14} className="text-[#5865F2]" />
                Channel Architecture
              </CardTitle>
              <p className="text-[9px] text-muted-foreground">Auto-created on server join</p>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {channelArchitecture.map(ch => (
                  <div key={ch.channel} className="flex items-center gap-2 text-[10px] p-1.5 rounded hover:bg-secondary/20 transition-colors">
                    <div className="text-muted-foreground">{ch.icon}</div>
                    <span className="font-mono text-foreground/70 w-28 truncate">{ch.channel}</span>
                    <Badge variant="outline" className={`text-[7px] h-3.5 ${ch.type === 'Voice' ? 'bg-[#F472B6]/10 text-[#F472B6] border-[#F472B6]/30' : ch.type === 'Private' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                      {ch.type}
                    </Badge>
                    <span className="flex-1 text-muted-foreground/60 truncate text-[9px]">{ch.purpose}</span>
                    {ch.bridge && (
                      <Badge variant="outline" className="text-[7px] h-3.5 bg-[#00FFB2]/10 text-[#00FFB2] border-[#00FFB2]/20">
                        bridge
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Measures */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="bg-card/60 backdrop-blur border-border overflow-hidden h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Shield size={14} className="text-[#38BDF8]" />
                Security Measures
              </CardTitle>
              <p className="text-[9px] text-muted-foreground">Discord-specific security layer</p>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {securityMeasures.map(sec => (
                  <div key={sec.measure} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-secondary/20">
                    <div className="mt-0.5" style={{ color: sec.color }}>{sec.icon}</div>
                    <div>
                      <div className="text-[10px] font-bold text-foreground">{sec.measure}</div>
                      <div className="text-[9px] text-muted-foreground">{sec.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dependency map */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Zap size={14} className="text-[#FBBF24]" />
              Dependency Map — What Discord Integration Connects To
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { name: 'Express Server', type: 'API', desc: 'Bot API routes mounted on :5051', color: '#00FFB2' },
                { name: 'Discord API', type: 'External', desc: 'REST + WebSocket Gateway', color: '#5865F2' },
                { name: 'PostgreSQL', type: 'Data', desc: 'discord_configs + discord_logs', color: '#336791' },
                { name: 'Redis', type: 'Cache', desc: 'Rate limits, session state', color: '#DC382D' },
                { name: 'WebSocket Server', type: 'Event', desc: 'Bidirectional WS ↔ Discord bridge', color: '#F472B6' },
                { name: 'LLM Proxy', type: 'API', desc: 'AI chat responses via proxy', color: '#38BDF8' },
                { name: 'Web UI', type: 'UI', desc: 'Config dashboard in Forge UI', color: '#A78BFA' },
                { name: 'Forge Builder', type: 'Event', desc: 'Trigger workflows from /forge deploy', color: '#FBBF24' },
                { name: 'Guardrails', type: 'Filter', desc: 'PII/injection filter on AI responses', color: '#EF4444' },
              ].map(dep => (
                <div key={dep.name} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/20">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dep.color }} />
                  <div>
                    <div className="text-[10px] font-bold text-foreground">{dep.name}</div>
                    <div className="text-[8px] text-muted-foreground">{dep.desc}</div>
                  </div>
                  <Badge variant="outline" className="text-[7px] h-3.5 ml-auto border-border text-muted-foreground">
                    {dep.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Database tables */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Activity size={14} className="text-[#336791]" />
              Discord Database Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* discord_configs */}
              <div className="p-3 rounded-lg border border-[#336791]/20 bg-[#336791]/5">
                <div className="text-[10px] font-bold font-mono text-[#336791] mb-1">discord_configs</div>
                <div className="text-[9px] text-muted-foreground mb-2">Bot configuration, server connections, channel mappings</div>
                <div className="space-y-0.5 font-mono text-[8px] text-muted-foreground/70">
                  {[
                    ['id', 'UUID PK'],
                    ['bot_token_encrypted', 'TEXT (AES-256)'],
                    ['guild_id', 'VARCHAR'],
                    ['channels', 'JSONB'],
                    ['command_prefix', 'VARCHAR'],
                    ['is_active', 'BOOLEAN'],
                    ['created_at', 'TIMESTAMP'],
                  ].map(([col, type]) => (
                    <div key={col} className="flex gap-2">
                      <span className="w-32 text-foreground/60">{col}</span>
                      <span className="text-[#FBBF24]">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* discord_logs */}
              <div className="p-3 rounded-lg border border-[#336791]/20 bg-[#336791]/5">
                <div className="text-[10px] font-bold font-mono text-[#336791] mb-1">discord_logs</div>
                <div className="text-[9px] text-muted-foreground mb-2">Immutable event audit log (commands, messages, actions)</div>
                <div className="space-y-0.5 font-mono text-[8px] text-muted-foreground/70">
                  {[
                    ['id', 'UUID PK'],
                    ['config_id', 'UUID FK'],
                    ['event_type', 'ENUM(5 types)'],
                    ['user_id', 'VARCHAR'],
                    ['channel_id', 'VARCHAR'],
                    ['content', 'TEXT'],
                    ['metadata', 'JSONB'],
                    ['created_at', 'TIMESTAMP'],
                  ].map(([col, type]) => (
                    <div key={col} className="flex gap-2">
                      <span className="w-32 text-foreground/60">{col}</span>
                      <span className="text-[#FBBF24]">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
