'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Container, Database, Globe, Server, Cpu, Activity,
  Shield, ChevronRight, Copy, Check, Terminal
} from 'lucide-react';
import { useState } from 'react';

const dockerServices = [
  {
    name: 'app (forge-studio)',
    icon: <Server size={16} />,
    color: '#00FFB2',
    image: 'node:20-alpine',
    port: '5051',
    ports: ['5051:5051'],
    health: 'curl -f http://localhost:5051/api/health || exit 1',
    volumes: ['./:/app', 'forge-data:/data', '/var/run/docker.sock:/var/run/docker.sock'],
    env: ['NODE_ENV=production', 'PORT=5051'],
    status: 'required',
    depends: ['postgres', 'redis'],
  },
  {
    name: 'postgres',
    icon: <Database size={16} />,
    color: '#336791',
    image: 'postgres:17-alpine',
    port: '5434',
    ports: ['5434:5432'],
    health: 'pg_isready -U forge',
    volumes: ['pg-data:/var/lib/postgresql/data'],
    env: ['POSTGRES_USER=forge', 'POSTGRES_PASSWORD=forge', 'POSTGRES_DB=forge'],
    status: 'required',
    depends: [],
  },
  {
    name: 'redis',
    icon: <Activity size={16} />,
    color: '#DC382D',
    image: 'redis:7-alpine',
    port: '6379',
    ports: ['6379:6379'],
    health: 'redis-cli ping',
    volumes: ['redis-data:/data'],
    env: [],
    status: 'required',
    depends: [],
  },
  {
    name: 'nginx',
    icon: <Globe size={16} />,
    color: '#009639',
    image: 'nginx:alpine',
    port: '80',
    ports: ['80:80'],
    health: 'curl -f http://localhost/ || exit 1',
    volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
    env: [],
    status: 'required',
    depends: ['app'],
  },
  {
    name: 'ollama (optional)',
    icon: <Cpu size={16} />,
    color: '#F472B6',
    image: 'ollama/ollama',
    port: '11434',
    ports: ['11434:11434'],
    health: 'curl -f http://localhost:11434/ || exit 1',
    volumes: ['ollama-data:/root/.ollama'],
    env: ['OLLAMA_HOST=0.0.0.0'],
    status: 'optional',
    depends: [],
  },
];

const pm2Services = [
  { name: 'qdrant', desc: 'Vector DB for embeddings', color: '#DC2F5E', status: 'running' },
  { name: 'mcp-sse', desc: 'Python MCP bridge server', color: '#C084FC', status: 'running' },
  { name: 'mcp-gateway-docker', desc: 'MCP gateway (Docker)', color: '#A78BFA', status: 'running' },
  { name: 'ai-lab-dashboard', desc: 'Separate analytics dashboard', color: '#38BDF8', status: 'running' },
  { name: 'forge-studio', desc: 'Main application server', color: '#00FFB2', status: 'running' },
];

const envVars = [
  { name: 'DATABASE_URL', value: 'postgresql://forge:forge@localhost:5434/forge', required: true },
  { name: 'REDIS_URL', value: 'redis://localhost:6379', required: true },
  { name: 'PORT', value: '5051', required: false },
  { name: 'JWT_SECRET', value: '••••••••••••••••', required: true },
  { name: 'NODE_ENV', value: 'production', required: false },
  { name: 'ALLOWED_ORIGINS', value: 'http://localhost:5051', required: false },
  { name: 'LITELLM_URL', value: '(optional — being removed)', required: false },
  { name: 'LITELLM_API_KEY', value: '(optional — being removed)', required: false },
];

const nginxCapabilities = [
  { feature: 'Rate Limiting', desc: '10 req/s per IP, burst 20', icon: <Shield size={14} /> },
  { feature: 'WebSocket Upgrade', desc: 'Auto-upgrade /ws to WS connections', icon: <Activity size={14} /> },
  { feature: 'Security Headers', desc: 'X-Frame-Options, CSP, HSTS, X-Content-Type-Options', icon: <Shield size={14} /> },
  { feature: 'Static Assets', desc: 'Serve /public with 30-day cache', icon: <Globe size={14} /> },
  { feature: 'SSL Termination', desc: 'Let\'s Encrypt / custom certs', icon: <Shield size={14} /> },
  { feature: 'Gzip Compression', desc: 'Brotli for text/*, application/json', icon: <Activity size={14} /> },
];

