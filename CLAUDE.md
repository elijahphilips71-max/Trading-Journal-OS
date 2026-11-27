# CLAUDE.md — OS Journal


## What this is
OS Journal is a trading journal for one beginner swing trader (Elijah, UK). It tracks paper trades toward his dad's 4 targets before a real account opens. The full spec is in `docs/SPEC.md`, the build order is in `docs/BUILD_PLAN.md`, and the design files are in `docs/design/`. The live mockup is at https://claude.ai/artifact/F2gTq6qd9NPRQqjGu1pyY8.

## Rules for working in this repo
- **Separate from elijah--os.** Never modify that repo. You may read it, if you have access, to match the stack and feel.
- **One PR per milestone** in BUILD_PLAN.md. Keep PRs small and reviewable. Each PR needs a short plain-English summary of what Elijah can now do.
- **Plain English UI.** Elijah is new to trading. Use short UK English sentences and explain jargon the first time it appears on a screen. Money is in £ for the account and in $ for share prices.
- **Mobile-first.** Check every screen at 390px wide and at 1440px. Touch targets must be at least 44px.
- **Logging speed matters most.** Don't add required fields to the log form without asking.
- **Use the design tokens** from SPEC §2. Use JetBrains Mono with tabular figures for every number. Show +/− signs, never colour alone.
- **Maths and target logic** (SPEC §4–5) live in a pure module with unit tests. No UI code goes in that module.
- **Secrets:** keep API keys server-side only, and list them in `.env.example`. Never commit `.env`.
- **AI coach:** it coaches process and never gives buy or sell advice. Validate structured JSON output and handle failures gracefully, because the app must still work if AI is down.
- **Time zones:** store times in UTC and display them in Europe/London. Convert US market times with real time zones, because DST dates differ between the US and UK.
- **Privacy:** the dad share page exposes only the whitelisted summary fields.
- Ask before adding paid services.
