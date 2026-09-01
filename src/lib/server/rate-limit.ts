import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function assertDemoRateLimit(request: Request, operation: string): Promise<void> {
  let limiter: RateLimit | undefined;
  try {
    const { env } = getCloudflareContext();
    limiter = env.RATE_LIMITER;
  } catch {
    return;
  }
  if (!limiter) return;

  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const clientAddress = forwarded?.split(",", 1)[0]?.trim() || "unknown";
  const outcome = await limiter.limit({ key: `${operation}:${clientAddress}` });
  if (!outcome.success) {
    throw new Error("Too many demo requests. Wait a minute, then try again.");
  }
}
