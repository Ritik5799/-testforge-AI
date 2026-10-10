# TestForge_AI 🧪
### Intent-aware, self-healing end-to-end tests

TestForge_AI is a hackathon prototype designed to help automated browser tests survive interface changes. Instead of relying only on fixed selectors, a test records **what it is trying to accomplish**, inspects the current UI when an action fails, searches for a suitable replacement, and verifies that the original goal was achieved.


## 🚩 Problem

Traditional end-to-end tests can break after harmless UI changes—for example, when a button is renamed, moved, or given a new HTML selector. Teams then spend time repairing test scripts even when the user workflow still works.

However, not every failed test is caused by a UI change. The application itself may be broken, or the intended action may be ambiguous. A useful self-healing system must distinguish these cases and avoid reporting success without evidence.

## 💡 Proposed solution

TestForge_AI aims to:

1. Store each test's **intent** and expected outcome, not just its selectors.
2. Use browser automation to inspect the current page and its available elements.
3. Detect when an original locator fails.
4. Find and score candidate replacement elements using signals such as intent, role, text, attributes, and page context.
5. Apply a replacement only when confidence is sufficient; otherwise request review or report an unresolved failure.
6. Execute the updated action and verify the expected outcome.
7. Record the failure, healing decision, replacement action, and verification result for review.

## ✨ Planned / target features

- **Intent-based tests:** Describe a workflow in plain language.
- **Self-healing locators:** Search for replacement elements after a locator fails.
- **Explainable decisions:** Show why a candidate was selected.
- **Confidence-based handling:** Avoid guessing when multiple elements are plausible.
- **Outcome verification:** A click alone does not count as a successful test.
- **Failure classification:** Distinguish recoverable UI changes from likely application failures.
- **Healing history:** Keep a record of original and repaired actions.
- **Dashboard:** Display test status, diagnostic logs, and final results.

> Features marked as targets should be considered implemented only after they are available and tested in the repository.

## 🧪 Demo scenario

The initial demonstration uses a controlled checkout page.

**Version A — original UI**
```html
<button id="checkout-button">Checkout</button>
```

The original test clicks `#checkout-button` and verifies that the checkout page opens.

**Version B — changed UI**
```html
<button id="continue-payment">Continue to Payment</button>
```

The original selector no longer works. TestForge_AI should inspect the updated page, identify the likely replacement from the test's intent, perform the action when confidence is sufficient, and verify that the expected checkout page appears.

A second scenario should introduce a genuine application error. The system should report the failure rather than blindly changing selectors or claiming the test passed.

## 🏗️ Proposed architecture

```text
React Dashboard
      |
      v
Node.js + Express API
      |
      v
Test Orchestrator
      |
      +---- Intent / Test Plan
      |
      +---- Playwright Browser Runner
      |          |
      |          v
      |      Application UI
      |
      +---- Healing Engine
      |          |
      |          +---- UI inspection
      |          +---- Candidate scoring
      |          +---- Confidence threshold
      |
      +---- Outcome Verification
      |
      v
Results, Logs & Healing History
```

### Suggested technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Dashboard and test results |
| Backend | Node.js, Express | API and orchestration |
| Browser automation | Playwright | Inspect and interact with the browser |
| Healing logic | JavaScript / TypeScript rules and scoring | Rank candidates and decide whether to heal |
| AI integration | Optional LLM API | Interpret natural-language intent and explain ambiguous cases |
| Storage | JSON or in-memory storage initially; database if needed | Save test plans and run history |

The stack may change as implementation progresses. A deterministic healing path should remain available even if an AI service is unavailable.

## 🚀 Getting started

This repository is intended to contain the implementation. Update these instructions to match the files and scripts actually committed.

### Prerequisites

- Node.js (use a current LTS release)
- npm
- Git
- A modern desktop browser supported by Playwright

### Installation

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
npm install
npx playwright install
```

If the frontend and backend live in separate directories, install dependencies in each directory and follow their respective `package.json` scripts.

### Run

Once the project's scripts are implemented, use the commands defined in `package.json`. For example, a project may provide:

```bash
npm run dev
```

**Note:** The command above is an example, not a guarantee that this script already exists. Check `package.json` and replace this section with the verified commands before publishing.

## 📊 Example test intent

```json
{
  "testName": "Checkout Workflow",
  "goal": "Proceed from the shopping cart to checkout",
  "steps": [
    {
      "action": "click",
      "intent": "Open the checkout process",
      "elementType": "button",
      "expectedOutcome": "Payment details are visible"
    }
  ]
}
```

## 🛡️ Safety and reliability principles

- Never report a test as passed just because an action was clicked.
- Verify the expected state or outcome after every healed action.
- Use confidence thresholds and stop for human review when candidates are ambiguous.
- Run demos against a local or sandbox application, not real payment flows.
- Do not perform destructive or consequential actions without explicit authorization.
- Keep original test definitions and repaired versions separate for traceability.
- Treat AI suggestions as candidates; browser evidence determines whether the test passed.

## 👥 Team

Add your team members and roles here:

- **Project lead:** Ritik Kumar
- **Frontend:** Prince
- **Backend / Playwright:** Sanyam Singh
- **Healing engine / AI:** Siddhant Pachauri

## 🤝 Contributing

1. Create a feature branch.
2. Make a focused change.
3. Run the relevant tests.
4. Open a pull request describing the change and test evidence.


## 🙌 Acknowledgements

Built as a hackathon project exploring intent-aware software testing and self-healing browser automation.

- [Playwright documentation](https://playwright.dev/docs/intro)
- [React documentation](https://react.dev/learn)
- [Node.js documentation](https://nodejs.org/docs/latest/api/)
- [Express documentation](https://expressjs.com/)
