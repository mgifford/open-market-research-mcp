# Procurement-officer usability test plan

**Status:** Plan prepared; no participants have been recruited and no sessions have been run. Do not claim the interface is validated.

## Purpose

Test whether a procurement officer with no development experience can use the zero-install research workflow on a restricted government device, with or without assistive technology, without installing Python, Node.js, MCP servers, browser extensions, or a local model.

## Participants

Recruit at least 6–8 participants across:

- contracting officers, contracting specialists, and program staff;
- DITAP participants or recent graduates;
- at least two people who use a screen reader or screen magnification;
- at least one person who works primarily on a locked-down government device;
- at least one person with limited recent market-research experience.

Do not use real acquisition records. Use the fictional DITAP fixture or a participant-created fictional need.

## Session setup

- Use a browser and device representative of the participant's normal environment.
- Do not install anything for the participant.
- Offer the published URL or a local static preview, whichever matches the test question.
- Obtain consent for notes, recording, and any accessibility accommodation.
- Explain that the tool is a prototype and that the session tests the interface, not the participant.
- Have a facilitator, observer, and note-taker where possible.

## Tasks

Record completion, assistance required, errors, and participant comments. Do not invent a completion percentage or confidence score.

1. **Begin a project without assistance.** Starting from the landing page, start a new research project and enter a problem, product/service type, and agency context.
2. **Identify relevant sources.** Find a source for government software reuse and a source for accessibility evidence. Explain why each is relevant.
3. **Record a completed search.** Use a source, record the search terms, date, and result. Distinguish this from merely opening the source.
4. **Distinguish a source claim from verified evidence.** Open the fictional case, find the commercial ACR claim, and explain what is and is not established.
5. **Use a Copilot-style prompt without installing anything.** Copy a prompt pattern from the About page or use the current AI guidance; describe how it would be used with an approved agency tool.
6. **Find and document accessibility evidence.** Identify the ACR status for one option, record the missing/partial evidence, and formulate a follow-up question.
7. **Resume a saved project.** Save the research file, close the tab, reopen the app, and continue from the saved file.
8. **Export a report for human review.** Export JSON and Markdown; confirm that the report is a draft and does not claim agency approval.

## Accessibility-specific probes

- Complete tasks with keyboard only; confirm focus is always visible.
- Complete at least one task with a screen reader and record the announcements.
- Test at 200% and 400% zoom and at 320 CSS px width.
- Test Windows High Contrast/forced-colors mode.
- Test text-spacing overrides.
- Ask whether the participant had to install or request anything to begin.

## Measures

- Task completion: completed independently, completed with assistance, or not completed.
- Where the participant hesitated or backtracked.
- Errors and whether the participant could recover.
- Whether the participant understood the difference between a source link, a planned search, and a completed search.
- Whether the participant understood that the report is a draft.
- Participant quotes and requested improvements.
- Accessibility barriers, with the task and assistive technology recorded.

## Reporting

For each participant, record:

- role and relevant experience;
- device/browser and assistive technology;
- tasks completed and assistance given;
- observed problems and participant feedback;
- changes made and changes deferred.

Store results separately from this plan. Redact sensitive information. Do not publish recordings or identifiable notes without consent.

## Current status

- Automated browser and axe tests pass on the Phase 1 branch.
- Manual screen-reader, zoom, text-spacing, forced-colors, and cross-browser testing remain outstanding.
- No procurement-officer sessions have been run.
