export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateRequestTokens(messages: { role: string; content: string }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const ratePerMillion = 0.001; // $0.001 per million tokens (rough average)
  return ((inputTokens + outputTokens) / 1000000) * ratePerMillion;
}
