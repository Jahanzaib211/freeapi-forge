import { Response } from "express";

interface RateLimitInfo {
  rateLimitRPM?: number;
  rateLimitTPM?: number;
  requestsThisMinute?: number;
  tokensThisMinute?: number;
}

export function setRateLimitHeaders(res: Response, info: RateLimitInfo) {
  const now = new Date();
  const resetMinute = new Date(now);
  resetMinute.setMinutes(resetMinute.getMinutes() + 1, 0, 0);

  const resetDay = new Date(now);
  resetDay.setHours(23, 59, 59, 999);

  const rpmLimit = info.rateLimitRPM || 1000;
  const tpmLimit = info.rateLimitTPM || 100000;
  const rpmRemaining = Math.max(0, rpmLimit - (info.requestsThisMinute || 0));
  const tpmRemaining = Math.max(0, tpmLimit - (info.tokensThisMinute || 0));

  res.setHeader("X-RateLimit-Limit-Requests", rpmLimit.toString());
  res.setHeader("X-RateLimit-Remaining-Requests", rpmRemaining.toString());
  res.setHeader("X-RateLimit-Limit-Tokens", tpmLimit.toString());
  res.setHeader("X-RateLimit-Remaining-Tokens", tpmRemaining.toString());
  res.setHeader("X-RateLimit-Reset-Requests", resetDay.toISOString());
  res.setHeader("X-RateLimit-Reset-Tokens", resetMinute.toISOString());
}
