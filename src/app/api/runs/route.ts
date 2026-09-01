import { z } from "zod";

import { assertSameOrigin, errorResponse } from "@/lib/server/http";
import { assertDemoRateLimit } from "@/lib/server/rate-limit";
import { getDashboardSnapshot, runScenario } from "@/lib/server/workflow";

const runRequestSchema = z.object({
  scenarioId: z.string().min(1).max(100),
  message: z.string().trim().min(1).max(2_000).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await assertDemoRateLimit(request, "run");
    const input = runRequestSchema.parse(await request.json());
    const run = await runScenario(
      input.message === undefined
        ? { scenarioId: input.scenarioId }
        : { scenarioId: input.scenarioId, message: input.message },
    );
    return Response.json({ run, snapshot: await getDashboardSnapshot() }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
