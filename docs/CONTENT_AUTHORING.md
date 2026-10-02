# Content Authoring

## Where content lives

| Type | Path |
|------|------|
| Scenarios | `src/content/scenarios/index.ts` |
| KB articles | `src/content/kb/articles.ts` |
| Curriculum | `src/content/curriculum/index.ts` |
| Schemas | `src/content/schema/index.ts` |

Author scenarios as `ScenarioInput` (optional defaulted fields). Runtime validates with `scenarioSchema`.

## Scenario checklist

- [ ] Slug id: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- [ ] Ticket with plain-language symptom
- [ ] `initialWorld` with only fields the engine/actions need
- [ ] `environment.components` listing preferred domain panels
- [ ] Actions gated with `appliesWhen` where order matters
- [ ] Optional `evaluation: { grade, rationale }` on important actions
- [ ] Optional `matchHints` for freeform conversation matching
- [ ] Optional `conversation` script (persona, opening, replies, mentorPrompts)
- [ ] At least one non-destructive wrong path with coaching feedback
- [ ] 3 hints escalating (evidence → method → fix) with `category`
- [ ] Debrief: rootCause, whyItWorked, methodologyMap, followUps
- [ ] `knowledgeLinks` to real KB ids
- [ ] External docs only as `references` (links, not copied text)

## Condition examples

```json
{ "type": "stateEquals", "path": "network.faults.dnsServerDown", "value": false }
{ "type": "commandRan", "commandId": "ping-ok" }
{ "type": "all", "conditions": [ ... ] }
```

## Conversation script example

```ts
conversation: {
  persona: "Alex Rivera",
  opening: "Symptom in the customer's words…",
  followUpQuestions: ["When did it start?"],
  replies: [
    { match: ["storm", "power"], response: "…", revealsConcepts: ["…"] },
  ],
  defaultReply: "…",
  mentorPrompts: ["Evidence before change."],
}
```

## Terminal commands

Only implement new commands in `src/engine/terminal.ts` behind `isEnabled([...])`.
Return `commandId` for `commandRan` conditions.

## Validation

```bash
npm test   # includes validateContent golden tests
```

Open Settings → Content integrity for a live report.
