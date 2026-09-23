import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ASSISTANT_TOOL_DECLARATIONS,
  executeAssistantTool,
  AssistantContext,
  MaterialSearchResult,
} from "@/lib/assistant/tools";

const SYSTEM_INSTRUCTION = `You are Deskwork's AI assistant, built exclusively for faculty, college professors, and teaching assistants.
You help teachers understand and interact with their Deskwork academic workspace.

You have access to real workspace data via tools:
- get_my_courses: lists the teacher's active teaching courses
- get_course_details: details of a course including enrolled students, uploaded materials, and exams
- search_materials: searches uploaded lecture slide text with exact unit and page citations
- get_exam_summary: summary of exam status, maximum marks, question counts, and progress
- get_exam_questions: extracted question paper questions, sub-parts, and marks
- get_exam_rubric: frozen rubric version, approval state, and criteria points
- get_grading_and_review_status: booklet counts, dual-model agreement rate, and review queue flags

Strict Operational Principles:
1. Grounded in Truth: Always invoke tools to retrieve actual data. Never invent courses, exam marks, booklet counts, rubric versions, or statistics. If data does not exist or has not been created yet, say so plainly.
2. Context Awareness: Use the current page context (route, page, courseId, examId) to interpret ambiguous references like "this exam", "this course", or "what do I need to do next?".
3. Student Privacy: Real student names and roll numbers remain private. Only refer to students using pseudonymous identifiers such as S001, S002.
4. Teacher Sovereignty: You advise and provide evidence. You cannot independently change marks or approve rubrics. The teacher remains the final authority.
5. Grounded Material Citations: When answering questions regarding syllabus topics, algorithms, or formulas, invoke search_materials and base your answer on the retrieved slides.
6. Keep answers concise, factual, and formatted in clean markdown.`;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Teacher Session
    let teacherId = "11111111-1111-1111-1111-111111111111"; // Default demo ID (Prof. Anish Sharma)
    let teacherName = "Prof. Anish Sharma";
    let isAuthenticated = false;

    // Check Supabase authenticated user
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        teacherId = user.id;
        teacherName = (user.user_metadata?.full_name as string) || "Professor";
        isAuthenticated = true;
      }
    } catch {
      // Supabase auth check failed, check demo cookie fallback
    }

    // Check demo cookie fallback
    const isDemo = req.cookies.get("deskwork_demo")?.value === "true";
    if (isDemo) {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized session. Please sign in as a teacher." },
        { status: 401 }
      );
    }

    // 2. Parse Request Body
    const body = await req.json();
    const {
      message,
      context = {} as AssistantContext,
      history = [] as Array<{ role: "user" | "assistant"; content: string }>,
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A message string is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // 3. Initialize Google Gemini Client
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

function formatGeminiHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  currentPrompt: string
): any[] {
  const contents: any[] = [];
  const recentHistory = history.slice(-8);

  let startIndex = 0;
  while (startIndex < recentHistory.length && recentHistory[startIndex].role === "assistant") {
    startIndex++;
  }

  let expectedRole: "user" | "model" = "user";
  for (let i = startIndex; i < recentHistory.length; i++) {
    const item = recentHistory[i];
    const text = item.content?.trim();
    if (!text) continue;

    const mappedRole = item.role === "assistant" ? "model" : "user";
    if (mappedRole === expectedRole) {
      contents.push({
        role: mappedRole,
        parts: [{ text }],
      });
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
  }

  if (expectedRole === "model") {
    contents.push({
      role: "model",
      parts: [{ text: "Understood. Please ask your question." }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: currentPrompt }],
  });

  return contents;
}

    // Format current turn with contextual page details
    const contextHeader = `[Current Context: Route=${context.route || "/dashboard"}, Page=${context.page || "dashboard"}, CourseId=${context.courseId || "none"}, ExamId=${context.examId || "none"}, Teacher=${teacherName}]`;
    const userPrompt = `${contextHeader}\n\nTeacher Question: ${message}`;
    const formattedHistory = formatGeminiHistory(history, userPrompt);

    const toolsConfig = [{ functionDeclarations: ASSISTANT_TOOL_DECLARATIONS }] as any;

    let collectedCitation: string | undefined = undefined;
    let collectedSources: MaterialSearchResult[] = [];

    // 4. Initial Gemini Generation with Tool Calling
    let response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: formattedHistory,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: toolsConfig,
        temperature: 0.2,
      },
    });

    // 5. Tool Execution Loop (supports up to 2 rounds of function calls)
    let rounds = 0;
    while (rounds < 2 && response.functionCalls && response.functionCalls.length > 0) {
      rounds++;
      const toolCalls = response.functionCalls;

      // Add model's function call message to conversation
      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      formattedHistory.push({
        role: "model",
        parts: candidateParts,
      });

      // Execute each requested tool server-side with teacher scoping
      for (const call of toolCalls) {
        if (!call.name) continue;

        const execution = await executeAssistantTool(
          call.name,
          call.args || {},
          teacherId,
          context
        );

        if (execution.citation) {
          collectedCitation = execution.citation;
        }
        if (execution.sources && execution.sources.length > 0) {
          collectedSources = execution.sources;
        }

        const responsePayload =
          Array.isArray(execution.result)
            ? { items: execution.result }
            : execution.result && typeof execution.result === "object"
            ? execution.result
            : { value: execution.result };

        formattedHistory.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: responsePayload,
              },
            },
          ],
        });
      }

      // Request next turn from Gemini with tool results
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: formattedHistory,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: toolsConfig,
          temperature: 0.2,
        },
      });
    }

    const finalText = response.text || "I was unable to formulate a response based on the workspace records.";

    return NextResponse.json({
      reply: finalText,
      citation: collectedCitation,
      sources: collectedSources.length > 0 ? collectedSources : undefined,
      model: "gemini-3.5-flash-lite",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal assistant error";
    console.error("[Assistant Route Error]", errorMsg);

    return NextResponse.json(
      {
        error: errorMsg,
        reply: "I encountered an error retrieving data from your workspace. Please try again.",
      },
      { status: 500 }
    );
  }
}
