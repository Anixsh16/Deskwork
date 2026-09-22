# Deskwork: project handoff

**Read this first, then read the attached build plan** (`Deskwork-Build-Plan.pdf` or `.html`). The build plan holds the full technical spec: scope, database schema, AI calls and prompts, grading pipeline, assistant design, screens, quota math, evaluation harness, privacy, demo script, synopsis outline. This file holds everything that is **not** in the plan: who I am, how the plan was arrived at, what was deliberately rejected, and how I want you to work with me.

Do not re-explain or re-summarise the build plan back to me. Assume I have read it.

---

## 1. Who I am and what this is

- Final-year B.Tech student at **Jaypee Institute of Information Technology (JIIT), Noida, India**.
- This is my **college major project**, built by a team of 2 to 4 people.
- There are exactly two checkpoints: a **mid evaluation** (we demo a working prototype and submit a synopsis with our future vision) and a **final evaluation** (we demo the finished product). Nothing else about scheduling matters to you.
- I build full-stack AI apps regularly. Comfortable stack: **Next.js, TypeScript, Tailwind, FastAPI, Python, Supabase, Postgres, LangChain/LangGraph, Gemini APIs**. Past projects include RAG platforms, a voice AI interviewer, email automation agents, satellite imagery analysis, and hackathon products. Assume I can read code and do not need basic concepts explained.

## 2. The product in one paragraph

**Deskwork** is an AI workspace for **teachers only** (students never log in; papers and results still travel through Google Classroom or WhatsApp). Three live modules for the prototype: (1) checking scanned **handwritten** answer booklets against an approved rubric, with two models grading independently and the teacher reviewing flagged answers, (2) generating assignments and question papers grounded in the teacher's own uploaded slides, (3) an assistant chatbot on every page. Future features appear in the prototype as greyed-out "Coming soon" placeholders. Full detail is in the attached plan.

## 3. How we got here (decisions and their reasons)

These were argued out already. Do not reopen them unless I ask, and never quietly reverse one.

| Decision | Why |
|---|---|
| Teachers only, no student portal | Teachers already distribute work through Classroom or WhatsApp, and the teacher is the accountable examiner. |
| Grade **all** answer types (theory, numericals, code, diagrams) | My call. Code and diagrams are always flagged for teacher review because research shows they grade badly. |
| Two models grade each booklet (3.5 Flash-Lite and 3.1 Flash-Lite), one call per booklet each | Fits the free-tier quota, and disagreement between them is the main signal for flagging. |
| Grade from the page image, never from a transcript | Vision models silently correct student mistakes while transcribing. |
| Forced-review UX (mark hidden until the scan is seen, reason needed for harsh marks, 10% spot-check before bulk accept) | A 2026 study found teachers accept wrong harsh AI grades more often when they know AI produced them. |
| Pitch is "consistent and evidence-backed, teacher stays the examiner" | "One AI grades everyone so it is fair" does not survive a viva; models are not self-consistent. |
| **CO/PO attainment and NBA reporting: removed entirely** | I do not know JIIT's thresholds, grading here is relative, and existing ERPs already do it. The CO printed on a question paper is stored as reference text only and **must not** be used in any logic, because it often does not match the question. Do not reintroduce this. |
| Half marks allowed (steps of 0.5) | Standard here. |
| Names hidden locally before anything reaches the AI | Free-tier Gemini may train on inputs and have humans review them; student scripts are personal data under India's DPDP Act. |
| No FastAPI REST API | One Next.js app plus one Python worker polling a jobs table. Two backends is too much for a small team. |
| Cut from scope: tools grid, quiz maker, copy detection, student portal | Depth beats breadth at a viva. Several of these reappear later as "Coming soon" placeholders. |
| Name: **Deskwork** | Rejected along the way: Markwise (too marking-focused), Staffroom, Lectern, Nib, Quire, Assay, Redpen, Coursework, Rubric, Markbook. I also rejected all Indian-language names (Kalam, Acharya, Samay). Tagline: "Set the paper, check the papers, clear the desk." |

## 4. Research already done (do not redo unless something changed)

Two research agents reviewed the idea, one on the product and teacher side, one on engineering and the Gemini API. Their findings are baked into the plan, with sources listed in its final section. Key facts worth remembering:

- Google no longer publishes free-tier rate limits in its docs. Third-party sources disagree (15 RPM / 500 RPD, versus older 1,000 to 1,500 RPD). **The real numbers must be read in AI Studio.** Plan for about 250 usable calls per model per day.
- Do not set temperature, top_p or top_k on Gemini 3 models. Use `thinking_level` instead.
- Files API uploads expire after 48 hours, and context caching is not on the free tier. Send extracted slide text rather than files.
- Free hosting limits: Vercel functions cap at 300 s, Render's free tier has no background workers, free Supabase projects pause after a week idle.

## 5. Test data I am providing

One of each, for a single subject: a previous-year question paper, its typed answer key, a **handwritten** answer key example, the subject's PDF slides, a college assignment, and **my own handwritten answers** (full consent, and these are what the viva demo will use). The plan maps each item to a pipeline step.

Still needed, and worth reminding me about: **human marks** for those handwritten answers (a teacher or a teammate marking them against the approved rubric). Without them there is no accuracy number for the viva. The plan also asks the team to hand-write 12 to 20 extra booklets with deliberately planted errors.

## 6. Where the project stands

Planning is finished and approved. **Nothing has been built yet.** No repo, no code.

The agreed first step: a small command-line script that runs one handwritten booklet through the grading prompt, so we can see how well Gemini reads and marks my handwriting before any UI exists. Everything else depends on that result.

## 7. How I want you to work with me

- **No em dashes anywhere.** Not in chat, code, comments or docs. Use commas, colons, parentheses or separate sentences. This is absolute.
- **Never use web or MCP connectors** (Gmail, Drive, Slack, Notion, Canva, Stripe, PostHog and so on). If a task seems to need one, stop and tell me. Local tooling and plain web search are fine.
- **Do not give me timelines, weekly plans or work splits.** I manage scheduling myself. Tell me what to build and in what order of dependency, nothing about time.
- **Be short and to the point.** Bullets and small tables over paragraphs. No filler, no restating my question back to me.
- **Criticise the idea honestly.** If something will not survive a viva or will not work technically, say so plainly and propose the fix. I asked for this explicitly.
- **Research before claiming.** Search the web for anything about API limits, model behaviour or competitors rather than answering from memory.
- **Ask me multiple-choice questions** when a decision is genuinely mine to make, and otherwise pick a sensible default and tell me what you picked.
- When something is finished and worth keeping, produce **an artifact or a single shareable file**, not a wall of chat text.

## 8. Good next requests to expect from me

- Write the first grading spike script and run it on my handwritten sample.
- Set up the repo, the Supabase schema and migrations.
- Build a specific module from the plan (exam setup, rubric editor, review screen, generator, assistant).
- Tune prompts and the evaluation harness once we have real numbers.
- Write the synopsis from the plan's outline.
- Prepare the mid-evaluation demo.

## 9. Open items

- Confirm the real Gemini free-tier limits in AI Studio.
- Get teacher marks for the test booklets.
- Check that the name Deskwork is free (domain and no existing edtech product).
- Which subject the demo uses is decided by whichever material I share.
