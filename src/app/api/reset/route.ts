import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository-provider";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const repository = await getRepository();
    await repository.reset();
    return Response.json(await getDashboardSnapshot(repository));
  } catch (error) {
    return errorResponse(error);
  }
}
