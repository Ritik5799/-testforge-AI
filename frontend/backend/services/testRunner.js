import { chromium } from "playwright";
import { updateRun } from "./runStore.js";

const baseUrl = () => `http://127.0.0.1:${process.env.PORT || 5000}`;

async function log(id, level, message, extra = {}) {
  return updateRun(id, {
    logsAppend: [{ at: new Date().toISOString(), level, message, ...extra }]
  });
}

/**
 * Playwright demo runner:
 * - healable: old selector is missing; one semantically matching button exists.
 * - app-failure: replacement button exists, but the app shows a simulated server error.
 * - ambiguous: two plausible buttons exist, so the engine asks for review.
 *
 * This is a safe local demo. Replace the demo URL and intent rules with your
 * actual test definitions when connecting your target application.
 */
export async function executeTestRun(id, scenario) {
  let browser;
  try {
    await log(id, "info", `Starting Playwright browser for scenario "${scenario}".`);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);

    const url = `${baseUrl()}/demo/checkout.html?scenario=${encodeURIComponent(scenario)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await log(id, "info", `Opened demo page: ${url}`);

    const original = page.locator("#checkout-button");
    const originalExists = await original.count() > 0;

    if (originalExists) {
      await log(id, "info", "Original selector was found.");
      await original.click();
    } else {
      await log(id, "warn", "Original selector #checkout-button was not found.");
      await updateRun(id, {
        failureReason: "Original selector not found",
        logsAppend: [{
          at: new Date().toISOString(),
          level: "info",
          message: "Inspecting visible buttons and their accessible names for a safe replacement."
        }]
      });

      const candidates = page.getByRole("button", { name: /continue to payment/i });
      const count = await candidates.count();

      if (count === 0) {
        await log(id, "error", "No candidate matched the saved test intent.");
        return updateRun(id, {
          status: "failed",
          verified: false,
          confidence: 0,
          summary: "No safe replacement was found; the test remains failed.",
          newSelector: null
        });
      }
      if (count > 1) {
        await log(id, "warn", `Found ${count} plausible replacement buttons; refusing to guess.`);
        return updateRun(id, {
          status: "needs_review",
          verified: false,
          confidence: 0.5,
          summary: "Multiple plausible replacements found. Human review is required.",
          newSelector: null
        });
      }

      await candidates.click();
      await updateRun(id, {
        newSelector: "getByRole('button', { name: 'Continue to Payment' })",
        confidence: 0.96,
        logsAppend: [{
          at: new Date().toISOString(),
          level: "success",
          message: "One high-confidence replacement was selected and clicked."
        }]
      });
    }

    // A click is not proof of success: verify the expected application outcome.
    const success = page.getByTestId("checkout-success");
    const failure = page.getByTestId("checkout-error");
    const outcome = await Promise.race([
      success.waitFor({ state: "visible", timeout: 2500 }).then(() => "success").catch(() => null),
      failure.waitFor({ state: "visible", timeout: 2500 }).then(() => "failure").catch(() => null)
    ]);

    if (outcome === "success") {
      await log(id, "success", "Verified expected outcome: checkout confirmation is visible.");
      return updateRun(id, {
        status: "healed",
        verified: true,
        confidence: originalExists ? 1 : 0.96,
        summary: originalExists
          ? "Test passed with the original selector."
          : "Selector was healed and the checkout outcome was verified.",
        failureReason: originalExists ? null : "Original selector not found"
      });
    }

    if (outcome === "failure") {
      const message = await failure.innerText();
      await log(id, "error", `Application-level failure detected: ${message}`);
      return updateRun(id, {
        status: "failed",
        verified: false,
        summary: "Replacement action ran, but the application itself failed.",
        failureReason: message,
        confidence: originalExists ? 1 : 0.96
      });
    }

    await log(id, "error", "Neither success nor known application-error outcome appeared.");
    return updateRun(id, {
      status: "failed",
      verified: false,
      summary: "Expected checkout outcome was not observed.",
      failureReason: "Expected outcome not visible after action"
    });
  } finally {
    if (browser) await browser.close();
  }
}