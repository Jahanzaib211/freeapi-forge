import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Book,
  Globe,
  Code,
  Copy,
  Check,
  ChevronRight,
  Terminal,
  FileCode,
  Braces,
} from "lucide-react";

const endpoints = [
  {
    method: "POST",
    path: "/v1/chat/completions",
    description: "Create a chat completion",
    tags: ["openai-compatible"],
  },
  {
    method: "GET",
    path: "/v1/models",
    description: "List available models",
    tags: ["openai-compatible"],
  },
  {
    method: "GET",
    path: "/v1/models/:model",
    description: "Retrieve a model",
    tags: ["openai-compatible"],
  },
  {
    method: "POST",
    path: "/api/trpc/analytics.liveStats",
    description: "Get live analytics statistics",
    tags: ["trpc"],
  },
  {
    method: "POST",
    path: "/api/trpc/models.list",
    description: "List all configured models",
    tags: ["trpc"],
  },
  {
    method: "POST",
    path: "/api/trpc/providers.status",
    description: "Get provider health status",
    tags: ["trpc"],
  },
];

const codeExamples: Record<string, Record<string, string>> = {
  curl: {
    "POST /v1/chat/completions": `curl -X POST http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`,
    "GET /v1/models": `curl http://localhost:3000/v1/models \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  python: {
    "POST /v1/chat/completions": `import openai

client = openai.OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
    temperature=0.7,
    max_tokens=1024
)

print(response.choices[0].message.content)`,
    "GET /v1/models": `import openai

client = openai.OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="YOUR_API_KEY"
)

models = client.models.list()
for model in models.data:
    print(model.id)`,
  },
  javascript: {
    "POST /v1/chat/completions": `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "YOUR_API_KEY",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.7,
  max_tokens: 1024,
});

console.log(response.choices[0].message.content);`,
    "GET /v1/models": `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "YOUR_API_KEY",
});

const models = await client.models.list();
console.log(models.data.map(m => m.id));`,
  },
};

const methodColors: Record<string, string> = {
  GET: "bg-green-600/20 text-green-400 border-green-600/50",
  POST: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  PUT: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50",
  DELETE: "bg-red-600/20 text-red-400 border-red-600/50",
};

export default function APIReference() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [lang, setLang] = useState("curl");
  const [copied, setCopied] = useState(false);

  const current = endpoints[selectedEndpoint];
  const codeKey = `${current.method} ${current.path}`;
  const code = codeExamples[lang]?.[codeKey] || `// Example for ${codeKey}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">API Reference</h1>
          <p className="text-slate-400 text-lg">OpenAI-compatible API with tRPC endpoints</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {endpoints.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedEndpoint(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                      i === selectedEndpoint ? "bg-blue-600/20 text-white" : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    <Badge className={`${methodColors[ep.method]} text-xs min-w-[42px] justify-center`}>{ep.method}</Badge>
                    <span className="font-mono text-xs truncate">{ep.path}</span>
                    {i === selectedEndpoint && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur mt-6">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Book className="w-4 h-4 text-green-400" /> Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm text-slate-300">
                <p>1. Get an API key from your admin</p>
                <p>2. Set the base URL to your server</p>
                <p>3. Use any OpenAI-compatible client</p>
                <p>4. All requests are authenticated via Bearer token</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Badge className={`${methodColors[current.method]}`}>{current.method}</Badge>
                  <CardTitle className="text-white font-mono text-lg">{current.path}</CardTitle>
                </div>
                <CardDescription className="text-slate-400">{current.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-2 mb-4">
                  {current.tags.map((t) => (
                    <Badge key={t} variant="outline" className="border-slate-600 text-slate-400 text-xs">{t}</Badge>
                  ))}
                </div>

                <div className="bg-slate-900/80 rounded-lg p-1 mb-4">
                  <div className="flex gap-1 p-1">
                    {["curl", "python", "javascript"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          lang === l ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        {l === "curl" ? <Terminal className="w-3 h-3 inline mr-1" /> : l === "python" ? <FileCode className="w-3 h-3 inline mr-1" /> : <Braces className="w-3 h-3 inline mr-1" />}
                        {l === "javascript" ? "JavaScript" : l.charAt(0).toUpperCase() + l.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <pre className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto font-mono">
                    {code}
                  </pre>
                  <button
                    onClick={copyCode}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400 hover:text-white" />}
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white text-base">Response Format</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <pre className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto font-mono">
{`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "${current.path.includes("models") ? "gpt-4o" : "gpt-4o"}",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
