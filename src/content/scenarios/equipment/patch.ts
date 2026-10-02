import type { ScenarioInput } from "@/content/schema";

/**
 * Patch panel / structured cabling family scenarios. Worlds seed every
 * derived key exactly as `deriveWorld` computes it; the trace flags
 * (jackTraced, horizontalTraced, patchChecked) stay absent until a probe
 * action records them, so the status and chain rows hide the cause until
 * the learner tones the path segment by segment.
 */
export const patchScenarios: ScenarioInput[] = [
  {
    id: "patch-keystone-loose",
    version: 1,
    title: "Desk 3-14 lost the network after the cleaner moved the cabinet",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Prove a cable path one segment at a time with a tone generator",
      "Separate a healthy desk patch lead from the horizontal run behind the faceplate",
    ],
    prerequisites: [],
    skills: ["structured-cabling", "cable-tracing", "troubleshooting-method"],
    ticket: {
      id: "HD-1055",
      user: "Fiona Doyle",
      role: "Legal assistant",
      symptomPlainLanguage:
        "My network went dead this morning and it hasn't come back. Same PC, same cable, same socket — I didn't touch a thing.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "The cabinet door was re-hung this morning.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "patch-panel",
      shell: "none",
      availableTools: ["device-panel", "inspection", "cable-tracer"],
      enabledCommands: [],
      components: ["patch-panel", "wall-jack", "ethernet-cable", "switch-port"],
      showInspector: true,
      focusTarget: { componentId: "wall-jack", cameraPreset: "patch-wall-jack" },
      initialWorld: {
        patch: {
          endpointSeated: true,
          endpointPowered: true,
          horizontalSeated: false,
          horizontalPort: 5,
          patchPanelPort: 5,
          labelPanelPort: "3-14",
          patchSeated: true,
          switchPortNumber: 4,
          switchPortEnabled: true,
          panelMatch: true,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-keystone", label: "Keystone knocked out behind the faceplate", initiallyPlausible: true },
      { id: "h-desk-lead", label: "Desk patch lead pulled loose", initiallyPlausible: true },
      { id: "h-port", label: "Switch port turned off in the cabinet", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work outward from the desk, proving one segment of the path at a time before you open the cabinet.",
      "steps": [
        {
          "id": "guide-desk-lead",
          "title": "Inspect the desk patch lead",
          "explanation": "Select Cabling on the bench and inspect where the patch lead meets the PC — seating and the NIC indicator.",
          "why": "The link light — the LED showing a negotiated connection — clears the PC and its lead in one look, so the search starts at the cheapest evidence.",
          "expectedObservation": "The lead clicking fully home with the NIC light lit - the desk end is sound.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "check-desk-end",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-tone-jack",
          "title": "Tone the jack from the desk",
          "explanation": "Send tone in at the desk lead and listen at the keystone behind the faceplate with the tracer.",
          "why": "The keystone — the snap-in outlet module behind the faceplate — is one more joint; toning from the desk outward shows where the signal stops without opening the cabinet.",
          "expectedObservation": "No tone at the keystone while the desk still feeds the generator - the jack breaks the path.",
          "target": {
            "componentId": "wall-jack",
            "label": "Wall jack",
            "cameraPreset": "patch-wall-jack"
          },
          "actionId": "trace-jack",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-reseat-keystone",
          "title": "Reseat the keystone in the faceplate",
          "explanation": "Press the module behind the desk 3-14 faceplate until both retention latches click, then re-check the path.",
          "why": "The tone stopped at this jack, so clicking the module home is the smallest change that answers the evidence you just gathered.",
          "expectedObservation": "Both latches clicking behind the faceplate and tone now passing the full path on a re-check.",
          "target": {
            "componentId": "wall-jack",
            "label": "Wall jack",
            "cameraPreset": "patch-wall-jack"
          },
          "actionId": "reseat-keystone",
          "conceptId": "network-cabling-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-desk-end",
        label: "Check the desk end of the patch lead",
        kind: "inspect",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Confirm the lead clicks into the PC and the NIC light responds.",
        feedback: "PC end clicks, NIC light on — the desk patch lead is fine",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Proving the desk lead and its link light first moves the search away from the PC and toward the fixed cabling at zero cost.",
          evidenceGain:
            "Desk patch lead seated with a lit NIC — the PC side of the path is healthy.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["desk lead", "pc cable", "nic light", "link light", "patch cord"],
      },
      {
        id: "trace-jack",
        label: "Tone the wall jack from the desk",
        kind: "inspect",
        tool: "cable-tracer",
        component: "wall-jack",
        inspectTarget: "wall-jack",
        description: "Send tone in at the desk lead and listen at the keystone behind the faceplate.",
        patch: { patch: { jackTraced: true } },
        feedback:
          "Tone generator at the desk, no tone at the keystone — the jack itself is not terminated through",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Tone that dies at the jack breaks the path into named segments and locates the fault without opening the cabinet or disturbing a working cross-connect.",
          evidenceGain:
            "No tone at the keystone — the break sits at the wall jack, before the horizontal run even starts.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["tone", "tracer", "probe the jack", "wall jack", "keystone"],
      },
      {
        id: "reseat-keystone",
        label: "Reseat the keystone in the faceplate",
        kind: "ui",
        tool: "inspection",
        component: "wall-jack",
        inspectTarget: "wall-jack",
        description: "Press the keystone back into the faceplate until both retention latches engage.",
        appliesWhen: { type: "stateEquals", path: "patch.jackTraced", value: true },
        patch: { patch: { horizontalSeated: true } },
        feedback: "Keystone latches in; tone now passes end to end",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The probe already proved the break was at the jack, so clicking the module back into its housing is the smallest change that restores the horizontal run.",
          evidenceGain:
            "Keystone latched behind the faceplate — horizontal path continuous through port 5 again.",
        },
        matchHints: ["reseat keystone", "clip the module in", "faceplate", "latch the jack"],
      },
      {
        id: "replace-nic-wrong",
        label: "Replace the PC network card",
        kind: "ui",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Swap the desktop NIC without checking the fixed cabling.",
        patch: { patch: {} },
        feedback:
          "The NIC light is already on and the desk lead proven good — a new card changes nothing at this desk.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "A lit NIC proves the network side of the desk is healthy, so replacing it spends budget on the one component already exonerated by its own indicator.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["replace nic", "new network card", "swap adapter"],
      },
      {
        id: "re-crimp-desk-lead-wrong",
        label: "Crimp a new RJ-45 onto the desk lead",
        kind: "ui",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Re-terminate the desk patch lead that was just proven good.",
        patch: { patch: {} },
        feedback:
          "That lead carried link a moment ago — cutting and re-crimping a healthy patch cord only adds one more way for this desk to fail.",
        evaluation: {
          grade: "low-value",
          rationale:
            "The link light already showed this lead passes signal, so re-terminating it is effort spent on a segment with no evidence against it.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["re-crimp", "crimp new connector", "new rj45", "re-terminate lead"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "patch.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "patch.horizontalSeated", value: true },
      { type: "stateEquals", path: "patch.panelMatch", value: true },
      { type: "stateEquals", path: "patch.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-nic-wrong"],
        },
        feedback:
          "The NIC's own light already cleared the PC — the break is in the fixed cabling behind the faceplate, and no card will reach it.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Who was in the room this morning? The cabinet door was re-hung — start with whatever physically moved.",
        category: "method",
      },
      {
        level: 2,
        text: "A tone generator proves a path one segment at a time: send tone in at one end and find where it stops.",
        category: "concept",
      },
      {
        level: 3,
        text: "Probe the jack with the tracer before you touch anything at the PC.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The keystone behind the desk faceplate for jack 3-14 was knocked out of its latches during the morning's cleaning, so the horizontal run stopped at the wall. Panel port 5, the label, and switch port 4 were all correct.",
      whyItWorked:
        "Evidence came outward from the desk: the lit NIC cleared the PC and its lead, and the toner stopped at the keystone, which named the fault before the cabinet was opened. Replacing the NIC or re-crimping the lead would have left the unseated module exactly where it was. Transferable principle: tone the path segment by segment and let the point where the tone dies tell you where to work.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Desk 3-14 dead after morning cleaning; user changed nothing at the PC." },
        { step: "Gather evidence", whatLearnerDid: "Desk lead checked for seating and link light, then the wall jack toned from the desk." },
        { step: "Rule out", whatLearnerDid: "PC, desk patch lead, and switch port ruled out before the cabinet was touched." },
        { step: "Apply fix", whatLearnerDid: "Clicked the keystone back into the faceplate behind jack 3-14." },
        { step: "Verify", whatLearnerDid: "Tone passed end to end and the link came back on switch port 4." },
      ],
      followUps: [
        "Try patch-crossconnect-mislabelled, where the path tones through but the panel label points at the wrong port.",
      ],
    },
    knowledgeLinks: ["network-cabling-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "patch-crossconnect-mislabelled",
    version: 1,
    title: "Link light at the switch but the desk never gets an address",
    category: "hardware",
    difficulty: "advanced",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 20,
    learningObjectives: [
      "Trace a cross-connect through patch panel and keystone labels",
      "Separate layer-1 continuity from layer-2 VLAN membership",
    ],
    prerequisites: ["patch-keystone-loose"],
    skills: ["structured-cabling", "cable-tracing", "troubleshooting-method"],
    ticket: {
      id: "HD-1056",
      user: "Samir Haddad",
      role: "Network engineer",
      symptomPlainLanguage:
        "Port 4 on the edge switch is green, but the desk never picks up an address and the user stays offline. The cross-connect looks right on paper.",
      priority: "high",
      channel: "portal",
      additionalContext: "The panel label says 3-14 on port 5.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "patch-panel",
      shell: "none",
      availableTools: ["device-panel", "inspection", "cable-tracer"],
      enabledCommands: [],
      components: ["patch-panel", "wall-jack", "ethernet-cable", "switch-port"],
      showInspector: true,
      focusTarget: { componentId: "patch-panel", cameraPreset: "patch-ports" },
      initialWorld: {
        patch: {
          endpointSeated: true,
          endpointPowered: true,
          horizontalSeated: true,
          horizontalPort: 9,
          patchPanelPort: 5,
          labelPanelPort: "3-14",
          patchSeated: true,
          switchPortNumber: 4,
          switchPortEnabled: true,
          panelMatch: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-landing", label: "Horizontal run lands on a different panel port", initiallyPlausible: true },
      { id: "h-label", label: "Panel label does not describe the real cross-connect", initiallyPlausible: true },
      { id: "h-config", label: "Switch port configuration blocking the desk", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Prove the path from the desk outward, one segment at a time, before you touch any patching.",
      "steps": [
        {
          "id": "guide-desk-link",
          "title": "Read the desk link light",
          "explanation": "Open Cabling on the bench and check the desk patch lead: is it seated, and does a link pulse reach the NIC?",
          "why": "A link pulse — the repeating signal two ends exchange to prove they can hear each other — clears the PC and its lead in one look.",
          "expectedObservation": "The lead fully seated with the NIC showing a live link pulse.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "check-desk-end",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-tone-keystone",
          "title": "Tone the keystone from the desk",
          "explanation": "Send tone in at the desk lead and listen at the keystone behind the faceplate before you go near the cabinet.",
          "why": "The keystone — the snap-in outlet behind the faceplate — is the wall end of the fixed run, and proving it sound keeps the trace honest as you move outward.",
          "expectedObservation": "Tone reading at the keystone - the wall side is properly terminated.",
          "target": {
            "componentId": "wall-jack",
            "label": "Wall jack",
            "cameraPreset": "patch-wall-jack"
          },
          "actionId": "trace-jack",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-tone-run",
          "title": "Tone the run to the panel",
          "explanation": "Follow the fixed run from the wall jack through to the cabinet and read which panel port signals.",
          "why": "A cross-connect — the patching linking a panel port to a switch port — is proven by where the copper lands, so tone the run to its landing port first.",
          "expectedObservation": "Tone landing on panel port 9 beside a label reading 3-14 to port 5 - the run and the label disagree.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "trace-run",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-repatch-landing",
          "title": "Repatch onto the landing port",
          "explanation": "Move the cabinet patch lead off port 5 and onto the port the toner just signalled.",
          "why": "With the landing port tonally proven, moving the lead is the smallest change your evidence supports — it rebuilds the cross-connect instead of re-working healthy copper.",
          "expectedObservation": "The patch lead now on panel port 9 with the end-to-end path completing to switch port 4.",
          "target": {
            "componentId": "patch-panel",
            "label": "Patch panel",
            "cameraPreset": "patch-ports"
          },
          "actionId": "repatch-to-landing-port",
          "conceptId": "network-cabling-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-desk-end",
        label: "Check the desk end of the patch lead",
        kind: "inspect",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Confirm the desk lead is seated and see whether a link pulse reaches the NIC.",
        feedback: "Desk lead seated, NIC sees link pulse from the far side",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "A link pulse at the desk confirms the lead and part of the path are alive, which keeps the investigation on the cross-connect instead of the user's machine.",
          evidenceGain:
            "Desk lead seated with a live pulse — PC and its patch cord ruled out.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["desk lead", "link pulse", "nic light", "patch cord"],
      },
      {
        id: "trace-jack",
        label: "Tone the wall jack from the desk",
        kind: "inspect",
        tool: "cable-tracer",
        component: "wall-jack",
        inspectTarget: "wall-jack",
        description: "Check the termination behind the faceplate before blaming the cabinet.",
        patch: { patch: { jackTraced: true } },
        feedback: "Keystone tone passes — the wall side is properly terminated",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Confirming the wall end first keeps the trace honest: a good keystone means everything from the desk to the faceplate is sound.",
          evidenceGain:
            "Keystone terminated correctly — wall jack and desk side ruled out.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["tone", "tracer", "wall jack", "keystone", "probe"],
      },
      {
        id: "trace-run",
        label: "Tone the horizontal run out to the panel",
        kind: "inspect",
        tool: "cable-tracer",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Follow the fixed run from the wall jack and read where it lands in the cabinet.",
        patch: { patch: { horizontalTraced: true } },
        feedback:
          "Tone lands on panel port 9 — the label 3-14 to port 5 is wrong; the run and the patch lead sit on different ports",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The green switch light only proves the patch lead's own path; toning the fixed run to its true landing port is what can expose a cross-connect mismatch.",
          evidenceGain: "run location proven — label ruled unreliable",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["trace the run", "tone the horizontal", "landing port", "follow the cable"],
      },
      {
        id: "repatch-to-landing-port",
        label: "Repatch onto the port the run lands on",
        kind: "ui",
        tool: "inspection",
        component: "patch-panel",
        inspectTarget: "patch-panel",
        description: "Move the patch lead from port 5 to the port the toner identified.",
        appliesWhen: { type: "stateEquals", path: "patch.horizontalTraced", value: true },
        patch: { patch: { patchPanelPort: 9 } },
        feedback: "Lead moved to port 9 — path completes to switch port 4",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the landing port tonally proven, moving the lead onto it rebuilds the cross-connect the label only claimed to describe.",
          evidenceGain:
            "Cross-connect aligned on port 9 — desk 3-14 reaches switch port 4 end to end.",
        },
        matchHints: ["move the lead", "repatch", "patch to port 9", "reconnect at panel"],
      },
      {
        id: "trust-label-repatch-wrong",
        label: "Re-punch the horizontal run onto port 5 to match the label",
        kind: "ui",
        tool: "inspection",
        component: "patch-panel",
        inspectTarget: "patch-panel",
        description: "Terminate the healthy run a second time so the printed label becomes true.",
        patch: { patch: {} },
        feedback:
          "Re-punching a healthy run to satisfy a printed strip risks breaking a good termination and hides the labelling fault that will catch the next technician.",
        evaluation: {
          grade: "risky",
          rationale:
            "Working sound copper to honour a piece of paper trades a two-minute repatch for a probable re-termination, and it buries the process fault in the labelling.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["re-punch", "punch down port 5", "re-terminate run", "match the label"],
      },
      {
        id: "wait-for-night-team-wrong",
        label: "Raise a job for the night cabling team and leave it",
        kind: "ui",
        tool: "device-panel",
        component: "patch-panel",
        inspectTarget: "patch-panel",
        description: "Defer the repair to the out-of-hours cabling crew.",
        patch: { patch: {} },
        feedback:
          "The landing port is already proven and the move takes two minutes — deferring leaves desk 3-14 dark for the rest of the day.",
        evaluation: {
          grade: "premature",
          rationale:
            "Handing over a fault that is fully diagnosed and one repatch from service stalls a fix the evidence already supports now.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["night team", "defer", "raise a job", "schedule a visit"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "patch.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "patch.panelMatch", value: true },
      { type: "stateEquals", path: "patch.pathOk", value: true },
      { type: "stateEquals", path: "patch.switchPortEnabled", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["trust-label-repatch-wrong"],
        },
        feedback:
          "The run was healthy and the label was wrong — re-punching to match the printout would have broken good copper to honour a piece of paper.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The switch is showing a green link on port 4 — so what is the desk still missing?",
        category: "method",
      },
      {
        level: 2,
        text: "Labels are metadata, not evidence: a printed strip records what someone intended, not where the copper actually lands.",
        category: "concept",
      },
      {
        level: 3,
        text: "Trace direction matters — send tone from the desk outward and read it at the panel.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The horizontal run for desk 3-14 lands on panel port 9 while the patch lead was patched to port 5, which the cabinet label still advertises as 3-14. The copper was never broken — only the cross-connect and the label disagreed.",
      whyItWorked:
        "The desk pulse cleared the PC, the keystone tone cleared the wall, and the run trace named port 9 as the true landing point, so the fix was one move of the lead instead of any re-termination. Trusting the label would have cut into healthy copper to satisfy a document. Transferable principle: a label is a claim about the cabling, and only a toner test can confirm or convict it.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Switch port 4 green, desk 3-14 still never obtains an address." },
        { step: "Gather evidence", whatLearnerDid: "Desk lead, wall keystone, and horizontal run toned in sequence from the desk outward." },
        { step: "Rule out", whatLearnerDid: "PC, desk lead, and wall termination ruled out; the printed label ruled unreliable once the run toned to port 9." },
        { step: "Apply fix", whatLearnerDid: "Repatched the lead from port 5 onto port 9, the port the run actually lands on." },
        { step: "Verify", whatLearnerDid: "Panel match restored and the path completed to switch port 4." },
      ],
      followUps: [
        "Try patch-switch-port-disabled, where the copper tones clean end to end and the fault is a port setting.",
      ],
    },
    knowledgeLinks: ["network-cabling-basics"],
    references: [],
  },
  {
    id: "patch-switch-port-disabled",
    version: 1,
    title: "New desk is cabled but the switch port stays amber",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Prove cabling continuity before suspecting switch configuration",
      "Confirm administrative port state and VLAN assignment end to end",
    ],
    prerequisites: ["patch-keystone-loose"],
    skills: ["structured-cabling", "switch-ports", "troubleshooting-method"],
    ticket: {
      id: "HD-1057",
      user: "Talia Rosenberg",
      role: "Product designer",
      symptomPlainLanguage:
        "I plugged into the new desk socket and the switch light stays amber. I never get an IP address, so I can't reach anything.",
      priority: "medium",
      channel: "email",
      additionalContext: "Movers re-patched everything during the office refit.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "patch-panel",
      shell: "none",
      availableTools: ["device-panel", "inspection", "cable-tracer"],
      enabledCommands: [],
      components: ["patch-panel", "wall-jack", "ethernet-cable", "switch-port"],
      showInspector: true,
      focusTarget: { componentId: "switch-port", cameraPreset: "patch-ports" },
      initialWorld: {
        patch: {
          endpointSeated: true,
          endpointPowered: true,
          horizontalSeated: true,
          horizontalPort: 5,
          patchPanelPort: 5,
          labelPanelPort: "3-14",
          patchSeated: true,
          switchPortNumber: 4,
          switchPortEnabled: false,
          panelMatch: true,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-admin", label: "Switch access port left administratively down", initiallyPlausible: true },
      { id: "h-run", label: "Horizontal run broken behind the new partition", initiallyPlausible: true },
      { id: "h-patch", label: "Patch lead on the wrong panel port after the refit", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Prove every cable segment from the desk inward before you decide what the amber port light means.",
      "steps": [
        {
          "id": "guide-nic-light",
          "title": "Check the desk link light",
          "explanation": "Confirm the patch lead is seated at the PC, then read the NIC indicator beside the socket.",
          "why": "The NIC light — the link indicator on the PC's network port — is the cheapest evidence available: a dark one with a seated lead points past the desk.",
          "expectedObservation": "The lead seated fully with the PC link light dark - the fault lies beyond the desk.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "check-desk-end",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-tone-path",
          "title": "Tone the path desk to switch",
          "explanation": "Run the tracer across desk, panel, and switch ends in one sweep and read the port LED in the cabinet.",
          "why": "A toner — a signal you follow along the copper — answers the cable question in one pass; only then can an amber port LED be read as port state.",
          "expectedObservation": "Tone registering at desk, panel port 5, and switch port 4, with the switch port LED still amber.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "trace-path",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-enable-port",
          "title": "Enable the switch access port",
          "explanation": "Open the port configuration on the bench panel and switch port 4 back on.",
          "why": "Admin state — whether the port is switched on in configuration rather than copper — is the last gate; with tone proven, it is the smallest change your evidence supports.",
          "expectedObservation": "Port 4's LED turning from amber to green and the desk picking up an IP address.",
          "target": { "componentId": "switch-port", "label": "Switch port" },
          "actionId": "enable-switch-port",
          "conceptId": "network-cabling-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-desk-end",
        label: "Check the desk end of the patch lead",
        kind: "inspect",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Confirm the lead is seated at the PC and read the NIC indicator.",
        feedback: "PC link light off — something beyond the desk lead",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A dark NIC with a seated lead immediately moves the fault past the desk, so no time is lost re-working the user's end of the path.",
          evidenceGain:
            "Lead seated but NIC dark — fault is downstream of the desk socket.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["desk lead", "link light", "nic light", "seated"],
      },
      {
        id: "trace-path",
        label: "Tone the whole path from desk to switch",
        kind: "inspect",
        tool: "cable-tracer",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Tone desk, panel, and switch ends in one pass and read the port LED.",
        patch: { patch: { jackTraced: true, horizontalTraced: true, patchChecked: true } },
        feedback:
          "Tone runs desk → panel port 5 → switch port 4, every seat solid — but the switch port LED is amber: administratively down",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Toning every segment in one sweep closes the physical layer question completely, which is what makes an amber port LED readable as configuration rather than damage.",
          evidenceGain: "whole copper path ruled out; fault isolated to port admin state",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["tone the path", "tracer", "panel port 5", "switch port", "amber led"],
      },
      {
        id: "enable-switch-port",
        label: "Enable the switch access port",
        kind: "ui",
        tool: "device-panel",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Bring switch port 4 back into service from its port configuration.",
        appliesWhen: { type: "stateEquals", path: "patch.patchChecked", value: true },
        patch: { patch: { switchPortEnabled: true } },
        feedback: "Port admin up — link negotiates, desk gets a lease",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Every copper segment tonally passed, so the only remaining gate between cable and forwarding is the port's administrative state.",
          evidenceGain:
            "Switch port 4 forwarding again — desk obtains a lease and reaches the network.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["enable the port", "no shutdown", "admin up", "port 4"],
      },
      {
        id: "re-crimp-cable-wrong",
        label: "Re-terminate the RJ-45 at both ends of the run",
        kind: "ui",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Cut off and replace both connectors on a path that tones clean.",
        patch: { patch: {} },
        feedback:
          "A perfect end-to-end tone makes re-termination pure risk — you would be cutting into copper that already tests good.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "With the whole run tonally proven, re-terminating converts a known-good path into a new unknown and adds two joints that can fail later.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["re-crimp", "re-terminate", "new rj45", "recut connectors"],
      },
      {
        id: "move-desk-wrong",
        label: "Move the desk to a spare wall outlet",
        kind: "ui",
        tool: "inspection",
        component: "wall-jack",
        inspectTarget: "wall-jack",
        description: "Relocate the user onto another drop instead of restoring this one.",
        patch: { patch: {} },
        feedback:
          "Relocating works around a port setting instead of fixing it — the next person to sit here meets the same amber LED.",
        evaluation: {
          grade: "low-value",
          rationale:
            "Changing the user's location hides a single disabled port and quietly consumes another drop, leaving the original fault in place.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["move the desk", "different socket", "spare outlet", "relocate"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "patch.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "patch.switchPortEnabled", value: true },
      { type: "stateEquals", path: "patch.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["re-crimp-cable-wrong"],
        },
        feedback:
          "The tone already proved the copper — the desk was blocked by a port setting, and re-crimping would never have opened it.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The whole path tones through cleanly — what is left standing between a connected cable and a forwarding port?",
        category: "method",
      },
      {
        level: 2,
        text: "On an access port, amber usually means the port is not forwarding rather than the copper being bad.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the port's admin state directly instead of inferring it from the link light.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Switch access port 4 was left administratively down after the movers re-patched the floor, so every cable in the path was perfect but the port never forwarded a frame for desk 3-14.",
      whyItWorked:
        "The dark NIC pointed past the desk, the full-path tone closed the physical layer in one pass, and the amber LED then read as a port state rather than a cable fault. Re-crimping or relocating would both have left port 4 shut. Transferable principle: when the copper tonally passes, stop working on copper — the next layer up is where the fault now lives.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "New desk fully cabled after the refit but amber on switch port 4 and no address." },
        { step: "Gather evidence", whatLearnerDid: "Desk lead and NIC read first, then the whole path toned desk to panel to switch." },
        { step: "Rule out", whatLearnerDid: "Horizontal run, panel cross-connect, and patch lead all ruled out by a clean tone." },
        { step: "Apply fix", whatLearnerDid: "Enabled the administratively down access port." },
        { step: "Verify", whatLearnerDid: "Port negotiated green and the desk picked up a lease." },
      ],
      followUps: [
        "Try patch-lead-not-seated, where the path is intermittent instead of cleanly broken.",
      ],
    },
    knowledgeLinks: ["network-cabling-basics", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "patch-lead-not-seated",
    version: 1,
    title: "Intermittent link that returns when the cable is touched",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Use physical manipulation as evidence for an intermittent connection",
      "Trace the full horizontal and patch path before replacing hardware",
    ],
    prerequisites: ["patch-keystone-loose"],
    skills: ["structured-cabling", "cable-tracing", "troubleshooting-method"],
    ticket: {
      id: "HD-1058",
      user: "George Mabena",
      role: "Architect",
      symptomPlainLanguage:
        "The network keeps blinking off and coming straight back. It started while I was tidying the cables under the desk.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "It blinked while I was cable-tidying under the desk.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "patch-panel",
      shell: "none",
      availableTools: ["device-panel", "inspection", "cable-tracer"],
      enabledCommands: [],
      components: ["patch-panel", "wall-jack", "ethernet-cable", "switch-port"],
      showInspector: true,
      focusTarget: { componentId: "ethernet-cable", cameraPreset: "patch-full" },
      initialWorld: {
        patch: {
          endpointSeated: true,
          endpointPowered: true,
          horizontalSeated: true,
          horizontalPort: 5,
          patchPanelPort: 5,
          labelPanelPort: "3-14",
          patchSeated: false,
          switchPortNumber: 4,
          switchPortEnabled: true,
          panelMatch: true,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-desk-end", label: "Desk end of the patch lead not seated", initiallyPlausible: true },
      { id: "h-switch-end", label: "Switch end of the patch lead not latched", initiallyPlausible: true },
      { id: "h-run", label: "Horizontal run damaged behind the desk", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Reproduce the blink with movement first, then work outward along the path while watching the link light.",
      "steps": [
        {
          "id": "guide-nudge-desk",
          "title": "Nudge the desk end and watch",
          "explanation": "Seat the desk end of the patch lead, nudge it gently, and keep the NIC link light in view.",
          "why": "An intermittent fault only speaks when you reproduce it: watching the link light — the LED showing a negotiated connection — while nudging tells you which end moves the link.",
          "expectedObservation": "The NIC light holding through the desk nudge while the link break follows the far end.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "check-desk-end",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-tone-inspect",
          "title": "Tone the path, inspect both plugs",
          "explanation": "Tone wall, panel, and switch ends in one pass, then look at how each plug sits in its port.",
          "why": "Toning clears the fixed cabling in one sweep; a plug's retention latch — the clip holding it in the port — is the one fault a toner never flags.",
          "expectedObservation": "Clean tone at wall and panel with the switch-end plug standing proud - its latch not clicked.",
          "target": { "componentId": "ethernet-cable", "label": "Cabling" },
          "actionId": "trace-path",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-reseat-switch-end",
          "title": "Reseat the plug at the switch",
          "explanation": "Push the far plug home until the retention latch clicks, then re-check the link under movement.",
          "why": "The inspection named an unlatched plug and the tone cleared the fixed cabling, so seating it is the smallest change that matches both observations.",
          "expectedObservation": "The latch clicking home and the link holding steady through a repeat wiggle test.",
          "target": { "componentId": "switch-port", "label": "Switch port" },
          "actionId": "reseat-patch-lead",
          "conceptId": "network-cabling-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-desk-end",
        label: "Check the desk end of the patch lead",
        kind: "inspect",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Seat and nudge the desk end while watching the link light.",
        feedback: "Desk end solid — the blink followed the far end when the lead was nudged",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "An intermittent fault is characterized by reproducing it — nudging one end while watching the light splits the path into the end that moves the link and the end that does not.",
          evidenceGain:
            "Desk end stable under movement — intermittent break is upstream of the desk socket.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["desk end", "nudge", "wiggle", "link light"],
      },
      {
        id: "trace-path",
        label: "Tone the path and inspect both plug ends",
        kind: "inspect",
        tool: "cable-tracer",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Tone wall, panel, and switch ends, then look at how each plug sits in its port.",
        patch: { patch: { jackTraced: true, horizontalTraced: true, patchChecked: true } },
        feedback:
          "Wall and panel tone clean; the patch lead's switch end sits proud — latch not clicked",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Toning clears the fixed cabling in one pass, and a visual on the far plug then shows the mechanical cause that a tone alone would never reveal.",
          evidenceGain:
            "Fixed cabling ruled out; switch-end plug standing proud with its latch unengaged.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["tone the path", "inspect the plug", "switch end", "latch", "seated"],
      },
      {
        id: "reseat-patch-lead",
        label: "Reseat the patch lead at the switch end",
        kind: "ui",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Push the far plug home until the retention latch clicks.",
        appliesWhen: { type: "stateEquals", path: "patch.patchChecked", value: true },
        patch: { patch: { patchSeated: true } },
        feedback: "Latch clicks — link stable through a wiggle test",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The inspection named an unlatched plug as the only fault, so seating it restores both contact pressure and retention without disturbing good terminations.",
          evidenceGain:
            "Switch-end plug latched and holding through movement — link no longer intermittent.",
        },
        matchHints: ["click it home", "seat the far plug", "latch the lead", "push it in"],
      },
      {
        id: "order-new-patch-wrong",
        label: "Order a replacement patch lead",
        kind: "ui",
        tool: "inspection",
        component: "ethernet-cable",
        inspectTarget: "ethernet-cable",
        description: "Raise a stock order instead of seating the plug that is already in the port.",
        patch: { patch: {} },
        feedback:
          "The lead seats fine once it is latched — ordering stock changes nothing for this desk today.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "A plug that holds link when pushed home is not a failed cable, so a replacement order spends budget and leaves the desk intermittent until it arrives.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["order new lead", "replace the cable", "new patch cord"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "patch.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "patch.patchSeated", value: true },
      { type: "stateEquals", path: "patch.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["order-new-patch-wrong"],
        },
        feedback:
          "The lead already proved it carries link when latched — the fault is an unclicked plug, and a boxed spare would sit unused.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The blink followed your hand — that points at a mechanical connection, not a configuration change. Which end moved?",
        category: "method",
      },
      {
        level: 2,
        text: "An RJ-45 latch does two jobs: it retains the plug and it holds the contact springs against the conductors.",
        category: "concept",
      },
      {
        level: 3,
        text: "Wiggle-test each end in turn with the link light in view and see which end drops the link.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The patch lead's switch-end plug was standing proud of port 4 with its retention latch unclicked, so contact pressure depended on how the lead happened to hang and the link blinked with movement.",
      whyItWorked:
        "Reproducing the fault while nudging the desk end cleared that end, and a full tone plus a visual on the far plug exposed an unclicked latch that no toner would have flagged. Ordering a new lead would have left the desk blinking until stock arrived. Transferable principle: for intermittent links, reproduce the movement, watch which end changes the result, and look at the plugs before you replace them.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Link blinking on and off after cable tidying under desk 3-14." },
        { step: "Gather evidence", whatLearnerDid: "Nudged the desk end while watching the light, then toned and visually checked both plug ends." },
        { step: "Rule out", whatLearnerDid: "Desk end, wall jack, and horizontal run ruled out by tone and movement tests." },
        { step: "Apply fix", whatLearnerDid: "Seated the switch-end plug until the latch clicked." },
        { step: "Verify", whatLearnerDid: "Link held steady through a repeat wiggle test." },
      ],
      followUps: [
        "Try patch-switch-port-disabled, where a perfectly stable path still carries no traffic.",
      ],
    },
    knowledgeLinks: ["network-cabling-basics", "troubleshooting-method"],
    references: [],
  },
];
