import { z } from "zod";

export const categorySchema = z.enum([
  "hardware",
  "windows",
  "linux",
  "networking",
  "security",
  "support",
  "sysadmin",
  "database",
  "cloud",
  "automation",
]);

export const difficultySchema = z.enum([
  "foundational",
  "beginner",
  "intermediate",
  "advanced",
]);

export const scenarioTypeSchema = z.enum([
  "FOUNDATIONAL_DIAGNOSIS",
  "EVIDENCE_DISCRIMINATION",
  "COMPONENT_FAILURE",
  "CONFIGURATION_ERROR",
  "SERVICE_FAILURE",
  "DEPENDENCY_FAILURE",
  "RESOURCE_EXHAUSTION",
  "MULTI_FAULT",
  "INTERMITTENT_FAILURE",
  "COMMUNICATION_SUPPORT",
  "SECURITY_TRIAGE",
  "RECOVERY",
  "CROSS_DOMAIN",
]);

export type ScenarioType = z.infer<typeof scenarioTypeSchema>;

export const modeSchema = z.enum(["guided", "practice", "challenge"]);

export type Mode = z.infer<typeof modeSchema>;

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("stateEquals"),
      path: z.string().min(1),
      value: z.unknown(),
    }),
    z.object({
      type: z.literal("stateIn"),
      path: z.string().min(1),
      values: z.array(z.unknown()),
    }),
    z.object({
      type: z.literal("commandRan"),
      commandId: z.string().min(1),
    }),
    z.object({
      type: z.literal("all"),
      conditions: z.array(conditionSchema),
    }),
    z.object({
      type: z.literal("any"),
      conditions: z.array(conditionSchema),
    }),
    z.object({
      type: z.literal("not"),
      condition: conditionSchema,
    }),
  ]),
);

export type Condition =
  | { type: "stateEquals"; path: string; value: unknown }
  | { type: "stateIn"; path: string; values: unknown[] }
  | { type: "commandRan"; commandId: string }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] }
  | { type: "not"; condition: Condition };

export type WorldPatch = Record<string, unknown>;

export const actionDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["ui", "terminal", "inspect"]),
  description: z.string().optional(),
  tool: z.string().optional(),
  appliesWhen: conditionSchema.optional(),
  patch: z.record(z.string(), z.unknown()).optional(),
  feedback: z.string().optional(),
  revealsConcepts: z.array(z.string()).optional(),
  isFix: z.boolean().optional(),
  isDiagnostic: z.boolean().optional(),
  evaluation: z
    .object({
      grade: z.enum([
        "optimal",
        "good",
        "reasonable",
        "low-value",
        "premature",
        "unnecessary",
        "risky",
        "wrong",
        "harmful",
      ]),
      rationale: z.string().min(1),
      evidenceGain: z.string().optional(),
      learnMore: z.string().optional(),
    })
    .optional(),
  matchHints: z.array(z.string()).default([]),
  component: z.string().optional(),
  inspectTarget: z.string().optional(),
});

export type ActionDef = z.infer<typeof actionDefSchema>;
export const evaluationGradeSchema = z.enum([
  "optimal",
  "good",
  "reasonable",
  "low-value",
  "premature",
  "unnecessary",
  "risky",
  "wrong",
  "harmful",
  "unknown",
]);

export type EvaluationGrade = z.infer<typeof evaluationGradeSchema>;

export const hintSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1),
  category: z.enum(["method", "tool", "concept", "direct"]).default("method"),
});

export type Hint = z.infer<typeof hintSchema>;

/**
 * Guided Troubleshooting (Phase 12): an optional, declarative walkthrough that
 * points the learner at real components while the simulation — never a second
 * state machine — decides when a step is done. Steps are ordered; progress is
 * derived from RunState (see `features/guide/logic.ts`).
 */
/**
 * Interaction cues — what the learner physically does to complete a step.
 * Authored cues are authoritative; `guideStepCue` only infers when absent.
 */
export const GUIDE_CUES = [
  "OBSERVE",
  "INSPECT",
  "CLICK",
  "TOGGLE",
  "CONNECT",
  "TYPE",
  "VERIFY",
] as const;

export const guidedTargetSchema = z.object({
  /** Existing component vocabulary (environment.components / lab object ids). */
  componentId: z.string().min(1),
  /** Accessible description: "Target: PSU power switch". */
  label: z.string().min(1),
  /** Existing camera preset id — only for 3D-capable labs. */
  cameraPreset: z.string().min(1).optional(),
});