export default function DockerStack() {
  const [copied, setCopied] = useState(false);

  const installCmd = 'curl -fsSL https://raw.githubusercontent.com/Jahanzaib211/forge-studio/main/install.sh | bash';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight">Docker Stack Architecture</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* One-line install */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-[#00FFB2] via-[#38BDF8] to-[#C084FC]" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={14} className="text-[#00FFB2]" />
              <span className="text-xs font-bold text-foreground">One-Line Install</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0a0a0f] rounded-lg px-3 py-2 border border-border">
              <code className="text-[11px] text-[#00FFB2] font-mono flex-1 truncate">{installCmd}</code>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                {copied ? <Check size={14} className="text-[#00FFB2]" /> : <Copy size={14} />}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Docker Compose services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dockerServices.map((svc, i) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="bg-card/60 backdrop-blur overflow-hidden group hover:border-opacity-80 transition-colors"
              style={{ borderLeftColor: svc.color, borderLeftWidth: '3px' }}>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: svc.color + '20', color: svc.color }}>
                      {svc.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold font-mono text-foreground">{svc.name}</CardTitle>
                      <span className="text-[9px] text-muted-foreground">{svc.image}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[8px] h-4 ${svc.status === 'optional' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-[#00FFB2]/10 text-[#00FFB2] border-[#00FFB2]/30'}`}>
                    {svc.status === 'optional' ? 'optional' : 'required'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] h-4 font-mono border-border text-muted-foreground">
                    :{svc.port}
                  </Badge>
                  {svc.depends.length > 0 && (
                    <span className="text-[8px] text-muted-foreground">
                      depends: {svc.depends.join(', ')}
                    </span>
                  )}
                </div>
                {svc.volumes.length > 0 && (
                  <div className="text-[9px] text-muted-foreground/60">
                    <span className="text-foreground/50">volumes:</span> {svc.volumes.length} mount{svc.volumes.length > 1 ? 's' : ''}
                  </div>
                )}
                <div className="text-[8px] font-mono text-muted-foreground/40 bg-[#0a0a0f] rounded px-2 py-1 truncate">
                  {svc.health}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* PM2 services */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Activity size={14} className="text-[#38BDF8]" />
              PM2 Services (ecosystem.services.cjs)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {pm2Services.map(svc => (
                <div key={svc.name} className="flex items-center gap-3 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: svc.color }} />
                  <span className="font-mono text-foreground/80 w-36 truncate">{svc.name}</span>
                  <span className="text-muted-foreground flex-1">{svc.desc}</span>
                  <Badge variant="outline" className="text-[8px] h-4 bg-[#00FFB2]/5 text-[#00FFB2] border-[#00FFB2]/20">
                    running
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* nginx capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Shield size={14} className="text-[#009639]" />
              nginx Reverse Proxy Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {nginxCapabilities.map(cap => (
                <div key={cap.feature} className="flex items-start gap-2 p-2 rounded bg-[#009639]/5 border border-[#009639]/10">
                  <div className="text-[#009639] mt-0.5">{cap.icon}</div>
                  <div>
                    <div className="text-[10px] font-bold text-foreground">{cap.feature}</div>
                    <div className="text-[9px] text-muted-foreground">{cap.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Environment variables */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card/60 backdrop-blur border-border overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Terminal size={14} className="text-[#FBBF24]" />
              Environment Variables (.env)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1 font-mono text-[10px]">
              {envVars.map(v => (
                <div key={v.name} className="flex items-center gap-2 text-muted-foreground/80">
                  <span className="w-32 truncate text-foreground/70">{v.name}</span>
                  <span className="text-muted-foreground/30">=</span>
                  <span className="flex-1 truncate text-muted-foreground/50">{v.value}</span>
                  {v.required && (
                    <Badge variant="outline" className="text-[7px] h-3.5 bg-red-500/10 text-red-400 border-red-500/30 px-1">
                      required
                    </Badge>
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
