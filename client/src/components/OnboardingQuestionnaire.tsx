import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, ArrowLeft, X } from "lucide-react";

interface Section {
  id: string;
  title: string;
  description: string;
  type: string;
  options?: Array<{ id: string; label: string; description?: string; icon?: string }>;
  suggestions?: string[];
}

interface Props {
  onClose: () => void;
}

export default function OnboardingQuestionnaire({ onClose }: Props) {
  const { getToken } = useAuth();
  const token = getToken();
  const [sections, setSections] = useState<Section[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    loadQuestionnaire();
  }, []);

  async function loadQuestionnaire() {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/aiLab.getQuestionnaire", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        const data = d.result?.data?.json || d.result?.data || [];
        setSections(data);
      }
    } catch {}
    setLoading(false);
  }

  function setAnswer(key: string, value: any) {
    setAnswers((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  }

  function toggleMultiSelect(sectionId: string, optionId: string) {
    const current: string[] = answers[sectionId] || [];
    if (current.includes(optionId)) {
      setAnswer(sectionId, current.filter((id: string) => id !== optionId));
    } else {
      setAnswer(sectionId, [...current, optionId]);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/trpc/aiLab.processQuestionnaire?batch=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify([{ json: answers }]),
      });
      if (res.ok) {
        const d = await res.json();
        const result = d[0]?.result?.data?.json;
        setSummary(result?.summary || "Studio configured successfully.");
        setCompleted(true);
      }
    } catch {}
    setSubmitting(false);
  }

  const section = sections[currentSection];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
        <div className="text-muted-foreground">Loading onboarding...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
        <Card className="w-full max-w-lg border-border">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">All Set!</h2>
            <p className="text-muted-foreground">{summary}</p>
            <p className="text-sm text-muted-foreground">Your decisions are now part of Forge Brain.</p>
            <Button onClick={onClose} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
      <Card className="w-full max-w-2xl border-border relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          title="Skip for now"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <div className="flex gap-1 mb-3">
            {sections.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= currentSection ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <CardTitle>{section?.title || "Configure Your Studio"}</CardTitle>
          <CardDescription>{section?.description || ""}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 min-h-[300px]">
          {section?.type === "multi-select" && (
            <div className="grid grid-cols-2 gap-3">
              {section.options?.map(opt => {
                const selected = (answers[section.id] || []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleMultiSelect(section.id, opt.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    <p className="font-medium text-foreground text-sm">
                      {opt.icon} {opt.label}
                    </p>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {section?.type === "single-select" && (
            <div className="space-y-2">
              {section.options?.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnswer(section.id, opt.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers[section.id] === opt.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">{opt.label}</p>
                  {opt.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {section?.type === "text" && (
            <div className="space-y-3">
              <Textarea
                placeholder="Describe what you want to build..."
                value={answers[section.id] || ""}
                onChange={e => setAnswer(section.id, e.target.value)}
                className="bg-card border-border min-h-[100px]"
              />
              {section.suggestions && (
                <div className="flex flex-wrap gap-2">
                  {section.suggestions.map(s => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setAnswer(section.id, s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-between p-6 pt-0">
          <Button
            variant="ghost"
            onClick={currentSection > 0 ? () => setCurrentSection(i => i - 1) : onClose}
          >
            {currentSection > 0 ? <><ArrowLeft className="w-4 h-4 mr-2" /> Back</> : "Skip"}
          </Button>

          <Button
            onClick={() => {
              if (currentSection < sections.length - 1) {
                setCurrentSection(i => i + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={submitting}
          >
            {currentSection < sections.length - 1 ? (
              <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : submitting ? (
              "Configuring..."
            ) : (
              "Complete Setup"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
