# Orchestration Plan: Aguamarina Joyería Marketing & SEO Automation

## Step 1: Initial Survey & Requirement Extraction
- Dispatch 3 parallel subagents (Explorers / Spec Miners) to mine requirements from ORIGINAL_REQUEST.md and establish feature requirements, interface schemas, dependencies, and test strategies.
- Aggregate findings into `PROJECT.md` § Feature Inventory and Architecture.

## Step 2: Milestone Decomposition & Architecture Design
- Decompose the project into 4 core implementation milestones + 1 testing track:
  - Track 1: E2E Testing Track (Test runner, test cases Tier 1-4, `TEST_READY.md`)
  - Milestone 1 (M1): Local SEO HTML Optimizer
  - Milestone 2 (M2): Google Ads & YouTube Ads Campaign Creator
  - Milestone 3 (M3): YouTube Auto-Upload Web Dashboard & AI Metadata Generator
  - Milestone 4 (M4): Centralized Credentials (.env / .env.example) & Documentation Guide
  - Final Milestone (M5): E2E Test Suite Pass (Tiers 1-4) & Adversarial Hardening (Tier 5)

## Step 3: Dispatch & Iterative Execution
- Dispatch specialized subagents for each milestone (Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate Check).
- Maintain zero-tolerance integrity checks with `teamwork_preview_auditor`.

## Step 4: Verification & Final Handoff
- Verify 100% test pass rate across unit/integration/E2E test suites.
- Complete claim report and notify Sentinel via message.
