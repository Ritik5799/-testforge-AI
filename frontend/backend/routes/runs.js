import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getAllRuns, getRun, saveRun, updateRun } from "../services/runStore.js";
import { executeTestRun } from "../services/testRunner.js";

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
// Body: { scenario: "healable" | "app-failure" | "ambiguous" }
router.post("/", async (req, res, next) => {
  try {
    const scenario = req.body?.scenario || "healable";
    const allowed = ["healable", "app-failure", "ambiguous"];
    if (!allowed.includes(scenario)) {
      return res.status(400).json({ error: `scenario must be one of: ${allowed.join(", ")}` });
    }

    const now = new Date().toISOString();
    const run = {
      id: randomUUID(),
      testName: scenario === "app-failure" ? "Checkout — genuine app failure"
        : scenario === "ambiguous" ? "Checkout — ambiguous replacement"
        : "Checkout Workflow",
      scenario,
      status: "running",
      createdAt: now,
      updatedAt: now,
      failureReason: null,
      oldSelector: "#checkout-button",
      newSelector: null,
      confidence: null,
      verified: false,
      summary: "Test run queued.",
      logs: [{ at: now, level: "info", message: "Test run created." }]
    };
    await saveRun(run);

    // Start the Playwright job in the background; poll GET /api/runs/:id for updates.
    executeTestRun(run.id, scenario).catch(async (error) => {
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