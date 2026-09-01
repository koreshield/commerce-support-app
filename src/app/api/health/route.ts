import { getRepository } from "@/lib/server/repository-provider";
import { integrationStatus } from "@/lib/server/workflow";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const repository = await getRepository();
    const tenant = await repository.getDefaultTenant();
    return Response.json({
      status: "healthy",
      database: "connected",
      seededTenant: tenant.slug,
      integration: integrationStatus(repository.storageProvider),
    });
  } catch {
    return Response.json({ status: "unhealthy", database: "unavailable" }, { status: 503 });
  }
}
