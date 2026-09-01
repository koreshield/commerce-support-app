import type { ActionId } from "@/lib/domain";
import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository-provider";
import { approveSandboxAction } from "@/lib/server/tools";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const repository = await getRepository();
    const action = await repository.getAction(id as ActionId);
    if (!action) return Response.json({ error: "Action not found." }, { status: 404 });
    const result = await approveSandboxAction(action, repository);
    await repository.completeAction(action.id, "executed", result);
    return Response.json({
      action: await repository.getAction(action.id),
      snapshot: await getDashboardSnapshot(repository),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
