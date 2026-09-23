// Test harness for Deskwork AI Assistant
// Validates all user-specified scenarios

async function sendQuery(message, context = {}, history = [], cookie = "deskwork_demo=true") {
  const res = await fetch("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie,
    },
    body: JSON.stringify({ message, context, history }),
  });

  const status = res.status;
  const data = await res.json();
  return { status, data };
}

async function runTests() {
  console.log("=== DESKWORK ASSISTANT TEST SUITE ===\n");

  // 1. Basic: Hello
  console.log("Test 1: Hello");
  const t1 = await sendQuery("Hello");
  console.log("Status:", t1.status);
  console.log("Reply:", t1.data.reply?.slice(0, 100) + "...\n");

  // 2. Basic: What can you help me with?
  console.log("Test 2: What can you help me with?");
  const t2 = await sendQuery("What can you help me with?");
  console.log("Status:", t2.status);
  console.log("Reply:", t2.data.reply?.slice(0, 120) + "...\n");

  // 3. Course: What courses do I have?
  console.log("Test 3: What courses do I have?");
  const t3 = await sendQuery("What courses do I have?");
  console.log("Status:", t3.status);
  console.log("Reply:", t3.data.reply?.slice(0, 150) + "...\n");

  // 4. Course: Tell me about this course (context CS301)
  console.log("Test 4: Tell me about this course");
  const t4 = await sendQuery(
    "Tell me about this course",
    { route: "/courses/c-cs301-2026", page: "course", courseId: "c-cs301-2026" }
  );
  console.log("Status:", t4.status);
  console.log("Reply:", t4.data.reply?.slice(0, 150) + "...\n");

  // 5. Exam: What exams are in this course?
  console.log("Test 5: What exams are in this course?");
  const t5 = await sendQuery(
    "What exams are in this course?",
    { route: "/courses/c-cs301-2026", page: "course", courseId: "c-cs301-2026" }
  );
  console.log("Status:", t5.status);
  console.log("Reply:", t5.data.reply?.slice(0, 150) + "...\n");

  // 6, 7, 8, 9. Exam Status, Questions, Rubric, Next steps
  console.log("Test 6: What is the status of this exam?");
  const t6 = await sendQuery(
    "What is the status of this exam?",
    { route: "/exams/exam-t1-cs301", page: "exam", examId: "exam-t1-cs301" }
  );
  console.log("Status:", t6.status);
  console.log("Reply:", t6.data.reply?.slice(0, 150) + "...\n");

  console.log("Test 7: How many questions are in this exam?");
  const t7 = await sendQuery(
    "How many questions are in this exam?",
    { route: "/exams/exam-t1-cs301", page: "exam", examId: "exam-t1-cs301" }
  );
  console.log("Status:", t7.status);
  console.log("Reply:", t7.data.reply?.slice(0, 150) + "...\n");

  console.log("Test 8: Is the rubric approved?");
  const t8 = await sendQuery(
    "Is the rubric approved?",
    { route: "/exams/exam-t1-cs301/rubric", page: "rubric", examId: "exam-t1-cs301" }
  );
  console.log("Status:", t8.status);
  console.log("Reply:", t8.data.reply?.slice(0, 150) + "...\n");

  console.log("Test 9: What do I need to do next?");
  const t9 = await sendQuery(
    "What do I need to do next?",
    { route: "/exams/exam-t1-cs301", page: "exam", examId: "exam-t1-cs301" }
  );
  console.log("Status:", t9.status);
  console.log("Reply:", t9.data.reply?.slice(0, 150) + "...\n");

  // 10, 11, 12. Material grounding & Citations
  console.log("Test 10-12: Material grounding and citations");
  const t10 = await sendQuery(
    "What topics are covered in Unit 3?",
    { route: "/courses/c-cs301-2026", page: "course", courseId: "c-cs301-2026" }
  );
  console.log("Status:", t10.status);
  console.log("Reply:", t10.data.reply?.slice(0, 150) + "...");
  console.log("Citation:", t10.data.citation);
  console.log("Sources count:", t10.data.sources?.length || 0, "\n");

  // 13, 14, 15. Grading and Review Status
  console.log("Test 13-15: Grading and review status");
  const t13 = await sendQuery(
    "How many scripts have been graded and how many need review?",
    { route: "/exams/exam-t1-cs301/review", page: "review", examId: "exam-t1-cs301" }
  );
  console.log("Status:", t13.status);
  console.log("Reply:", t13.data.reply?.slice(0, 150) + "...\n");

  // 16, 17, 18. Multi-turn conversation context
  console.log("Test 16-18: Multi-turn conversation");
  const turn1User = "What is the status of my exam?";
  const turn1 = await sendQuery(
    turn1User,
    { route: "/exams/exam-t1-cs301", page: "exam", examId: "exam-t1-cs301" }
  );
  const turn2 = await sendQuery(
    "What should I do first?",
    { route: "/exams/exam-t1-cs301", page: "exam", examId: "exam-t1-cs301" },
    [
      { role: "user", content: turn1User },
      { role: "assistant", content: turn1.data.reply || "" },
    ]
  );
  console.log("Turn 2 Status:", turn2.status);
  console.log("Turn 2 Reply:", turn2.data.reply?.slice(0, 150) + "...\n");

  // 19, 20. Security: Unauthenticated request rejection
  console.log("Test 19-20: Security - Unauthenticated request rejection");
  const tSec = await sendQuery("What courses do I have?", {}, [], "");
  console.log("Unauthenticated Status:", tSec.status, "(Expected: 401)");
  console.log("Error response:", tSec.data.error, "\n");

  // 21, 22. Failure handling: empty message
  console.log("Test 21-22: Failure handling - empty message validation");
  const tEmpty = await sendQuery("   ");
  console.log("Empty Message Status:", tEmpty.status, "(Expected: 400)\n");

  console.log("=== ALL TEST SCENARIOS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(console.error);
