# Optional AI and source integrity policy

## Default: no AI required

AI is not necessary to perform the starter's core tasks. The browser never sends user inputs to external services. The local MCP server performs deterministic operations without a model, including public metadata normalization and OpenACR YAML import.

## Phase 2: generated prompts, no hosted AI

The zero-install workspace still does not call an AI service. The **Use an approved AI assistant** section generates a prompt from the current record, previews it, and offers one-click copy. The user pastes it into an agency-approved tool. No model, API key, connector, or hosted AI endpoint is required.

Prompts require the AI to use only the provided record, avoid invented sources and citations, distinguish proposed searches from completed searches, flag uncertainty, avoid supplier ranking and Section 508/exception determinations, and leave decisions to authorized personnel.

If AI materially contributes, the user can record the approved tool, actions, and what a person verified. That disclosure appears in the report only when the AI-use checkbox is set. AI output remains assistance, not evidence.

## Experiment included

`.github/workflows/hf-demo.yml` is a manually triggered GitHub Action that sends only the explicitly fictional, public DITAP fixture to Hugging Face Inference Providers. It requires a repository secret `HF_TOKEN` and the selected model ID. The output is marked unverified and delivered as an Action artifact. It is never deployed to the website.

The workflow uses Hugging Face's OpenAI-compatible chat completions REST endpoint, `https://router.huggingface.co/v1/chat/completions`. Provider availability, model licenses, pricing, and retention terms must be checked before use.

## Before processing real procurement data

- Obtain agency authorization for the provider, purpose, and data classification.
- Never include protected acquisition, personally identifiable, vendor-proprietary, CUI, or private government repository data without explicit authorization and controls.
- Confirm data retention, subprocessors, geographic processing, and training settings.
- Require documented human review of all extracted claims and synthesis.
- Keep deterministic provenance and evidence retrieval separate from narrative generation.
- Record model, provider, prompt version, and source references; mark generated text as AI-assisted.
- Enforce budgets, request sizes, safe URL retrieval, failure modes, and retries.
- Do not generate false source links, compliance claims, vendor rankings, or exception approvals.

## Future browser option

A hosted AI feature would require an authenticated backend or approved local model, not a Hugging Face token embedded in GitHub Pages JavaScript. Add it only after testing demonstrates a clear need.
