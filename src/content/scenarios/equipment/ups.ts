import type { ScenarioInput } from "@/content/schema";

/**
 * UPS family scenarios (Phase 11.6). Worlds seed every derived key exactly as
 * `deriveWorld` computes it (`onUtility`, `outputPresent`, `loadOk`); reveal
 * flags (`batteryChecked`, `loadChecked`, `outletChecked`, `inputChecked`,
 * `breakerChecked`) stay absent until a check action patches them.
 */
export const upsScenarios: ScenarioInput[] = [
  {
    id: "ups-battery-expired",
    version: 1,
    title: "UPS screams a self-test warning every morning",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read a UPS self-test alarm as evidence about battery health",
      "Confirm a consumable's age and measured capacity before scheduling replacement",
    ],
    prerequisites: [],
    skills: ["ups", "power-protection", "troubleshooting-method"],
    ticket: {
      id: "HD-1050",
      user: "Dana Whitfield",
      role: "Server room technician",
      symptomPlainLanguage:
        "Every morning just after six the UPS starts beeping and the panel flashes a warning. It quiets down after about a minute, then does it again the next day. Nothing has been plugged in or unplugged — the rack load has not changed.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Install date sticker reads three years ago.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "ups",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["ups", "ups-input", "ups-output", "ups-battery"],
      showInspector: true,
      focusTarget: { componentId: "ups-battery", cameraPreset: "ups-front" },
      initialWorld: {
        ups: {
          inputPresent: true,
          breakerOk: true,
          outletsLive: true,
          batteryOk: false,
          loadPct: 35,
          mode: "online",
          onUtility: true,
          outputPresent: true,
          loadOk: true,
        },
      },
    },
    hypotheses: [
      { id: "h-battery", label: "Battery at the end of its service life", initiallyPlausible: true },
      { id: "h-selftest", label: "Scheduled self-test misconfigured", initiallyPlausible: true },
      { id: "h-load", label: "Load change on the outlet group", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the panel first to see which part of the UPS is complaining, then measure that part directly.",
      "steps": [
        {
          "id": "guide-panel",
          "title": "Read the front panel lamps",
          "explanation": "Look at the UPS front panel and note the mains, output, and battery lamps as separate readings.",
          "why": "A self-test alarm — the unit's own scheduled health check — can come from the reserve or the supply, and the lamps split those two immediately.",
          "expectedObservation": "Mains and output lamps green while the battery lamp glows amber after a failed self-test.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-pack-numbers",
          "title": "Read the pack's date and capacity",
          "explanation": "Inspect the battery pack's own label for its date code and the result of its latest capacity test.",
          "why": "The pack is a consumable with a rated life — capacity fades as it ages — so its own two numbers beat reasoning about the beep.",
          "expectedObservation": "A date code of 36 months beside a measured 18% of rated capacity.",
          "target": {
            "componentId": "ups-battery",
            "label": "UPS battery",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-battery",
          "conceptId": "ups-runtime-basics"
        },
        {
          "id": "guide-replace-pack",
          "title": "Fit a replacement battery pack",
          "explanation": "Install a fresh sealed pack in the battery bay, then re-run the unit's self-test.",
          "why": "A pack measured at 18% is the smallest part to change that matches the alarm you just measured.",
          "expectedObservation": "The self-test reporting 100% capacity on the front panel.",
          "target": {
            "componentId": "ups-battery",
            "label": "UPS battery"
          },
          "actionId": "replace-ups-battery",
          "conceptId": "ups-runtime-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the UPS front panel lamps",
        kind: "inspect",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Read the panel before touching cabling or ordering parts.",
        feedback:
          "Mains green, output green, battery lamp amber — last self-test failed at 18% capacity",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The panel already distinguishes a load fault from a reserve fault: mains and output are green while only the battery lamp complains.",
          evidenceGain:
            "Utility and output healthy — breaker, outlet group, and load faults ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "lamps", "battery lamp", "self test", "amber"],
      },
      {
        id: "check-battery",
        label: "Inspect the battery pack date code and capacity test",
        kind: "inspect",
        tool: "inspection",
        component: "ups-battery",
        inspectTarget: "ups-battery",
        description: "Read the pack's own record rather than assuming chemistry is fine.",
        patch: { ups: { batteryChecked: true } },
        feedback:
          "Date code 36 months, measured capacity 18% of rating — the pack is expired",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A scheduled morning alarm with a green utility lamp points at the reserve; the date code and a measured capacity figure confirm it instead of guessing.",
          evidenceGain:
            "Pack dated at 36 months with 18% measured capacity — charger and inverter ruled out, depletion confirmed.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["date code", "capacity", "battery pack", "test result", "age"],
      },
      {
        id: "replace-ups-battery",
        label: "Replace the UPS battery pack",
        kind: "ui",
        tool: "inspection",
        component: "ups-battery",
        inspectTarget: "ups-battery",
        description: "Fit a fresh sealed VRLA pack and re-run the self-test.",
        appliesWhen: {
          type: "stateEquals",
          path: "ups.batteryChecked",
          value: true,
        },
        patch: { ups: { batteryOk: true } },
        feedback: "New pack seated; self-test passes at 100% capacity",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "An expired pack at 18% of rated capacity is direct evidence for replacement — the fix matches the measurement exactly.",
          evidenceGain: "Self-test passed at full capacity; morning alarm no longer reproducible.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["replace battery", "new pack", "fit battery", "swap pack"],
      },
      {
        id: "defer-replacement-wrong",
        label: "Log the alarm and defer the swap to the annual service visit",
        kind: "ui",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Record the warning without acting on the measurement.",
        patch: { ups: {} },
        feedback:
          "The alarm clears each day on its own, so nothing looks urgent — until a real cut arrives and the pack delivers seconds instead of minutes.",
        evaluation: {
          grade: "risky",
          rationale:
            "A pack measured at 18% will not hold the rack through an outage; deferring leaves the room with a UPS that only appears healthy.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["defer", "postpone", "annual service", "ignore warning", "log it"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "ups.batteryOk", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "ups.batteryOk", value: true },
      { type: "stateEquals", path: "ups.outputPresent", value: true },
      { type: "stateEquals", path: "ups.onUtility", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["defer-replacement-wrong"],
        },
        feedback:
          "Deferring keeps an 18% pack in service — the next outage drops the rack mid-write instead of riding through it.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The panel is already reporting something specific — read what the self-test lamp says before you touch a cable.",
        category: "method",
      },
      {
        level: 2,
        text: "Batteries are consumables with a calendar, not permanent parts — three years is a full life for a sealed pack.",
        category: "concept",
      },
      {
        level: 3,
        text: "Pull the date code and the measured capacity figure from the pack itself; those two numbers settle the question.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The sealed VRLA pack had reached end of life after 36 months and measured 18% of rated capacity, so the daily self-test failed and raised the alarm while utility power stayed perfectly healthy.",
      whyItWorked:
        "Evidence came in a straight line: the panel separated a reserve fault from a supply fault, and the pack's date code and capacity measurement confirmed depletion before any stock was ordered. Logging the alarm and waiting would have left the room holding a UPS that only looks healthy. Transferable principle: for a consumable with a rated life, measure the consumable rather than reasoning about the symptom.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Recurring morning self-test alarm with no change in rack load.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Front-panel lamps read first, then the pack date code and capacity test.",
        },
        {
          step: "Rule out",
          whatLearnerDid: "Utility feed, breaker, outlet group, and load ruled out by green mains and output lamps.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Fitted a replacement battery pack and re-ran the self-test.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Self-test passed at 100% capacity and the morning alarm no longer repeats.",
        },
      ],
      followUps: [
        "Try ups-input-unplugged, where the UPS discharges with a perfectly healthy battery.",
        "Compare with ups-breaker-tripped, where the panel goes dark instead of beeping.",
      ],
    },
    knowledgeLinks: ["ups-runtime-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "ups-overload",
    version: 1,
    title: "UPS overload lamp lit and beeping under normal load",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Treat a UPS load gauge as a shared power budget that must be added up",
      "Trace a load increase back to the specific device that caused it",
    ],
    prerequisites: ["ups-battery-expired"],
    skills: ["ups", "power-budget", "troubleshooting-method"],
    ticket: {
      id: "HD-1051",
      user: "Hugo Lindgren",
      role: "Data centre coordinator",
      symptomPlainLanguage:
        "The UPS started beeping this morning and the overload light is on. The rack still has power, but I don't trust it — nobody reports switching anything new on.",
      priority: "high",
      channel: "phone",
      additionalContext: "A test rig was wheeled in last week.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "ups",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["ups", "ups-input", "ups-output", "ups-battery"],
      showInspector: true,
      focusTarget: { componentId: "ups", cameraPreset: "ups-front" },
      initialWorld: {
        ups: {
          inputPresent: true,
          breakerOk: true,
          outletsLive: true,
          batteryOk: true,
          loadPct: 96,
          mode: "online",
          onUtility: true,
          outputPresent: true,
          loadOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-overload", label: "Load close to the UPS rating", initiallyPlausible: true },
      { id: "h-fault", label: "Internal UPS fault raising a false alarm", initiallyPlausible: true },
      { id: "h-inrush", label: "Startup surge from the rack fans", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Turn the beep into a number, then account for what on the bank is spending it.",
      "steps": [
        {
          "id": "guide-load-gauge",
          "title": "Read the front panel load gauge",
          "explanation": "Look at the UPS front panel and read the load gauge percentage sitting beside the overload lamp.",
          "why": "A beeping lamp is only a claim; a percentage is a measurement, and how close that number sits to the unit's rating decides how urgent this is.",
          "expectedObservation": "Load gauge reading 96% with the overload lamp amber and output still live.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-outlet-trace",
          "title": "Trace every device on the bank",
          "explanation": "Walk the rear outlet group and list what each socket on that bank is feeding.",
          "why": "A UPS load is a shared budget drawn by everything plugged into the bank, so the watts have to be counted device by device.",
          "expectedObservation": "Group B listing the test rig alongside a 1500W space heater.",
          "target": {
            "componentId": "ups-output",
            "label": "UPS outlets",
            "cameraPreset": "ups-rear"
          },
          "actionId": "trace-outlet-load",
          "conceptId": "ups-runtime-basics"
        },
        {
          "id": "guide-move-heater",
          "title": "Move the heater off the UPS",
          "explanation": "Unplug the space heater from the protected bank and leave it on ordinary wall power.",
          "why": "Removing the one device the trace just identified returns the bank to protected equipment — the smallest change matching a 96% reading.",
          "expectedObservation": "Load settling at 48% with the overload lamp clearing.",
          "target": {
            "componentId": "ups-output",
            "label": "UPS outlets"
          },
          "actionId": "move-heater-off-ups",
          "conceptId": "ups-runtime-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the front-panel load gauge",
        kind: "inspect",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Quantify the alarm instead of silencing it.",
        feedback: "Load gauge 96%, overload amber, output still live — about to shed",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A numeric gauge turns a beeping lamp into a measurable problem and shows how close the unit is to dropping the rack.",
          evidenceGain:
            "Load at 96% with output live — internal fault and breaker fault ruled out; the alarm is real.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "load gauge", "overload", "beeping", "percent"],
      },
      {
        id: "trace-outlet-load",
        label: "Trace which devices sit on the outlet group",
        kind: "inspect",
        tool: "inspection",
        component: "ups-output",
        inspectTarget: "ups-output",
        description: "Walk the outlets and account for every load on the bank.",
        patch: { ups: { loadChecked: true } },
        feedback:
          "Group B feeds the test rig AND a 1500W space heater — the heater alone is a third of the UPS rating",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the gauge already at 96%, the only useful next step is naming what drew the extra wattage rather than guessing at a hardware fault.",
          evidenceGain:
            "1500W heater identified on the same bank as the test rig — load growth attributed to a single device.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["outlet", "group b", "trace load", "heater", "watts", "map outlets"],
      },
      {
        id: "move-heater-off-ups",
        label: "Move the space heater off the UPS",
        kind: "ui",
        tool: "inspection",
        component: "ups-output",
        inspectTarget: "ups-output",
        description: "Return the bank to protected equipment only.",
        appliesWhen: {
          type: "stateEquals",
          path: "ups.loadChecked",
          value: true,
        },
        patch: { ups: { loadPct: 48 } },
        feedback: "Load settles at 48% — overload lamp clears, runtime estimate returns",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The heater was traced onto the bank and is a resistive load the UPS never needed to protect; removing it is the exact remedy for the measured 96%.",
          evidenceGain: "Load back to 48% with the overload lamp clear; runtime estimate restored.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["move heater", "unplug heater", "off the ups", "take it off the bank"],
      },
      {
        id: "ignore-overload-wrong",
        label: "Silence the beep and keep the configuration as it is",
        kind: "ui",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Mute the alarm without reducing the load.",
        patch: { ups: {} },
        feedback:
          "The beeping stops, but the gauge still reads 96% — the first inrush spike will shed the whole rack mid-write.",
        evaluation: {
          grade: "risky",
          rationale:
            "Muting an overload alarm leaves the unit one transient away from tripping; nothing about the underlying 96% load has changed.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["silence", "mute", "acknowledge alarm", "ignore overload", "leave it"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "ups.loadOk", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "ups.loadOk", value: true },
      { type: "stateEquals", path: "ups.loadPct", value: 48 },
      { type: "stateEquals", path: "ups.outputPresent", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["ignore-overload-wrong"],
        },
        feedback:
          "Riding an overload until it trips drops the whole rack at once — the alarm was the UPS telling you it is about to give up.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Something arrived with the test rig last week — find what got plugged in alongside it.",
        category: "method",
      },
      {
        level: 2,
        text: "A UPS load is a shared budget like any other supply: every device on the bank spends from the same VA rating.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the load gauge on the front panel and match the figure against the outlet map to see which plug added the watts.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "A 1500W space heater left on outlet group B alongside the new test rig pushed the bank to 96% of the UPS rating, tripping the overload lamp while output was still live.",
      whyItWorked:
        "The gauge gave a number, the outlet trace gave a name, and the fix removed exactly the device the trace identified — no hardware was swapped for a load problem. Muting the beep would have looked like progress while leaving the unit one spike from a full rack drop. Transferable principle: when a resource gauge is in the red, account for what consumes it before you suspect the resource itself.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Overload lamp and beeping reported with no obvious change in the rack.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Load gauge read at 96%, then every device on outlet group B accounted for.",
        },
        {
          step: "Rule out",
          whatLearnerDid: "Internal UPS fault, breaker fault, and transient inrush ruled out by a steady gauge and live output.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Moved the space heater off the protected bank.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Load settled at 48%, overload lamp cleared, runtime estimate returned.",
        },
      ],
      followUps: [
        "Try ups-breaker-tripped, where the load stays high long enough for protection to open the circuit.",
      ],
    },
    knowledgeLinks: ["ups-runtime-basics"],
    references: [],
  },
  {
    id: "ups-outlet-group-dead",
    version: 1,
    title: "Half the rack lost power while the UPS shows healthy input",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate a healthy UPS from a de-energised outlet group",
      "Work the staged protection path from inlet to outlets instead of bypassing it",
    ],
    prerequisites: ["ups-battery-expired"],
    skills: ["ups", "power-protection", "troubleshooting-method"],
    ticket: {
      id: "HD-1052",
      user: "Isabel Torres",
      role: "Infrastructure engineer",
      symptomPlainLanguage:
        "About half the rack went dark ten minutes ago. The UPS front panel still looks healthy — input is green and there are no alarms from the room distribution board.",
      priority: "high",
      channel: "portal",
      additionalContext: "Nothing tripped in the room breaker.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "ups",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["ups", "ups-input", "ups-output", "ups-battery"],
      showInspector: true,
      focusTarget: { componentId: "ups-output", cameraPreset: "ups-rear" },
      initialWorld: {
        ups: {
          inputPresent: true,
          breakerOk: true,
          outletsLive: false,
          batteryOk: true,
          loadPct: 20,
          mode: "online",
          onUtility: true,
          outputPresent: false,
          loadOk: true,
        },
      },
    },
    hypotheses: [
      { id: "h-group", label: "Outlet group switched off or tripped", initiallyPlausible: true },
      { id: "h-ups", label: "UPS output stage failed", initiallyPlausible: true },
      { id: "h-room", label: "Room distribution board tripped", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the panel to see where the power chain stops, then compare the outlet banks at the rear.",
      "steps": [
        {
          "id": "guide-panel",
          "title": "Read input and output lamps",
          "explanation": "Look at the UPS front panel and note the input lamp and the output lamp as separate signals.",
          "why": "Power reaches the outlets in stages — supply, conversion, protection, bank — and the two lamps show where that chain stops.",
          "expectedObservation": "Input lamp green while the output lamp reads red.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-compare-banks",
          "title": "Compare the two outlet banks",
          "explanation": "Inspect the rear outlet group and compare the bank feeding the dark half with the bank that is still live.",
          "why": "A live bank beside a dead one names the stage that opened instead of condemning the whole unit.",
          "expectedObservation": "Rear group breaker popped while the front group stays live at a measured 20% load.",
          "target": {
            "componentId": "ups-output",
            "label": "UPS outlets",
            "cameraPreset": "ups-rear"
          },
          "actionId": "check-outlets",
          "conceptId": "ups-runtime-basics"
        },
        {
          "id": "guide-reset-breaker",
          "title": "Reset the rear group breaker",
          "explanation": "Close the breaker that popped on the rear bank, then watch the rack devices power up in sequence.",
          "why": "The popped device sits on an otherwise healthy path, and a measured 20% load rules out an overload — closing it is the smallest matched change.",
          "expectedObservation": "The rear bank energising with output returning to the rack.",
          "target": {
            "componentId": "ups-output",
            "label": "UPS outlets"
          },
          "actionId": "reset-outlet-breaker"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the UPS front panel state",
        kind: "inspect",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Establish which side of the UPS is healthy.",
        feedback:
          "Input green, output red, overload lamp off — the unit is protecting a local fault, not a load fault",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Green input with a dead output and no overload lamp proves the supply is fine and narrows the fault to the output side.",
          evidenceGain:
            "Utility feed and load level healthy — supply fault and overload ruled out; fault sits downstream of conversion.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "input green", "output red", "lamps", "overload"],
      },
      {
        id: "check-outlets",
        label: "Inspect the rear outlet group and its breaker",
        kind: "inspect",
        tool: "inspection",
        component: "ups-output",
        inspectTarget: "ups-output",
        description: "Walk the rear bank and compare the two groups.",
        patch: { ups: { outletChecked: true } },
        feedback:
          "Rear group breaker is popped; front group live. Measured no overload before it tripped",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Comparing the live front bank with the dead rear bank locates the break in the path at a single named device instead of the whole unit.",
          evidenceGain:
            "Rear group breaker popped with a measured 20% load — output stage and overload ruled out.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["rear", "outlet group", "breaker", "popped", "front group", "outlets"],
      },
      {
        id: "reset-outlet-breaker",
        label: "Reset the rear outlet-group breaker",
        kind: "ui",
        tool: "inspection",
        component: "ups-output",
        inspectTarget: "ups-output",
        description: "Close the local protection device that opened.",
        appliesWhen: {
          type: "stateEquals",
          path: "ups.outletChecked",
          value: true,
        },
        patch: { ups: { outletsLive: true } },
        feedback: "Group back live — rack devices power up in sequence",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The popped local breaker is the observed break in an otherwise healthy path; closing it after confirming no overload is the matched fix.",
          evidenceGain: "Rear bank energised; protected output restored end to end.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reset breaker", "close breaker", "rear group", "push it back in"],
      },
      {
        id: "bypass-ups-wrong",
        label: "Plug the dead half of the rack straight into the wall",
        kind: "ui",
        tool: "inspection",
        component: "ups-output",
        inspectTarget: "ups-output",
        description: "Route around the UPS instead of restoring its output.",
        patch: { ups: {} },
        feedback:
          "The dark servers come back, but they are now unprotected — the next cut takes them down with no battery ride-through at all.",
        evaluation: {
          grade: "risky",
          rationale:
            "Bypassing the unit restores power by discarding the protection the rack exists for, and hides the local breaker fault behind an undocumented extension lead.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["bypass", "plug into wall", "extension lead", "skip the ups"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "ups.outputPresent", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "ups.outletsLive", value: true },
      { type: "stateEquals", path: "ups.outputPresent", value: true },
      { type: "stateEquals", path: "ups.onUtility", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["bypass-ups-wrong"],
        },
        feedback:
          "Mains without a UPS is not a repair — you traded a popped local breaker for an unprotected rack.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Input is healthy and output is dark — where between the inlet and the outlets does the power path actually break?",
        category: "method",
      },
      {
        level: 2,
        text: "A UPS protects in stages — supply, conversion, breaker, outlet group — and each stage can open on its own.",
        category: "concept",
      },
      {
        level: 3,
        text: "Map which outlets are dead and which are live, and read the protection device sitting in front of the dead ones.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The rear outlet-group breaker had popped while the main input breaker stayed closed, so half the rack lost power with the UPS reporting perfectly healthy utility input.",
      whyItWorked:
        "The panel separated supply from output, and the rear inspection compared a live bank against a dead one to name the exact device that opened. Going straight to a wall extension would have restored power while removing battery backup entirely. Transferable principle: when the source is healthy, walk the distribution stages one at a time until you find the stage that opened.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Half the rack dark with a healthy-looking UPS and no room breaker trip.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Panel lamps read, then both outlet banks compared at the rear.",
        },
        {
          step: "Rule out",
          whatLearnerDid: "Supply fault, overload, and output-stage failure ruled out by green input, 20% load, and a live front group.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Closed the popped rear outlet-group breaker.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Rear bank live again, output present, rack devices powered up in sequence.",
        },
      ],
      followUps: [
        "Try ups-breaker-tripped, where the main breaker opens instead of a local outlet group.",
      ],
    },
    knowledgeLinks: ["ups-runtime-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "ups-input-unplugged",
    version: 1,
    title: "UPS on battery although the room has power",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Explain what the on-battery lamp actually asserts about the input feed",
      "Verify the physical inlet before blaming battery chemistry",
    ],
    prerequisites: [],
    skills: ["ups", "power-protection", "troubleshooting-method"],
    ticket: {
      id: "HD-1053",
      user: "Ben Achterberg",
      role: "Night shift support",
      symptomPlainLanguage:
        "The UPS is beeping and the display says it is running on battery, but the room clearly has power — the ceiling lights are on and the machine is not dark.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "The lamp in the same wall socket works.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "ups",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["ups", "ups-input", "ups-output", "ups-battery"],
      showInspector: true,
      focusTarget: { componentId: "ups-input", cameraPreset: "ups-rear" },
      initialWorld: {
        ups: {
          inputPresent: false,
          breakerOk: true,
          outletsLive: true,
          batteryOk: true,
          loadPct: 30,
          mode: "battery",
          onUtility: false,
          outputPresent: true,
          loadOk: true,
        },
      },
    },
    hypotheses: [
      { id: "h-inlet", label: "Mains lead not seated at the UPS inlet", initiallyPlausible: true },
      { id: "h-circuit", label: "Local outage on the UPS circuit", initiallyPlausible: true },
      { id: "h-chemistry", label: "Battery fault forcing a discharge", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Start from what the unit believes about its supply, then follow that supply back to where it enters.",
      "steps": [
        {
          "id": "guide-display",
          "title": "Read the display while on battery",
          "explanation": "Look at the UPS display and note the mode, the runtime countdown, and the overload lamp.",
          "why": "On battery means the unit is running from its reserve because it believes the supply is gone — that reports what the unit thinks, not what the room is doing.",
          "expectedObservation": "On-battery lamp lit with runtime counting down from 22 minutes and output still live.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-feed-ends",
          "title": "Check both ends of the feed",
          "explanation": "Inspect the rear IEC inlet and check that the wall socket feeding it is live.",
          "why": "The IEC inlet is where the mains lead enters the unit; proving the socket live first isolates the connector instead of a whole circuit.",
          "expectedObservation": "Mains lead sitting proud of the inlet while the socket proves live with a desk lamp.",
          "target": {
            "componentId": "ups-input",
            "label": "UPS mains input",
            "cameraPreset": "ups-rear"
          },
          "actionId": "check-input",
          "conceptId": "ups-runtime-basics"
        },
        {
          "id": "guide-seat-lead",
          "title": "Seat the mains lead fully",
          "explanation": "Push the lead into the rear inlet until it latches, then watch the unit transfer back.",
          "why": "A live socket beside a visibly unseated connector leaves seating the lead as the smallest change that matches the evidence.",
          "expectedObservation": "The on-battery lamp clearing as the unit returns to utility power.",
          "target": {
            "componentId": "ups-input",
            "label": "UPS mains input",
            "cameraPreset": "ups-rear"
          },
          "actionId": "reseat-mains-lead",
          "conceptId": "ups-runtime-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the UPS display while it is on battery",
        kind: "inspect",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Confirm what the unit believes about its supply.",
        feedback:
          "On-battery lamp, runtime counting down from 22 minutes, overload clear — the unit is discharging",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Reading the display first distinguishes a unit that thinks it lost input from a unit that cannot hold its output.",
          evidenceGain:
            "Runtime counting down with output live and load clear — battery health and load fault ruled out; input is the open question.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["display", "on battery", "runtime", "beeping", "lamp"],
      },
      {
        id: "check-input",
        label: "Inspect the rear IEC inlet and the wall socket",
        kind: "inspect",
        tool: "inspection",
        component: "ups-input",
        inspectTarget: "ups-input",
        description: "Check the physical feed at both ends.",
        patch: { ups: { inputChecked: true } },
        feedback:
          "IEC lead sits proud of the inlet — not latched; wall socket verified live with the desk lamp",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The wall socket was proven live, so testing the inlet end converts a vague outage report into a visibly unseated connector.",
          evidenceGain:
            "Socket live, inlet unseated — room circuit and battery chemistry ruled out; feed located at the connector.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["iec inlet", "rear", "cable", "socket", "unseated", "power lead"],
      },
      {
        id: "reseat-mains-lead",
        label: "Reseat the mains lead at the UPS inlet",
        kind: "ui",
        tool: "inspection",
        component: "ups-input",
        inspectTarget: "ups-input",
        description: "Latch the connector fully into the inlet.",
        appliesWhen: {
          type: "stateEquals",
          path: "ups.inputChecked",
          value: true,
        },
        patch: { ups: { inputPresent: true, mode: "online" } },
        feedback: "Input transfers back to utility; on-battery lamp clears",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A live socket and a proud connector leave only one remedy — seating the lead restores the feed the unit was reporting as missing.",
          evidenceGain: "Unit back on utility with the on-battery lamp out; discharge stopped.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["reseat", "push in the lead", "seat connector", "plug it fully in"],
      },
      {
        id: "replace-battery-wrong",
        label: "Order a replacement battery pack",
        kind: "ui",
        tool: "inspection",
        component: "ups-battery",
        inspectTarget: "ups-battery",
        description: "Replace a healthy pack that is doing exactly its job.",
        patch: { ups: {} },
        feedback:
          "A fresh pack changes nothing — with the lead still proud of the inlet the unit stays on battery and keeps counting down.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "The pack is holding the load correctly; spending stock on a healthy consumable leaves the actual feed fault untouched.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace battery", "new pack", "order battery", "swap pack"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "ups.onUtility", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "ups.onUtility", value: true },
      { type: "stateEquals", path: "ups.mode", value: "online" },
      { type: "stateEquals", path: "ups.outputPresent", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-battery-wrong"],
        },
        feedback:
          "The battery is discharging exactly as designed — the feed simply is not reaching the inlet, and chemistry is not the problem.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The room definitely has power — the question is whether the UPS itself is seeing any of it.",
        category: "method",
      },
      {
        level: 2,
        text: "On battery means the unit believes utility input is gone, even when the socket next to it is live.",
        category: "concept",
      },
      {
        level: 3,
        text: "Inspect the inlet at the rear and the lead plugged into it before you blame the pack.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The mains IEC lead sat proud of the UPS inlet without latching, so the unit saw no utility input and rode the rack on battery while the wall socket stayed live.",
      whyItWorked:
        "The display established what the unit believed, and checking both ends of the feed proved the socket live and the inlet unseated. Ordering a pack would have replaced a battery that was performing correctly while the real fault stayed in place. Transferable principle: verify the physical connection at both ends before diagnosing the device it feeds.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "UPS reporting on-battery with the room lights on and a working socket.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Display read for mode and runtime, then inlet and wall socket inspected.",
        },
        {
          step: "Rule out",
          whatLearnerDid: "Battery chemistry, load, and room circuit ruled out by countdown, clear overload lamp, and a live socket.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Seated the mains lead fully into the rear inlet.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Unit returned to online mode on utility with the on-battery lamp out.",
        },
      ],
      followUps: [
        "Try ups-battery-expired, where the utility feed is solid and the reserve itself has aged out.",
      ],
    },
    knowledgeLinks: ["ups-runtime-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "ups-breaker-tripped",
    version: 1,
    title: "UPS output died after the rack fans spun up",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read a tripped breaker as the answer to a condition rather than a one-off event",
      "Clear the condition that tripped protection before resetting it",
    ],
    prerequisites: ["ups-overload"],
    skills: ["ups", "power-protection", "troubleshooting-method"],
    ticket: {
      id: "HD-1054",
      user: "Karolina Nowak",
      role: "Systems administrator",
      symptomPlainLanguage:
        "The rack lost power a few minutes ago while the fans were spinning up. The UPS input light is on but nothing comes out of the outlets, and the unit has cut out repeatedly since.",
      priority: "high",
      channel: "phone",
      additionalContext: "It tripped twice more this morning.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "ups",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["ups", "ups-input", "ups-output", "ups-battery"],
      showInspector: true,
      focusTarget: { componentId: "ups", cameraPreset: "ups-front" },
      initialWorld: {
        ups: {
          inputPresent: true,
          breakerOk: false,
          outletsLive: true,
          batteryOk: true,
          loadPct: 88,
          mode: "online",
          onUtility: false,
          outputPresent: false,
          loadOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-breaker", label: "Main breaker opened under load", initiallyPlausible: true },
      { id: "h-overload", label: "Load above the UPS rating", initiallyPlausible: true },
      { id: "h-ups", label: "UPS output stage failed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read what the unit reports right after the cut, then find the condition that would trip it again.",
      "steps": [
        {
          "id": "guide-panel",
          "title": "Read the panel after the trip",
          "explanation": "Look at the UPS front panel and note the input lamp, the output state, and the overload lamp.",
          "why": "Green input with dead output and an overload lamp says protection acted deliberately — that frames the repair as a condition, not a broken part.",
          "expectedObservation": "Input lamp green, output dead, overload lamp amber.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel",
            "cameraPreset": "ups-front"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-breaker-log",
          "title": "Check breaker position and load log",
          "explanation": "Inspect the rear breaker's position and read the pre-trip load log on the panel.",
          "why": "A breaker — a resettable switch that opens on excess current — answers a continuing condition, and the log names what it will trip on again.",
          "expectedObservation": "Rear breaker in the tripped position with the log showing 88% and a heater on the branch just before the cut.",
          "target": {
            "componentId": "ups",
            "label": "UPS rear breaker",
            "cameraPreset": "ups-rear"
          },
          "actionId": "check-breaker",
          "conceptId": "ups-runtime-basics"
        },
        {
          "id": "guide-shed-then-reset",
          "title": "Shed the branch load, then reset",
          "explanation": "Take the extra load off that branch first, then close the breaker and watch it hold.",
          "why": "The log showed a condition rather than a moment; clearing it before resetting is what makes the closure stick this time.",
          "expectedObservation": "Breaker holding at 55% with output restored and no repeat trip.",
          "target": {
            "componentId": "ups",
            "label": "UPS front panel"
          },
          "actionId": "shed-load-reset-breaker",
          "conceptId": "ups-runtime-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the UPS front panel after the trip",
        kind: "inspect",
        tool: "device-panel",
        component: "ups",
        inspectTarget: "ups",
        description: "Establish which protection stage acted.",
        feedback: "Output dead, input lamp green, overload amber — the unit tripped protecting itself",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Green input with dead output and an overload lamp says protection acted deliberately; that frames the whole repair.",
          evidenceGain:
            "Supply healthy with an overload indication — utility fault and output-stage failure ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "input lamp", "output dead", "overload", "tripped"],
      },
      {
        id: "check-breaker",
        label: "Inspect the rear breaker and the pre-trip load log",
        kind: "inspect",
        tool: "inspection",
        component: "ups",
        inspectTarget: "ups",
        description: "Confirm the breaker position and what it was carrying.",
        patch: { ups: { breakerChecked: true } },
        feedback:
          "Rear breaker in the tripped position; logged load was 88% just before — rack fans plus the heater on one branch",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The breaker position proves the trip, and the logged 88% names the condition that will trip it again if nothing changes.",
          evidenceGain:
            "Breaker tripped at 88% logged load — output-stage failure ruled out; trip condition identified.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["breaker", "tripped position", "load log", "88", "reset switch"],
      },
      {
        id: "shed-load-reset-breaker",
        label: "Shed the extra load and reset the breaker",
        kind: "ui",
        tool: "inspection",
        component: "ups",
        inspectTarget: "ups",
        description: "Remove the overload first, then close the protection device.",
        appliesWhen: {
          type: "stateEquals",
          path: "ups.breakerChecked",
          value: true,
        },
        patch: { ups: { breakerOk: true, loadPct: 55 } },
        feedback: "Breaker holds at 55% load — output restored, no repeat trip",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The log showed the condition, not a moment; clearing the branch load before resetting is what makes the breaker hold this time.",
          evidenceGain: "Output restored with the breaker holding at 55% load; no repeat trip.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["shed load", "reset the breaker", "reduce load", "unplug branch"],
      },
      {
        id: "force-reset-wrong",
        label: "Force the breaker back on without changing anything",
        kind: "ui",
        tool: "inspection",
        component: "ups",
        inspectTarget: "ups",
        description: "Reset protection while the same overload is still connected.",
        patch: { ups: {} },
        feedback:
          "It closes for a few seconds, then trips again on the same 88% load — each attempt arcs a little more life out of the contacts.",
        evaluation: {
          grade: "risky",
          rationale:
            "Resetting under the unchanged condition repeats the trip and stresses the contacts for no gain; the load has to come down first.",
          learnMore: "ups-runtime-basics",
        },
        matchHints: ["force reset", "reset anyway", "hold it in", "flip it back"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "ups.outputPresent", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "ups.breakerOk", value: true },
      { type: "stateEquals", path: "ups.loadOk", value: true },
      { type: "stateEquals", path: "ups.outputPresent", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["force-reset-wrong"],
        },
        feedback:
          "It tripped twice already — resetting a breaker into the same overload just repeats the trip and wears the contacts.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "It tripped twice more this morning — what condition is still true every time you close it again?",
        category: "method",
      },
      {
        level: 2,
        text: "A breaker protects against a continuing condition, not a single moment in time.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the pre-trip load log on the panel to see what the unit was carrying when it opened.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The main breaker opened after load reached 88% with the rack fans and a space heater on one branch, and the same load was still connected each time it was reset.",
      whyItWorked:
        "The panel showed protection acting on an overload, and the load log named the condition that would keep repeating. Shedding the branch before closing the breaker is what made it hold; forcing it closed would have tripped again and arced the contacts. Transferable principle: a protection device is telling you about a condition — clear the condition, then reset.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Output dead after fan spin-up, with two repeat trips the same morning.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Panel lamps read after the trip, then breaker position and pre-trip load log checked.",
        },
        {
          step: "Rule out",
          whatLearnerDid: "Utility fault and output-stage failure ruled out by a green input lamp and an explicit overload indication.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Shed the extra branch load, then reset the breaker.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Breaker held at 55% load with output restored and no repeat trip.",
        },
      ],
      followUps: [
        "Try ups-overload, where the load is still in range but riding far too close to the rating.",
      ],
    },
    knowledgeLinks: ["ups-runtime-basics"],
    references: [],
  },
];
