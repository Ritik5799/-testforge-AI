import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getAllRuns, getRun, saveRun, updateRun } from "../services/runStore.js";
import { executeTestRun } from "../services/testRunner.js";
import { executeWebsiteTestRun } from "../services/websiteTestRunner.js";
import { assertPublicHttpUrl } from "../services/urlSafety.js";

const router = Router();

// GET /api/runs
router.get("/", async (_req, res, next) => {
  try {
    const runs = await getAllRuns();
    res.json({ runs });
  } catch (error) { next(error); }
});

// GET /api/runs/:id
router.get("/:id", async (req, res, next) => {
  try {
    const run = await getRun(req.params.id);
    if (!run) return res.status(404).json({ error: "Test run not found" });
    res.json(run);
  } catch (error) { next(error); }
});

// POST /api/runs
// Body: { scenario } for demos, or { websiteUrl, goal, openApiSpecUrl?, openApiSpecText? }
router.post("/", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const websiteRun = ["websiteUrl", "goal", "openApiSpecUrl", "openApiSpecText"]
      .some((key) => Object.hasOwn(body, key));
    const scenario = body.scenario || "healable";
    let websiteUrl;
    let goal;
    let openApiSpecUrl;
    let openApiSpecText;
    let openApiSpecName;

    if (websiteRun) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: "Website testing needs OPENAI_API_KEY configured in backend/.env." });
      }
      if (typeof body.websiteUrl !== "string" || !body.websiteUrl.trim()) {
        return res.status(400).json({ error: "Enter the website URL to test." });
      }
      if (typeof body.goal !== "string" || !body.goal.trim()) {
        return res.status(400).json({ error: "Describe the goal you want the test to check." });
      }
      if (body.goal.length > 2000) {
        return res.status(400).json({ error: "The test goal must be 2,000 characters or fewer." });
      }
      if (body.openApiSpecUrl !== undefined && typeof body.openApiSpecUrl !== "string") {
        return res.status(400).json({ error: "The OpenAPI spec URL must be a string." });
      }
      if (body.openApiSpecText !== undefined && typeof body.openApiSpecText !== "string") {
        return res.status(400).json({ error: "The uploaded OpenAPI spec must be text." });
      }
      if (body.openApiSpecUrl && body.openApiSpecText) {
        return res.status(400).json({ error: "Provide an OpenAPI spec URL or upload a spec file, not both." });
      }
      if (body.openApiSpecText !== undefined && (!body.openApiSpecText.trim() || body.openApiSpecText.length > 50000)) {
        return res.status(400).json({ error: "The OpenAPI spec file must not be empty and must be 50,000 characters or fewer." });
      }

      websiteUrl = await assertPublicHttpUrl(body.websiteUrl.trim());
      goal = body.goal.trim();
      openApiSpecUrl = body.openApiSpecUrl ? await assertPublicHttpUrl(body.openApiSpecUrl.trim()) : null;
      openApiSpecText = body.openApiSpecText || null;
      openApiSpecName = typeof body.openApiSpecName === "string" ? body.openApiSpecName.slice(0, 200) : null;
    } else {
      const allowed = ["healable", "app-failure", "ambiguous"];
      if (!allowed.includes(scenario)) {
        return res.status(400).json({ error: `scenario must be one of: ${allowed.join(", ")}` });
      }
    }

    const now = new Date().toISOString();
    const run = {
      id: randomUUID(),
      testName: websiteRun ? `Website test: ${goal.slice(0, 72)}`
        : scenario === "app-failure" ? "Checkout — genuine app failure"
        : scenario === "ambiguous" ? "Checkout — ambiguous replacement"
        : "Checkout Workflow",
      scenario: websiteRun ? "website" : scenario,
      websiteUrl: websiteUrl || null,
      goal: goal || null,
      openApiSpecName: openApiSpecName || (openApiSpecUrl ? "OpenAPI spec URL" : null),
      status: "running",
      createdAt: now,
      updatedAt: now,
      failureReason: null,
      oldSelector: websiteRun ? null : "#checkout-button",
      newSelector: null,
      confidence: null,
      verified: false,
      summary: websiteRun ? "AI website test queued." : "Test run queued.",
      logs: [{ at: now, level: "info", message: "Test run created." }]
    };
    await saveRun(run);

    // Start the Playwright job in the background; poll GET /api/runs/:id for updates.
    const execute = websiteRun
      ? executeWebsiteTestRun(run.id, { websiteUrl, goal, openApiSpecUrl, openApiSpecText, openApiSpecName })
      : executeTestRun(run.id, scenario);
    execute.catch(async (error) => {
      console.error("Runner error:", error);
      await updateRun(run.id, {
        status: "failed",
        verified: false,
        summary: "The test runner encountered an unexpected error.",
        failureReason: error.message,
        logsAppend: [{ at: new Date().toISOString(), level: "error", message: error.message }]
      });
    });

    res.status(202).json({ id: run.id, status: run.status, message: "Test run started." });
  } catch (error) { next(error); }
});

export default router;