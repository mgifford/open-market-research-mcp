# Optional AI and source integrity policy

## Default: no AI required

AI is not necessary to perform the starter's core tasks. The browser never sends user inputs to external services. The local MCP server performs deterministic operations without a model, including public metadata normalization and OpenACR YAML import.

## Phase 1: static guidance only

The zero-install workspace does not call an AI service. Copyable prompt patterns and AI guardrails live on the secondary About page. Generated, context-specific prompts and one-click copying are deferred to Phase 2. No model, API key, or hosted AI endpoint is required for the core workflow.

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
