import { z } from "zod";

import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { getDashboardSnapshot, runScenario } from "@/lib/server/workflow";

const runRequestSchema = z.object({
  scenarioId: z.string().min(1).max(100),
  message: z.string().trim().min(1).max(2_000).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = runRequestSchema.parse(await request.json());
    const run = await runScenario(
      input.message === undefined
        ? { scenarioId: input.scenarioId }
        : { scenarioId: input.scenarioId, message: input.message },
    );
    return Response.json({ run, snapshot: getDashboardSnapshot() }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
