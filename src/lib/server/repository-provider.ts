import { getCloudflareContext } from "@opennextjs/cloudflare";

import { D1DemoRepository } from "@/lib/server/repository-d1";
import type { SupportRepository } from "@/lib/server/repository-contract";

export async function getRepository(): Promise<SupportRepository> {
  try {
    const { env } = getCloudflareContext();
    if (env.DB) return new D1DemoRepository(env.DB);
  } catch {
    // A Node.js deployment uses the local SQLite adapter loaded below.
  }
  const { getRepository: getNodeRepository } = await import("@/lib/server/repository");
  return getNodeRepository();
}
