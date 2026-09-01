import { getRepository } from "@/lib/server/repository";
import { integrationStatus } from "@/lib/server/workflow";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const tenant = getRepository().getDefaultTenant();
    return Response.json({
      status: "healthy",
      database: "connected",
      seededTenant: tenant.slug,
      integration: integrationStatus(),
    });
  } catch {
    return Response.json({ status: "unhealthy", database: "unavailable" }, { status: 503 });
  }
}