export const guidedStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    /** WHAT to inspect or do. */
    explanation: z.string().min(1),
    /** WHY it matters — plain language, jargon explained. */
    why: z.string().min(1),
    /** WHAT to look for — never spoils the root cause. */
    expectedObservation: z.string().min(1),
    target: guidedTargetSchema,
    /** Completion: the learner applied this scenario action. */
    actionId: z.string().min(1).optional(),
    /** Completion: the learner ran this engine command id. */
    commandId: z.string().min(1).optional(),
    /** Completion: this existing condition holds (world flags / evidence). */
    completeWhen: conditionSchema.optional(),
    /**
     * Authored interaction cue — authoritative over inference so the reticle,
     * the instruction and the completion trigger always agree. Legacy steps
     * without a cue keep the derived fallback.
     */
    cue: z.enum(GUIDE_CUES).optional(),
    /** Human-readable "DONE WHEN" line; derived from the trigger when absent. */
    doneWhen: z.string().min(1).optional(),
    /** Optional KB article id for a "Learn this term" chip. */
    conceptId: z.string().min(1).optional(),
    /** Shown when the target element is not present in the current view. */
    fallback: z.string().min(1).optional(),
  })
  .refine(
    (step) => step.actionId !== undefined || step.commandId !== undefined || step.completeWhen !== undefined,
    { message: "guided step needs an actionId, commandId, or completeWhen completion trigger" },
  );

export const guidedWalkthroughSchema = z.object({
  intro: z.string().min(1),
  steps: z.array(guidedStepSchema).min(1),
});

export type GuidedTarget = z.infer<typeof guidedTargetSchema>;
export type GuidedStep = z.infer<typeof guidedStepSchema>;
export type GuidedWalkthrough = z.infer<typeof guidedWalkthroughSchema>;
/**
 * What the environment renders while the guide is open: the step's target
 * plus the step's completion action, so the lab can pin selection and offer
 * the SAME interaction the step completes on.
 */
export type GuideFocus = GuidedTarget & { actionId?: string };

export const referenceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  note: z.string().optional(),
});

export const ticketSchema = z.object({
  id: z.string().min(1),
  user: z.string().min(1),
  role: z.string().min(1),
  symptomPlainLanguage: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  channel: z.enum(["email", "phone", "walkup", "portal"]),
  additionalContext: z.string().optional(),
});

export const conversationEntrySchema = z.object({
  role: z.enum(["customer", "mentor"]),
  text: z.string().min(1),
  at: z.number(),
  evaluation: evaluationGradeSchema.optional(),
  revealedConcepts: z.array(z.string()).optional(),
});

export type ConversationEntry = z.infer<typeof conversationEntrySchema>;

export const customerReplySchema = z.object({
  match: z.array(z.string().min(1)).min(1),
  response: z.string().min(1),
  once: z.boolean().default(false),
  revealsConcepts: z.array(z.string()).default([]),
  when: conditionSchema.optional(),
});

export const conversationScriptSchema = z.object({
  persona: z.string().min(1),
  opening: z.string().min(1),
  followUpQuestions: z.array(z.string()).default([]),
  replies: z.array(customerReplySchema).default([]),
  defaultReply: z.string().min(1),
  mentorPrompts: z.array(z.string()).default([]),
});

export type ConversationScript = z.infer<typeof conversationScriptSchema>;

/**
 * Physical IT equipment families (Phase 11). Each family is a reusable
 * device model: one world-state namespace, one component vocabulary, one
 * chain/causality derivation, and shared 2D/3D projections.
 */
export const deviceFamilySchema = z.enum([
  "printer",
  "router",
  "switch",
  "access-point",
  "ups",
  "patch-panel",
]);

export type DeviceFamilyId = z.infer<typeof deviceFamilySchema>;

