import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, courseId, examId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback response for prototype testing when API key is not yet set
    if (!apiKey || apiKey === "your-gemini-api-key") {
      let content = "Hello Professor. I am your Deskwork assistant, grounded in your course materials.";
      let citation = undefined;

      const lower = message.toLowerCase();
      if (lower.includes("b-tree") || lower.includes("slide")) {
        content = "In your Unit 3 slides, a B-Tree is defined as a self-balancing search tree where each node contains multiple keys and children, keeping disk I/O minimal for large block operations.";
        citation = "Unit 3 Slides, p. 18";
      } else if (lower.includes("question") || lower.includes("struggle") || lower.includes("average")) {
        content = "Question 2b (AVL tree rotations) showed the lowest average score (2.1 / 4.0) with 6 student booklets flagged for manual verification of LR double rotations.";
      }

      return NextResponse.json({
        reply: content,
        citation,
        model: "gemini-3.5-flash-lite",
      });
    }

    // When API key is provided, use @google/genai on the server
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
          `You are an assistant for a college professor teaching at JIIT. You only answer questions using the course slides, approved rubrics, and exam marks. Never reveal student names. Use pseudonymous IDs (S001, S002). Current Course: ${courseId || "General"}. User query: ${message}`,
        ],
      });

      return NextResponse.json({
        reply: response.text,
        model: "gemini-3.5-flash-lite",
      });
    } catch (apiError: unknown) {
      const errorMsg = apiError instanceof Error ? apiError.message : "AI model invocation error";
      return NextResponse.json({
        reply: "Grounded assistant response based on syllabus and exam statistics.",
        warning: errorMsg,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
