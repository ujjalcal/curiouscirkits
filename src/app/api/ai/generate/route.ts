import { NextRequest } from "next/server";
import { generateFromText, generateFromAnswers } from "@/lib/ai/generate";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mode, text, answers } = body as {
    mode: "text" | "answers";
    text?: string;
    answers?: {
      name: string;
      role: string;
      about: string;
      projects: string;
      skills: string;
    };
  };

  if (mode !== "text" && mode !== "answers") {
    return new Response(
      JSON.stringify({ error: 'Invalid mode. Must be "text" or "answers".' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (mode === "text" && (!text || typeof text !== "string")) {
    return new Response(
      JSON.stringify({ error: "text field is required for text mode." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (mode === "answers" && !answers) {
    return new Response(
      JSON.stringify({ error: "answers field is required for answers mode." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        sendEvent("status", { message: "Generating portfolio content..." });

        const content =
          mode === "text"
            ? await generateFromText(text!)
            : await generateFromAnswers(answers!);

        sendEvent("content", content);
        sendEvent("done", { success: true });
      } catch (error) {
        sendEvent("error", {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
