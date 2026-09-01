import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const repository = getRepository();
    repository.reset();
    return Response.json(getDashboardSnapshot(repository));
  } catch (error) {
    return errorResponse(error);
  }
}
