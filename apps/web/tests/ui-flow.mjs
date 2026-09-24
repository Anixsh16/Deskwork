// Full teacher walkthrough in real Chrome, with a screenshot at every step.
// Needs the web app (:3000) and backend (:8000) running, and the material in ../../testdata.
//   node tests/ui-flow.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const data = path.join(root, "testdata");
const shots = path.join(root, ".work", "screenshots");
const BASE = "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(shots, { recursive: true });

const log = [];
let n = 0;
const step = (msg) => {
  console.log(`- ${msg}`);
  log.push({ at: new Date().toISOString(), msg });
};

function signinLink() {
  return execFileSync("uv", ["run", "python", "-m", "tools.session", "link"], { cwd: path.join(root, "backend") }).toString().trim();
}

async function shot(page, name, opts = {}) {
  n += 1;
  const file = `${String(n).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(shots, file), fullPage: opts.fullPage ?? false });
  step(`screenshot ${file}`);
}

async function waitText(page, text, timeout = 240_000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
}

async function showLastAnswer(page) {
  await page.locator(".doc").last().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -140);
}

async function sendChat(page, prompt, wordButtons, timeout = 360_000) {
  await page.getByPlaceholder(/./).last().fill(prompt);
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForFunction(
    (count) => [...document.querySelectorAll("button")].filter((b) => b.textContent?.trim() === "Word").length >= count,
    wordButtons,
    { timeout },
  );
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(60_000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

try {
  // Sign-in screen as a new teacher sees it.
  await page.goto(`${BASE}/login`);
  await waitText(page, "Continue with Google");
  await shot(page, "sign-in");

  await page.goto(signinLink());
  await waitText(page, "Start with your first course");
  await shot(page, "dashboard-empty");

  // Create the course and upload every slide file.
  await page.getByRole("button", { name: /Create a course/ }).first().click();
  await page.locator("#c-name").fill("Computer Networks & Internet of Things");
  await page.locator("#c-code").fill("18B11CS311");
  await page.locator("#c-sem").fill("Even 2026");
  await page.locator("#c-inst").fill("Jaypee Institute of Information Technology, Noida");
  await page.locator("#c-desc").fill("B.Tech 6th semester core course");
  await page.locator("#c-co").fill(
    "CO1: Defining the basics of networking, components, and underlying technologies.\nCO2: Illustrate the various key protocols in OSI model and TCP/IP protocol suite and explain various application protocols.\nCO3: Examine various transport protocols and their performance enhancing mechanisms.\nCO4: Determine the shortest path for the network using various routing protocols and evaluate it.\nCO5: Create IP & MAC addressing mechanism and data link layer protocol to solve communication, error detection and correction problems.\nCO6: Identification and description of various components, architecture and protocols of IoT and real-life problems.",
  );
  await shot(page, "create-course");
  await page.getByRole("button", { name: "Create course" }).click();
  await waitText(page, "Add lecture slides");
  const slides = ["CN & IOT_Module 1_Introduction.pdf", "CN & IOT_Module 2_Application Layer (1).pdf", "CN & IOT_Module 3_Transport Layer_T1 (2).pdf", "CN & IOT_Module 3_Transport Layer(Part 2) T2_Content (1).pdf", "CN & IOT_Module 5_DataLink Layer. (1).pptx", "Module 6 (2).pdf", "Module 7 (2).pdf"];
  await page.locator("#upload-slides").setInputFiles(slides.map((f) => path.join(data, "slides", f)));
  await page.waitForFunction(() => document.body.innerText.includes("%"), null, { timeout: 120_000 });
  await shot(page, "slides-indexing");
  await page.waitForFunction(() => (document.body.innerText.match(/Indexed/g) || []).length >= 7, null, { timeout: 900_000, polling: 3000 });
  await shot(page, "slides-indexed");
  await page.getByRole("button", { name: "Open course" }).click();
  await waitText(page, "Generate from your slides");
  await shot(page, "course-overview");
  const courseUrl = page.url();

  // Assignment generator.
  await page.getByRole("link", { name: "Assignments" }).click();
  await waitText(page, "Assignment generator");
  await shot(page, "assignment-empty");
  await sendChat(page, "Create an assignment of 6 questions on TCP flow control and congestion control, mixing numericals and conceptual questions, 5 marks each.", 1);
  await showLastAnswer(page);
  await shot(page, "assignment-generated");

  // Solution generator with the real Assignment 1 PDF attached.
  await page.getByRole("link", { name: "Solutions" }).click();
  await waitText(page, "Solution generator");
  await page.locator("#chat-attach").setInputFiles(path.join(data, "assignment1.pdf"));
  await waitText(page, "assignment1.pdf", 120_000);
  await sendChat(page, "Write complete step-by-step solutions for every question in the attached assignment.", 1, 480_000);
  await showLastAnswer(page);
  await shot(page, "solutions-generated");

  // Question paper generator, then its answer key in the same chat.
  await page.getByRole("link", { name: "Question papers" }).click();
  await waitText(page, "Question paper generator");
  await sendChat(page, "T2 paper, 20 marks, 1 hour, covering the syllabus up to Transport Layer part 2 (TCP flow and congestion control).", 1);
  await showLastAnswer(page);
  await shot(page, "question-paper-generated");
  await sendChat(page, "Now write the complete answer key for this paper, with marks for each step.", 2);
  await showLastAnswer(page);
  await shot(page, "question-paper-answer-key");

  // Ask your slides.
  await page.getByRole("link", { name: "Ask your slides" }).click();
  await waitText(page, "Ask anything about this course");
  await sendChat(page, "Explain Nagle's algorithm with an example.", 1);
  await shot(page, "ask-your-slides");

  // Exam: T2 question paper, answer key, two students.
  await page.goto(courseUrl);
  await page.getByRole("button", { name: "New exam" }).click();
  await page.locator("#e-title").fill("T2 Examination, Even 2026");
  await page.getByRole("button", { name: "T2", exact: true }).click();
  await shot(page, "create-exam");
  await page.getByRole("button", { name: "Create exam" }).click();
  await waitText(page, "Upload the question paper");
  await shot(page, "exam-empty");

  await page.locator("#upload-question-paper").setInputFiles(path.join(data, "t2_question_paper.pdf"));
  await waitText(page, "Reading the question paper page by page", 60_000);
  await shot(page, "question-paper-reading");
  await waitText(page, "5 questions");
  await shot(page, "question-paper-ready");

  await page.locator("#upload-answer-key").setInputFiles(path.join(data, "t2_answer_key.pdf"));
  await waitText(page, "Reading the answer key page by page", 60_000);
  await waitText(page, "13 answers");
  await page.getByRole("button", { name: /^Q2 / }).click();
  await shot(page, "answer-key-ready");

  await page.locator("#upload-student-papers").setInputFiles([path.join(data, "t2_student_ananya.pdf"), path.join(data, "t2_student_parth.pdf")]);
  await waitText(page, "Ananya Gupta", 180_000);
  await waitText(page, "Parth Gupta", 180_000);
  await page.getByRole("heading", { name: "Student papers" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await shot(page, "student-papers-uploaded");

  await page.getByRole("button", { name: "Check", exact: true }).first().click();
  await page.getByRole("button", { name: /Check all/ }).click();
  await waitText(page, "Checking...", 30_000);
  await shot(page, "papers-checking");
  await page.waitForFunction(() => !document.body.innerText.includes("Checking..."), null, { timeout: 900_000, polling: 3000 });
  await page.getByRole("heading", { name: "Student papers" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await shot(page, "papers-checked");
  const examUrl = page.url();

  // Detailed analysis of Parth's paper, and a teacher override.
  await page.getByRole("row", { name: /Parth Gupta/ }).getByRole("link", { name: "View" }).click();
  await waitText(page, "Answer sheet");
  await page.waitForTimeout(1500);
  await shot(page, "paper-analysis");
  await page.getByText("Q4(b)", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByText("Q4(b)", { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, "question-reasoning");
  const q1b = page.getByLabel("Marks for Q1(b)");
  await q1b.fill("1");
  await waitText(page, "unsaved change");
  await shot(page, "teacher-override");
  await page.getByRole("button", { name: "Save marks" }).click();
  await waitText(page, "Marks saved");
  await page.getByText("Changes you made").scrollIntoViewIfNeeded();
  await shot(page, "override-saved");

  // Export marks to Excel.
  await page.goto(examUrl);
  await waitText(page, "Export marks");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export marks" }).click()]);
  await download.saveAs(path.join(root, ".work", "exported-marks.xlsx"));
  step(`exported ${download.suggestedFilename()}`);

  // Assignment 1 checked against the solutions generated above.
  await page.goto(courseUrl);
  await page.getByRole("button", { name: "New exam" }).click();
  await page.locator("#e-title").fill("Evaluative Assignment 1");
  await page.getByRole("button", { name: "Assignment", exact: true }).click();
  await page.getByRole("button", { name: "Create exam" }).click();
  await waitText(page, "Upload the question paper");
  await page.locator("#upload-question-paper").setInputFiles(path.join(data, "assignment1.pdf"));
  await waitText(page, "8 questions");
  await page.getByRole("button", { name: "Use solutions generated in Deskwork" }).click();
  await waitText(page, "Use generated solutions as the key");
  await shot(page, "use-generated-solutions");
  const solutionRow = page.locator("div.rounded-2xl", { hasText: "Solutions ·" }).first();
  await solutionRow.getByRole("button", { name: "Use this" }).click();
  await waitText(page, "answers", 300_000);
  await page.waitForFunction(() => !document.body.innerText.includes("Reading the answer key"), null, { timeout: 300_000 });
  await shot(page, "assignment-exam-ready");
  await page.locator("#upload-student-papers").setInputFiles(path.join(data, "assignment1_student_answers.pdf"));
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Check"), null, { timeout: 180_000 });
  await page.getByRole("button", { name: "Check", exact: true }).first().click();
  await waitText(page, "Checking...", 30_000);
  await page.waitForFunction(() => !document.body.innerText.includes("Checking..."), null, { timeout: 900_000, polling: 3000 });
  await page.getByRole("heading", { name: "Student papers" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await shot(page, "assignment-checked");
  await page.getByRole("link", { name: "View" }).first().click();
  await waitText(page, "Answer sheet");
  await page.waitForTimeout(1500);
  await shot(page, "assignment-analysis");

  // Phone layout.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`);
  await waitText(page, "What would you like to get off your desk today?");
  await shot(page, "phone-dashboard");

  step(errors.length ? `browser errors: ${errors.slice(0, 5).join(" | ")}` : "no browser errors");
  console.log("UI FLOW PASSED");
} catch (e) {
  step(`FAILED: ${e.message.split("\n")[0]}`);
  await page.screenshot({ path: path.join(shots, "zz-failure.png"), fullPage: true }).catch(() => {});
  console.log("UI FLOW FAILED");
  process.exitCode = 1;
} finally {
  writeFileSync(path.join(root, ".work", "ui-flow-log.json"), JSON.stringify({ log, errors }, null, 2));
  await browser.close();
}
