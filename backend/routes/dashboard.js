import { Router } from "express";
import { getAllRuns } from "../services/runStore.js";

const router = Router();

// GET /api/dashboard
router.get("/", async (_req, res, next) => {
  try {
    const runs = await getAllRuns();
    const total = runs.length;
    const healed = runs.filter((run) => run.status === "healed").length;
    const successful = runs.filter((run) => run.status === "healed" || run.status === "passed").length;
    const failed = runs.filter((run) => run.status === "failed").length;
    const needsReview = runs.filter((run) => run.status === "needs_review").length;
    const completed = successful + failed + needsReview;
    res.json({
      stats: {
        totalTests: total,
        healedTests: healed,
        successfulTests: successful,
        failedTests: failed,
        needsReview,
        healingRate: completed ? Math.round((successful / completed) * 100) : 0
      },
      recentRuns: runs.slice(0, 8)
    });
  } catch (error) { next(error); }
});

export default router;