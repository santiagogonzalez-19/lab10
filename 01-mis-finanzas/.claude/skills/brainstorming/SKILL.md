---
name: brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements, and design through collaborative dialogue. Ends with a user-approved design and hands off to the `specify` skill, which writes the spec; writing the spec and implementation are out of scope here."
---

# Brainstorming Ideas Into Designs

Turn ideas into fully formed designs through natural, collaborative dialogue. Understand the project context, ask questions one at a time to refine the idea, then present the design and get approval. This skill covers the brainstorming conversation only — it ends at an agreed design.

<HARD-GATE>
Do NOT write any code, scaffold anything, write a spec doc, or take any implementation action inside this skill — regardless of how simple the project seems.
</HARD-GATE>

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this — a todo list, a one-function utility, a config change. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences), but you MUST present it and get approval.

## Workflow

1. **Explore project context** — check files, docs, recent commits. Assess scope first: if the request spans multiple independent subsystems, flag it and help decompose into sub-projects before refining details. Each sub-project gets its own brainstorming pass.
2. **Ask clarifying questions** — one question per message, multiple-choice when possible. Focus on purpose, constraints, and success criteria. If a topic needs more exploration, break it into several questions.
3. **Propose 2-3 approaches** — with trade-offs. Lead with your recommendation and explain why.
4. **Present the design** — section by section, scaled to complexity (a few sentences if straightforward, up to ~300 words if nuanced). Cover architecture, components, data flow, error handling, and testing. Ask after each section whether it looks right; go back and clarify when something doesn't make sense.
5. **Stop and hand off** — once the user approves the design, this skill is done. Do not start writing the spec here; hand off to the `specify` skill, which owns that step (see below).

## Handoff: from an approved design to a written spec

The approved design lives only in the conversation, and that is deliberate — brainstorming optimizes for changing your mind cheaply, which is why it writes nothing. But a design that stays in the chat is lost the moment the session ends, so the last thing this skill does is pass it to the `specify` skill, which turns it into `requirements.md` (EARS, numbered criteria), then `design.md`, and finally `tasks.md` — the implementation plan that doubles as the log of what got decided while building it.

Close the brainstorming like this:

1. Summarize the agreed design in a few lines — this is the input `specify` will work from.
2. Name the next step explicitly: the spec goes to `docs/specs/<YYYY-MM-DD>-<slug>/`, starting with `requirements.md`, with an approval gate before the design document.
3. Ask for the go-ahead, then invoke the `specify` skill.

Ask rather than invoking silently: the user may want to sit with the design, split it into more than one spec, or start with a different piece. A single short question costs nothing and keeps the decision theirs. If they say go, invoke `specify` — don't paraphrase its process by hand, since it carries its own templates, notation rules, and gates.

If the design turned out to span several features, hand off **one** at a time and say which one you are specifying, so the rest stays visible as future work instead of quietly disappearing.

## Design for Isolation and Clarity

- Break the system into small units, each with one clear purpose and a well-defined interface, understandable and testable on its own.
- For each unit, you should be able to say: what it does, how to use it, what it depends on. If you can't understand a unit without reading its internals — or can't change its internals without breaking consumers — the boundaries need work.
- A file growing large is usually a signal it's doing too much.

## Working in Existing Codebases

- Explore the current structure first and follow existing patterns.
- Where existing code problems affect the work (a too-large file, unclear boundaries, tangled responsibilities), fold targeted improvements into the design — as a good developer improves code they're working in.
- Don't propose unrelated refactoring. Stay focused on the current goal.

## Guardrails

- **YAGNI ruthlessly** — cut features the goal doesn't require.
- **Validate incrementally** — get approval on each section before moving on.
- **Design only** — this skill ends at an approved design; the spec and implementation happen elsewhere. "Elsewhere" has a name: the `specify` skill writes the spec. Ending without pointing there leaves the user holding a design with nowhere to put it.
