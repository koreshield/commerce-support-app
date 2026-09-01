import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { assertDemoRateLimit } from "@/lib/server/rate-limit";
import { getRepository } from "@/lib/server/repository-provider";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await assertDemoRateLimit(request, "reset");
    const repository = await getRepository();
    await repository.reset();
    return Response.json(await getDashboardSnapshot(repository));
  } catch (error) {
    return errorResponse(error);
  }
}
