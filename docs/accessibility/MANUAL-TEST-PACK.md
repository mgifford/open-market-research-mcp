# Manual accessibility test pack

Use this pack for a person-driven audit of the static app. Record results in a
copy of [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md). This is not a conformance
checklist that can be completed by scanning alone.

## Before testing

- Record the deployed commit or Pages URL and the date.
- Use the fictional demo and synthetic URLs only.
- Read the test session script aloud or provide it in advance.
- Confirm the participant/tester can use their preferred input method.
- Have a second person available for a finding that needs independent
  reproduction.

## Environment matrix

Cover at least one route from each group; add combinations when a finding is
environment-specific.

| Group | Minimum |
| --- | --- |
| Screen reader | NVDA + Firefox or Chrome on Windows |
| Screen reader | VoiceOver + Safari on macOS or iOS |
| Screen reader (optional) | JAWS + Chrome |
| Keyboard only | Chromium and Firefox |
| Magnification/reflow | 200% and 400% zoom; 320 CSS px viewport |
| Visual preferences | Light, dark OS preference, forced colors / high contrast |
| Motion | Reduced motion |
| Text spacing | WCAG 1.4.12 overrides |
| Pointer/touch | Narrow viewport and touch target check |

Record exact product, browser, OS, and version. “Latest” is not a version.

## Tasks

Perform each task without a mouse. For screen-reader tasks, capture the
relevant spoken phrase, not a full transcript.

1. **Landmarks and headings.** Load the page. Use landmark navigation and
   heading navigation. Confirm one `main`, a labelled navigation, a useful
   heading outline, and a working skip link.
2. **Scope entry.** Enter a title, ICT type, need, users, and constraints.
   Save. Confirm the status message is announced once and remains visible.
3. **Source browsing.** Search and filter the source directory. Confirm the
   result count is announced after a pause, cards remain navigable, and “no
   matches” is understandable.
4. **Demo and replacement.** Load the fictional exercise. Confirm a prompt
   appears when work is present, the prompt is keyboard-operable, and focus
   returns logically.
5. **Add and error recovery.** Add an option with an HTTPS source. Then enter
   an HTTP URL and submit. Confirm the error is associated with the URL field,
   focus moves there, the value is preserved, and correcting it clears the
   error.
6. **Table and removal.** Add two options. Navigate the table and its labelled
   scroll region. Remove one option with the keyboard. Confirm focus moves to
   a logical remaining target and the removal is announced.
7. **Import.** Import the valid demo JSON. Confirm success, no runtime error,
   and that the file input can be used again. Import invalid JSON and confirm
   an understandable error without losing existing work.
8. **Export.** Export JSON and Markdown. Confirm downloads are named clearly,
   the content is labelled draft/fictional/unapproved, and the preview is
   readable.
9. **Reflow and zoom.** At 320 CSS px and 400% zoom, confirm the page does not
   scroll horizontally; the options table may scroll inside its labelled,
   keyboard-operable region. Confirm no content is clipped.
10. **Forced colors and contrast.** Enable a native high-contrast theme.
    Confirm focus, links, buttons, input boundaries, error text, and status
    messages remain distinguishable without relying on color alone.
11. **Text spacing and reduced motion.** Apply the WCAG text-spacing
    overrides; confirm no overlap or clipping. Enable reduced motion; confirm
    smooth scrolling is disabled.

## Evidence rules

For each task record:

- `before` — where focus/reading position started;
- `action` — the exact keys or AT command;
- `expected` — what should happen;
- `observed` — what actually happened;
- `disposition` — PASS, FAIL, BLOCKED, or UNTESTED;
- `evidence` — short speech phrase, keyboard trace, screenshot path, or
  measured contrast value.

Do not mark a task PASS from a screenshot when the task is about keyboard
behavior or an announcement. A blocked or inconclusive attempt stays visible
in the results; it is not a pass.

## Finding severity

| Level | Meaning |
| --- | --- |
| Critical | Blocks the core research task for a disability group |
| Serious | Significant impairment; workaround is unreasonable |
| Moderate | Friction with a workable alternative |
| Minor | Best-practice gap with marginal impact |

Severity is about the user and task, not the scanner’s label.

## Session access

- Offer the test script in advance and in the participant’s preferred format.
- Allow breaks, asynchronous feedback, and a companion of choice.
- Do not require disclosure of a disability or diagnosis.
- Compensate participation time where policy allows.
- Obtain consent before recording; store notes in an approved system.
- Do not paste participant data or real procurement records into the app.
