# Phase 1 landing and save flow: accessibility design plan

**Date:** 2026-11-13
**Target:** WCAG 2.2 AA design and testing target
**Users:** Procurement officers, contracting specialists, DITAP participants, keyboard-only users, screen-reader users, low-vision and zoom users, people using forced-colors mode, and people on locked-down government devices.
**Risk:** Medium — a long form flow, file import/export, dynamic status, and a new secondary page.

This plan records the accessibility decisions for the Phase 1 interface. It is a design plan, not a conformance claim. Implementation was checked with automated and keyboard tests; manual AT testing has not occurred.

## Semantic structure

- One `<h1>` per page: **Research a government purchase** on the workspace and **About this tool and developer options** on the About page.
- The header is a `<header>` with a labelled `<nav>`; the primary page nav uses “Research stages”, the About page uses “About navigation”.
- A skip link is the first focusable element and targets `<main id="main" tabindex="-1">`.
- The landing actions are native `<button>` elements. **Continue existing research** is a native file input inside its visible `<label>`, preserving a keyboard-reachable control and a visible focus ring.
- The start form uses native `<label for>`, `<textarea>`, `<input>`, and `<select>`. Related optional fields are grouped in a `<details>` disclosure.
- Source cards use `<article>`, a descriptive source heading link, and a native button. The direct source link and the “use this source” action have different purposes and names.
- Tables retain `<caption>`, `<th scope="col">`, and static empty-state data cells.

## Interaction and focus

| Control | Behaviour | Focus |
| --- | --- | --- |
| Start new research | Resets a blank record, confirms only when work exists | Moves to `#need` after reset |
| Continue existing research | Native file chooser; imports after validation and confirmation | Returns to the scope heading after import |
| Try fictional example | Loads the static demo after confirmation when work exists | Moves to the scope heading |
| Save research file | Validates, downloads JSON, announces the filename | Focus stays on the button; status announces |
| Use this source | Requires a research question; fills the search form as not searched | Moves to `#search-source-name` |
| Details/summary | Native disclosure | Native keyboard behaviour; no custom ARIA |

No modal dialog, focus trap, or composite widget is introduced. The file input remains reachable even though its label provides the visible button surface.

## State communication

- `#status` is `role="status"` with `aria-live="polite"`; it announces saves, imports, source prefill, and errors.
- URL errors use `aria-invalid="true"` and `aria-describedby` to a specific error paragraph; the error is also announced through the status text.
- Search status is an explicit select with labels, including **not searched**. A source prefill sets that value and announces that it is not a completed search.
- The save panel explains that the file is downloaded, not uploaded. The privacy note is visible text, not a tooltip.
- No state relies on colour alone. The selected search status, focus ring, error border, and text messages all have text/programmatic equivalents.

## Visual and responsive design

- Existing light palette and focus tokens were retained; focus indicators remain at least 2 px and use the established high-contrast focus colour.
- The landing, action row, save panel, and form fields wrap at 320 CSS px. The full suite checks page overflow at 320 px.
- `prefers-contrast: more` and `forced-colors: active` rules continue to apply.
- No new animation is introduced; reduced-motion behaviour is unchanged.
- Touch targets use the existing button/label padding; the file label is a full control surface.

## Content design

- The first question is the problem, not the schema or the technology.
- The page says **No account, installation, API key, or AI subscription is required.**
- “Unknown is a valid answer” reduces false certainty.
- The save panel explains the human-readable filename and resume path in plain language.
- Technical MCP/local-LLM/AI material is separated onto About, where it does not block the first task.
- The About page explicitly says the page does not display live MCP data and does not run AI.

## Testing plan and status

Automated and behavioural tests implemented:

- axe scan on the default workspace and the About page;
- heading/label name checks for the landing and start form;
- keyboard focus after Start new research;
- file input focus visible through its label, and tab reachability;
- 320 px reflow;
- forced-colors focus;
- status announcements;
- save/download filename and round-trip JSON content;
- source prefill does not add a search;
- existing keyboard, focus, table, and privacy tests.

Manual tests still required:

- NVDA with Firefox and Chrome;
- JAWS with Chrome;
- VoiceOver with Safari;
- 200% and 400% browser zoom, text-spacing override, and Windows High Contrast;
- speech input and screen magnification checks;
- a procurement-officer usability session using [the usability test plan](../USABILITY-TEST-PLAN.md).

Do not describe the interface as WCAG-conformant or validated until those manual and user tests are recorded.
