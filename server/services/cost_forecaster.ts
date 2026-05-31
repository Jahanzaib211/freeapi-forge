export function forecastMonthlySpend(
  dailyData: { date: string; spend: number }[]
): {
  projected: number;
  avgDaily: number;
  confidence: "high" | "medium" | "low";
} {
  if (dailyData.length < 3)
    return { projected: 0, avgDaily: 0, confidence: "low" };

  const avg =
    dailyData.reduce((s, d) => s + d.spend, 0) / dailyData.length;

  return {
    projected: avg * 30,
    avgDaily: avg,
    confidence:
      dailyData.length >= 14 ? "high" : dailyData.length >= 7 ? "medium" : "low",
  };
}
