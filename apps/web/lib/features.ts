export type FeatureStatus = "live" | "soon";

export interface FeatureDefinition {
  status: FeatureStatus;
  blurb?: string;
  name?: string;
}

export const FEATURES = {
  checking: {
    status: "live",
    name: "Exam Checking",
    blurb: "Dual-model AI assisted handwritten exam evaluation with forced review."
  },
  generator: {
    status: "live",
    name: "Assignment Generator",
    blurb: "Generate assignments and question papers from uploaded course slides."
  },
  assistant: {
    status: "live",
    name: "Course Assistant",
    blurb: "Chat assistant grounded in course slides with page citations."
  },
  lessonPlanner: {
    status: "soon",
    name: "Lesson Planner",
    blurb: "Turn a topic into a lecture plan and reading list."
  },
  questionBank: {
    status: "soon",
    name: "Question Bank",
    blurb: "Reuse and tag verified questions across courses and exams."
  },
  feedbackWriter: {
    status: "soon",
    name: "Feedback Writer",
    blurb: "Draft personalized feedback from criterion marks and error notes."
  },
  rubricLibrary: {
    status: "soon",
    name: "Rubric Library",
    blurb: "Save, share, and reuse vetted rubrics across departmental colleagues."
  },
  analytics: {
    status: "soon",
    name: "Weak-Topic Analytics",
    blurb: "Detect weak topics and question performance trends across exams."
  },
  questionWiseReview: {
    status: "soon",
    name: "Question-Wise Review",
    blurb: "Grade and review one specific question across every student booklet."
  },
  answerGrouping: {
    status: "soon",
    name: "Answer Grouping",
    blurb: "Cluster similar responses and apply a single review decision."
  },
  phoneCapture: {
    status: "soon",
    name: "Phone Batch Capture",
    blurb: "Scan booklets using phone camera with automated deskew and blur check."
  },
  qrCoverSheet: {
    status: "soon",
    name: "QR Cover Sheets",
    blurb: "Printable cover sheets with student QR codes for instant identification."
  },
  rubricReapply: {
    status: "soon",
    name: "Rubric Re-Application",
    blurb: "Apply approved rubric updates to already evaluated booklets."
  },
  multipleSets: {
    status: "soon",
    name: "Multiple Sets (A/B/C)",
    blurb: "Automatically generate parallel sets A, B, and C with balanced difficulty."
  },
  wordExport: {
    status: "soon",
    name: "College Word Export",
    blurb: "Export question papers in official college Word formatting."
  },
  regenerateQuestion: {
    status: "soon",
    name: "Regenerate Question",
    blurb: "Replace an individual question while retaining difficulty balance."
  },
  scriptShowingView: {
    status: "soon",
    name: "Script-Showing Day View",
    blurb: "Per-question audit view designed for transparent dispute resolution."
  },
  assistantActions: {
    status: "soon",
    name: "Assistant Write Actions",
    blurb: "Allow assistant to create exams and trigger runs upon teacher confirmation."
  }
} as const;

export type FeatureId = keyof typeof FEATURES;