export const environmentSchema = z.object({
  kind: z.enum([
    "network+terminal",
    "windows-panel",
    "linux-terminal",
    "hardware-bench",
    "equipment-bench",
    "mixed",
  ]),
  /**
   * Which equipment family renders this scenario's stage. Present only when
   * kind is "equipment-bench"; routing is data-driven (never scenario ids).
   */
  deviceFamily: deviceFamilySchema.optional(),
  shell: z.enum(["windows", "linux", "none"]).default("none"),
  initialWorld: z.record(z.string(), z.unknown()),
  availableTools: z.array(z.string()).default([]),
  enabledCommands: z.array(z.string()).default([]),
  components: z
    .array(
      z.enum([
        "wall",
        "power-supply",
        "motherboard",
        "ram",
        "storage",
        "cpu-cooler",
        "gpu",
        "front-panel",
        "printer",
        "printer-paper",
        "printer-cartridge",
        "printer-network",
        "router",
        "router-wan",
        "router-lan",
        "router-dhcp",
        "router-nat",
        "switch",
        "switch-port",
        "switch-uplink",
        "switch-vlan",
        "access-point",
        "ap-radio",
        "ap-poe",
        "ups",
        "ups-input",
        "ups-output",
        "ups-battery",
        "patch-panel",
        "wall-jack",
        "ethernet-cable",
        "event-viewer",
        "task-manager",
        "services",
        "device-manager",
        "filesystem",
        "process-list",
        "package-manager",
        "service-manager",
        "network-topology",
        "packet-inspector",
        "dns-inspector",
        "evidence-board",
        "email-client",
        "log-viewer",
        "ticket-inbox",
        "customer-chat",
      ]),
    )
    .default([]),
  showInspector: z.boolean().default(true),
  showTerminal: z.boolean().optional(),
  /**
   * Declarative workbench focus for hardware scenarios: which part the bench
   * opens on and which camera preset frames it. Optional — scenarios without
   * it keep the neutral full-view/no-selection default.
   */
  focusTarget: z
    .object({
      componentId: z.enum([
        "wall",
        "power-supply",
        "motherboard",
        "cpu-cooler",
        "ram",
        "gpu",
        "storage",
        "front-panel",
        "printer",
        "printer-paper",
        "printer-cartridge",
        "printer-network",
        "router",
        "router-wan",
        "router-lan",
        "router-dhcp",
        "router-nat",
        "switch",
        "switch-port",
        "switch-uplink",
        "switch-vlan",
        "access-point",
        "ap-radio",
        "ap-poe",
        "ups",
        "ups-input",
        "ups-output",
        "ups-battery",
        "patch-panel",
        "wall-jack",
        "ethernet-cable",
      ]),
      cameraPreset: z.enum([
        "full",
        "front",
        "motherboard",
        "power-supply",
        "cables",
        "front-panel",
        "ram",
        "cpu-cooler",
        "storage",
        "printer-full",
        "printer-controls",
        "printer-paper",
        "printer-network",
        "router-full",
        "router-wan",
        "router-lan",
        "router-rear",
        "switch-full",
        "switch-ports",
        "switch-uplink",
        "ap-full",
        "ap-face",
        "ap-drop",
        "ups-full",
        "ups-front",
        "ups-rear",
        "patch-full",
        "patch-ports",
        "patch-wall-jack",
      ]),
    })
    .optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export const scenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  version: z.number().int().positive(),
  title: z.string().min(3),
  category: categorySchema,
  difficulty: difficultySchema,
  scenarioType: scenarioTypeSchema,
  modeSupport: z.array(modeSchema).min(1),
  estimatedMinutes: z.number().positive(),
  learningObjectives: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(z.string()).default([]),
  skills: z.array(z.string().min(1)).min(1),
  ticket: ticketSchema,
  environment: environmentSchema,
  conversation: conversationScriptSchema.optional(),
  conversationEnabled: z.boolean().default(true),
  scoring: z
    .object({
      diagnosticWeight: z.number().default(2),
      fixWeight: z.number().default(5),
      hintPenalty: z.number().default(3),
      wrongActionPenalty: z.number().default(2),
      maxScore: z.number().default(100),
    })
    .optional(),
  conceptsOnStart: z.array(z.string()).optional(),
  hypotheses: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        initiallyPlausible: z.boolean().default(false),
      }),
    )
    .default([]),
  actions: z.array(actionDefSchema).min(1),
  successConditions: z.array(conditionSchema).min(1),
  verificationSteps: z.array(conditionSchema).min(1),
  wrongPaths: z
    .array(
      z.object({
        when: conditionSchema,
        feedback: z.string(),
        consequence: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
  hints: z
    .array(
      z.object({
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text: z.string().min(1),
        category: z.enum(["method", "tool", "concept", "direct"]).default("method"),
      }),
    )
    .min(1),
  guidedWalkthrough: guidedWalkthroughSchema.optional(),
  debrief: z.object({
    rootCause: z.string().min(1),
    whyItWorked: z.string().min(1),
    methodologyMap: z.array(
      z.object({
        step: z.string(),
        whatLearnerDid: z.string(),
      }),
    ),
    followUps: z.array(z.string()).default([]),
  }),
  knowledgeLinks: z.array(z.string()).min(1),
  references: z.array(referenceSchema).default([]),
});

export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioInput = z.input<typeof scenarioSchema>;

export const kbArticleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(3),
  track: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  glossaryTerms: z
    .array(
      z.object({
        term: z.string(),
        definition: z.string(),
      }),
    )
    .default([]),
  relatedScenarios: z.array(z.string()).default([]),
  relatedArticles: z.array(z.string()).default([]),
  references: z.array(referenceSchema).default([]),
});

export type KbArticle = z.infer<typeof kbArticleSchema>;

export const topicSchema = z.object({
  id: z.string(),
  title: z.string(),
  articleIds: z.array(z.string()).default([]),
  scenarioIds: z.array(z.string()).default([]),
  prereqTopicIds: z.array(z.string()).default([]),
});

export const moduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  topics: z.array(topicSchema),
});

export const trackSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  modules: z.array(moduleSchema),
});

export type Track = z.infer<typeof trackSchema>;
