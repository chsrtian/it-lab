import type { ScenarioInput } from "@/content/schema";
import { printerScenarios } from "./equipment/printer";
import { routerScenarios } from "./equipment/router";
import { switchScenarios } from "./equipment/switch";
import { accessPointScenarios } from "./equipment/accessPoint";
import { upsScenarios } from "./equipment/ups";
import { patchScenarios } from "./equipment/patch";
import { windowsScenarios } from "./expansion/windows";
import { linuxScenarios } from "./expansion/linux";
import { sysadminScenarios } from "./expansion/sysadmin";
import { databaseScenarios } from "./expansion/database";
import { securityScenarios } from "./expansion/security";
import { supportScenarios } from "./expansion/support";

export const scenarioList: ScenarioInput[] = [
  {
    id: "pc-no-power",
    version: 1,
    title: "Desktop PC does not power on",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Separate no-POST from no-power symptoms",
      "Check PSU, cabling, and front-panel power systematically",
    ],
    prerequisites: [],
    skills: ["hardware-diagnostics", "psu", "troubleshooting-method"],
    ticket: {
      id: "HD-1001",
      user: "Maya Chen",
      role: "Marketing coordinator",
      symptomPlainLanguage:
        "I press the power button and nothing happens. No fans, no lights, completely dead.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Worked yesterday. Storm knocked power out overnight.",
    },
    environment: {
      kind: "hardware-bench",
      shell: "none",
      availableTools: ["bench", "multimeter"],
      enabledCommands: [],
      components: ["wall", "power-supply", "motherboard", "front-panel"],
      showInspector: true,
      initialWorld: {
        bench: {
          powerSwitchAtWall: false,
          powerCableSeated: true,
          psuToggle: true,
          frontPanelConnector: false,
          psuOutputOk: false,
          fansSpin: false,
          ledsOn: false,
          posted: false,
          lastPowerEvent: "storm overnight",
        },
      },
    },
    conversation: {
      persona: "Maya Chen",
      opening:
        "I press the power button and nothing happens. No fans, no lights, completely dead.",
      followUpQuestions: [
        "Did anything change before this started?",
        "Is the outlet working for other devices?",
        "Any storm or power event last night?",
      ],
      replies: [
        {
          match: ["storm", "power out", "overnight", "lightning"],
          response:
            "Yes — a storm knocked the power out overnight. Everything else in the office was fine this morning though.",
          once: false,
          revealsConcepts: ["Power events can leave strips or switches in a weird state."],
        },
        {
          match: ["outoutlet", "outlet", "strip", "other devices"],
          when: { type: "stateEquals", path: "bench.powerSwitchAtWall", value: false },
          response:
            "My lamp is plugged into the same strip and it works. I think the strip is fine?",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["outoutlet", "outlet", "strip", "other devices"],
          when: { type: "stateEquals", path: "bench.powerSwitchAtWall", value: true },
          response:
            "OK — the strip light is on now after you checked it. The PC still does nothing when I press power.",
          once: false,
          revealsConcepts: ["Strip power restored, but the start signal path may still be broken."],
        },
        {
          match: ["button", "power button", "case"],
          when: {
            type: "stateEquals",
            path: "bench.frontPanelConnector",
            value: false,
          },
          response:
            "I hold the case power button for a second and nothing at all happens — no beep, no fan spin.",
          once: false,
          revealsConcepts: ["No fans and no LEDs usually means no power delivery, not no-POST."],
        },
        {
          match: ["button", "power button", "case"],
          when: {
            type: "all",
            conditions: [
              { type: "stateEquals", path: "bench.frontPanelConnector", value: true },
              { type: "stateEquals", path: "bench.psuOutputOk", value: true },
            ],
          },
          response:
            "After you reseated that header cable the fans kicked on and the screen showed the company logo — it posted!",
          once: false,
          revealsConcepts: ["Front-panel header carries the power-button signal to the board."],
        },
      ],
      defaultReply:
        "I only know what I see from my desk — when I press power, the machine stays completely dead.",
      mentorPrompts: [
        "Confirm the power path before assuming the PSU failed.",
        "Evidence first: wall → cable → PSU → front panel → power on.",
        "State what you observed after each check before moving on.",
      ],
    },
    conceptsOnStart: ["POST is the firmware self-test that runs before the OS loads."],
    hypotheses: [
      { id: "h-wall", label: "No power at the wall", initiallyPlausible: true },
      { id: "h-psu", label: "PSU failed", initiallyPlausible: true },
      { id: "h-front", label: "Front panel power button not connected", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro: "We will follow the power path together, from the wall to the button.",
      steps: [
        {
          id: "guide-wall",
          title: "Check the wall outlet and power strip",
          explanation: "Look at the outlet and the strip that feed the computer.",
          why: "We start at the source because a machine that looks dead may simply not be receiving power yet.",
          expectedObservation: "Look for whether power is available at the outlet.",
          target: { componentId: "wall", label: "Wall outlet and power strip" },
          actionId: "check-wall",
          cue: "INSPECT",
          doneWhen:
            "You applied \u201cCheck wall outlet / power strip\u201d and the strip reads live.",
          fallback: "the power strip along the edge of the bench",
        },
        {
          id: "guide-cable",
          title: "Reseat the PSU power cable",
          explanation:
            "Check that the power cable sits firmly in the power supply and at the strip end.",
          why: "The cable carries power from the strip into the power supply unit (PSU), the box that converts wall power for the computer's parts.",
          expectedObservation: "Look for whether the cable is fully seated at both ends.",
          target: {
            componentId: "power-supply",
            label: "PSU AC power cable",
            cameraPreset: "power-supply",
          },
          actionId: "check-cable",
          cue: "INSPECT",
          doneWhen:
            "You applied \u201cReseat PSU power cable\u201d and the cable reads seated at both ends.",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-front",
          actionId: "check-front-panel",
          title: "Inspect the front-panel power header",
          explanation: "Find where the case power button connects to the motherboard.",
          why: "The power button only works if its small header cable is seated on the motherboard pins.",
          expectedObservation: "Look for whether the header is fully seated.",
          target: {
            componentId: "front-panel",
            label: "Front-panel power switch header",
            cameraPreset: "front-panel",
          },
          cue: "INSPECT",
          doneWhen: "You applied \u201cInspect front-panel power switch header\u201d and the header reads seated.",
          completeWhen: {
            type: "stateEquals",
            path: "bench.frontPanelConnector",
            value: true,
          },
        },
        {
          id: "guide-press",
          title: "Press the power button",
          explanation: "Now try starting the machine.",
          why: "With the power path confirmed, this attempt verifies the whole chain end to end.",
          expectedObservation: "Look for whether fans spin and indicator lights come on.",
          target: { componentId: "front-panel", label: "Case power button" },
          actionId: "press-power",
          cue: "CLICK",
          doneWhen:
            "You pressed the case power button and the machine fans spin, lights come on, and it POSTs.",
        },
      ],
    },
    actions: [
      {
        id: "check-wall",
        label: "Check wall outlet / power strip",
        kind: "inspect",
        tool: "bench",
        component: "wall",
        inspectTarget: "wall",
        description: "Verify the outlet and strip actually have power.",
        patch: { bench: { powerSwitchAtWall: true } },
        feedback: "Outlet strip switch was off — power restored to the cable.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Starting at the power source is the correct first step for a completely dead PC.",
          evidenceGain: "Strip switch was off; outlet is live after correction.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["outlet", "power strip", "wall", "power at the source"],
      },
      {
        id: "check-cable",
        label: "Reseat PSU power cable",
        kind: "inspect",
        tool: "bench",
        component: "power-supply",
        inspectTarget: "power-supply",
        patch: { bench: { powerCableSeated: true } },
        feedback:
          "Cable is fully seated at the PSU and the strip end. Standby voltage tracks wall power.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale: "Checking cable seating after source power is a solid diagnostic move.",
          evidenceGain: "PSU AC cable seated; standby depends on wall power.",
        },
        matchHints: ["psu cable", "power cable", "reseat cable"],
      },
      {
        id: "check-front-panel",
        label: "Inspect front-panel power switch header",
        kind: "inspect",
        tool: "bench",
        component: "front-panel",
        inspectTarget: "front-panel",
        patch: { bench: { frontPanelConnector: true } },
        feedback: "The case power button cable was loose on the motherboard header.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With power present but no response to the case button, the front-panel header is the next link in the chain.",
          evidenceGain: "Front-panel power header was not fully seated.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["front panel", "power button header", "case button"],
      },
      {
        id: "press-power",
        label: "Press power button",
        kind: "ui",
        tool: "bench",
        component: "front-panel",
        description: "Attempt to start the system once the power path is confirmed.",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.powerSwitchAtWall", value: true },
            { type: "stateEquals", path: "bench.frontPanelConnector", value: true },
            { type: "stateEquals", path: "bench.psuOutputOk", value: true },
          ],
        },
        patch: { bench: { fansSpin: true, ledsOn: true, posted: true } },
        feedback: "Fans spin, LEDs on, system POSTs.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale: "With the power path confirmed, attempting power-on is the correct fix step.",
          evidenceGain: "System POSTs successfully.",
        },
        matchHints: ["press power", "power on", "start the pc"],
      },
      {
        id: "replace-psu-wrong",
        label: "Order a replacement PSU immediately",
        kind: "ui",
        tool: "bench",
        component: "power-supply",
        description: "Skip diagnosis and replace parts.",
        patch: { bench: {} },
        feedback:
          "Parts-swapping without evidence wastes time and money. Confirm power path first.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Replacing parts before confirming the power path is premature and costly.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace psu", "order psu", "swap power supply"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "bench.posted", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "bench.fansSpin", value: true },
      { type: "stateEquals", path: "bench.posted", value: true },
      { type: "stateEquals", path: "bench.frontPanelConnector", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.powerSwitchAtWall", value: false },
            { type: "stateEquals", path: "appliedActions", value: [] },
          ],
        },
        feedback: "Even with a good PSU, no wall power means no start. Start at the source.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Work from the wall inward: outlet → cable → PSU → case button.",
        category: "method",
      },
      {
        level: 2,
        text: "The overnight storm is a clue — check whether power is actually reaching the PC.",
        category: "concept",
      },
      {
        level: 3,
        text: "The front-panel power header may not be seated; inspect it after power path is good.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Two issues stacked: the power strip switch was off, and the case front-panel power connector was loose.",
      whyItWorked:
        "Restoring power and re-establishing the power-button signal let the PSU and motherboard complete the start sequence. Replacing the PSU alone would not have fixed the loose header. Transferable principle: with two stacked faults, prove each link in the chain — fixing only one leaves the symptom unchanged.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Confirmed complete no-power (not just no display)." },
        { step: "Gather evidence", whatLearnerDid: "Checked outlet, cable, front panel." },
        { step: "Rule out", whatLearnerDid: "Dead-PSU hypothesis dropped once outlet power and the start signal were proven at the bench." },
        { step: "Apply fix", whatLearnerDid: "Restored power path and pressed power." },
        { step: "Verify", whatLearnerDid: "Fans, LEDs, and POST observed." },
      ],
      followUps: ["Practice the no-display scenario where POST succeeds but video fails."],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "pc-on-no-display",
    version: 1,
    title: "PC powers on but no display",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "MULTI_FAULT",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Differentiate no-POST beep codes from display-path failures",
      "Isolate GPU, RAM, monitor, and cable issues",
    ],
    prerequisites: ["pc-no-power"],
    skills: ["hardware-diagnostics", "ram", "gpu", "troubleshooting-method"],
    ticket: {
      id: "HD-1002",
      user: "Jordan Lee",
      role: "Accountant",
      symptomPlainLanguage:
        "Fans turn on and lights work, but the monitor stays black. No logo, nothing.",
      priority: "high",
      channel: "phone",
    },
    environment: {
      kind: "hardware-bench",
      shell: "none",
      availableTools: ["bench"],
      enabledCommands: [],
      components: ["wall", "motherboard", "ram", "power-supply", "front-panel", "gpu"],
      showInspector: true,
      initialWorld: {
        bench: {
          powerSwitchAtWall: true,
          powerCableSeated: true,
          psuToggle: true,
          psuOutputOk: true,
          frontPanelConnector: true,
          fansSpin: true,
          ledsOn: true,
          monitorPower: true,
          videoCableToGpu: false,
          gpuSeated: true,
          ramSeated: false,
          beepCode: "one-short",
          posted: true,
          displayOk: false,
        },
      },
    },
    hypotheses: [
      { id: "h-monitor", label: "Monitor/cable", initiallyPlausible: true },
      { id: "h-ram", label: "RAM not seated", initiallyPlausible: false },
      { id: "h-gpu", label: "GPU failure", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "We will work outward along the display path, then follow whatever the board reports at startup.",
      "steps": [
        {
          "id": "guide-monitor-power",
          "title": "Confirm monitor power and input",
          "explanation": "Check the monitor's power light and confirm the selected input matches the cable in use.",
          "why": "We start outside the case because a dark panel or wrong input looks identical to a broken computer.",
          "expectedObservation": "The monitor's power LED lit with the correct input selected.",
          "target": { "componentId": "gpu", "label": "Graphics card video output" },
          "actionId": "check-monitor-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-video-cable",
          "title": "Reseat the video cable",
          "explanation": "Push the display cable firmly into the graphics card, then check the monitor end.",
          "why": "The display path has two seated ends, so a cable loose at the card still shows nothing.",
          "expectedObservation": "The connector sitting flush against the card with no gap.",
          "target": { "componentId": "gpu", "label": "Video cable to GPU" },
          "actionId": "reseat-video-cable"
        },
        {
          "id": "guide-startup-beep",
          "title": "Listen for the startup beep",
          "explanation": "Power-cycle the machine and listen to the board speaker through the entire startup.",
          "why": "POST — the firmware self-test that runs before the OS loads — reports failures as beeps when no picture appears.",
          "expectedObservation": "One short beep from the board speaker during power-on.",
          "target": { "componentId": "ram", "label": "RAM DIMM slots", "cameraPreset": "ram" },
          "actionId": "listen-beeps"
        },
        {
          "id": "guide-reseat-memory",
          "title": "Reseat the memory modules",
          "explanation": "Power off, unclip each DIMM, and press it back until the retaining latches click.",
          "why": "The beep says the board is still waiting on memory contact — reseating is the smallest change that matches it.",
          "expectedObservation": "Both modules sitting level with their latches fully closed.",
          "target": { "componentId": "ram", "label": "RAM DIMM slots", "cameraPreset": "ram" },
          "actionId": "reseat-ram"
        },
        {
          "id": "guide-verify-display",
          "title": "Power on and watch the screen",
          "explanation": "Start the machine and keep your eyes on the monitor through the whole startup.",
          "why": "Verification replays the original symptom — a picture at boot proves the entire display path, not just one link.",
          "expectedObservation": "The firmware screen appearing on the monitor after power-on.",
          "target": { "componentId": "motherboard", "label": "Motherboard startup status", "cameraPreset": "motherboard" },
          "actionId": "power-test"
        }
      ]
    },
    actions: [
      {
        id: "check-monitor-power",
        label: "Confirm monitor power and input source",
        kind: "inspect",
        tool: "bench",
        component: "gpu",
        patch: { bench: { monitorPower: true } },
        feedback: "Monitor LED is on and input is set correctly.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Confirming the monitor's power and input first rules out the cheapest display-path failure before anything internal is touched.",
          evidenceGain: "Monitor has power and the correct input — fault is downstream of the panel.",
        },
        isDiagnostic: true,
      },
      {
        id: "reseat-video-cable",
        label: "Reseat video cable into the GPU",
        kind: "inspect",
        tool: "bench",
        component: "gpu",
        patch: { bench: { videoCableToGpu: true } },
        feedback: "Cable was loose at the graphics card end.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Working the display path from the panel toward the GPU, a loose cable at the graphics-card end explains no picture with a working monitor.",
          evidenceGain: "Cable was loose at the GPU — display path interrupted at the last hop.",
        },
        isDiagnostic: true,
      },
      {
        id: "listen-beeps",
        label: "Note BIOS beep code",
        kind: "inspect",
        tool: "bench",
        component: "ram",
        patch: { bench: { beepCode: "one-short" } },
        feedback: "One short beep often means RAM check issues on many boards.",
        evaluation: {
          grade: "optimal",
          rationale:
            "POST beep codes are firmware's diagnostic channel — one short beep points at memory training, narrowing the fault beyond the cable you already fixed.",
          evidenceGain: "One-short beep — firmware flags memory, not the display path.",
        },
        isDiagnostic: true,
      },
      {
        id: "reseat-ram",
        label: "Reseat RAM modules",
        kind: "ui",
        tool: "bench",
        component: "ram",
        description: "Power off, reseat DIMMs, power on.",
        patch: { bench: { ramSeated: true } },
        feedback: "DIMMs clicked fully into place.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The beep code indicted memory; reseating the DIMMs restores the contact the firmware was waiting on. The loose cable found earlier was a separate, already-proven fault.",
          evidenceGain: "DIMMs seated — memory training obstacle removed.",
        },
        isFix: true,
      },
      {
        id: "power-test",
        label: "Power on and observe display",
        kind: "ui",
        tool: "bench",
        component: "motherboard",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.ramSeated", value: true },
            { type: "stateEquals", path: "bench.videoCableToGpu", value: true },
            { type: "stateEquals", path: "bench.monitorPower", value: true },
          ],
        },
        patch: { bench: { posted: true, displayOk: true, beepCode: "none" } },
        feedback: "POST succeeds and the display shows the firmware screen.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Both faults are corrected — powering on with the full display path seated proves POST and picture together instead of assuming success.",
          evidenceGain: "POST and firmware screen visible — display path restored end to end.",
        },
        isFix: true,
      },
    ],
    successConditions: [{ type: "stateEquals", path: "bench.displayOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "bench.posted", value: true },
      { type: "stateEquals", path: "bench.displayOk", value: true },
      { type: "stateEquals", path: "bench.ramSeated", value: true },
      { type: "stateEquals", path: "bench.videoCableToGpu", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.videoCableToGpu", value: false },
            { type: "stateEquals", path: "bench.ramSeated", value: false },
          ],
        },
        feedback:
          "You haven't isolated the fault yet. Fans spinning means power exists — inspect display path and listen for beep codes.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Fans on means PSU is at least partly OK. Focus on display path and POST signals.",
        category: "method",
      },
      {
        level: 2,
        text: "A short beep code is a clue from firmware — interpret it before swapping GPUs.",
        category: "concept",
      },
      {
        level: 3,
        text: "The beep code is firmware reporting memory — decide which link in the chain it is waiting on before you power on again.",
        category: "method",
      },
    ],
    debrief: {
      rootCause: "Unseated RAM plus a loose video cable at the GPU prevented a clean POST/display path.",
      whyItWorked:
        "Firmware halt on memory was cleared by reseating DIMMs; the display path was restored by reseating the cable. Both were required. Transferable principle: a beep code names the failing link — fix what firmware reports before chasing the symptom.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Checked monitor, cable, beep codes." },
        { step: "Form hypotheses", whatLearnerDid: "Compared display vs memory failure modes." },
        { step: "Rule out", whatLearnerDid: "Monitor panel ruled out (LED and input correct); beep code separated memory from the display path." },
        { step: "Apply fix", whatLearnerDid: "Reseated RAM and cable." },
        { step: "Verify", whatLearnerDid: "POST + display observed." },
      ],
      followUps: ["If one short beep persists after reseating, test modules individually."],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "ram-instability-crashes",
    version: 1,
    title: "PC reboots itself under load",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "INTERMITTENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 18,
    learningObjectives: [
      "Treat intermittent resets as evidence — history, load pattern, targeted test",
      "Confirm a failing module with a memory test instead of swapping parts blindly",
    ],
    prerequisites: ["pc-on-no-display"],
    skills: ["hardware-diagnostics", "ram", "troubleshooting-method"],
    ticket: {
      id: "HD-1015",
      user: "Priya Raman",
      role: "Graphic designer",
      symptomPlainLanguage:
        "The PC reboots itself mid-project — always when I have the design app and a browser stack open. It did it three times today.",
      priority: "high",
      channel: "portal",
      additionalContext: "Two 16GB sticks were installed about a month ago.",
    },
    environment: {
      kind: "hardware-bench",
      shell: "none",
      availableTools: ["bench"],
      enabledCommands: [],
      components: ["power-supply", "motherboard", "ram"],
      showInspector: true,
      focusTarget: { componentId: "ram", cameraPreset: "ram" },
      initialWorld: {
        bench: {
          powerSwitchAtWall: true,
          powerCableSeated: true,
          psuToggle: true,
          psuOutputOk: true,
          frontPanelConnector: true,
          ledsOn: true,
          fansSpin: true,
          posted: true,
          ramSeated: true,
          gpuSeated: true,
          monitorPower: true,
          videoCableToGpu: true,
          displayOk: true,
          beepCode: "none",
          lastPowerEvent: "3 unexpected restarts in 48h",
          memTestRun: false,
          dimmFaultySlot: "B1",
        },
      },
    },
    hypotheses: [
      { id: "h-mem", label: "Failing RAM module", initiallyPlausible: true },
      { id: "h-psu", label: "PSU degrading under load", initiallyPlausible: true },
      { id: "h-sw", label: "OS / driver corruption", initiallyPlausible: true },
      { id: "h-thermal", label: "Heat-related shutdown", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Characterize the resets first, then let a targeted test name the part before anything is replaced.",
      "steps": [
        {
          "id": "guide-restart-history",
          "title": "Review the restart history",
          "explanation": "Open the board's restart log and compare each reset with the workload running then.",
          "why": "How a machine dies is evidence — the reset pattern points at power, heat, or software before any part is touched.",
          "expectedObservation": "Three logged restarts, each cutting out mid-load instead of shutting down cleanly.",
          "target": { "componentId": "motherboard", "label": "Last power event on the motherboard", "cameraPreset": "motherboard" },
          "actionId": "review-crash-logs"
        },
        {
          "id": "guide-psu-rails",
          "title": "Test the supply under load",
          "explanation": "Run the PSU rail test while the machine carries its usual heavy workload.",
          "why": "Rails — the fixed voltages a supply delivers — can sag only under load and imitate many unrelated faults.",
          "expectedObservation": "The 12V rail sagging less than 1% during the load.",
          "target": { "componentId": "power-supply", "label": "PSU voltage rails", "cameraPreset": "power-supply" },
          "actionId": "check-psu-rails"
        },
        {
          "id": "guide-memory-test",
          "title": "Run the extended memory test",
          "explanation": "Start the firmware memory test and let it stress every address range.",
          "why": "With resets proven hardware-level, a targeted test names the failing part instead of guessing between modules.",
          "expectedObservation": "The test halting with errors in the address range mapped to slot B1.",
          "target": { "componentId": "ram", "label": "Memory test result", "cameraPreset": "ram" },
          "actionId": "run-memory-test",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-remove-dimm",
          "title": "Remove the flagged module",
          "explanation": "Power off, take out the module the test flagged, and reseat the remaining one.",
          "why": "Removing exactly what the test named is evidence-driven repair — swapping parts at random would hide the fault.",
          "expectedObservation": "Slot B1 empty and the remaining module clicked into A1.",
          "target": { "componentId": "ram", "label": "DIMM in slot B1", "cameraPreset": "ram" },
          "actionId": "remove-failed-dimm"
        },
        {
          "id": "guide-retest-load",
          "title": "Retest under the original load",
          "explanation": "Repeat the memory test, then run the heavy workload that used to trigger resets.",
          "why": "A fix counts only when the original conditions are replayed — a clean pass under that load proves stability.",
          "expectedObservation": "The memory test passing and the load session ending with no reset.",
          "target": { "componentId": "ram", "label": "RAM DIMM slots", "cameraPreset": "ram" },
          "actionId": "verify-stability"
        }
      ]
    },
    actions: [
      {
        id: "review-crash-logs",
        label: "Review restart history and crash pattern",
        kind: "inspect",
        tool: "bench",
        component: "motherboard",
        description: "Compare the logged restarts against workload and shutdown type.",
        patch: { bench: { crashLogsReviewed: true } },
        feedback:
          "Three hard resets logged mid-load — power cut instantly, never a clean shutdown.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Characterizing the failure first separates hardware resets from OS crashes and sets the whole search direction.",
          evidenceGain:
            "Hard resets under load — hardware-level fault, ruled out clean OS shutdowns.",
        },
        isDiagnostic: true,
        matchHints: ["history", "crash log", "restart history", "event log"],
      },
      {
        id: "check-psu-rails",
        label: "Test PSU rails under load",
        kind: "inspect",
        tool: "bench",
        component: "power-supply",
        description: "Check 12V/5V stability while the machine is under load.",
        patch: { bench: {} },
        feedback: "12V rail sags less than 1% under load — supply is healthy.",
        evaluation: {
          grade: "good",
          rationale:
            "A supply that sags under load mimics many intermittent faults, so ruling it out keeps later conclusions honest.",
          evidenceGain: "PSU rails in spec — supply ruled out as the instability source.",
          learnMore: "troubleshooting-method",
        },
        isDiagnostic: true,
        matchHints: ["psu", "rails", "voltage", "power supply test"],
      },
      {
        id: "run-memory-test",
        label: "Run an extended memory test",
        kind: "inspect",
        tool: "bench",
        component: "ram",
        description: "Firmware-level memory test that stresses every address range.",
        patch: { bench: { memTestRun: true, memTestPass: false } },
        feedback: "Test halts with errors in the address range mapped to slot B1.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Once resets are proven hardware-level, a targeted test names the failing part instead of guessing between modules.",
          evidenceGain: "Memory test failed at slot B1 — module flagged, not assumed.",
        },
        isDiagnostic: true,
        matchHints: ["memory test", "memtest", "ram test", "diagnostic test"],
      },
      {
        id: "remove-failed-dimm",
        label: "Remove the failed DIMM (slot B1)",
        kind: "ui",
        tool: "bench",
        component: "ram",
        description: "Power off, remove the flagged module, reseat the good one.",
        appliesWhen: { type: "stateEquals", path: "bench.memTestRun", value: true },
        patch: { bench: { faultyDimmOut: true } },
        feedback: "Faulty B1 module removed; the good module sits in A1.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The test named the module — removing exactly that stick is evidence-driven repair, not parts swapping.",
          evidenceGain: "Flagged module out of the system — failure source removed.",
        },
        isFix: true,
        matchHints: ["remove dimm", "pull the stick", "take out module"],
      },
      {
        id: "verify-stability",
        label: "Retest memory and run a load session",
        kind: "ui",
        tool: "bench",
        component: "ram",
        description: "Repeat the test, then reproduce the original workload.",
        appliesWhen: {
          type: "stateEquals",
          path: "bench.faultyDimmOut",
          value: true,
        },
        patch: { bench: { memTestRun: true, memTestPass: true, stabilityVerified: true } },
        feedback: "Test passes clean; a 15-minute load session ends with no reset.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Verification must reproduce the conditions that failed — a passing test plus the original load proves the fix.",
          evidenceGain: "Memory clean under load — instability no longer reproducible.",
        },
        isFix: true,
        matchHints: ["retest", "load session", "stress test", "verify stability"],
      },
      {
        id: "reinstall-os-wrong",
        label: "Reinstall Windows to clear the instability",
        kind: "ui",
        tool: "bench",
        component: "ram",
        description: "Skip hardware diagnosis and wipe/reinstall the OS.",
        patch: { bench: {} },
        feedback:
          "Reinstalling the OS cannot fix failing hardware — and it risks the user's files.",
        evaluation: {
          grade: "harmful",
          rationale:
            "Hardware faults survive an OS reinstall; wiping user data without evidence is destructive and wasted work.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reinstall", "wipe windows", "fresh install", "format"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "bench.stabilityVerified", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "bench.memTestPass", value: true },
      { type: "stateEquals", path: "bench.stabilityVerified", value: true },
      { type: "stateEquals", path: "bench.faultyDimmOut", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.memTestRun", value: false },
            { type: "stateEquals", path: "appliedActions", value: [] },
          ],
        },
        feedback:
          "Intermittent faults hide behind symptoms. Characterize the resets first — then let a test name the part.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The crash pattern itself is evidence — what kind of reset happens, and when?",
        category: "method",
      },
      {
        level: 2,
        text: "A test that fails at a named slot has already found the fault for you.",
        category: "tool",
      },
      {
        level: 3,
        text: "Fix what the test flagged, then prove stability under the same load that used to crash it.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "A failing 16GB DIMM in slot B1 caused hard resets once memory pressure reached it; the PSU and the other module were healthy.",
      whyItWorked:
        "The restart history framed a hardware reset, the PSU rule-out kept the search honest, and the memory test named the exact module so the swap was evidence-driven. Transferable principle: intermittent faults are confirmed by reproducing the load condition and letting a targeted test name the failing part.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Reviewed restart history and tested PSU rails under load.",
        },
        {
          step: "Form hypotheses",
          whatLearnerDid: "Compared failing module vs degrading PSU vs software corruption.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "PSU rails in spec ruled out supply instability; hard-reset pattern ruled out OS shutdowns.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed the module the test flagged." },
        {
          step: "Verify",
          whatLearnerDid: "Passed memory test plus a load session with no reset.",
        },
      ],
      followUps: [
        "Run the memory test twice — intermittent faults can pass on a cold run.",
        "If errors move to another slot, test the slot, not the module.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "cpu-thermal-shutdown",
    version: 1,
    title: "Workstation shuts down while rendering",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Correlate time-of-death with sensor logs to identify thermal trips",
      "Verify the cooling chain physically before condemning the CPU",
    ],
    prerequisites: ["pc-no-power"],
    skills: ["hardware-diagnostics", "thermal", "troubleshooting-method"],
    ticket: {
      id: "HD-1016",
      user: "Marcus Webb",
      role: "Video editor",
      symptomPlainLanguage:
        "The workstation powers off mid-render after ten minutes or so. Today it did it twice — I have to switch it back on myself.",
      priority: "high",
      channel: "phone",
      additionalContext: "Render corner gets warm and collects dust fast.",
    },
    environment: {
      kind: "hardware-bench",
      shell: "none",
      availableTools: ["bench"],
      enabledCommands: [],
      components: ["power-supply", "motherboard", "cpu-cooler"],
      showInspector: true,
      focusTarget: { componentId: "cpu-cooler", cameraPreset: "cpu-cooler" },
      initialWorld: {
        bench: {
          powerSwitchAtWall: true,
          powerCableSeated: true,
          psuToggle: true,
          psuOutputOk: true,
          frontPanelConnector: true,
          ledsOn: true,
          fansSpin: true,
          posted: true,
          ramSeated: true,
          gpuSeated: true,
          monitorPower: true,
          videoCableToGpu: true,
          displayOk: true,
          beepCode: "none",
          cpuFanSpinning: false,
          lastPowerEvent: "thermal shutdown 14:32",
        },
      },
    },
    hypotheses: [
      { id: "h-thermal", label: "CPU overheating (cooling fault)", initiallyPlausible: true },
      { id: "h-psu", label: "PSU thermal protection", initiallyPlausible: true },
      { id: "h-cpu", label: "CPU itself failing", initiallyPlausible: true },
      { id: "h-sw", label: "OS / driver crash", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Start from what the board recorded at the moment of shutdown, then check the cooling chain you can see.",
      "steps": [
        {
          "id": "guide-thermal-log",
          "title": "Read the hardware monitor log",
          "explanation": "Open the board's sensor history and read the entries just before each shutdown.",
          "why": "Sensor history turns \"it shuts down\" into measurable numbers — temperature and fan speed recorded by the board.",
          "expectedObservation": "94°C and 0 RPM on CPU_FAN1 logged right before the power cut.",
          "target": { "componentId": "motherboard", "label": "Hardware monitor readings", "cameraPreset": "motherboard" },
          "actionId": "read-thermal-log",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-inspect-cooler",
          "title": "Inspect the CPU cooler fan",
          "explanation": "Look at the connector on CPU_FAN1 and turn the fan blades by hand.",
          "why": "A physical check separates a loose connection from a seized fan — the sensor log alone cannot tell them apart.",
          "expectedObservation": "The connector half out of its header while the blades turn freely.",
          "target": { "componentId": "cpu-cooler", "label": "CPU cooler fan header", "cameraPreset": "cpu-cooler" },
          "actionId": "inspect-cooler-fan"
        },
        {
          "id": "guide-seat-fan-header",
          "title": "Seat the CPU fan header",
          "explanation": "Power off and push the fan connector fully onto the CPU_FAN1 pins.",
          "why": "This is the smallest change that matches the evidence you just gathered — no parts need replacing.",
          "expectedObservation": "The connector flush on the header and the fan spinning at power-on.",
          "target": { "componentId": "cpu-cooler", "label": "CPU fan connector on CPU_FAN1", "cameraPreset": "cpu-cooler" },
          "actionId": "reseat-fan-header"
        },
        {
          "id": "guide-replay-load",
          "title": "Replay the render load",
          "explanation": "Run a 15-minute load test with the sensor readings visible.",
          "why": "The original failure appeared only under sustained load, so verification must reproduce that load rather than idle.",
          "expectedObservation": "The CPU holding 61°C under full load with no shutdown.",
          "target": { "componentId": "cpu-cooler", "label": "CPU cooler under load", "cameraPreset": "cpu-cooler" },
          "actionId": "verify-thermal-load"
        }
      ]
    },
    actions: [
      {
        id: "read-thermal-log",
        label: "Read the hardware monitor log",
        kind: "inspect",
        tool: "bench",
        component: "motherboard",
        description: "Board-level sensor history around each shutdown.",
        patch: { bench: { thermalLogChecked: true, cpuTempC: 94 } },
        feedback:
          "Log shows CPU at 94°C right before power cut; CPU_FAN1 reports 0 RPM.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Sensor history turns 'it shuts down' into a measurable event — temperature plus fan RPM names the failing subsystem.",
          evidenceGain:
            "94°C with 0 RPM on the CPU fan header — thermal trip without airflow.",
        },
        isDiagnostic: true,
        matchHints: ["thermal log", "monitor log", "temperature", "hardware monitor"],
      },
      {
        id: "inspect-cooler-fan",
        label: "Inspect the CPU cooler fan and header",
        kind: "inspect",
        tool: "bench",
        component: "cpu-cooler",
        description: "Physical check of the fan connector and blades.",
        patch: { bench: { fanHeaderChecked: true } },
        feedback:
          "Fan connector is half out of the CPU_FAN1 header; blades turn freely by hand.",
        evaluation: {
          grade: "good",
          rationale:
            "Confirming the fan physically separates a connection fault from a seized fan — both look identical from the log alone.",
          evidenceGain:
            "Header half-seated — fan never spun; seized fan and dead cooler ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["fan header", "inspect fan", "cooler", "cpu fan"],
      },
      {
        id: "reseat-fan-header",
        label: "Reseat the CPU fan header",
        kind: "ui",
        tool: "bench",
        component: "cpu-cooler",
        description: "Power off and push the fan connector fully onto CPU_FAN1.",
        appliesWhen: { type: "stateEquals", path: "bench.fanHeaderChecked", value: true },
        patch: { bench: { cpuFanSpinning: true } },
        feedback: "Header fully seated; the fan spins immediately at power-on.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The inspection found the exact fault — restoring the fan connection restores cooling without touching the CPU.",
          evidenceGain: "CPU fan spinning — active cooling restored.",
        },
        isFix: true,
        matchHints: ["reseat fan", "fan connector", "plug in fan", "cpu_fan1"],
      },
      {
        id: "verify-thermal-load",
        label: "Run a 15-minute load test and watch temperatures",
        kind: "ui",
        tool: "bench",
        component: "cpu-cooler",
        description: "Reproduce the original render workload with sensors visible.",
        appliesWhen: {
          type: "stateEquals",
          path: "bench.cpuFanSpinning",
          value: true,
        },
        patch: { bench: { cpuTempC: 61, thermalVerified: true } },
        feedback: "CPU holds 61°C under full render load — no shutdown.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The original failure only appeared under sustained load — verification must replay that load with temperatures in view.",
          evidenceGain: "61°C under load — thermal headroom restored, trip not reproducible.",
        },
        isFix: true,
        matchHints: ["load test", "stress test", "watch temps", "verify temperatures"],
      },
      {
        id: "replace-cpu-wrong",
        label: "RMA the CPU immediately",
        kind: "ui",
        tool: "bench",
        component: "cpu-cooler",
        description: "Skip diagnosis and start a CPU replacement.",
        patch: { bench: {} },
        feedback:
          "RMA-ing the CPU skips the obvious — the fan never spun. Cooling first, parts second.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Condemning silicon while the fan sits unspun wastes days of RMA time and never fixes the actual fault.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["rma", "replace cpu", "new processor", "swap cpu"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "bench.thermalVerified", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "bench.cpuFanSpinning", value: true },
      { type: "stateEquals", path: "bench.thermalVerified", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.cpuFanSpinning", value: false },
            { type: "stateEquals", path: "bench.thermalLogChecked", value: false },
          ],
        },
        feedback:
          "It dies after minutes of heat, not seconds of power — read what the board's sensors recorded before replacing anything.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Time-of-death is a clue: minutes of sustained load, not the instant you press power.",
        category: "method",
      },
      {
        level: 2,
        text: "The hardware monitor log records temperatures — read what the board saw.",
        category: "tool",
      },
      {
        level: 3,
        text: "Something in the cooling chain isn't moving air. Confirm it physically before touching the CPU.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "The CPU fan header was half-seated, so the CPU lost active cooling and thermal-protected at 94°C under sustained load.",
      whyItWorked:
        "The sensor log proved a thermal trip, the physical inspection found the half-seated header and cleared a seized fan, and the load test confirmed sustained temperatures. Transferable principle: correlate time-of-death with sensor data, and verify the cooling chain you can physically see before condemning silicon.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Read the hardware monitor log and inspected the cooler fan.",
        },
        {
          step: "Form hypotheses",
          whatLearnerDid: "Weighed overheating vs PSU protection vs CPU failure.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Freely turning blades ruled out a seized fan; the 0 RPM header reading focused the fault on the connection.",
        },
        { step: "Apply fix", whatLearnerDid: "Seated the CPU fan header fully." },
        {
          step: "Verify",
          whatLearnerDid: "Reproduced the render load — 61°C steady, no shutdown.",
        },
      ],
      followUps: [
        "Dust filters and heatsink fins degrade airflow over months — schedule cleaning.",
        "Alert on 0 RPM fan readings so the next trip is caught before shutdown.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "storage-not-detected",
    version: 1,
    title: "No boot device found after cleaning",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Translate a 'no boot device' message into a board-to-drive link problem",
      "Prove enumeration before replacing storage or changing boot configuration",
    ],
    prerequisites: ["pc-no-power"],
    skills: ["hardware-diagnostics", "storage", "troubleshooting-method"],
    ticket: {
      id: "HD-1017",
      user: "Tom Ferris",
      role: "Warehouse supervisor",
      symptomPlainLanguage:
        "This morning it boots to a black screen that says No boot device found, press F1. Yesterday it was fine.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "The desks got a deep clean over the weekend — cables were moved around.",
    },
    environment: {
      kind: "hardware-bench",
      shell: "none",
      availableTools: ["bench"],
      enabledCommands: [],
      components: ["power-supply", "motherboard", "storage"],
      showInspector: true,
      focusTarget: { componentId: "storage", cameraPreset: "storage" },
      initialWorld: {
        bench: {
          powerSwitchAtWall: true,
          powerCableSeated: true,
          psuToggle: true,
          psuOutputOk: true,
          frontPanelConnector: true,
          ledsOn: true,
          fansSpin: true,
          posted: true,
          ramSeated: true,
          gpuSeated: true,
          monitorPower: true,
          videoCableToGpu: true,
          displayOk: true,
          beepCode: "none",
          sataDataSeated: false,
          sataPowerSeated: true,
          driveDetected: false,
          lastPowerEvent: "no boot device found (F1)",
        },
      },
    },
    hypotheses: [
      { id: "h-drive", label: "Drive has failed", initiallyPlausible: true },
      { id: "h-boot", label: "Boot order changed", initiallyPlausible: true },
      { id: "h-cable", label: "Loose SATA data cable", initiallyPlausible: false },
      { id: "h-board", label: "Motherboard SATA port dead", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the firmware message literally, then work the two links between board and drive until the port sees the disk.",
      "steps": [
        {
          "id": "guide-boot-message",
          "title": "Read the firmware boot message",
          "explanation": "Capture exactly what firmware prints during startup before touching any cable.",
          "why": "Firmware — the board's built-in startup software — reports literally what it can and cannot see.",
          "expectedObservation": "The message \"No boot device found\" with SATA port 1 reported empty.",
          "target": { "componentId": "motherboard", "label": "Firmware boot message" },
          "actionId": "read-boot-error"
        },
        {
          "id": "guide-sata-cables",
          "title": "Inspect both SATA cables",
          "explanation": "Check the data and power connectors at the drive and where they meet the board.",
          "why": "The drive needs two links — data carries the bits, power feeds the drive — so check both before judging it.",
          "expectedObservation": "The power connector seated while the data cable sits loose at the drive end.",
          "target": { "componentId": "storage", "label": "SATA data and power connectors", "cameraPreset": "storage" },
          "actionId": "inspect-sata-cables"
        },
        {
          "id": "guide-boot-order",
          "title": "Check the firmware boot order",
          "explanation": "Open the firmware settings and confirm the SSD is still the first boot device.",
          "why": "A changed boot order produces the same message as a missing drive — ruling it out prevents a pointless change.",
          "expectedObservation": "The SATA SSD listed first with no stray entries.",
          "target": { "componentId": "motherboard", "label": "Firmware boot order list" },
          "actionId": "check-boot-order",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-reseat-data",
          "title": "Reseat the SATA data cable",
          "explanation": "Push the data connector fully into the drive and the board port until it seats.",
          "why": "The inspection found the broken link — restoring it is the smallest change that matches the evidence.",
          "expectedObservation": "The connector flush at both the drive end and the board port.",
          "target": { "componentId": "storage", "label": "SATA data cable", "cameraPreset": "storage" },
          "actionId": "reseat-sata-data"
        },
        {
          "id": "guide-verify-boot",
          "title": "Power cycle and watch enumeration",
          "explanation": "Restart the machine and watch firmware list the drives before it hands off to Windows.",
          "why": "Verification proves enumeration — the exact observation that was failing — instead of assuming the cable fixed it.",
          "expectedObservation": "The 500GB SSD listed on port 1 and the desktop loading.",
          "target": { "componentId": "storage", "label": "SATA SSD in the storage bay", "cameraPreset": "storage" },
          "actionId": "verify-boot"
        }
      ]
    },
    actions: [
      {
        id: "read-boot-error",
        label: "Read the firmware boot message",
        kind: "inspect",
        tool: "bench",
        component: "motherboard",
        description: "Capture exactly what firmware reports during POST.",
        patch: { bench: { bootErrorRead: true } },
        feedback: "Firmware message: 'No boot device found.' SATA port 1 reports empty.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reading the firmware literally narrows a vague 'won't boot' into a port-level observation before any hardware is touched.",
          evidenceGain: "Port 1 enumerates as empty — fault sits on the board-to-drive link.",
        },
        isDiagnostic: true,
        matchHints: ["boot message", "firmware", "post", "error message"],
      },
      {
        id: "inspect-sata-cables",
        label: "Inspect SATA data and power cables at the drive",
        kind: "inspect",
        tool: "bench",
        component: "storage",
        description: "Check both links between board and drive.",
        patch: { bench: { cableInspectChecked: true } },
        feedback: "Power connector seated; data cable is loose at the drive end.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The drive needs two links — checking both separates a broken data path from a dead drive in one step.",
          evidenceGain: "Data cable not seated — power link good, data link broken.",
        },
        isDiagnostic: true,
        matchHints: ["sata", "cable", "data cable", "inspect cables"],
      },
      {
        id: "check-boot-order",
        label: "Check firmware boot order",
        kind: "inspect",
        tool: "bench",
        component: "motherboard",
        description: "Confirm the firmware still looks for the SSD first.",
        patch: { bench: { bootOrderChecked: true } },
        feedback: "Boot order still lists the SATA SSD first; no stray entries.",
        evaluation: {
          grade: "good",
          rationale:
            "Boot order is the classic misdirection for this message — ruling it out prevents a pointless settings change.",
          evidenceGain: "Boot order ruled out — firmware looks for the right device first.",
          learnMore: "troubleshooting-method",
        },
        isDiagnostic: true,
        matchHints: ["boot order", "boot sequence", "firmware settings"],
      },
      {
        id: "reseat-sata-data",
        label: "Reseat the SATA data cable",
        kind: "ui",
        tool: "bench",
        component: "storage",
        description: "Push the data connector fully into drive and board ports.",
        appliesWhen: {
          type: "stateEquals",
          path: "bench.cableInspectChecked",
          value: true,
        },
        patch: { bench: { sataDataSeated: true } },
        feedback: "Cable clicked fully into the drive and board ports.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Inspection found the broken link — restoring the data path is the smallest change that addresses the evidence.",
          evidenceGain: "Data link restored — board and drive connected again.",
        },
        isFix: true,
        matchHints: ["reseat", "sata data", "push cable", "reconnect drive"],
      },
      {
        id: "verify-boot",
        label: "Power cycle and confirm drive detection",
        kind: "ui",
        tool: "bench",
        component: "storage",
        description: "Restart and watch firmware enumerate the drive.",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.sataDataSeated", value: true },
            { type: "stateEquals", path: "bench.bootOrderChecked", value: true },
          ],
        },
        patch: { bench: { driveDetected: true, bootVerified: true } },
        feedback:
          "Firmware enumerates the 500GB SSD on port 1 and boots to the desktop.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Verification proves enumeration — the exact observation that was failing — instead of assuming the cable fixed it.",
          evidenceGain: "Drive enumerated and boot reached — link confirmed end to end.",
        },
        isFix: true,
        matchHints: ["power cycle", "reboot", "confirm detection", "verify boot"],
      },
      {
        id: "replace-drive-wrong",
        label: "Replace the SSD immediately",
        kind: "ui",
        tool: "bench",
        component: "storage",
        description: "Order a new drive without checking the link.",
        patch: { bench: {} },
        feedback:
          "The firmware sees an empty port, not a dying drive — a new SSD would show the same error.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Replacing storage while the link is unproven spends money on hardware and leaves the real fault in place.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace ssd", "new drive", "swap drive", "buy ssd"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "bench.bootVerified", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "bench.sataDataSeated", value: true },
      { type: "stateEquals", path: "bench.driveDetected", value: true },
      { type: "stateEquals", path: "bench.bootVerified", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.sataDataSeated", value: false },
            { type: "stateEquals", path: "bench.cableInspectChecked", value: false },
          ],
        },
        feedback:
          "Start with what the firmware told you — the port is the observation point, not the parts cart.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Read the firmware message literally: it is telling you what it cannot see.",
        category: "method",
      },
      {
        level: 2,
        text: "Two links reach the drive — data and power. Check both ends before judging the drive.",
        category: "concept",
      },
      {
        level: 3,
        text: "Prove the port enumerates the device before you trust any boot attempt.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The SATA data cable had worked loose at the drive end, so firmware enumerated an empty port and found no boot device.",
      whyItWorked:
        "The firmware message pointed at the port, the cable inspection found the broken link while power checked out, and the boot-order rule-out prevented a pointless settings change. Transferable principle: 'no device' means the link first — prove enumeration before you replace storage or touch boot configuration.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Read the boot message, inspected both SATA links, and checked boot order.",
        },
        {
          step: "Form hypotheses",
          whatLearnerDid: "Compared failed drive vs changed boot order vs loose cable.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power cable seated and boot order unchanged — settings and supply ruled out.",
        },
        { step: "Apply fix", whatLearnerDid: "Reseated the SATA data cable." },
        {
          step: "Verify",
          whatLearnerDid: "Firmware enumerated the drive and the system booted.",
        },
      ],
      followUps: [
        "If the cable loosens again, check the drive tray screw — vibration walks connectors out.",
        "SMART warnings only appear after enumeration, so an empty port is always link-layer first.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "windows-wont-boot",
    version: 1,
    title: "Windows fails to start after update",
    category: "windows",
    difficulty: "beginner",
    scenarioType: "RECOVERY",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 18,
    learningObjectives: [
      "Use recovery/startup repair concepts safely",
      "Correlate update events with boot failure",
    ],
    prerequisites: [],
    skills: ["windows-boot", "recovery", "event-logs"],
    ticket: {
      id: "HD-1003",
      user: "Sam Ortiz",
      role: "HR specialist",
      symptomPlainLanguage:
        "My laptop shows the spinning dots forever after the update last night. It never reaches login.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["recovery", "event-viewer"],
      enabledCommands: ["systeminfo", "tasklist", "ipconfig"],
      components: ["event-viewer", "task-manager", "services"],
      showInspector: true,
      initialWorld: {
        currentUser: "sam",
        hosts: [
          {
            id: "host1",
            name: "LAPTOP-HR2",
            os: "windows",
            ips: ["192.168.1.55"],
            mac: "00:1A:2B:3C:4D:5E",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        boot: {
          reachesLogo: true,
          reachesLogin: false,
          lastUpdatePending: true,
          safeModeBoot: false,
          startupRepairRan: false,
        },
        logs: [
          "2026-09-22 02:14:11 INFO  Update installed: KB5041234",
          "2026-09-22 02:20:45 ERROR Staging failed for pending operations",
          "2026-09-22 02:21:02 ERROR Boot manager: 0xC000000F",
        ],
      },
    },
    conversation: {
      persona: "Sam Ortiz",
      opening: "My laptop shows the spinning dots forever after the update last night.",
      followUpQuestions: [
        "When did you last shut down cleanly?",
        "Any external drives attached?",
        "Did the update finish before the hang?",
      ],
      replies: [
        {
          match: ["repair", "restarted", "fixed", "progress"],
          when: { type: "stateEquals", path: "boot.startupRepairRan", value: true },
          response:
            "It restarted twice and now shows the login spinner instead of hanging — that's new.",
          once: false,
          revealsConcepts: ["Judge a repair by observed behavior change, not by the tool's exit status."],
        },
        {
          match: ["update", "night", "kb", "patch"],
          response:
            "Windows updated overnight. This morning it never gets past the spinning dots.",
          once: false,
          revealsConcepts: ["Boot failures after updates often correlate with staged operations."],
        },
        {
          match: ["external", "usb", "drive"],
          response: "No USB drives or docks attached — just power and the built-in keyboard.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply:
        "It shows the Windows logo, then endless spinning dots. Never reaches login.",
      mentorPrompts: [
        "Read recovery options and logs before reinstalling.",
        "Correlate update staging with boot manager errors.",
      ],
    },
    hypotheses: [
      { id: "h-driver", label: "Bad driver in update", initiallyPlausible: true },
      { id: "h-disk", label: "Disk failure", initiallyPlausible: false },
      { id: "h-boot-files", label: "Corrupt boot configuration", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Work inside recovery: read what changed last night, then repair only what the logs justify.",
      "steps": [
        {
          "id": "guide-enter-recovery",
          "title": "Enter the recovery environment",
          "explanation": "From Tools, run Boot to recovery environment to reach advanced startup.",
          "why": "Recovery options are repair tools that load without starting Windows, and they are unreachable until you boot into them.",
          "expectedObservation": "The machine restarting into advanced startup with its recovery options listed.",
          "target": { "componentId": "event-viewer", "label": "Checks list in the Windows workstation panel" },
          "actionId": "boot-recovery",
          "conceptId": "windows-boot-repair"
        },
        {
          "id": "guide-read-boot-log",
          "title": "Read last night's boot log",
          "explanation": "Open the Event Viewer tab and read the entries left by the overnight update.",
          "why": "Boot and update logs show what changed just before the hang, and their timestamps narrow the failure to one event.",
          "expectedObservation": "A staging failure at 02:20:45 and boot-manager error 0xC000000F at 02:21:02.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "review-boot-logs",
          "conceptId": "windows-event-logs"
        },
        {
          "id": "guide-startup-repair",
          "title": "Run Startup Repair",
          "explanation": "From Tools, run Startup Repair now that the log has been read.",
          "why": "It is the least-destructive option matching the evidence you just gathered, and it leaves user data untouched.",
          "expectedObservation": "Startup Repair reporting that pending update operations were rolled back.",
          "target": { "componentId": "event-viewer", "label": "Windows workstation panel" },
          "actionId": "run-startup-repair"
        },
        {
          "id": "guide-safe-mode",
          "title": "Confirm with a Safe Mode boot",
          "explanation": "From Tools, attempt Safe Mode and see how far the boot gets.",
          "why": "Safe Mode loads a minimal driver set, so reaching a desktop there shows the repair held before a full boot.",
          "expectedObservation": "A minimal Safe Mode desktop appearing instead of the endless spinner.",
          "target": { "componentId": "event-viewer", "label": "Checks list in the Windows workstation panel" },
          "actionId": "safe-mode"
        },
        {
          "id": "guide-normal-boot",
          "title": "Restart into normal Windows",
          "explanation": "From Tools, restart into normal Windows and watch the boot complete.",
          "why": "Reproducing the original boot path is the only honest end-to-end verification of the repair.",
          "expectedObservation": "The login screen appearing instead of the spinning dots.",
          "target": { "componentId": "event-viewer", "label": "Windows workstation panel" },
          "actionId": "normal-boot"
        }
      ]
    },
    actions: [
      {
        id: "boot-recovery",
        label: "Boot to recovery environment",
        kind: "ui",
        tool: "recovery",
        patch: { boot: { reachesLogo: true, recoveryAvailable: true } },
        feedback: "Recovery options are available from advanced startup.",
        evaluation: {
          grade: "optimal",
          rationale:
            "You cannot choose a repair without seeing what recovery offers — entering the environment is the least-destructive first move.",
          evidenceGain: "Recovery environment loads — repair and log tools reachable.",
        },
        isDiagnostic: true,
      },
      {
        id: "review-boot-logs",
        label: "Read boot and update logs in recovery",
        kind: "ui",
        tool: "recovery",
        appliesWhen: { type: "stateEquals", path: "boot.recoveryAvailable", value: true },
        patch: { boot: { logsReviewed: true } },
        feedback:
          "Boot log shows the overnight update interrupted mid-staging; no disk I/O errors recorded.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket mentioned an overnight update — reading what actually changed last night separates an incomplete staging operation from disk or driver failure before any repair runs.",
          evidenceGain:
            "Update staging interrupted mid-commit with clean disk I/O — rules out hardware failure.",
        },
        isDiagnostic: true,
      },
      {
        id: "run-startup-repair",
        label: "Run Startup Repair",
        kind: "ui",
        tool: "recovery",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "boot.recoveryAvailable", value: true },
            { type: "stateEquals", path: "boot.logsReviewed", value: true },
          ],
        },
        patch: { boot: { startupRepairRan: true, lastUpdatePending: false } },
        feedback:
          "Startup Repair found pending update staging errors and rolled back the incomplete operation.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The log showed an incomplete staging operation, so Startup Repair rolls back the pending boot-config change — the least-destructive fix that matches the evidence.",
          evidenceGain: "Pending update staging rolled back.",
        },
        isFix: true,
      },
      {
        id: "safe-mode",
        label: "Attempt Safe Mode boot",
        kind: "ui",
        tool: "recovery",
        appliesWhen: { type: "stateEquals", path: "boot.startupRepairRan", value: true },
        patch: { boot: { safeModeBoot: true } },
        feedback: "Safe Mode reaches a minimal desktop — good confirmation.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Safe Mode proves the repair held under a minimal driver set before you risk a full boot — confirmation, not an assumption.",
          evidenceGain: "Minimal environment reaches desktop — boot chain functional.",
        },
        isDiagnostic: true,
      },
      {
        id: "normal-boot",
        label: "Restart into normal Windows",
        kind: "ui",
        tool: "recovery",
        appliesWhen: { type: "stateEquals", path: "boot.safeModeBoot", value: true },
        patch: { boot: { reachesLogin: true } },
        feedback: "Login screen appears. Boot restored.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With staging cleared and Safe Mode confirmed, a normal boot is the honest end-to-end verification of the fix.",
          evidenceGain: "Login screen reached — boot restored under normal drivers.",
        },
        isFix: true,
      },
      {
        id: "factory-reset-wrong",
        label: "Factory reset the device",
        kind: "ui",
        tool: "recovery",
        evaluation: {
          grade: "harmful",
          rationale:
            "A factory reset would destroy Sam's data to solve a staging error the logs already explain. The boot record showed an incomplete update — the least-destructive recovery that rolls back pending work was available and sufficient.",
        },
        feedback:
          "Reset destroys user data. Always try least-destructive recovery first.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "boot.reachesLogin", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "boot.reachesLogin", value: true },
      { type: "stateEquals", path: "boot.startupRepairRan", value: true },
      { type: "stateEquals", path: "boot.lastUpdatePending", value: false },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["factory-reset-wrong"],
        },
        feedback: "Factory reset is not reversible for local data — back out of that path.",
      },
    ],
    hints: [
      { level: 1, text: "The ticket mentions an overnight update — correlate that with boot logs." },
      {
        level: 2,
        text: "Before reaching for any repair tool, what did the boot and update logs say changed last night?",
        category: "method",
      },
      {
        level: 3,
        text: "The staging error means an operation is incomplete, not destroyed — which recovery option undoes pending work without touching user data?",
        category: "concept",
      },
    ],
    debrief: {
      rootCause: "An incompletely staged Windows update left boot configuration pending and blocked startup.",
      whyItWorked:
        "Startup Repair completed/rolled back the pending staging, after which a normal boot could proceed. Transferable principle: the least-destructive repair that matches log evidence beats any destructive option.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Read boot logs showing staging failure." },
        { step: "Rule out", whatLearnerDid: "Disk failure dropped — no I/O errors in the boot log; staging error matched the symptom." },
        { step: "Apply fix", whatLearnerDid: "Non-destructive Startup Repair." },
        { step: "Verify", whatLearnerDid: "Safe Mode then normal login." },
      ],
      followUps: ["Check Windows Update history after login for repeated failures."],
    },
    knowledgeLinks: ["windows-boot-repair", "windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn — Startup Repair",
        url: "https://learn.microsoft.com/en-us/windows-server/troubleshoot/startup-repair",
        note: "Link only.",
      },
    ],
  },
  {
    id: "windows-app-crash",
    version: 1,
    title: "Application keeps crashing",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: ["Use Event Viewer to find faulting modules", "Correlate crashes with config"],
    prerequisites: ["windows-wont-boot"],
    skills: ["event-logs", "application-support"],
    ticket: {
      id: "HD-1004",
      user: "Priya Nair",
      role: "Analyst",
      symptomPlainLanguage: "The reporting app closes by itself every time I open the Q3 file.",
      priority: "medium",
      channel: "email",
    },
    environment: {
      components: ["event-viewer", "services"],
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "services"],
      enabledCommands: ["tasklist", "systeminfo"],
      initialWorld: {
        currentUser: "priya",
        services: [
          {
            id: "reporting",
            name: "ReportSvc",
            status: "stopped",
            pid: 0,
            description: "Reporting helper service",
            lastError: ["Service terminated with exit code 1067"],
          },
        ],
        logs: [
          "2026-09-23 09:12:01 ERROR Faulting application: reportapp.exe",
          "2026-09-23 09:12:01 ERROR Faulting module: ntdll.dll",
          "2026-09-23 09:11:58 WARN  Config profile: Q3-legacy missing dependency VC2010",
          "2026-09-23 09:12:02 INFO  ReportSvc stopped unexpectedly",
        ],
        app: {
          crashOnQ3: true,
          dependencyInstalled: false,
          serviceRunning: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-corrupt-file", label: "Corrupt Q3 file", initiallyPlausible: true },
      { id: "h-dependency", label: "Missing runtime dependency", initiallyPlausible: false },
      { id: "h-service", label: "Helper service down", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Match the crash to a single log entry first, then restore only what that entry names.",
      "steps": [
        {
          "id": "guide-application-log",
          "title": "Open the Application log",
          "explanation": "Select the Event Viewer tab and find the entries recorded when the app closed.",
          "why": "Windows records application crashes as faulting entries, so timestamps there correlate the crash with what was running.",
          "expectedObservation": "Faulting application entries timed at 09:12:01, the moment the app closed.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "open-event-viewer",
          "conceptId": "windows-event-logs"
        },
        {
          "id": "guide-faulting-module",
          "title": "Read the faulting module entry",
          "explanation": "Open the faulting entry and read the module name plus the warning logged just before it.",
          "why": "The faulting module names the code that actually failed, turning a vague crash into something concrete to restore.",
          "expectedObservation": "Faulting module ntdll.dll preceded by a warning about a missing VC2010 dependency.",
          "target": { "componentId": "event-viewer", "label": "Faulting module entry in Event Viewer" },
          "actionId": "read-faulting-module"
        },
        {
          "id": "guide-install-runtime",
          "title": "Install the missing runtime",
          "explanation": "From Tools, run Install missing VC++ 2010 runtime, then watch ReportSvc in this tab.",
          "why": "Restoring what the log named removes the faulting condition itself — the smallest change that matches the evidence.",
          "expectedObservation": "The runtime reported installed for the Q3-legacy profile.",
          "target": { "componentId": "services", "label": "Services tab" },
          "actionId": "install-dependency"
        },
        {
          "id": "guide-start-service",
          "title": "Start the ReportSvc helper",
          "explanation": "From Tools, run Start ReportSvc while the Services tab is open.",
          "why": "The helper backs the reporting app, so pairing it with the runtime fix covers both conditions seen in the log.",
          "expectedObservation": "ReportSvc showing running with PID 4242 in the Services tab.",
          "target": { "componentId": "services", "label": "ReportSvc row in the Services tab" },
          "actionId": "start-service"
        },
        {
          "id": "guide-reopen-q3",
          "title": "Reopen the Q3 file",
          "explanation": "From Tools, open the Q3 file again while watching the Application log.",
          "why": "Reproducing the original open is the only honest proof the crash is gone — idle checks would pass either way.",
          "expectedObservation": "The file staying open with no new faulting entry in the log.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "verify-open-q3"
        }
      ]
    },
    actions: [
      {
        id: "open-event-viewer",
        label: "Open Application log",
        kind: "inspect",
        tool: "event-viewer",
        patch: {},
        feedback: "Found faulting application entries with timestamps matching the crash.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket describes a reproducible crash — the Application log's faulting entries with matching timestamps are where Windows records the cause.",
          evidenceGain: "Faulting application entries match the crash timestamps.",
        },
        isDiagnostic: true,
      },
      {
        id: "read-faulting-module",
        label: "Inspect faulting module details",
        kind: "inspect",
        tool: "event-viewer",
        patch: { app: { dependencyInstalled: true } },
        feedback:
          "Missing VC2010 runtime for the Q3-legacy profile — installing the dependency is indicated.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The faulting-module warning names the missing VC++ 2010 runtime — the concrete dependency the profile needs, turning a vague crash into an actionable cause.",
          evidenceGain: "Faulting module reports a missing VC++ 2010 runtime.",
        },
        isDiagnostic: true,
      },
      {
        id: "install-dependency",
        label: "Install missing VC++ 2010 runtime",
        kind: "ui",
        tool: "services",
        inspectTarget: "ReportSvc",
        appliesWhen: { type: "stateEquals", path: "app.dependencyInstalled", value: true },
        patch: { app: { dependencyInstalled: true, crashOnQ3: false } },
        feedback: "Runtime installed for the legacy profile.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Restoring the runtime removes the faulting condition itself; the service check and file reopen that follow prove it under real use.",
          evidenceGain: "Runtime present — crash precondition removed.",
        },
        isFix: true,
      },
      {
        id: "start-service",
        label: "Start ReportSvc",
        kind: "ui",
        tool: "services",
        inspectTarget: "ReportSvc",
        patch: { services: [{ id: "reporting", name: "ReportSvc", status: "running", pid: 4242 }], app: { serviceRunning: true } },
        feedback: "ReportSvc is running.",
        evaluation: {
          grade: "reasonable",
          rationale:
            "Starting ReportSvc is necessary for verification, but alone it does not explain the faulting module — without the runtime fix, opening the file would crash again. Keep it paired with the log evidence.",
          evidenceGain: "ReportSvc running — backend helper available for the reopen test.",
        },
        isFix: true,
      },
      {
        id: "verify-open-q3",
        label: "Open the Q3 file to verify",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "app.crashOnQ3", value: false },
            { type: "stateEquals", path: "app.serviceRunning", value: true },
          ],
        },
        patch: { app: { verified: true } },
        feedback: "File opens and stays open. Crash no longer reproduces.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reproducing the original open is the only honest proof the crash is gone — the dependency and the service must hold together under the real workload.",
          evidenceGain: "Q3 file opens and stays open — crash does not reproduce.",
        },
        isFix: true,
      },
      {
        id: "delete-user-file-wrong",
        label: "Delete the user's Q3 file",
        kind: "ui",
        tool: "event-viewer",
        evaluation: {
          grade: "harmful",
          rationale:
            "Deleting Priya's file would destroy the only reproduction case. The faulting-module warning points at a missing runtime — restore what the profile needs before blaming the file.",
        },
        feedback: "Destructive and unnecessary — logs point at a missing dependency, not file corruption.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "app.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "app.verified", value: true },
      { type: "stateEquals", path: "app.crashOnQ3", value: false },
      { type: "stateEquals", path: "app.serviceRunning", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["delete-user-file-wrong"],
        },
        feedback:
          "Destructive — deleting user data risks permanent loss, and the evidence points at a missing dependency, not file corruption.",
      },
    ],
    hints: [
      { level: 1, text: "Match the crash time to Application log events." },
      { level: 2, text: "The warning before the fault mentions a missing dependency." },
      {
        level: 3,
        text: "The crash signature is identical every time — get the profile back to a runnable state, then reopen the file to prove the fault is gone.",
        category: "direct",
      },
    ],
    debrief: {
      rootCause: "Missing VC++ 2010 runtime plus a stopped ReportSvc helper caused crashes on the Q3-legacy profile.",
      whyItWorked:
        "Fixing the dependency removed the faulting condition; restarting the service restored required backend support. Verification proved non-reproduction. Transferable principle: when the log names a missing dependency, restore it before ever touching the user's file.",
      methodologyMap: [
        { step: "Reproduce", whatLearnerDid: "Crash on Q3 open noted in ticket." },
        { step: "Evidence", whatLearnerDid: "Event Viewer faulting module + warning." },
        { step: "Rule out", whatLearnerDid: "Corrupt-file hypothesis dropped — identical faulting module every run." },
        { step: "Fix + Verify", whatLearnerDid: "Dependency + service + reopen test." },
      ],
      followUps: ["Document the runtime as a prerequisite in the app install guide."],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [],
  },
  {
    id: "windows-update-failure",
    version: 1,
    title: "Windows Update fails with 0x80070002",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "RECOVERY",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Interpret update error codes as state, not noise",
      "Reset update components only after evidence names the corrupt store",
    ],
    prerequisites: ["windows-app-crash"],
    skills: ["event-logs", "windows-update"],
    ticket: {
      id: "HD-1018",
      user: "Owen Brady",
      role: "Payroll coordinator",
      symptomPlainLanguage:
        "Windows Update fails with 0x80070002 every night. It downloads, rolls back, and tries again.",
      priority: "medium",
      channel: "portal",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "services"],
      enabledCommands: ["tasklist", "systeminfo"],
      components: ["event-viewer", "services", "storage"],
      showInspector: true,
      initialWorld: {
        currentUser: "owen",
        hosts: [
          {
            id: "host1",
            name: "DESKTOP-PAY3",
            os: "windows",
            ips: ["192.168.1.72"],
            mac: "00:1A:2B:77:88:99",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        logs: [
          "2026-09-25 03:02:11 WARN  Downloaded KB5041566 (100%) from WSUS",
          "2026-09-25 03:02:44 ERROR 0x80070002 install failed: hash mismatch in SoftwareDistribution\\Download",
          "2026-09-25 03:03:02 INFO  Rollback of staged package completed",
          "2026-09-25 03:14:11 WARN  Retry 3 failed with 0x80070002",
        ],
        services: [
          { id: "wuauserv", name: "wuauserv (Windows Update)", status: "running", pid: 1872 },
          { id: "bits", name: "BITS", status: "running", pid: 2044 },
        ],
        disks: [
          {
            fs: "NTFS",
            mount: "C:",
            size: "476 GB",
            used: "182 GB",
            avail: "294 GB",
            usePercent: "38%",
          },
        ],
        update: {
          historyReviewed: false,
          servicesChecked: false,
          cacheInspected: false,
          cacheCorrupt: true,
          componentsReset: false,
          installVerified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-cache", label: "Corrupt update download cache", initiallyPlausible: true },
      { id: "h-network", label: "WSUS or proxy unreachable", initiallyPlausible: true },
      { id: "h-disk", label: "Not enough free disk space", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Read the update history to see where the install breaks, then repair only what that evidence names.",
      "steps": [
        {
          "id": "guide-update-history",
          "title": "Read the Windows Update history",
          "explanation": "Open the Event Viewer tab and read the entries covering KB5041566's three attempts.",
          "why": "An error code raised after a completed download already separates fetching from verifying, and the history shows which stage failed.",
          "expectedObservation": "Three attempts downloading to 100% and then failing with 0x80070002.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "review-update-history",
          "conceptId": "windows-event-logs"
        },
        {
          "id": "guide-update-services",
          "title": "Check the update services",
          "explanation": "Open the Services tab and look at wuauserv and BITS.",
          "why": "A stopped update service produces the same nightly pattern, so confirming both run removes the cheap cause early.",
          "expectedObservation": "wuauserv and BITS both running with stable process IDs.",
          "target": { "componentId": "services", "label": "Services tab" },
          "actionId": "check-update-services"
        },
        {
          "id": "guide-inspect-cache",
          "title": "Inspect the download cache",
          "explanation": "From Tools, run Inspect the SoftwareDistribution download cache.",
          "why": "The error code only names a class of failure — opening the store it points at shows which artifact is bad.",
          "expectedObservation": "A partial KB5041566 package whose hash does not match the catalog.",
          "target": { "componentId": "event-viewer", "label": "Checks list in the Windows workstation panel" },
          "actionId": "inspect-update-cache"
        },
        {
          "id": "guide-reset-components",
          "title": "Reset the update components",
          "explanation": "From Tools, run Reset update components with the Services tab open.",
          "why": "Clearing the store is justified only because you observed the mismatched hash inside it — the evidence names the repair.",
          "expectedObservation": "The cache cleared with wuauserv and BITS still running.",
          "target": { "componentId": "services", "label": "Services tab" },
          "actionId": "reset-update-components"
        },
        {
          "id": "guide-retry-install",
          "title": "Retry the update installation",
          "explanation": "From Tools, run Retry the update installation, then re-read the update history.",
          "why": "Re-running the exact failed step and judging by the history entry verifies the repair honestly.",
          "expectedObservation": "A new history entry reading Success (0x0) with a normal reboot pending.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "retry-update-install"
        }
      ]
    },
    actions: [
      {
        id: "review-update-history",
        label: "Read the Windows Update history",
        kind: "inspect",
        tool: "event-viewer",
        patch: { update: { historyReviewed: true } },
        feedback:
          "KB5041566 downloaded to 100%, then failed with 0x80070002 on three consecutive attempts.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The error code is reported after the download completes — reading the history establishes whether the failure is fetch, verify, or apply before anything is touched.",
          evidenceGain:
            "Download completes at 100% then fails — network reachability and WSUS availability ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "check-update-services",
        label: "Check Windows Update services",
        kind: "inspect",
        tool: "services",
        patch: { update: { servicesChecked: true } },
        feedback: "wuauserv and BITS are both running with stable PIDs.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A stopped update service produces the same nightly failure pattern — confirming both services run eliminates the cheap cause before any repair.",
          evidenceGain: "Update services running — stopped-service hypothesis ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-update-cache",
        label: "Inspect the SoftwareDistribution download cache",
        kind: "inspect",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "update.historyReviewed", value: true },
        patch: { update: { cacheInspected: true } },
        feedback:
          "SoftwareDistribution\\Download holds a partial KB5041566 package whose hash does not match the catalog.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An error code only names a class of failure — opening the store the code points at confirms which artifact is actually bad and where the repair belongs.",
          evidenceGain: "Corrupt package confirmed in the download cache — repair target identified.",
        },
        isDiagnostic: true,
      },
      {
        id: "reset-update-components",
        label: "Reset update components",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "update.cacheInspected", value: true },
        patch: {
          update: { componentsReset: true, cacheCorrupt: false },
          services: [
            { id: "wuauserv", name: "wuauserv (Windows Update)", status: "running", pid: 1872 },
            { id: "bits", name: "BITS", status: "running", pid: 2044 },
          ],
        },
        feedback:
          "SoftwareDistribution cache cleared and update components cycled — no corrupt packages remain staged.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Clearing the cache is justified only once the mismatched hash was observed inside it — the evidence names the store, so repairing that store is the least-destructive matching fix.",
          evidenceGain: "Download cache empty — corrupt package removed.",
        },
        isFix: true,
      },
      {
        id: "retry-update-install",
        label: "Retry the update installation",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "update.componentsReset", value: true },
        patch: { update: { installVerified: true } },
        feedback:
          "KB5041566 installs cleanly. Update history now shows Success (0x0) with only a normal reboot pending.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Re-running the exact failed step after the repair, then judging by the history entry rather than the wizard's exit code, is the honest end-to-end check.",
          evidenceGain: "Update history records Success (0x0) — install verified from the record.",
        },
        isFix: true,
      },
      {
        id: "clean-install-wrong",
        label: "Reinstall Windows to start fresh",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "harmful",
          rationale:
            "A data-destructive reinstall to fix a corrupt download cache is grossly disproportionate — the hash mismatch named a store that a component reset clears without touching user data.",
        },
        feedback: "Data-destructive — the evidence pointed at a cache a reset already clears.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "update.installVerified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "update.installVerified", value: true },
      { type: "stateEquals", path: "update.cacheCorrupt", value: false },
      { type: "stateEquals", path: "update.componentsReset", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["clean-install-wrong"],
        },
        feedback:
          "Reinstalling Windows would destroy Owen's data for a cache problem the evidence already isolated.",
      },
    ],
    hints: [
      { level: 1, text: "The history shows the download finishes — read what happens after that." },
      {
        level: 2,
        text: "Services run and the disk has 294 GB free — where does the install actually break?",
      },
      {
        level: 3,
        text: "0x80070002 after a completed download means the bits on disk are bad — repair that store before retrying.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A corrupt KB5041566 package left in the SoftwareDistribution download cache made every install attempt fail hash verification with 0x80070002.",
      whyItWorked:
        "Clearing the download cache removed the corrupt package, so the retry staged and installed cleanly. Transferable principle: a download that completes and then fails verification is a storage-integrity problem — repair the subsystem that holds the bits before changing anything else.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Read update history: 100% download, then 0x80070002." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Network, services and disk capacity dropped — download completes, services run, 294 GB free.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Reset update components only after confirming the corrupt package on disk.",
        },
        { step: "Verify", whatLearnerDid: "Retry recorded Success (0x0) in the history." },
      ],
      followUps: ["Confirm the next update cycle installs automatically before closing the ticket."],
    },
    knowledgeLinks: ["windows-event-logs", "windows-boot-repair", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn — Windows Update error codes",
        url: "https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-error-reference",
        note: "Link only.",
      },
    ],
  },
  {
    id: "windows-device-error",
    version: 1,
    title: "Camera reports Code 43 after driver update",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Read device status codes as evidence of failure class",
      "Exhaust driver-class fixes before blaming hardware",
    ],
    prerequisites: ["windows-update-failure"],
    skills: ["event-logs", "device-drivers"],
    ticket: {
      id: "HD-1019",
      user: "Lila Moreno",
      role: "Marketing specialist",
      symptomPlainLanguage:
        "My webcam worked until yesterday. Now Teams says no camera is found and the light blinks once.",
      priority: "medium",
      channel: "email",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "device-manager"],
      enabledCommands: ["systeminfo", "tasklist"],
      components: ["event-viewer", "device-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "lila",
        logs: [
          "2026-09-25 09:29:55 INFO  Driver package 24.10.1 installed via Windows Update",
          "2026-09-25 09:31:12 WARN  USB\\VID_046E&PID_55A1 reported Code 43 (device stopped responding)",
          "2026-09-25 09:41:02 WARN  Camera re-enumeration failed after port reset",
          "2026-09-25 09:41:06 INFO  Other PnP devices healthy",
        ],
        devices: [
          "Display adapter: Intel UHD 770 — working",
          "Monitor (DP-1): Generic PnP — working",
          "Camera: Contoso HD Cam — Error code 43",
          "Network adapter: Contoso GbE — working",
        ],
        camera: {
          managerSeen: false,
          eventsRead: false,
          physicalChecked: false,
          driverRolledBack: false,
          deviceHealthy: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-bad-driver", label: "Bad driver package from Windows Update", initiallyPlausible: true },
      { id: "h-hardware", label: "Defective camera hardware", initiallyPlausible: true },
      { id: "h-port", label: "Dead USB port or cable", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Read the device's status code and timeline first, then exhaust driver-class fixes before you touch hardware.",
      "steps": [
        {
          "id": "guide-device-manager",
          "title": "Open Device Manager",
          "explanation": "Select the Device Manager tab and find the camera in the device list.",
          "why": "Windows records per-device status there, so one device in error while others work frames the failure as device-local.",
          "expectedObservation": "The Contoso HD Cam showing Code 43 while every other device reports working.",
          "target": { "componentId": "device-manager", "label": "Device Manager tab" },
          "actionId": "open-device-manager"
        },
        {
          "id": "guide-device-events",
          "title": "Read the device events",
          "explanation": "Open the Event Viewer tab and compare the camera's failure time with the last installs.",
          "why": "Timestamps turn coincidence into sequence — the log shows what changed immediately before the device stopped responding.",
          "expectedObservation": "Driver 24.10.1 installed at 09:29:55 and Code 43 reported at 09:31:12.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "read-device-events",
          "conceptId": "windows-event-logs"
        },
        {
          "id": "guide-other-port",
          "title": "Replug on a known-good port",
          "explanation": "From Tools, run Replug camera on a known-good port and watch the device row.",
          "why": "One cheap physical test separates a cable or port fault from a device fault before any driver change.",
          "expectedObservation": "The camera re-enumerating on the new port and still reporting Code 43.",
          "target": { "componentId": "device-manager", "label": "Camera entry in Device Manager" },
          "actionId": "test-another-port"
        },
        {
          "id": "guide-rollback-driver",
          "title": "Roll back the camera driver",
          "explanation": "From Tools, run Roll back to known-good driver.",
          "why": "The timeline and the port test together make undoing the last change the smallest fix matching both facts.",
          "expectedObservation": "Driver 24.8.2 reported as the installed package after the rollback.",
          "target": { "componentId": "device-manager", "label": "Camera driver entry in Device Manager" },
          "actionId": "rollback-driver"
        },
        {
          "id": "guide-scan-changes",
          "title": "Scan for hardware changes",
          "explanation": "From Tools, run Scan for hardware changes and watch the camera row.",
          "why": "A rollback only takes effect when Windows rebinds the device, and the scan performs that rebind.",
          "expectedObservation": "The camera reporting \"This device is working properly\" after the rescan.",
          "target": { "componentId": "device-manager", "label": "Camera status in Device Manager" },
          "actionId": "scan-for-changes"
        }
      ]
    },
    actions: [
      {
        id: "open-device-manager",
        label: "Open Device Manager",
        kind: "inspect",
        tool: "device-manager",
        patch: { camera: { managerSeen: true } },
        feedback:
          "The Contoso HD Cam shows 'This device cannot start. (Code 43)' — every other device reports working.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Device Manager is where Windows records per-device status — a single device in error while the rest are healthy frames the failure as device-local, not system-wide.",
          evidenceGain: "Only the camera reports an error — bus-wide failure ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "read-device-events",
        label: "Read device events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "camera.managerSeen", value: true },
        patch: { camera: { eventsRead: true } },
        feedback:
          "Driver 24.10.1 installed at 09:29; the camera threw Code 43 at 09:31 — two minutes later.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Timestamps turn coincidence into cause — the failure begins right after a specific driver install, which points the repair at the driver rather than the hardware.",
          evidenceGain: "Code 43 starts two minutes after driver 24.10.1 installed.",
        },
        isDiagnostic: true,
      },
      {
        id: "test-another-port",
        label: "Replug camera on a known-good port",
        kind: "ui",
        tool: "device-manager",
        patch: { camera: { physicalChecked: true } },
        feedback:
          "The camera re-enumerates on a known-good port and still reports Code 43 — port and cable ruled out.",
        evaluation: {
          grade: "optimal",
          rationale:
            "One cheap physical test separates cable/port faults from device faults — you need it before claiming the hardware itself is fine or that the driver is the cause.",
          evidenceGain: "Code 43 persists across ports — physical link ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "rollback-driver",
        label: "Roll back to known-good driver",
        kind: "ui",
        tool: "device-manager",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "camera.eventsRead", value: true },
            { type: "stateEquals", path: "camera.physicalChecked", value: true },
          ],
        },
        patch: { camera: { driverRolledBack: true } },
        feedback: "Rolled back to driver 24.8.2, the last known-good package.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The timeline blames the new package and the port test cleared the physical layer — undoing the last change is the least-destructive fix that matches both facts.",
          evidenceGain: "Driver rolled back to known-good 24.8.2.",
        },
        isFix: true,
      },
      {
        id: "scan-for-changes",
        label: "Scan for hardware changes",
        kind: "ui",
        tool: "device-manager",
        appliesWhen: { type: "stateEquals", path: "camera.driverRolledBack", value: true },
        patch: { camera: { deviceHealthy: true } },
        feedback: "The scan re-enumerates the camera: 'This device is working properly.'",
        evaluation: {
          grade: "optimal",
          rationale:
            "A rollback only takes effect when PnP rebinds the device — the scan forces that rebind and reports the resulting state instead of assuming it.",
          evidenceGain: "Code 43 cleared — device reports healthy after rebind.",
        },
        isFix: true,
      },
      {
        id: "test-camera",
        label: "Test camera in the meeting app",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "camera.deviceHealthy", value: true },
        patch: { camera: { verified: true } },
        feedback: "Camera preview opens with live video — the original symptom is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reproducing the original meeting failure is the only honest proof the fix holds under the real workload the user reported.",
          evidenceGain: "Camera produces video — end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "replace-camera-wrong",
        label: "Replace the webcam",
        kind: "ui",
        tool: "device-manager",
        evaluation: {
          grade: "wrong",
          rationale:
            "The camera never failed before the driver install, and a replug on a good port reproduced Code 43 — replacement skips the driver-class fix the timeline demands.",
        },
        feedback:
          "Hardware replacement before exhausting driver fixes — the evidence pointed at yesterday's update.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "camera.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "camera.verified", value: true },
      { type: "stateEquals", path: "camera.deviceHealthy", value: true },
      { type: "stateEquals", path: "camera.driverRolledBack", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-camera-wrong"],
        },
        feedback:
          "Replacing a camera whose failure started with a driver install skips the matching fix — roll back first.",
      },
    ],
    hints: [
      { level: 1, text: "Device Manager shows which devices are unhappy — start there." },
      { level: 2, text: "Read the timing of the last two events before the failure." },
      {
        level: 3,
        text: "Code 43 right after a driver install, reproducible on another port, is a software-class fault — undo the change before blaming the hardware.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Windows Update installed camera driver package 24.10.1, which leaves the device reporting Code 43 on every enumeration.",
      whyItWorked:
        "Rolling back to 24.8.2 restored a known-good driver and the hardware scan re-bound the camera; the meeting test proved the original symptom gone. Transferable principle: a device that fails immediately after a driver change is a software-class fault until a physical test says otherwise.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Device Manager Code 43 on the camera only." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Other devices healthy; camera still fails on a known-good port; timeline ties failure to the driver install.",
        },
        { step: "Apply fix", whatLearnerDid: "Driver rollback to 24.8.2, then a hardware rescan." },
        { step: "Verify", whatLearnerDid: "Live camera preview in the meeting app." },
      ],
      followUps: [
        "Hold driver 24.10.1 from auto-installing until the vendor ships a fixed package.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn — device status codes",
        url: "https://learn.microsoft.com/en-us/windows-hardware/drivers/device-manager/error-codes",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-permission-denied",
    version: 1,
    title: "Permission denied writing config",
    category: "linux",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: ["Read ls -l modes", "Choose safe permission fixes"],
    prerequisites: [],
    skills: ["linux-permissions", "shell"],
    ticket: {
      id: "HD-1005",
      user: "devon (deploy bot owner)",
      role: "Junior engineer",
      symptomPlainLanguage: "Deploy script fails: Permission denied on /etc/myapp/config.yaml",
      priority: "medium",
      channel: "portal",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel"],
      enabledCommands: ["ls", "pwd", "cat", "chmod", "chown", "whoami", "id", "help", "grep"],
      components: ["filesystem", "process-list", "package-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "devon",
        cwd: "/etc/myapp",
        fs: {
          type: "dir",
          name: "/",
          owner: "root",
          group: "root",
          mode: "755",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              owner: "root",
              group: "root",
              mode: "755",
              children: {
                myapp: {
                  type: "dir",
                  name: "myapp",
                  owner: "root",
                  group: "app",
                  mode: "755",
                  children: {
                    "config.yaml": {
                      type: "file",
                      name: "config.yaml",
                      mode: "600",
                      owner: "root",
                      group: "root",
                      content: "listen: 8080\ndb_host: db01\n",
                    },
                  },
                },
              },
            },
            home: {
              type: "dir",
              name: "home",
              owner: "root",
              group: "root",
              mode: "755",
              children: {
                devon: {
                  type: "dir",
                  name: "devon",
                  owner: "devon",
                  group: "devon",
                  mode: "755",
                  children: {},
                },
              },
            },
          },
        },
        users: [
          { name: "root", uid: 0, gid: 0, group: "root", groups: ["root", "sudo"] },
          { name: "devon", uid: 1000, gid: 1000, group: "devon", groups: ["devon", "users"] },
        ],
        groups: [
          { name: "root", gid: 0 },
          { name: "app", gid: 1001 },
          { name: "devon", gid: 1000 },
          { name: "users", gid: 100 },
        ],
        perms: {
          configFixed: false,
          verified: false,
          insecure: false,
        },
      },
    },
    hypotheses: [
      { id: "h-wrong-user", label: "Running as wrong user", initiallyPlausible: true },
      { id: "h-mode", label: "File mode too strict", initiallyPlausible: true },
      { id: "h-readonly-fs", label: "Read-only filesystem", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro: "Work through the failure in order: who you are, what the file allows, then the smallest safe change.",
      steps: [
        {
          id: "guide-identity",
          title: "Confirm the effective user",
          explanation: "Run an identity check in the terminal before touching the file.",
          why: "Permission failures come down to user, group, and mode — identity is the first of the three to establish.",
          expectedObservation: "Which user and group the shell is acting as right now.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "whoami-check",
          commandId: "whoami",
          fallback: "the terminal button in the bottom dock",
          conceptId: "linux-permissions-basics",
        },
        {
          id: "guide-mode",
          title: "Read the file's mode and owner",
          explanation: "List the config file with its permissions, in the file view or the terminal.",
          why: "Mode and ownership tell you which permission class is blocking the write.",
          expectedObservation: "The mode string, owner, and group shown for config.yaml.",
          target: {
            componentId: "filesystem",
            label: "/etc/myapp/config.yaml in the file tree",
          },
          actionId: "ls-config",
          commandId: "ls",
          fallback: "the filesystem view in the workstation panel",
        },
        {
          id: "guide-fix",
          title: "Apply the least-privilege fix",
          explanation: "Grant the app group write access to the config without opening it to everyone.",
          why: "A group-writable mode grants exactly the access that is needed; a world-writable mode would grant far more.",
          expectedObservation: "The file's mode changing to group-writable and its group switching to the app group.",
          target: { componentId: "filesystem", label: "config.yaml permissions" },
          actionId: "fix-mode",
          conceptId: "least-privilege-basics",
        },
        {
          id: "guide-verify",
          title: "Re-run the deploy write test",
          explanation: "Run the failing operation again from the terminal.",
          why: "Re-running the original failing command confirms the fix end to end instead of assuming it worked.",
          expectedObservation: "The write succeeding without a permission error.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "verify-deploy",
          fallback: "the terminal button in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "whoami-check",
        label: "Check identity (whoami / id)",
        kind: "terminal",
        tool: "terminal",
        patch: {},
        feedback: "You are devon, not root.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale: "Confirming the effective user is the first step for permission failures.",
          evidenceGain: "Running as devon (uid 1000), not root.",
          learnMore: "linux-permissions-basics",
        },
        matchHints: ["whoami", "id", "check identity", "which user"],
      },
      {
        id: "ls-config",
        label: "Inspect config mode (ls -l)",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/etc/myapp/config.yaml",
        patch: {},
        feedback: "config.yaml is mode 600 owned by root — devon cannot write it.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale: "Inspecting mode and ownership isolates whether this is a permissions issue.",
          evidenceGain: "config.yaml is root:root mode 600.",
          learnMore: "linux-permissions-basics",
        },
        matchHints: ["ls -l", "inspect mode", "check permissions", "ls config"],
      },
      {
        id: "fix-mode",
        label: "Set config group-writable mode 660",
        kind: "ui",
        tool: "file-panel",
        inspectTarget: "/etc/myapp/config.yaml",
        appliesWhen: { type: "stateEquals", path: "perms.configFixed", value: false },
        patch: {
          perms: { configFixed: true, insecure: false },
          fs: {
            children: {
              etc: {
                children: {
                  myapp: {
                    children: {
                      "config.yaml": { mode: "660", owner: "root", group: "app" },
                    },
                  },
                },
              },
            },
          },
        },
        feedback: "Mode changed to 660 root:app (owner+group write) — better than 777.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale: "Group-writable 660 grants needed access without world-writable risk.",
          evidenceGain: "Mode corrected to 660 root:app.",
          learnMore: "least-privilege-basics",
        },
        matchHints: ["chmod 660", "group writable", "set mode 660"],
      },
      {
        id: "chmod-777-wrong",
        label: "chmod 777 config.yaml",
        kind: "ui",
        tool: "file-panel",
        patch: {
          perms: { insecure: true },
          fs: {
            children: {
              etc: {
                children: {
                  myapp: {
                    children: {
                      "config.yaml": { mode: "777" },
                    },
                  },
                },
              },
            },
          },
        },
        feedback: "World-writable system config is an anti-pattern. Prefer group-based access.",
        evaluation: {
          grade: "harmful",
          rationale: "777 makes the config world-writable and violates least privilege.",
          learnMore: "least-privilege-basics",
        },
        matchHints: ["chmod 777", "777", "world writable"],
      },
      {
        id: "verify-deploy",
        label: "Re-run deploy write test",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "perms.configFixed", value: true },
        patch: { perms: { verified: true } },
        feedback: "Write succeeded.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale: "Re-running the failing operation confirms the fix.",
          evidenceGain: "Deploy write test succeeded.",
        },
        matchHints: ["re-run deploy", "write test", "verify deploy"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "perms.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "perms.verified", value: true },
      { type: "stateEquals", path: "perms.configFixed", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "perms.insecure", value: true },
        feedback: "777 will 'work' but violates least privilege — fix ownership/group instead.",
      },
    ],
    hints: [
      { level: 1, text: "Who owns the file? Who are you?", category: "method" },
      { level: 2, text: "Mode 600 means only root can write.", category: "concept" },
      {
        level: 3,
        text: "The mode blocks devon — choose the change that grants the app group write access without opening the file to the whole system.",
        category: "concept",
      },
    ],
    conversation: {
      persona: "devon",
      opening: "Deploy script fails: Permission denied on /etc/myapp/config.yaml",
      followUpQuestions: [
        "Which user runs the deploy?",
        "Did file ownership change recently?",
        "Can you read the file but not write it?",
      ],
      replies: [
        {
          match: ["worked", "clean", "success", "again"],
          when: { type: "stateEquals", path: "perms.configFixed", value: true },
          response:
            "The deploy just ran clean for the first time this week — whatever you changed took effect.",
          once: false,
          revealsConcepts: ["Verify fixes by re-running the original failing workflow, not just the file state."],
        },
        {
          match: ["who runs", "user", "deploy user", "devon"],
          response: "The deploy job runs as devon, not root. It worked last week.",
          once: false,
          revealsConcepts: ["Deploy identity matters for permission checks."],
        },
        {
          match: ["read", "write", "mode", "permission"],
          response:
            "cat works, but writing config.yaml fails with Permission denied. ls shows something like -rw-------.",
          once: false,
          revealsConcepts: ["Readable but not writable often means mode/ownership, not missing file."],
        },
      ],
      defaultReply:
        "The deploy bot just says Permission denied when it tries to write the YAML config.",
      mentorPrompts: [
        "Check identity and file mode before changing permissions.",
        "Avoid 777 — prefer group-based access.",
      ],
    },
    debrief: {
      rootCause: "config.yaml was root:root mode 600 while the deploy user needed write access.",
      whyItWorked:
        "Granting group write (660) allows the app group to update config without making it world-writable. Transferable principle: grant exactly the access that is needed — never open a file to the whole system to fix one user.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "whoami + ls -l" },
        { step: "Rule out", whatLearnerDid: "Missing-file hypothesis dropped — the file reads fine, only writes fail." },
        { step: "Fix", whatLearnerDid: "Corrected mode without 777" },
        { step: "Verify", whatLearnerDid: "Write test succeeded" },
      ],
      followUps: ["Prefer adding users to groups over sharing root."],
    },
    knowledgeLinks: ["linux-permissions-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "linux-service-failing",
    version: 1,
    title: "nginx service fails to start",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: ["Read systemd status", "Interpret journal errors", "Fix config safely"],
    prerequisites: ["linux-permission-denied"],
    skills: ["systemd", "logs", "nginx"],
    ticket: {
      id: "HD-1006",
      user: "ops on-call",
      role: "Site reliability",
      symptomPlainLanguage: "Company intranet returns 502 after server reboot. nginx unit is failed.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["filesystem", "service-manager"],
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["systemctl", "journalctl", "cat", "ls", "grep", "help", "ps"],
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "nginx",
            name: "nginx",
            status: "failed",
            description: "A high performance web server",
            lastError: [
              "nginx: [emerg] open() \"/etc/nginx/nginx.conf\" failed (13: Permission denied)",
            ],
          },
        ],
        logs: [
          "Sep 23 08:01:01 srv01 systemd[1]: Starting nginx...",
          "Sep 23 08:01:01 srv01 nginx[991]: nginx: [emerg] open() \"/etc/nginx/nginx.conf\" failed (13: Permission denied)",
          "Sep 23 08:01:01 srv01 systemd[1]: Failed to start nginx.",
        ],
        fs: {
          type: "dir",
          name: "/",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              children: {
                nginx: {
                  type: "dir",
                  name: "nginx",
                  children: {
                    "nginx.conf": {
                      type: "file",
                      name: "nginx.conf",
                      mode: "000",
                      content: "events {}\nhttp { server { listen 80; } }\n",
                    },
                  },
                },
              },
            },
          },
        },
        svc: {
          confReadable: false,
          serviceRunning: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-conf", label: "nginx.conf unreadable", initiallyPlausible: true },
      { id: "h-port", label: "Port 80 in use", initiallyPlausible: false },
      { id: "h-disk", label: "Disk full", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work from the unit's own report outward, change only what the evidence supports, and finish by proving the site answers.",
      "steps": [
        {
          "id": "guide-unit-status",
          "title": "Read the unit's status",
          "explanation": "Open the terminal and run systemctl status nginx to see how systemd reports it.",
          "why": "systemd — the service manager that starts nginx at boot — records why a unit stopped, so its status is the fastest first evidence.",
          "expectedObservation": "The status output lists nginx as failed with an error line beneath it.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "systemctl-status",
          "commandId": "systemctl-status",
          "conceptId": "systemd-service-basics"
        },
        {
          "id": "guide-journal",
          "title": "Read the unit's journal",
          "explanation": "Run journalctl -u nginx to pull the entries the unit wrote while starting.",
          "why": "The journal records the exact system call that failed, so it separates one explanation from the alternatives instead of guessing.",
          "expectedObservation": "The journal shows open() of /etc/nginx/nginx.conf failing (13: Permission denied).",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "journalctl-review",
          "commandId": "journalctl",
        },
        {
          "id": "guide-config-mode",
          "title": "Restore the config file's mode",
          "explanation": "Select /etc/nginx/nginx.conf in the Filesystem tab and apply the chmod 644 fix for it.",
          "why": "A file's mode is its permission bits; 644 is the standard readable setting a service config ships with.",
          "expectedObservation": "The result reports nginx.conf world-readable again.",
          "target": { "componentId": "filesystem", "label": "Filesystem tab (nginx.conf)" },
          "actionId": "fix-conf-mode",
          "conceptId": "linux-permissions-basics",
          "fallback": "the Filesystem tab in the Linux workstation panel"
        },
        {
          "id": "guide-restart-nginx",
          "title": "Restart the nginx unit",
          "explanation": "Apply systemctl restart nginx so the unit reads the config you just restored.",
          "why": "A configuration change reaches the service only when it starts again and re-reads the file.",
          "expectedObservation": "The Services tab shows nginx as active (running).",
          "target": { "componentId": "service-manager", "label": "Services tab (nginx unit)" },
          "actionId": "restart-nginx",
          "fallback": "the Services tab in the Linux workstation panel"
        },
        {
          "id": "guide-verify-http",
          "title": "Verify the intranet answers",
          "explanation": "Request the intranet page and read the status it returns.",
          "why": "The ticket reports a 502 for users, so a fresh request is the only honest proof the symptom is gone.",
          "expectedObservation": "The intranet responds with HTTP 200.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "verify-http"
        }
      ]
    },
    actions: [
      {
        id: "systemctl-status",
        label: "systemctl status nginx",
        kind: "terminal",
        tool: "terminal",
        patch: {},
        feedback: "Unit is failed with permission denied on nginx.conf.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The unit's own status is the fastest source of truth for why nginx failed — it names the failing file before you read deeper.",
          evidenceGain: "Unit failed with permission denied on nginx.conf.",
        },
        isDiagnostic: true,
      },
      {
        id: "journalctl-review",
        label: "journalctl -u nginx",
        kind: "terminal",
        tool: "terminal",
        patch: { svc: { confReadable: false } },
        feedback: "Logs confirm config open() failed with EACCES.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Status says what failed; the journal shows the exact open() syscall with EACCES — confirming the mode hypothesis and ruling out the port and disk alternatives.",
          evidenceGain: "open() failed with EACCES — port and disk hypotheses ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "fix-conf-mode",
        label: "chmod 644 /etc/nginx/nginx.conf",
        kind: "ui",
        tool: "services",
        patch: { fs: {}, svc: { confReadable: true } },
        feedback: "Config is now world-readable (standard for nginx.conf).",
        evaluation: {
          grade: "optimal",
          rationale:
            "EACCES means the mode blocked the read; restoring standard 644 matches how nginx.conf is meant to ship without widening access beyond convention.",
          evidenceGain: "Config readable again (mode 644).",
        },
        isFix: true,
      },
      {
        id: "restart-nginx",
        label: "systemctl restart nginx",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "svc.confReadable", value: true },
        patch: {
          services: [{ id: "nginx", name: "nginx", status: "active (running)", description: "web server" }],
          svc: { serviceRunning: true },
        },
        feedback: "nginx started successfully.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A config change means nothing until the master process reloads it — the restart loads the now-readable file.",
          evidenceGain: "nginx started with the restored config.",
        },
        isFix: true,
      },
      {
        id: "verify-http",
        label: "Verify HTTP 200 on intranet",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "svc.serviceRunning", value: true },
        patch: { svc: { verified: true } },
        feedback: "Intranet returns HTTP 200.",
        evaluation: {
          grade: "optimal",
          rationale:
            "HTTP 200 proves the service not only runs but serves — the reported symptom itself is resolved, not just the unit state.",
          evidenceGain: "Intranet answers HTTP 200.",
        },
        isFix: true,
      },
      {
        id: "reboot-blind-wrong",
        label: "Reboot server without reading logs",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "risky",
          rationale:
            "Rebooting would clear the failed unit from view without explaining why nginx could not open its config. The journal already names the failing open() — read it before disturbing the host.",
        },
        feedback: "Reboot might mask the issue. Read status/logs first.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "svc.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "svc.verified", value: true },
      { type: "stateEquals", path: "svc.serviceRunning", value: true },
    ],
    wrongPaths: [],
    hints: [
      {
        level: 1,
        text: "Start with systemctl status, not random restarts.",
        category: "tool",
      },
      {
        level: 2,
        text: "Permission denied on the config file — check its mode.",
        category: "concept",
      },
      {
        level: 3,
        text: "The journal shows exactly which open() failed — restore normal config readability, then bring the unit back up and prove the site answers.",
        category: "method",
      },
    ],
    debrief: {
      rootCause: "/etc/nginx/nginx.conf had mode 000 after a botched maintenance script, so nginx could not open it.",
      whyItWorked:
        "Restoring standard 644 permissions allowed the master process to read config; restart loaded it; HTTP verification proved service health. Transferable principle: let the failing syscall in the journal dictate the fix, not the service's surface symptom.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "status + journalctl" },
        { step: "Rule out", whatLearnerDid: "Port and disk hypotheses dropped — EACCES on config open explains the failure." },
        { step: "Root cause", whatLearnerDid: "EACCES on config" },
        { step: "Verify", whatLearnerDid: "HTTP 200" },
      ],
      followUps: ["Audit other files touched by the same maintenance script."],
    },
    knowledgeLinks: ["systemd-service-basics", "linux-permissions-basics"],
    references: [],
  },
  {
    id: "linux-disk-full",
    version: 1,
    title: "App writes fail: no space left on device",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Trace ENOSPC from journal to the file owning the bytes",
      "Fix growth policy, not just the symptom",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["disk-space", "logs", "shell"],
    ticket: {
      id: "HD-1020",
      user: "Ken Sato",
      role: "Application owner",
      symptomPlainLanguage:
        "Our app stopped writing logs and last night's jobs failed with 'No space left on device'.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["filesystem", "service-manager"],
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["df", "journalctl", "cat", "ls", "grep", "systemctl", "help"],
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        disks: [
          {
            fs: "/dev/sda2",
            size: "50G",
            used: "48G",
            avail: "2.0G",
            usePercent: "96%",
            mount: "/",
          },
        ],
        logs: [
          "Sep 25 02:14:07 srv01 app[2210]: write /var/log/app/debug.log: No space left on device",
          "Sep 25 02:14:07 srv01 app[2210]: batch job 8821 aborted",
          "Sep 25 06:00:12 srv01 crond[880]: /etc/cron.d/nightly: exit status 1",
          "Sep 25 07:31:55 srv01 systemd[1]: app.service: Failed with result 'exit-code'.",
        ],
        services: [
          {
            id: "app",
            name: "app.service",
            status: "failed",
            description: "Batch processing service",
            lastError: ["write failed: No space left on device"],
          },
        ],
        fs: {
          type: "dir",
          name: "/",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              children: {
                app: {
                  type: "dir",
                  name: "app",
                  children: {
                    "app.conf": {
                      type: "file",
                      name: "app.conf",
                      mode: "644",
                      owner: "root",
                      group: "app",
                      content:
                        "log_file: /var/log/app/debug.log\nlog_level: debug\nrotate: disabled\n",
                    },
                  },
                },
              },
            },
            var: {
              type: "dir",
              name: "var",
              children: {
                log: {
                  type: "dir",
                  name: "log",
                  children: {
                    app: {
                      type: "dir",
                      name: "app",
                      mode: "750",
                      children: {
                        "debug.log": {
                          type: "file",
                          name: "debug.log",
                          mode: "640",
                          owner: "root",
                          group: "app",
                          size: "46G",
                          content: "2026-09-25 02:14:06 DEBUG chunk 9981 retrying\n",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        disk: {
          dfChecked: false,
          writerFound: false,
          rotationSeen: false,
          purged: false,
          appRestarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-full", label: "Filesystem full", initiallyPlausible: true },
      { id: "h-app-crash", label: "App binary corrupted", initiallyPlausible: true },
      { id: "h-bad-config", label: "Bad config after deploy", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Trace the failed write from the journal to the file it names, change only what the evidence supports, and prove writes work again.",
      "steps": [
        {
          "id": "guide-journal-write",
          "title": "Read the failing write",
          "explanation": "Run journalctl -u app and find the line where the write failed.",
          "why": "The journal names which write broke and on what file, turning a vague disk-full report into a specific object.",
          "expectedObservation": "A line reports writing /var/log/app/debug.log: No space left on device.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "journalctl-app",
          "commandId": "journalctl",
        },
        {
          "id": "guide-app-conf",
          "title": "Read the log configuration",
          "explanation": "Run cat /etc/app/app.conf and read how rotation is set.",
          "why": "Rotation — the schedule that truncates a growing log — explains why this file was never bounded.",
          "expectedObservation": "The output shows log_level: debug and rotate: disabled.",
          "target": { "componentId": "filesystem", "label": "Filesystem tab (/etc/app/app.conf)" },
          "actionId": "cat-app-conf",
          "commandId": "cat",
          "fallback": "the Filesystem tab in the Linux workstation panel"
        },
        {
          "id": "guide-purge-rotate",
          "title": "Free the space and bound growth",
          "explanation": "Apply the purge and rotation fix, then read the usage figure it reports.",
          "why": "Freeing the bytes fixes today's failure; rotation changes the policy that let the log grow unbounded.",
          "expectedObservation": "The result shows / now at 52 percent used.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "purge-and-rotate",
          "conceptId": "disk-space-slow-pc"
        },
        {
          "id": "guide-restart-app",
          "title": "Restart the app service",
          "explanation": "Restart app.service so it runs again under the repaired filesystem.",
          "why": "A restart only means something once space exists for the service to write into.",
          "expectedObservation": "The Services tab shows app.service as active (running).",
          "target": { "componentId": "service-manager", "label": "Services tab (app.service)" },
          "actionId": "restart-app",
          "fallback": "the Services tab in the Linux workstation panel"
        },
        {
          "id": "guide-verify-writes",
          "title": "Verify writes and the job",
          "explanation": "Run the write check and confirm the batch job that failed last night completes.",
          "why": "The ticket was about failed writes, so reproducing one is the honest end-to-end proof.",
          "expectedObservation": "The check reports new lines landing in debug.log and job 8821 succeeding.",
          "target": { "componentId": "filesystem", "label": "Filesystem tab (debug.log)" },
          "actionId": "verify-writes",
          "conceptId": "troubleshooting-method",
          "fallback": "the Filesystem tab in the Linux workstation panel"
        }
      ]
    },
    actions: [
      {
        id: "df-h",
        label: "df -h",
        kind: "terminal",
        tool: "terminal",
        patch: { disk: { dfChecked: true } },
        feedback: "/dev/sda2 is 96% used — 48G of 50G, only 2.0G free.",
        evaluation: {
          grade: "optimal",
          rationale:
            "ENOSPC-style failures start at the filesystem — df states in one line whether space exists, framing every later reading.",
          evidenceGain: "Root filesystem 96% full — a space problem is in play.",
        },
        isDiagnostic: true,
      },
      {
        id: "journalctl-app",
        label: "journalctl -u app",
        kind: "terminal",
        tool: "terminal",
        patch: { disk: { writerFound: true } },
        feedback:
          "Journal names the writer: app failed writing /var/log/app/debug.log with ENOSPC; the batch job aborted right after.",
        evaluation: {
          grade: "optimal",
          rationale:
            "df proves space is gone; the journal names which write failed and on what file — turning 'disk full' into a specific object to inspect.",
          evidenceGain: "ENOSPC tied to debug.log — where the space went.",
        },
        isDiagnostic: true,
      },
      {
        id: "cat-app-conf",
        label: "cat /etc/app/app.conf",
        kind: "terminal",
        tool: "terminal",
        patch: { disk: { rotationSeen: true } },
        feedback: "Config: log_level debug, rotate disabled — the log grows without bound.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The file owning the bytes is only half the story — the config explains why nothing ever bounds its growth, which is what must change.",
          evidenceGain: "Rotation disabled explains unbounded growth — cause, not just symptom.",
        },
        isDiagnostic: true,
      },
      {
        id: "purge-and-rotate",
        label: "Purge old logs and enable rotation",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "disk.writerFound", value: true },
            { type: "stateEquals", path: "disk.rotationSeen", value: true },
          ],
        },
        patch: {
          disk: { purged: true },
          disks: [
            {
              fs: "/dev/sda2",
              size: "50G",
              used: "24G",
              avail: "26G",
              usePercent: "52%",
              mount: "/",
            },
          ],
        },
        feedback:
          "Historical debug.log content purged and daily rotation enabled — / now 52% used.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Freeing the bytes treats today's failure; enabling rotation changes the policy that let it happen — both come from evidence, not guesswork.",
          evidenceGain: "26G free and growth bounded by rotation.",
        },
        isFix: true,
      },
      {
        id: "restart-app",
        label: "Restart app.service",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "disk.purged", value: true },
        patch: {
          disk: { appRestarted: true },
          services: [
            {
              id: "app",
              name: "app.service",
              status: "active (running)",
              pid: 3120,
              description: "Batch processing service",
            },
          ],
        },
        feedback: "app.service is active and running again.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Only after space exists does restarting mean anything — the service must come back under the repaired filesystem conditions.",
          evidenceGain: "Service back up under the fixed filesystem.",
        },
        isFix: true,
      },
      {
        id: "verify-writes",
        label: "Verify log writes and retry the failed job",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "disk.appRestarted", value: true },
        patch: { disk: { verified: true } },
        feedback:
          "New log lines land in debug.log and batch job 8821 completes successfully.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The original failure was a write under load — reproducing a successful write and the originally failing job is the honest end-to-end check.",
          evidenceGain: "Writes and the failed job both succeed — symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "reboot-wrong",
        label: "Reboot the server",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "Rebooting a full disk changes nothing — debug.log still owns 46G after boot, and the journal already named the file and the policy gap.",
        },
        feedback: "Reboot does not reclaim space — the file is still there.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "disk.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "disk.verified", value: true },
      { type: "stateEquals", path: "disk.purged", value: true },
      { type: "stateEquals", path: "disk.appRestarted", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-wrong"],
        },
        feedback: "A reboot delays the same failure — reclaim the space and bound the growth.",
      },
    ],
    hints: [
      { level: 1, text: "Start with what the filesystem itself reports." },
      { level: 2, text: "The journal names a file — who writes it, and why does it never shrink?" },
      {
        level: 3,
        text: "A 46G log with rotation disabled is a growth-policy bug — reclaim the bytes and bound future growth before restarting anything.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Debug-level logging with rotation disabled filled the root filesystem — debug.log grew to 46G until every write failed with ENOSPC.",
      whyItWorked:
        "Purging the file freed the space and enabling daily rotation bounded future growth, so the restarted service could write again under real load. Transferable principle: ENOSPC is a symptom — identify what owns the bytes and which policy should have bounded it.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "df showed 96% used; journal named debug.log as the failing write." },
        {
          step: "Rule out",
          whatLearnerDid:
            "App-binary hypothesis dropped — failures are write errors, not crashes; bad-deploy hypothesis dropped — app.conf unchanged since August.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Purged historical logs and enabled the rotation policy.",
        },
        { step: "Verify", whatLearnerDid: "Service restarted; new writes and job 8821 succeed." },
      ],
      followUps: ["Alert on filesystem usage above 85% so this is caught before writes fail."],
    },
    knowledgeLinks: ["troubleshooting-method", "disk-space-slow-pc"],
    references: [
      {
        title: "systemd project — journal rotation",
        url: "https://systemd.io/JOURNAL_NATIVE_PROTOCOL/",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-runaway-process",
    version: 1,
    title: "Server crawls: one process pinned at 100% CPU",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Distinguish a starved service from a failing service",
      "Identify the CPU owner with ps before touching the app",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["processes", "shell", "performance"],
    ticket: {
      id: "HD-1021",
      user: "Dana Kirsch",
      role: "Data operations lead",
      symptomPlainLanguage:
        "Since 9am the reports box is crawling — SSH takes a minute and the API returns 504s.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["process-list", "service-manager"],
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["ps", "journalctl", "systemctl", "cat", "ls", "grep", "help"],
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        processes: [
          "root    812  99.7  python3 /opt/extract.py",
          "www     915   1.1  nginx: worker process",
          "www     916   0.9  nginx: worker process",
          "root    401   0.2  sshd: root@pts/0",
        ],
        services: [
          {
            id: "app",
            name: "app.service",
            status: "degraded",
            description: "Reporting API",
            lastError: ["upstream timeout after 30s"],
          },
          {
            id: "extract",
            name: "extract.timer",
            status: "active",
            description: "Hourly extract job",
          },
        ],
        logs: [
          "Sep 25 09:02:11 srv02 app[1051]: request GET /reports took 31.4s (slow)",
          "Sep 25 09:04:40 srv02 app[1051]: upstream timeout after 30s",
          "Sep 25 09:07:02 srv02 app[1051]: load average: 14.8, 11.2, 6.1",
          "Sep 25 09:31:18 srv02 extract[812]: retrying chunk 9981",
          "Sep 25 09:31:19 srv02 extract[812]: retrying chunk 9981",
          "Sep 25 09:31:20 srv02 extract[812]: retrying chunk 9981",
        ],
        cpu: {
          slowLogged: false,
          hogSeen: false,
          jobIdentified: false,
          jobStopped: false,
          appRestarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-hog", label: "Runaway process", initiallyPlausible: true },
      { id: "h-app", label: "App memory leak", initiallyPlausible: true },
      { id: "h-flood", label: "Inbound request flood", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Establish whether the reporting app is failing or being starved, then name the process holding the CPU before changing anything.",
      "steps": [
        {
          "id": "guide-ps-cpu",
          "title": "Find the CPU owner",
          "explanation": "Run ps aux and read each row in the Processes tab.",
          "why": "The process list — the same table ps prints — answers directly who is holding the cores.",
          "expectedObservation": "One row reads: root 812 99.7 python3 /opt/extract.py.",
          "target": { "componentId": "process-list", "label": "Processes tab (running list)" },
          "actionId": "ps-aux",
          "commandId": "ps",
          "fallback": "the Processes tab in the Linux workstation panel"
        },
        {
          "id": "guide-job-output",
          "title": "Read what the job is doing",
          "explanation": "Inspect the extract job's output and note the line it repeats.",
          "why": "A high-CPU number alone is not a diagnosis; seeing the loop shows what the process is actually doing.",
          "expectedObservation": "The output repeats the line 'retrying chunk 9981'.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "inspect-extract-job"
        },
        {
          "id": "guide-stop-job",
          "title": "Stop the runaway job",
          "explanation": "Apply Stop the runaway job so the looping process stops holding the cores.",
          "why": "The evidence points at this one process, so stopping it frees the machine without touching healthy services.",
          "expectedObservation": "The Processes tab no longer lists PID 812.",
          "target": { "componentId": "process-list", "label": "Processes tab (PID 812)" },
          "actionId": "stop-extract-job",
          "fallback": "the Processes tab in the Linux workstation panel"
        },
        {
          "id": "guide-restart-api",
          "title": "Restart the reporting service",
          "explanation": "Restart app.service so queued work can drain on the freed cores.",
          "why": "The app was slowed, not dead, so a restart clears its backlog and sets up an honest test.",
          "expectedObservation": "The Services tab shows app.service as active (running).",
          "target": { "componentId": "service-manager", "label": "Services tab (app.service)" },
          "actionId": "restart-app",
          "conceptId": "systemd-service-basics",
          "fallback": "the Services tab in the Linux workstation panel"
        },
        {
          "id": "guide-verify-latency",
          "title": "Re-measure the original request",
          "explanation": "Run Verify API response time and confirm app.service answers GET /reports quickly.",
          "why": "The ticket was about slowness, so only a fresh measurement proves the reported symptom is gone.",
          "expectedObservation": "The check reports GET /reports completing in 240 ms.",
          "target": { "componentId": "service-manager", "label": "Services tab (app.service row)" },
          "actionId": "verify-latency",
          "conceptId": "troubleshooting-method",
          "fallback": "the Services tab in the Linux workstation panel"
        }
      ]
    },
    actions: [
      {
        id: "journalctl-app",
        label: "journalctl -u app",
        kind: "terminal",
        tool: "terminal",
        patch: { cpu: { slowLogged: true } },
        feedback:
          "Requests take over 30s with load average 14.8 — the app is slow but still running.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal separates 'failing' from 'starved' — a live process serving slowly points at contention, not a crash loop.",
          evidenceGain: "Slow requests with rising load — starvation pattern, not a crash.",
        },
        isDiagnostic: true,
      },
      {
        id: "ps-aux",
        label: "ps aux",
        kind: "terminal",
        tool: "terminal",
        patch: { cpu: { hogSeen: true } },
        feedback:
          "python3 /opt/extract.py at 99.7% CPU (PID 812) — one process owns every core.",
        evaluation: {
          grade: "optimal",
          rationale:
            "When load is the symptom, ps answers who owns the CPU directly — one row at 100% reframes the whole ticket around that PID.",
          evidenceGain: "Single process at 99.7% CPU — CPU resource exhausted.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-extract-job",
        label: "Inspect the extract job output",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "cpu.hogSeen", value: true },
        patch: { cpu: { jobIdentified: true } },
        feedback:
          "extract.py loops on 'retrying chunk 9981' — launched by the hourly extract.timer, it never exits on a malformed archive.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Seeing a high-CPU PID is not yet a diagnosis — reading what the job is doing proves it is a looping batch job, not the app you were asked about.",
          evidenceGain: "Runaway confirmed as a looping batch job — the app is the victim.",
        },
        isDiagnostic: true,
      },
      {
        id: "stop-extract-job",
        label: "Stop the runaway job",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "cpu.jobIdentified", value: true },
        patch: {
          cpu: { jobStopped: true },
          processes: [
            "www     915   1.1  nginx: worker process",
            "www     916   0.9  nginx: worker process",
            "root    401   0.2  sshd: root@pts/0",
          ],
        },
        feedback: "PID 812 stopped; load dropping — CPU back under 15%.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence points at this PID and this PID only — stopping the loop frees the cores without touching the healthy app.",
          evidenceGain: "Starvation source removed — CPU reclaimed.",
        },
        isFix: true,
      },
      {
        id: "restart-app",
        label: "Restart app.service",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "cpu.jobStopped", value: true },
        patch: {
          cpu: { appRestarted: true },
          services: [
            {
              id: "app",
              name: "app.service",
              status: "active (running)",
              pid: 1051,
              description: "Reporting API",
            },
            {
              id: "extract",
              name: "extract.timer",
              status: "active",
              description: "Hourly extract job",
            },
          ],
        },
        feedback: "app.service is active; queued requests draining.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The app was degraded, not dead — a restart after the CPU is freed clears its backlog and gives verification a clean starting point.",
          evidenceGain: "Service healthy again with CPU available.",
        },
        isFix: true,
      },
      {
        id: "verify-latency",
        label: "Verify API response time",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "cpu.appRestarted", value: true },
        patch: { cpu: { verified: true } },
        feedback: "GET /reports completes in 240 ms — back to normal.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was about slowness, so the fix is only proven by measuring the original request under the same path the user reported.",
          evidenceGain: "240 ms response — original symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "reboot-wrong",
        label: "Reboot the server",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "A reboot drops the load briefly, but extract.timer relaunches the same looping job on the next hourly cycle — the evidence names a process to stop, not a machine to restart.",
        },
        feedback: "Reboot only delays — the timer will relaunch the looping job.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "cpu.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "cpu.verified", value: true },
      { type: "stateEquals", path: "cpu.jobStopped", value: true },
      { type: "stateEquals", path: "cpu.appRestarted", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-wrong"],
        },
        feedback: "The looping timer job comes right back — stop the process the evidence named.",
      },
    ],
    hints: [
      { level: 1, text: "Read what the app journal says is happening to requests." },
      { level: 2, text: "The Processes view and ps both list who owns the CPU right now." },
      {
        level: 3,
        text: "One PID at 99.7% with the app merely slow means the app is the victim — stop the loop, then restore the service.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "extract.py, launched hourly by extract.timer, loops forever on a malformed archive and pins every CPU core; the reporting API is starved of CPU.",
      whyItWorked:
        "Stopping the looping process freed the cores and the service restart let queued work drain — the latency measurement proved recovery. Transferable principle: when one process owns the CPU, the service in the ticket is usually the victim, not the culprit.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Journal showed 30s requests and load 14.8." },
        {
          step: "Rule out",
          whatLearnerDid:
            "App-crash hypothesis dropped — process stayed up; flood hypothesis dropped — slowness tracks local load, not request volume.",
        },
        { step: "Apply fix", whatLearnerDid: "Stopped runaway PID 812, then restarted the service." },
        { step: "Verify", whatLearnerDid: "GET /reports measured at 240 ms." },
      ],
      followUps: [
        "Add a watchdog alert for a single process above 90% CPU for 5 minutes.",
        "Make extract.py exit non-zero on a malformed archive instead of retrying forever.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "systemd-service-basics"],
    references: [
      {
        title: "procps-ng — ps",
        url: "https://man7.org/linux/man-pages/man1/ps.1.html",
        note: "Link only.",
      },
    ],
  },
  {
    id: "dns-some-sites-broken",
    version: 1,
    title: "Some websites work, some don't",
    category: "networking",
    difficulty: "beginner",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: ["Separate DNS from connectivity failures", "Use nslookup/ping effectively"],
    prerequisites: [],
    skills: ["dns", "tcp-ip", "troubleshooting-method"],
    ticket: {
      id: "HD-1007",
      user: "Alex Rivera",
      role: "Sales",
      symptomPlainLanguage:
        "I can open sites I visited before, but new URLs fail. It says server not found.",
      priority: "high",
      channel: "phone",
    },
    environment: {
      kind: "network+terminal",
      shell: "windows",
      availableTools: ["network", "terminal", "network-settings"],
      enabledCommands: ["ipconfig", "ping", "nslookup", "tracert", "help", "netstat"],
      components: ["network-topology", "dns-inspector", "packet-inspector"],
      showInspector: true,
        initialWorld: {
          currentUser: "alex",
          hosts: [
            {
              id: "pc1",
              name: "DESKTOP-ALEX",
              os: "windows",
              ips: ["192.168.1.50"],
              mac: "A1:B2:C3:D4:E5:F6",
              gateway: "192.168.1.1",
              dns: ["192.168.1.1"],
            },
          ],
          network: {
            faults: {
              dnsServerDown: true,
              dnsWrongRecord: false,
              portalOffline: false,
              gatewayMisconfigured: false,
              gatewayDown: false,
              noInternet: false,
            },
          },
          dnsZones: {
            "intranet.corp": "10.0.0.20",
            "portal.corp": "10.0.0.30",
          },
          diagnostics: {
            pingedGateway: false,
            pingedPublicIp: false,
            ranNslookup: false,
            fixedDns: false,
            verified: false,
          },
        },
      },
      conversation: {
        persona: "Alex Rivera",
        opening:
          "I can open sites I visited before, but new URLs fail. It says server not found.",
        followUpQuestions: [
          "Does email or Teams still work?",
          "When did this start?",
          "Have you tried a different network?",
        ],
        replies: [
          {
            match: ["email", "teams", "cached", "before", "history"],
            response:
              "Email still works, and bookmarks I use every day open fine. Only brand-new addresses fail.",
            once: false,
            revealsConcepts: ["Cached/history hits working while new names fail points to DNS."],
          },
          {
            match: ["start", "when", "today", "yesterday"],
            response: "It started this morning after the network maintenance window.",
            once: false,
            revealsConcepts: [],
          },
          {
            match: ["different network", "hotspot", "phone"],
            response:
              "I have not tried another network yet. Should I tether to my phone?",
            once: false,
            revealsConcepts: [],
          },
          {
            match: ["gateway", "router", "ping"],
            when: { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
            response:
              "You already tested the router path — I saw the lights blinking. New names still fail though.",
            once: false,
            revealsConcepts: ["Gateway reachability does not prove name resolution works."],
          },
          {
            match: ["dns", "resolver", "server"],
            when: { type: "stateEquals", path: "diagnostics.ranNslookup", value: true },
            response:
              "So the lookup itself is failing on our side? That matches what I see in the browser.",
            once: false,
            revealsConcepts: ["Isolating nslookup failure confirms the DNS path, not the NIC."],
          },
        ],
        defaultReply:
          "Old sites open, new ones say server not found. Wi-Fi looks connected.",
        mentorPrompts: [
          "Separate connectivity from name resolution before changing settings.",
          "Prove the path: gateway → public IP → DNS lookup.",
          "Consider all four failure classes: resolver down, bad record, portal, path.",
        ],
      },
      conceptsOnStart: [
        "DNS converts names to IP addresses. Connectivity can be fine while DNS is broken.",
      ],
      hypotheses: [
      { id: "h-dns", label: "DNS server down (resolver unreachable)", initiallyPlausible: true },
      { id: "h-record", label: "DNS record missing / wrong", initiallyPlausible: true },
      { id: "h-portal", label: "Captive portal offline", initiallyPlausible: false },
      { id: "h-path", label: "Network path to resolver broken", initiallyPlausible: true },
      { id: "h-nic", label: "NIC failure", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro: "Prove each layer in order: local path, internet path, then name resolution.",
      steps: [
        {
          id: "guide-gateway",
          title: "Prove the local path",
          explanation: "Ping the default gateway from the terminal.",
          why: "Connectivity and name resolution failures look identical from the user's seat; the local path is the first layer to prove.",
          expectedObservation: "Whether the gateway answers the ping.",
          target: { componentId: "gateway", label: "Default gateway" },
          actionId: "diag-ping-gateway",
          commandId: "ping-ok",
          fallback: "the gateway node in the network map",
          conceptId: "gateway-vs-dns",
        },
        {
          id: "guide-public",
          title: "Prove the internet path",
          explanation: "Ping a public IP address (8.8.8.8).",
          why: "Pinging by address exercises routing without involving name resolution at all.",
          expectedObservation: "Whether the public IP answers the ping.",
          target: { componentId: "internet", label: "Internet (public path)" },
          actionId: "diag-ping-public",
          commandId: "ping-ok",
          fallback: "the internet node in the network map",
        },
        {
          id: "guide-lookup",
          title: "Test name resolution",
          explanation: "Run a lookup for a brand-new hostname in the terminal.",
          why: "With routing proven, an explicit lookup isolates whether name resolution itself is failing.",
          expectedObservation: "Whether the lookup returns an address or times out.",
          target: { componentId: "dns", label: "DNS resolver" },
          actionId: "diag-nslookup",
          commandId: "nslookup-fail",
          fallback: "the DNS node in the network map",
          conceptId: "what-is-dns",
        },
        {
          id: "guide-resolver",
          title: "Point the adapter at a reachable resolver",
          explanation: "Change this machine's DNS setting to a working secondary resolver.",
          why: "Once lookups fail while routing works, changing only the resolver is the smallest change that matches the evidence.",
          expectedObservation: "The adapter showing the new resolver address.",
          target: { componentId: "dns", label: "DNS settings on this machine" },
          actionId: "fix-dns",
          fallback: "the network settings for this machine",
        },
        {
          id: "guide-verify",
          title: "Verify with a new site",
          explanation: "Resolve and open a hostname you have not visited in this session.",
          why: "A brand-new name is the only honest test of the original symptom — cached entries would pass either way.",
          expectedObservation: "The new hostname resolving and the page loading.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "verify-browse",
          commandId: "nslookup-ok",
          fallback: "the terminal button in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "diag-ping-gateway",
          label: "Ping the default gateway",
          kind: "terminal",
          tool: "terminal",
          component: "gateway",
          patch: { diagnostics: { pingedGateway: true } },
          feedback: "Gateway responds — local network path is healthy.",
          isDiagnostic: true,
          evaluation: {
            grade: "optimal",
            rationale: "Confirming local reachability first separates LAN issues from upstream/DNS.",
            evidenceGain: "Gateway reachable (L3 path to router OK).",
            learnMore: "gateway-vs-dns",
          },
          matchHints: ["ping gateway", "ping default gateway", "reach gateway", "ping 192.168.1.1"],
        },
        {
          id: "diag-ping-public",
          label: "Ping a public IP (8.8.8.8)",
          kind: "terminal",
          tool: "terminal",
          component: "internet",
          appliesWhen: { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
          patch: { diagnostics: { pingedPublicIp: true } },
          feedback: "Public IP responds — routing to internet works. Not a gateway issue.",
          isDiagnostic: true,
          evaluation: {
            grade: "optimal",
            rationale: "Pinging by IP proves connectivity independent of DNS.",
            evidenceGain: "Internet routing works without DNS.",
            learnMore: "ip-addressing-basics",
          },
          matchHints: ["ping 8.8.8.8", "ping public ip", "ping ip"],
        },
        {
          id: "diag-nslookup",
          label: "nslookup example.com",
          kind: "terminal",
          tool: "terminal",
          component: "dns",
          appliesWhen: { type: "stateEquals", path: "diagnostics.pingedPublicIp", value: true },
          patch: { diagnostics: { ranNslookup: true } },
          feedback: "nslookup times out — DNS server unreachable.",
          isDiagnostic: true,
          evaluation: {
            grade: "optimal",
            rationale: "After proving IP connectivity, nslookup isolates name resolution failure.",
            evidenceGain: "DNS server unreachable for lookups (resolver down, not path).",
            learnMore: "what-is-dns",
          },
          matchHints: ["nslookup", "dns lookup", "resolve name"],
        },
        {
          id: "diag-tracert",
          label: "tracert toward the internet",
          kind: "terminal",
          tool: "terminal",
          component: "internet",
          appliesWhen: { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
          patch: {},
          feedback: "Route leaves the gateway cleanly — path to WAN is intact.",
          isDiagnostic: true,
          evaluation: {
            grade: "good",
            rationale: "Traceroute confirms the network path while DNS remains the open question.",
            evidenceGain: "WAN path healthy; rules out network-path root cause.",
          },
          matchHints: ["tracert", "traceroute", "trace route"],
        },
        {
          id: "fix-dns",
          label: "Point DNS to working secondary (1.1.1.1)",
          kind: "ui",
          tool: "network-settings",
          component: "dns",
          appliesWhen: { type: "stateEquals", path: "diagnostics.ranNslookup", value: true },
          patch: {
            hosts: [
              {
                id: "pc1",
                name: "DESKTOP-ALEX",
                os: "windows",
                ips: ["192.168.1.50"],
                mac: "A1:B2:C3:D4:E5:F6",
                gateway: "192.168.1.1",
                dns: ["1.1.1.1"],
              },
            ],
            network: {
              faults: {
                dnsServerDown: false,
                dnsWrongRecord: false,
                portalOffline: false,
                gatewayMisconfigured: false,
              },
            },
            diagnostics: { fixedDns: true },
          },
          feedback: "Adapter now uses a reachable DNS resolver.",
          isFix: true,
          evaluation: {
            grade: "optimal",
            rationale: "Switching to a reachable resolver restores name resolution without touching routing.",
            evidenceGain: "DNS path repaired to 1.1.1.1; resolver reachable.",
            learnMore: "what-is-dns",
          },
          matchHints: ["change dns", "1.1.1.1", "secondary dns", "fix dns"],
        },
        {
          id: "verify-browse",
          label: "Resolve and open a new site",
          kind: "terminal",
          tool: "terminal",
          component: "dns",
          appliesWhen: { type: "stateEquals", path: "diagnostics.fixedDns", value: true },
          patch: { diagnostics: { verified: true } },
          feedback: "New hostname resolves; page loads.",
          isFix: true,
          evaluation: {
            grade: "optimal",
            rationale: "Opening a brand-new hostname verifies the original symptom is gone.",
            evidenceGain: "New site resolves and loads.",
          },
          matchHints: ["browse new site", "open website", "verify resolve", "nslookup example.com"],
        },
        {
          id: "reboot-wifi-wrong",
          label: "Reboot the Wi-Fi router blindly",
          kind: "ui",
          tool: "network",
          component: "gateway",
          feedback:
            "Gateway pings fine — the edge router is not the problem. Narrow with evidence before rebooting shared equipment.",
          evaluation: {
            grade: "risky",
            rationale:
              "Rebooting shared infrastructure without evidence can disrupt others and may not fix DNS.",
            learnMore: "troubleshooting-method",
          },
          matchHints: ["reboot router", "restart wifi", "power cycle router"],
        },
      ],
    successConditions: [{ type: "stateEquals", path: "diagnostics.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "diagnostics.verified", value: true },
      { type: "stateEquals", path: "network.faults.dnsServerDown", value: false },
      { type: "stateEquals", path: "diagnostics.ranNslookup", value: true },
      {
        type: "all",
        conditions: [
          { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
          { type: "stateEquals", path: "diagnostics.pingedPublicIp", value: true },
        ],
      },
    ],
    wrongPaths: [
      {
        when: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "diagnostics.pingedPublicIp", value: false },
            { type: "stateEquals", path: "appliedActions", value: ["fix-dns"] },
          ],
        },
        feedback: "You changed DNS before confirming IP connectivity — that skips the diagnostic path.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Cached sites working vs new names failing is a classic DNS signature.",
        category: "concept",
      },
      {
        level: 2,
        text: "Work up the stack and prove each layer before blaming the next: local path, then internet path, then name resolution.",
        category: "method",
      },
      {
        level: 3,
        text: "Routing is proven and lookups still fail — what is the smallest change that restores resolution without disturbing the network?",
        category: "direct",
      },
    ],
    debrief: {
      rootCause: "The site's primary DNS server was down while routing remained healthy.",
      whyItWorked:
        "Tests proved L3 connectivity, isolated failure to name resolution, and switching resolvers restored lookups without touching the gateway. Transferable principle: prove each layer before blaming the next, then change only the layer that fails.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Gateway ping → public IP ping → nslookup" },
        { step: "Rule out", whatLearnerDid: "Routing and WAN dropped — gateway and public pings both answered." },
        { step: "Root cause", whatLearnerDid: "DNS unreachable" },
        { step: "Fix + Verify", whatLearnerDid: "Alternate DNS + resolve new name" },
      ],
      followUps: ["Consider redundant DNS servers for the LAN."],
    },
    knowledgeLinks: ["what-is-dns", "gateway-vs-dns", "ip-addressing-basics"],
    references: [
      {
        title: "RFC Editor",
        url: "https://www.rfc-editor.org/",
        note: "Protocol references; free to read.",
      },
    ],
  },
  {
    id: "wifi-connected-no-internet",
    version: 1,
    title: "Wi-Fi connected but no internet",
    category: "networking",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: ["Identify wrong gateway configuration", "Verify with layered pings"],
    prerequisites: ["dns-some-sites-broken"],
    skills: ["gateway", "ip-addressing", "troubleshooting-method"],
    ticket: {
      id: "HD-1008",
      user: "Chris Patel",
      role: "Designer",
      symptomPlainLanguage:
        "Wi-Fi shows connected with full signal, but nothing loads. Email offline too.",
      priority: "high",
      channel: "walkup",
    },
    environment: {
      kind: "network+terminal",
      shell: "windows",
      availableTools: ["network", "terminal", "network-settings"],
      enabledCommands: ["ipconfig", "ping", "nslookup", "tracert", "help"],
      initialWorld: {
        currentUser: "chris",
        hosts: [
          {
            id: "pc1",
            name: "LAPTOP-CHRIS",
            os: "windows",
            ips: ["192.168.1.77"],
            mac: "C0:FF:EE:00:11:22",
            gateway: "10.0.0.1",
            dns: ["8.8.8.8"],
          },
        ],
        network: {
          faults: {
            dnsServerDown: false,
            gatewayMisconfigured: true,
            noInternet: false,
          },
        },
        diagnostics: {
          ranIpconfig: false,
          pingedGateway: false,
          pingedPublicIp: false,
          fixedGateway: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Chris Patel",
      opening: "Wi-Fi shows connected with full signal, but nothing loads. Email offline too.",
      followUpQuestions: [
        "Do other devices on this network work?",
        "When did it last work?",
        "Did anything change on your laptop?",
      ],
      replies: [
        {
          match: ["other devices", "phone", "colleague", "works there"],
          response: "My phone on this same Wi-Fi loads pages fine — it's only this laptop.",
          once: false,
          revealsConcepts: ["One device failing while others work points at the client, not the network."],
        },
        {
          match: ["yesterday", "last worked", "this morning", "when"],
          response:
            "It worked fine this morning when I got in, then everything stopped loading around 10.",
          once: false,
          revealsConcepts: ["A start time helps separate a config change from an outage."],
        },
        {
          match: ["changed", "update", "moved", "settings"],
          response: "Nothing that I know of — I've been at the same desk all day.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply:
        "It says connected with full bars, but every site just spins until it times out.",
      mentorPrompts: [
        "Ask what else shares the network before blaming the router.",
        "Compare the host's own addressing against the network it claims to be on.",
      ],
    },
    hypotheses: [
      { id: "h-gw", label: "Wrong gateway", initiallyPlausible: false },
      { id: "h-isp", label: "ISP outage", initiallyPlausible: true },
      { id: "h-dns", label: "DNS", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Start with this laptop's own addressing, then probe outward one hop at a time and change only what a probe contradicts.",
      "steps": [
        {
          "id": "guide-ipconfig",
          "title": "Read the adapter's addressing",
          "explanation": "Run ipconfig /all and compare the IP line with the gateway line.",
          "why": "ipconfig shows what this machine believes about itself — address, gateway, DNS — before any test is run.",
          "expectedObservation": "The output lists 192.168.1.77/24 with gateway 10.0.0.1.",
          "target": { "componentId": "host", "label": "Workstation LAPTOP-CHRIS" },
          "actionId": "diag-ipconfig",
          "commandId": "ipconfig",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-ping-gateway",
          "title": "Ping the configured gateway",
          "explanation": "Run Ping configured gateway and watch whether 10.0.0.1 answers.",
          "why": "A gateway is the router address that carries traffic off this subnet, so it must answer first.",
          "expectedObservation": "The ping to 10.0.0.1 returns no reply lines.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "diag-ping-gw",
          "commandId": "ping-fail",
          "conceptId": "gateway-vs-dns"
        },
        {
          "id": "guide-ping-public",
          "title": "Ping a public address",
          "explanation": "Ping 8.8.8.8 for comparison and read whether this machine can leave its own network.",
          "why": "A raw address bypasses DNS — the service that turns names into addresses — so this test is about routing only.",
          "expectedObservation": "The ping to 8.8.8.8 prints no reply lines.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "diag-ping-public",
          "commandId": "ping-fail",
        },
        {
          "id": "guide-set-gateway",
          "title": "Correct the gateway setting",
          "explanation": "Apply Set gateway to 192.168.1.1, the address this machine's own subnet expects.",
          "why": "Changing only the mismatched value is the smallest change the evidence supports; Wi-Fi and DNS stay untouched.",
          "expectedObservation": "The gateway node turns healthy and reads config corrected.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "fix-gateway"
        },
        {
          "id": "guide-verify-internet",
          "title": "Verify the path end to end",
          "explanation": "Run Ping public IP and open a site to confirm traffic flows again.",
          "why": "Layered probes plus a real page prove recovery instead of assuming the single change worked.",
          "expectedObservation": "The public ping answers and the page loads.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "verify-internet"
        }
      ]
    },
    actions: [
      {
        id: "diag-ipconfig",
        label: "ipconfig /all",
        kind: "terminal",
        tool: "terminal",
        patch: { diagnostics: { ranIpconfig: true } },
        feedback: "IP is 192.168.1.77/24 but gateway is 10.0.0.1 — different network!",
        evaluation: {
          grade: "optimal",
          rationale:
            "Configured addressing is the first thing to prove when 'connected but no internet' — ipconfig exposes a gateway on a different network immediately.",
          evidenceGain: "Host 192.168.1.77/24 but gateway 10.0.0.1 — different networks.",
        },
        isDiagnostic: true,
      },
      {
        id: "diag-ping-gw",
        label: "Ping configured gateway",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "diagnostics.ranIpconfig", value: true },
        patch: { diagnostics: { pingedGateway: true } },
        feedback: "10.0.0.1 unreachable — wrong gateway.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Probing the configured gateway tests whether that exit is reachable — its failure confirms the mismatch ipconfig showed and keeps the fault local.",
          evidenceGain: "Configured gateway unreachable — fault is local config, not the ISP.",
        },
        matchHints: ["ping 10.0.0.1"],
        isDiagnostic: true,
      },
      {
        id: "diag-ping-public",
        label: "Ping 8.8.8.8 (for comparison)",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
        patch: { diagnostics: { pingedPublicIp: true } },
        feedback: "Public ping fails without a valid gateway — cannot leave the subnet.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A public target proves you cannot leave the subnet at all — isolating the fault to your own exit rather than any remote site or DNS.",
          evidenceGain: "Cannot leave the subnet — remote sites and DNS not yet in scope.",
        },
        matchHints: ["ping 8.8.8.8"],
        isDiagnostic: true,
      },
      {
        id: "fix-gateway",
        label: "Set gateway to 192.168.1.1",
        kind: "ui",
        tool: "network-settings",
        appliesWhen: { type: "stateEquals", path: "diagnostics.pingedPublicIp", value: true },
        patch: {
          hosts: [
            {
              id: "pc1",
              name: "LAPTOP-CHRIS",
              os: "windows",
              ips: ["192.168.1.77"],
              mac: "C0:FF:EE:00:11:22",
              gateway: "192.168.1.1",
              dns: ["8.8.8.8"],
            },
          ],
          network: { faults: { gatewayMisconfigured: false } },
          diagnostics: { fixedGateway: true },
        },
        feedback: "Gateway now matches the local subnet.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The host's own subnet says the exit should be 192.168.1.1 — the smallest change that restores routing without touching DNS or Wi-Fi settings.",
          evidenceGain: "Gateway now on-subnet (192.168.1.1).",
        },
        isFix: true,
      },
      {
        id: "verify-internet",
        label: "Ping public IP and open a site",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "diagnostics.fixedGateway", value: true },
        patch: { diagnostics: { verified: true } },
        feedback: "Internet path restored.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Layered pings plus an actual page load prove end-to-end connectivity instead of assuming the gateway change worked.",
          evidenceGain: "Public path restored end to end.",
        },
        isFix: true,
      },
      {
        id: "forget-wifi-wrong",
        label: "Forget Wi-Fi network and reconnect",
        kind: "ui",
        tool: "network",
        evaluation: {
          grade: "wrong",
          rationale:
            "Reassociating does not touch addressing: the adapter is already connected with full signal, and ipconfig shows the real problem is a gateway outside this subnet.",
        },
        feedback:
          "Association is already fine (connected). The fault is in addressing, not Wi-Fi auth.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "diagnostics.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "diagnostics.verified", value: true },
      { type: "stateEquals", path: "network.faults.gatewayMisconfigured", value: false },
      { type: "stateEquals", path: "diagnostics.ranIpconfig", value: true },
    ],
    wrongPaths: [],
    hints: [
      { level: 1, text: "\"Connected\" only means Layer 2 — check addressing next." },
      { level: 2, text: "Compare your IP network to the gateway address." },
      {
        level: 3,
        text: "The gateway you were handed doesn't answer — what does your own subnet say the exit should be?",
        category: "concept",
      },
    ],
    debrief: {
      rootCause: "A static gateway (10.0.0.1) did not belong to the host's 192.168.1.0/24 subnet.",
      whyItWorked:
        "With a reachable on-subnet gateway, the host could route off-network traffic. Layered pings proved each hop. Transferable principle: 'connected' only proves Layer 2 — addressing is what makes a host reachable.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "ipconfig + ping gateway" },
        { step: "Rule out", whatLearnerDid: "Remote sites and DNS dropped — no route exists until the gateway is correct." },
        { step: "Root cause", whatLearnerDid: "Misconfigured gateway" },
        { step: "Verify", whatLearnerDid: "Public connectivity restored" },
      ],
      followUps: ["Prefer DHCP unless static addressing is documented."],
    },
    knowledgeLinks: ["ip-addressing-basics", "gateway-vs-dns"],
    references: [],
  },
  {
    id: "dhcp-addressing-broken",
    version: 1,
    title: "Clients get 169.254 addresses",
    category: "networking",
    difficulty: "intermediate",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: ["Recognize APIPA", "Diagnose DHCP server failures"],
    prerequisites: ["wifi-connected-no-internet"],
    skills: ["dhcp", "ip-addressing"],
    ticket: {
      id: "HD-1009",
      user: "Helpdesk queue",
      role: "Multiple users",
      symptomPlainLanguage:
        "Several PCs suddenly have weird 169.254.x.x addresses and cannot reach shares.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "network+terminal",
      shell: "windows",
      availableTools: ["network", "terminal", "network-settings"],
      enabledCommands: ["ipconfig", "ping", "nslookup", "help"],
      initialWorld: {
        currentUser: "helpdesk",
        hosts: [
          {
            id: "pc1",
            name: "PC-FINANCE-02",
            os: "windows",
            ips: ["169.254.10.22"],
            mac: "AA:BB:CC:01:02:03",
            gateway: "",
            dns: [],
          },
        ],
        network: {
          faults: {
            dhcpServerDown: true,
            dnsServerDown: false,
            gatewayMisconfigured: false,
            noInternet: false,
          },
          dhcpServer: { status: "stopped", pool: "192.168.1.100-200" },
        },
        diagnostics: {
          sawApipa: false,
          checkedDhcp: false,
          startedDhcp: false,
          renewedLease: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-dhcp", label: "DHCP server down", initiallyPlausible: true },
      { id: "h-cable", label: "Cable unplugged", initiallyPlausible: false },
      { id: "h-vlan", label: "Wrong VLAN", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work from the client's own address outward, one layer at a time, until the source of the leases is in view.",
      "steps": [
        {
          "id": "guide-apipa",
          "title": "Read the client's address",
          "explanation": "Note the self-assigned 169.254 address this machine is using.",
          "why": "A 169.254 address is picked by the client itself when no lease offer arrives, so it points upstream.",
          "expectedObservation": "The machine shows 169.254.10.22 with no gateway listed.",
          "target": { "componentId": "host", "label": "Workstation PC-FINANCE-02" },
          "actionId": "diag-apipa",
          "commandId": "ipconfig",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-dhcp-service",
          "title": "Inspect the DHCP service",
          "explanation": "Run Inspect DHCP server service and read the state it reports for the server.",
          "why": "DHCP — the service that hands out addresses — must answer before any client can get a real lease.",
          "expectedObservation": "The DHCP node reads service stopped.",
          "target": { "componentId": "dhcp", "label": "DHCP server" },
          "actionId": "check-dhcp-service"
        },
        {
          "id": "guide-start-dhcp",
          "title": "Start the DHCP service",
          "explanation": "Apply Start DHCP service so the server can offer leases again.",
          "why": "Restoring the source fixes every client on the segment instead of patching a single machine.",
          "expectedObservation": "The DHCP node changes from service stopped to service running.",
          "target": { "componentId": "dhcp", "label": "DHCP server" },
          "actionId": "start-dhcp"
        },
        {
          "id": "guide-renew-lease",
          "title": "Renew the client's lease",
          "explanation": "Run ipconfig /renew and read the address the server hands back.",
          "why": "A server fix does nothing for a host still holding its self-assigned address; the client must ask again.",
          "expectedObservation": "The output shows 192.168.1.154 received from the pool.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "renew-lease",
          "commandId": "ipconfig",
        },
        {
          "id": "guide-verify-lease",
          "title": "Verify reachability with the lease",
          "explanation": "Run Ping gateway and file share and read what answers.",
          "why": "An address alone proves nothing; replies show the lease carries a working gateway and a DNS resolver — the server that answers name lookups.",
          "expectedObservation": "Replies come back from the gateway and the file share.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "verify-connectivity"
        }
      ]
    },
    actions: [
      {
        id: "diag-apipa",
        label: "Note 169.254 APIPA address",
        kind: "terminal",
        tool: "terminal",
        patch: { diagnostics: { sawApipa: true } },
        feedback: "169.254.x.x means the host could not reach a DHCP server.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A 169.254 self-assigned address is the client telling you no DHCP server answered — the failure point is upstream of this host.",
          evidenceGain: "APIPA present — DHCP never answered this client.",
        },
        matchHints: ["ipconfig"],
        isDiagnostic: true,
      },
      {
        id: "check-link",
        label: "Check link light on NIC and switch",
        kind: "inspect",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.sawApipa", value: true },
        patch: { diagnostics: { checkedLink: true } },
        feedback: "Link is up at 1 Gbps on both ends — cable and switch port are fine.",
        evaluation: {
          grade: "optimal",
          rationale:
            "APIPA can mean a dead cable as easily as a dead server — ruling out Layer 1 first keeps the diagnosis honest before blaming DHCP.",
          evidenceGain: "Link up at 1 Gbps — cable and switch port ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "check-dhcp-service",
        label: "Inspect DHCP server service",
        kind: "inspect",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.sawApipa", value: true },
        patch: { diagnostics: { checkedDhcp: true } },
        feedback: "DHCP service on the server VM is stopped.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the wire path plausible, inspecting the server's own service answers where the offers should be coming from.",
          evidenceGain: "DHCP service stopped — server-side fault proven.",
        },
        isDiagnostic: true,
      },
      {
        id: "start-dhcp",
        label: "Start DHCP service",
        kind: "ui",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.checkedDhcp", value: true },
        patch: {
          network: {
            faults: { dhcpServerDown: false },
            dhcpServer: { status: "running", pool: "192.168.1.100-200" },
          },
          diagnostics: { startedDhcp: true },
        },
        feedback: "DHCP is running and ready to offer leases.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The stopped service is the root cause — restarting it restores the offer source for every client on the segment.",
          evidenceGain: "DHCP running and offering from pool 192.168.1.100-200.",
        },
        isFix: true,
      },
      {
        id: "renew-lease",
        label: "ipconfig /renew",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "diagnostics.startedDhcp", value: true },
        patch: {
          hosts: [
            {
              id: "pc1",
              name: "PC-FINANCE-02",
              os: "windows",
              ips: ["192.168.1.154"],
              mac: "AA:BB:CC:01:02:03",
              gateway: "192.168.1.1",
              dns: ["192.168.1.1"],
            },
          ],
          diagnostics: { renewedLease: true },
        },
        feedback: "Client received 192.168.1.154 from the pool.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A server fix does nothing for a host still holding an APIPA address — the client must request a lease again to pick up valid config.",
          evidenceGain: "Client received 192.168.1.154 from the pool.",
        },
        isDiagnostic: true,
      },
      {
        id: "verify-connectivity",
        label: "Ping gateway and file share",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "diagnostics.renewedLease", value: true },
        patch: { diagnostics: { verified: true } },
        feedback: "Shares reachable again.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Gateway and share reachability prove the lease carries working gateway and DNS config, not just an address.",
          evidenceGain: "Gateway and file share reachable — lease fully functional.",
        },
        isFix: true,
      },
      {
        id: "static-ip-wrong",
        label: "Hardcode a static IP on the PC",
        kind: "ui",
        tool: "network-settings",
        evaluation: {
          grade: "wrong",
          rationale:
            "Hardcoding one PC works around the symptom on a single machine while every other client keeps timing out. The server-side service failure is the actual fault to fix.",
        },
        feedback:
          "Static IPs on multiple machines risk conflicts and don't fix other affected clients.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "diagnostics.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "diagnostics.verified", value: true },
      { type: "stateEquals", path: "network.faults.dhcpServerDown", value: false },
      { type: "stateEquals", path: "diagnostics.renewedLease", value: true },
    ],
    wrongPaths: [],
    hints: [
      { level: 1, text: "169.254 is a self-assigned (APIPA) address — DHCP never answered." },
      { level: 2, text: "Check the DHCP service on the server, not just the client." },
      {
        level: 3,
        text: "The server side is where it failed — once it answers again, what has to happen on the client before it can talk?",
        category: "concept",
      },
    ],
    debrief: {
      rootCause: "The DHCP service was stopped, so clients fell back to APIPA addresses.",
      whyItWorked:
        "Restoring DHCP and renewing leases gave clients valid subnet, gateway, and DNS configuration. Transferable principle: APIPA is the client reporting an answer that never came — chase the server that should have replied.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Identified APIPA" },
        { step: "Rule out", whatLearnerDid: "Client misconfiguration dropped — the host fell back to APIPA exactly as designed when no server answered." },
        { step: "Root cause", whatLearnerDid: "DHCP service down" },
        { step: "Verify", whatLearnerDid: "Valid lease + ping" },
      ],
      followUps: ["Monitor DHCP service health to catch outages early."],
    },
    knowledgeLinks: ["ip-addressing-basics", "gateway-vs-dns"],
    references: [],
  },
  {
    id: "duplicate-ip-conflict",
    version: 1,
    title: "IP address conflict on the network",
    category: "networking",
    difficulty: "intermediate",
    scenarioType: "INTERMITTENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: ["Recognize duplicate IP symptoms", "Resolve static/DHCP overlaps"],
    prerequisites: ["dhcp-addressing-broken"],
    skills: ["ip-addressing", "arp", "dhcp"],
    ticket: {
      id: "HD-1010",
      user: "Two users in finance",
      role: "Staff",
      symptomPlainLanguage:
        "Both my PC and a printer keep dropping off the network. Windows warns about an IP conflict.",
      priority: "medium",
      channel: "phone",
    },
    environment: {
      components: ["network-topology"],
      kind: "network+terminal",
      shell: "windows",
      availableTools: ["network", "terminal", "network-settings"],
      enabledCommands: ["ipconfig", "ping", "help", "netstat"],
      initialWorld: {
        currentUser: "finance",
        hosts: [
          {
            id: "pc1",
            name: "PC-FIN-11",
            os: "windows",
            ips: ["192.168.1.120"],
            mac: "11:22:33:44:55:66",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
          {
            id: "printer1",
            name: "PRN-HP-550",
            os: "embedded",
            ips: ["192.168.1.120"],
            mac: "99:88:77:66:55:44",
            gateway: "192.168.1.1",
            dns: [],
          },
        ],
        network: {
          faults: { duplicateIp: true, dhcpServerDown: false },
          duplicatePair: ["pc1", "printer1"],
        },
        diagnostics: {
          sawConflict: false,
          identifiedPair: false,
          movedPrinterStatic: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Dana Fox, finance",
      opening: "Both my PC and the printer keep dropping off. Windows warns about an IP conflict.",
      followUpQuestions: [
        "When did the warnings start?",
        "Was anything installed or moved recently?",
        "Does the printer print at all?",
      ],
      replies: [
        {
          match: ["tuesday", "installed", "new", "vendor"],
          response:
            "The printer arrived Tuesday — the vendor plugged it straight into the wall port and left.",
          once: false,
          revealsConcepts: ["Network complaints that start when hardware changes often trace to that change."],
        },
        {
          match: ["conflict", "warning", "dropping"],
          response:
            "Windows pops the conflict bubble maybe twice an hour, on both machines.",
          once: false,
          revealsConcepts: ["A conflict warning means two claimants for one address, not a failing cable."],
        },
        {
          match: ["mine", "mine only", "my machine"],
          response: "Nobody touched my machine — it's been the same all week.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply:
        "Since Tuesday everything on this end drops randomly — the conflict warning started it.",
      mentorPrompts: [
        "Identify both claimants before changing any address.",
        "Static addresses must live outside the DHCP pool.",
      ],
    },
    hypotheses: [
      { id: "h-dup", label: "Duplicate static IP", initiallyPlausible: true },
      { id: "h-malware", label: "Malware spoofing", initiallyPlausible: false },
      { id: "h-nic", label: "Failing NIC", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Identify every device claiming the address before changing anything, then move one of them and confirm the warning stays away.",
      "steps": [
        {
          "id": "guide-conflict-warning",
          "title": "Read the conflict warning",
          "explanation": "Run Open network status and note the address Windows is warning about.",
          "why": "The operating system already names the contested address, so starting there gives you the exact value to chase.",
          "expectedObservation": "The workstation node reads IP conflict, and the warning names 192.168.1.120.",
          "target": { "componentId": "host", "label": "Workstation PC-FIN-11" },
          "actionId": "see-conflict",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-arp-table",
          "title": "List the address claimants",
          "explanation": "Inspect the ARP device table and read which MAC addresses claim 192.168.1.120.",
          "why": "A conflict needs two claimants; MAC addresses — each network card's unique hardware ID — name them precisely.",
          "expectedObservation": "The table lists two MAC addresses on 192.168.1.120.",
          "target": { "componentId": "host", "label": "Workstation PC-FIN-11" },
          "actionId": "arp-scan"
        },
        {
          "id": "guide-link-lights",
          "title": "Check both link lights",
          "explanation": "Run Check link lights on both devices and read what the network map shows.",
          "why": "Conflicts can look like flapping hardware, so stable links rule out a failing network card before you re-address the devices.",
          "expectedObservation": "The check reports both link lights up and stable.",
          "target": { "componentId": "network-topology", "label": "Network map" },
          "actionId": "check-links"
        },
        {
          "id": "guide-move-printer",
          "title": "Move the printer off the address",
          "explanation": "Apply the change that puts the printer on 192.168.1.201, outside the DHCP pool.",
          "why": "The table named both claimants; moving the printer outside the pool keeps its static address from colliding with dynamic clients.",
          "expectedObservation": "The workstation node clears from IP conflict to link up.",
          "target": { "componentId": "host", "label": "Workstation PC-FIN-11" },
          "actionId": "move-printer"
        },
        {
          "id": "guide-verify-conflict",
          "title": "Confirm the conflict stays away",
          "explanation": "Run Confirm conflict warning cleared and read every node's state on the map.",
          "why": "No warning after the change proves the overlap caused it, rather than a coincidence that happened to pass.",
          "expectedObservation": "No node on the map reports a conflict.",
          "target": { "componentId": "network-topology", "label": "Network map" },
          "actionId": "verify-conflict-clear"
        }
      ]
    },
    actions: [
      {
        id: "see-conflict",
        label: "Open network status (conflict warning)",
        kind: "inspect",
        tool: "network",
        patch: { diagnostics: { sawConflict: true } },
        feedback: "Windows reports an address conflict on 192.168.1.120.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The OS's own conflict warning is the symptom stated in machine terms — it names the exact address at fault.",
          evidenceGain: "Address conflict on 192.168.1.120 confirmed by the OS.",
        },
        isDiagnostic: true,
      },
      {
        id: "arp-scan",
        label: "Inspect ARP / device table",
        kind: "inspect",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.sawConflict", value: true },
        patch: { diagnostics: { identifiedPair: true } },
        feedback: "Two MACs claim 192.168.1.120: the PC and the printer.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A conflict needs two claimants — the ARP table shows exactly which devices are fighting over the address.",
          evidenceGain: "Two MACs claim 192.168.1.120: the PC and the printer.",
        },
        isDiagnostic: true,
      },
      {
        id: "check-links",
        label: "Check link lights on both devices",
        kind: "inspect",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.sawConflict", value: true },
        patch: { diagnostics: { checkedLinks: true } },
        feedback: "Both link lights are up and stable — no hardware fault.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Conflicts can mask as flapping hardware — confirming both links are stable rules out a dying NIC or cable before you touch addressing.",
          evidenceGain: "Both links stable — hardware fault ruled out; overlap remains.",
        },
        isDiagnostic: true,
      },
      {
        id: "move-printer",
        label: "Change printer static IP to .201 (outside DHCP pool)",
        kind: "ui",
        tool: "network-settings",
        appliesWhen: { type: "stateEquals", path: "diagnostics.identifiedPair", value: true },
        patch: {
          hosts: [
            {
              id: "pc1",
              name: "PC-FIN-11",
              os: "windows",
              ips: ["192.168.1.120"],
              mac: "11:22:33:44:55:66",
              gateway: "192.168.1.1",
              dns: ["192.168.1.1"],
            },
            {
              id: "printer1",
              name: "PRN-HP-550",
              os: "embedded",
              ips: ["192.168.1.201"],
              mac: "99:88:77:66:55:44",
              gateway: "192.168.1.1",
              dns: [],
            },
          ],
          network: { faults: { duplicateIp: false } },
          diagnostics: { movedPrinterStatic: true },
        },
        feedback: "Printer moved to a unique static address outside the DHCP pool.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The PC's lease predates the printer, so the printer's static should move — and outside the DHCP pool so it can never collide with a dynamic client again.",
          evidenceGain: "Printer on unique static .201, outside the DHCP pool.",
        },
        isFix: true,
      },
      {
        id: "verify-conflict-clear",
        label: "Confirm conflict warning cleared",
        kind: "ui",
        tool: "network",
        appliesWhen: { type: "stateEquals", path: "diagnostics.movedPrinterStatic", value: true },
        patch: { diagnostics: { verified: true } },
        feedback: "No further conflicts; both devices stable.",
        evaluation: {
          grade: "optimal",
          rationale:
            "No conflict warning after the change proves the overlap was the cause rather than a coincidence.",
          evidenceGain: "Warning cleared; both devices stable.",
        },
        isFix: true,
      },
      {
        id: "disable-dhcp-wrong",
        label: "Disable DHCP entirely",
        kind: "ui",
        tool: "network-settings",
        evaluation: {
          grade: "wrong",
          rationale:
            "Disabling DHCP would drop every dynamic client on the network to fix one overlapping assignment. The ARP evidence points at a single static address that should be moved instead.",
        },
        feedback: "That scales the conflict problem to every client. Fix the overlapping assignment instead.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "diagnostics.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "diagnostics.verified", value: true },
      { type: "stateEquals", path: "network.faults.duplicateIp", value: false },
    ],
    wrongPaths: [],
    hints: [
      { level: 1, text: "A conflict means two devices claim one address." },
      { level: 2, text: "Compare MAC addresses in the device/ARP table." },
      {
        level: 3,
        text: "You can see both MACs claiming the address — which device should move, and where can it live without colliding with the pool again?",
        category: "concept",
      },
    ],
    debrief: {
      rootCause: "Printer static IP 192.168.1.120 overlapped a DHCP-assigned PC address.",
      whyItWorked:
        "Unique addressing removes ARP ambiguity. Placing printer statics outside the DHCP pool prevents recurrence. Transferable principle: address conflicts are logical — resolve the claimants before replacing hardware.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Conflict warning + ARP table" },
        { step: "Rule out", whatLearnerDid: "Hardware fault dropped — ARP shows two live MACs colliding on one address." },
        { step: "Fix", whatLearnerDid: "Readdressed printer" },
        { step: "Verify", whatLearnerDid: "Warning cleared" },
      ],
      followUps: ["Document static IP reservations policy."],
    },
    knowledgeLinks: ["ip-addressing-basics"],
    references: [],
  },
  {
    id: "firewall-blocks-port",
    version: 1,
    title: "Finance app times out on one port",
    category: "networking",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: [
      "Isolate a port-specific filter with contrasting port tests",
      "Prove path health before blaming the host",
    ],
    prerequisites: ["wifi-connected-no-internet"],
    skills: ["firewall", "ports", "tcp-ip"],
    ticket: {
      id: "HD-1022",
      user: "Rosa Delgado",
      role: "Finance systems analyst",
      symptomPlainLanguage:
        "The finance app at finapp.corp:8443 times out from my workstation since yesterday. Everything else opens fine.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "network+terminal",
      shell: "windows",
      availableTools: ["network", "terminal", "network-settings"],
      enabledCommands: ["ipconfig", "ping", "nslookup", "tracert", "help", "netstat"],
      components: ["network-topology", "dns-inspector", "packet-inspector"],
      showInspector: true,
      initialWorld: {
        currentUser: "rosa",
        hosts: [
          {
            id: "pc1",
            name: "WS-FIN12",
            os: "windows",
            ips: ["192.168.1.88"],
            mac: "B4:2E:99:11:AC:07",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        network: {
          faults: {
            portBlocked: true,
            dnsServerDown: false,
            dnsWrongRecord: false,
            portalOffline: false,
            gatewayMisconfigured: false,
            gatewayDown: false,
            noInternet: false,
            duplicateIp: false,
            dhcpServerDown: false,
          },
        },
        dnsZones: {
          "finapp.corp": "10.10.20.15",
        },
        diagnostics: {
          pingedGateway: false,
          pingedPublicIp: false,
          ranNslookup: false,
          fixedDns: false,
          verified: false,
        },
        fw: {
          pathProved: false,
          resolved: false,
          port8443TimedOut: false,
          port443Ok: false,
          ruleFound: false,
          ruleFixed: false,
          portVerified: false,
        },
      },
    },
    conversation: {
      persona: "Rosa Delgado",
      opening:
        "The finance app times out from my workstation since yesterday. Everything else opens fine.",
      followUpQuestions: [
        "When did it start?",
        "Can the admin reach it from the server console?",
        "Does anyone else have the same problem?",
      ],
      replies: [
        {
          match: ["start", "when", "today", "yesterday"],
          response: "It worked until the network change window yesterday afternoon.",
          once: false,
          revealsConcepts: ["A recent change window is prime-suspect timing."],
        },
        {
          match: ["console", "server side", "locally"],
          response:
            "The admin logs into the server fine — the app process is up from his side.",
          once: false,
          revealsConcepts: ["Local success plus remote failure points at the path, not the process."],
        },
        {
          match: ["anyone else", "others", "colleague"],
          response: "Two others on the finance floor report the same timeout.",
          once: false,
          revealsConcepts: ["Multiple clients failing the same way argues against client config."],
        },
        {
          match: ["443", "management", "other port"],
          when: { type: "stateEquals", path: "fw.port443Ok", value: true },
          response:
            "So the same box answers on 443? That matches — only our app URL is dead.",
          once: false,
          revealsConcepts: ["A live neighbor port proves the host is up and the filter is port-specific."],
        },
      ],
      defaultReply:
        "The finance app times out from my workstation since yesterday; everything else opens fine.",
      mentorPrompts: [
        "Prove the path before blaming the host.",
        "Compare a dead port with a live one on the same server.",
        "Read the firewall rules that match the exact port.",
      ],
    },
    conceptsOnStart: [
      "A timeout on one port while others work is a filtering pattern, not a host failure.",
    ],
    hypotheses: [
      { id: "h-fw", label: "Firewall dropping TCP 8443", initiallyPlausible: true },
      { id: "h-app", label: "App server down", initiallyPlausible: true },
      { id: "h-dns", label: "DNS problem", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Prove the path with layered probes, contrast the failing port with a live one, then read only the rules that match it.",
      "steps": [

        {
          "id": "guide-fw-path",
          "title": "Prove the path to the host",
          "explanation": "Ping 192.168.1.1 from the terminal and read whether the gateway answers.",
          "why": "A port test only means something once the local path is proven — a dead path makes every port look dead.",
          "expectedObservation": "Replies from 192.168.1.1 in well under a millisecond.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "ping-gateway",
          "commandId": "ping-ok"
        },
        {
          "id": "guide-fw-8443",
          "title": "Reproduce the failing port",
          "explanation": "Run Test TCP 8443 to 10.10.20.15 and read how the handshake ends.",
          "why": "The handshake — the open request a port must answer — turns the complaint into a measured test you can compare.",
          "expectedObservation": "The connect test to 8443 times out with no reply.",
          "target": { "componentId": "host", "label": "Workstation WS-FIN12" },
          "actionId": "test-port-8443"
        },
        {
          "id": "guide-fw-443",
          "title": "Test a working port",
          "explanation": "Run Test TCP 443 to the same address and compare the result with 8443.",
          "why": "A live port beside a dead one separates a failed host from a filter; the difference is the diagnosis.",
          "expectedObservation": "The test to 443 succeeds in 2 ms.",
          "target": { "componentId": "host", "label": "Workstation WS-FIN12" },
          "actionId": "test-port-443",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-fw-rules",
          "title": "Read the rules for that port",
          "explanation": "Inspect the edge firewall rules and find the entries matching TCP 8443.",
          "why": "Only after proving a port-specific filter does reading rules become targeted instead of an open-ended search.",
          "expectedObservation": "A deny entry matches TCP 8443 from 192.168.1.0/24.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "inspect-firewall-rules"
        },
        {
          "id": "guide-fw-allow",
          "title": "Add a scoped allow rule",
          "explanation": "Apply Add allow rule for TCP 8443 so it sits above the matching deny.",
          "why": "One scoped, reversible rule above the deny is the smallest change that answers the rule evidence.",
          "expectedObservation": "A new allow entry for TCP 8443 sits above the deny.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "add-allow-rule"
        },
        {
          "id": "guide-fw-verify",
          "title": "Verify the original connection",
          "explanation": "Run Verify app connection on 8443 and read the result it returns.",
          "why": "The ticket was a user-facing timeout, so replaying that exact connection is the only honest proof it is fixed.",
          "expectedObservation": "The connection to 8443 completes in 3 ms and the login page loads.",
          "target": { "componentId": "gateway", "label": "Default gateway" },
          "actionId": "verify-port"
        }
      ]
    },
    actions: [
      {
        id: "ping-gateway",
        label: "ping 192.168.1.1",
        kind: "terminal",
        tool: "terminal",
        component: "gateway",
        patch: { diagnostics: { pingedGateway: true }, fw: { pathProved: true } },
        feedback: "Reply from 192.168.1.1: bytes=32 time<1ms TTL=64.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Every remote test crosses the gateway first — proving it answers keeps the investigation honest about where the path could break.",
          evidenceGain: "Gateway replies in <1ms — the workstation's local path is healthy.",
        },
        isDiagnostic: true,
      },
      {
        id: "resolve-app-name",
        label: "nslookup finapp.corp",
        kind: "terminal",
        tool: "terminal",
        component: "dns",
        patch: { diagnostics: { ranNslookup: true }, fw: { resolved: true } },
        feedback: "finapp.corp → 10.10.20.15.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A timeout can masquerade as a name problem — resolving the name first separates DNS from reachability before any port test.",
          evidenceGain: "Name resolves to 10.10.20.15 — DNS ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "test-port-8443",
        label: "Test TCP 8443 to 10.10.20.15",
        kind: "inspect",
        tool: "network",
        component: "host",
        appliesWhen: { type: "stateEquals", path: "diagnostics.pingedGateway", value: true },
        patch: { fw: { port8443TimedOut: true } },
        feedback:
          "TCP connect to 10.10.20.15:8443 timed out — SYN sent, no SYN-ACK returned.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reproducing the reported failure from the network side turns a user complaint into a measurable, timed-out handshake.",
          evidenceGain: "The reported port times out while the gateway path replies.",
        },
        isDiagnostic: true,
      },
      {
        id: "test-port-443",
        label: "Test TCP 443 to 10.10.20.15",
        kind: "inspect",
        tool: "network",
        component: "host",
        appliesWhen: { type: "stateEquals", path: "fw.port8443TimedOut", value: true },
        patch: { fw: { port443Ok: true } },
        feedback: "TCP connect to 10.10.20.15:443 succeeds in 2 ms.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Contrasting a dead port with a live neighbor on the same host is the fastest way to separate host failure from port-specific filtering.",
          evidenceGain: "Same server answers on 443 — host is up; 8443 is specifically filtered.",
        },
        isDiagnostic: true,
      },
      {
        id: "ping-public",
        label: "ping 8.8.8.8",
        kind: "terminal",
        tool: "terminal",
        component: "internet",
        patch: { diagnostics: { pingedPublicIp: true } },
        feedback: "Reply from 8.8.8.8: bytes=32 time=14ms TTL=115.",
        evaluation: {
          grade: "optimal",
          rationale:
            "WAN reachability completes the path picture — a healthy uplink narrows the failure to the internal hop the app traffic takes.",
          evidenceGain: "WAN path healthy — general internet access unaffected.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-firewall-rules",
        label: "Inspect edge firewall rules",
        kind: "inspect",
        tool: "network",
        component: "gateway",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "fw.port8443TimedOut", value: true },
            { type: "stateEquals", path: "fw.port443Ok", value: true },
          ],
        },
        patch: { fw: { ruleFound: true } },
        feedback:
          "Rule 'deny-finance-app' drops TCP 8443 from 192.168.1.0/24 — added in yesterday's change window.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Only after proving a port-specific filter does reading the rules become targeted — the deny entry names the exact port, source subnet, and timing the ticket describes.",
          evidenceGain: "Deny rule matches the exact port, subnet, and change window.",
        },
        isDiagnostic: true,
      },
      {
        id: "add-allow-rule",
        label: "Add allow rule for TCP 8443",
        kind: "ui",
        tool: "network",
        component: "gateway",
        appliesWhen: { type: "stateEquals", path: "fw.ruleFound", value: true },
        patch: {
          fw: { ruleFixed: true },
          network: { faults: { portBlocked: false } },
        },
        feedback:
          "Allow rule placed above the deny — TCP 8443 now permitted from the finance subnet.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence named one deny rule, so the matching fix is one scoped allow above it — minimal, attributable, and reversible.",
          evidenceGain: "Firewall no longer drops TCP 8443 from the finance subnet.",
        },
        isFix: true,
      },
      {
        id: "verify-port",
        label: "Verify app connection on 8443",
        kind: "ui",
        tool: "network",
        component: "gateway",
        appliesWhen: { type: "stateEquals", path: "fw.ruleFixed", value: true },
        patch: { fw: { portVerified: true } },
        feedback: "TCP 8443 connects in 3 ms and the app login page loads.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was a user-facing timeout — replaying the exact original connection is the only honest proof the fix landed where it mattered.",
          evidenceGain: "Original failure path now works — connection established on 8443.",
        },
        isFix: true,
      },
      {
        id: "restart-server-wrong",
        label: "Restart the app server",
        kind: "ui",
        tool: "network",
        component: "gateway",
        evaluation: {
          grade: "wrong",
          rationale:
            "The server answered on port 443 minutes ago — restarting a healthy host ignores the port-specific evidence that points at the path between client and server.",
        },
        feedback: "Server proven up on 443 — the drop is on the path, not the host.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "fw.portVerified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "fw.portVerified", value: true },
      { type: "stateEquals", path: "fw.ruleFixed", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-server-wrong"],
        },
        feedback:
          "Restarting a host that answers on 443 wastes time — the evidence points at the filter on the path.",
      },
    ],
    hints: [
      { level: 1, text: "Prove the path from the workstation outward before blaming the server." },
      { level: 2, text: "One port times out while another answers on the same host — what sits between them?" },
      {
        level: 3,
        text: "ICMP and one TCP port working while another dies is a filter's signature — read the rules matching that exact port.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Edge firewall rule 'deny-finance-app', added during yesterday's change window, drops TCP 8443 from the finance subnet while the rest of the host stays reachable.",
      whyItWorked:
        "Proving gateway, WAN and DNS health, then contrasting the dead 8443 with the live 443, isolated the failure to a port-specific filter; a scoped allow rule restored exactly what was dropped. Transferable principle: when one port dies while its neighbor lives, the difference between them is the diagnosis.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Gateway and WAN pings, name resolution, and dual port tests against 10.10.20.15.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Server-down dropped via live 443; DNS dropped via nslookup; local path dropped via gateway ping.",
        },
        { step: "Apply fix", whatLearnerDid: "Scoped allow rule matched to the exact deny entry." },
        { step: "Verify", whatLearnerDid: "8443 connects in 3 ms and the login page loads." },
      ],
      followUps: [
        "Add the finance subnet to the change-review checklist for firewall edits.",
      ],
    },
    knowledgeLinks: ["gateway-vs-dns", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn — Windows Firewall with Advanced Security",
        url: "https://learn.microsoft.com/en-us/windows-server/networking/windows-firewall/firewall-with-advanced-security-overview",
        note: "Link only.",
      },
    ],
  },
  {
    id: "printer-not-printing",
    version: 1,
    title: "Printer isn't printing",
    category: "support",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: ["Queue → connectivity → device triage order"],
    prerequisites: [],
    skills: ["helpdesk", "printing", "troubleshooting-method"],
    ticket: {
      id: "HD-1011",
      user: "Elena Brooks",
      role: "Office manager",
      symptomPlainLanguage: "I hit print ten minutes ago and nothing came out. No error on screen.",
      priority: "low",
      channel: "walkup",
    },
    environment: {
      components: ["customer-chat", "evidence-board", "ticket-inbox"],
      kind: "mixed",
      shell: "windows",
      availableTools: ["print-manager", "terminal", "hardware-bench"],
      enabledCommands: ["ipconfig", "ping", "tasklist", "help"],
      initialWorld: {
        currentUser: "elena",
        hosts: [
          {
            id: "pc1",
            name: "PC-ELENA",
            os: "windows",
            ips: ["192.168.1.40"],
            mac: "DE:AD:BE:EF:00:01",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        printer: {
          powerOn: true,
          powerCableSeated: true,
          netCableSeated: true,
          netPortOk: true,
          netEnabled: true,
          addressOk: true,
          paperOk: true,
          tonerOk: true,
          doorClosed: true,
          jamPresent: false,
          spoolerRunning: true,
          queuePaused: true,
          verified: false,
          powerOk: true,
          netLink: true,
          printReady: false,
        },
        diagnostics: {
          checkedQueue: false,
          resumedQueue: false,
        },
      },
    },
    conversation: {
      persona: "Elena Brooks",
      opening: "I hit print ten minutes ago and nothing came out. No error on screen.",
      followUpQuestions: [
        "Is the printer showing any warnings?",
        "Did it print earlier today?",
        "Did anything change on your computer?",
      ],
      replies: [
        {
          match: ["warnings", "jam", "toner", "lights"],
          response: "No warning lights and no jam tray out — the little screen says Ready.",
          once: false,
          revealsConcepts: ["A ready device shifts suspicion to the queue or the driver, not the hardware."],
        },
        {
          match: ["earlier", "yesterday", "printed", "fine"],
          response: "It printed labels all morning — this afternoon's job just vanished.",
          once: false,
          revealsConcepts: ["A recent success rules out most permanent hardware faults."],
        },
        {
          match: ["paused", "someone", "queue"],
          response: "I didn't pause anything, but three of us share this printer.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply: "The job shows as sent, but nothing prints and nothing complains.",
      mentorPrompts: [
        "Check the queue state before touching drivers.",
        "A healthy device with stuck jobs means the spooler is holding them.",
      ],
    },
    hypotheses: [
      { id: "h-queue", label: "Paused queue", initiallyPlausible: true },
      { id: "h-offline", label: "Printer offline", initiallyPlausible: true },
      { id: "h-jam", label: "Paper jam", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Confirm the device first, then the queue, change only what the evidence supports, and finish with a printed page.",
      "steps": [
        {
          "id": "guide-printer-ready",
          "title": "Confirm the printer's own state",
          "explanation": "Ask Elena what the printer's screen shows, then run Check printer display/power.",
          "why": "The device's own report comes first in any triage — confirm what the hardware says before blaming the computer.",
          "expectedObservation": "The check reports the printer powered and ready with no jam indicator.",
          "target": { "componentId": "customer-chat", "label": "Conversation with Elena Brooks" },
          "actionId": "check-printer-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-open-queue",
          "title": "Open the print queue",
          "explanation": "Run Open print queue and read the state it records in the session log.",
          "why": "The spooler — the buffer that holds submitted jobs — shows where documents stopped before you touch drivers.",
          "expectedObservation": "The result records the queue paused with documents waiting.",
          "target": { "componentId": "evidence-board", "label": "Evidence drawer (Session log)" },
          "actionId": "open-queue",
          "fallback": "the Evidence button in the bottom dock bar"
        },
        {
          "id": "guide-resume-queue",
          "title": "Resume the queue",
          "explanation": "Apply Resume printing so the waiting jobs can flow to the device you just confirmed.",
          "why": "Releasing the pause is the smallest change that matches a healthy device with jobs stuck behind it.",
          "expectedObservation": "The feedback records the queue resumed and jobs spooling.",
          "target": { "componentId": "evidence-board", "label": "Evidence drawer (latest feedback)" },
          "actionId": "resume-queue",
          "fallback": "the Evidence button in the bottom dock bar"
        },
        {
          "id": "guide-test-page",
          "title": "Print a test page",
          "explanation": "Run Confirm test page prints and compare it with the symptom on the ticket.",
          "why": "The ticket asked for a page to print, so a printed page is the only honest end-to-end proof.",
          "expectedObservation": "The result reports a test page printed successfully.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip (HD-1011)" },
          "actionId": "verify-page"
        }
      ]
    },
    actions: [
      {
        id: "check-printer-power",
        label: "Check printer display/power",
        kind: "inspect",
        tool: "hardware-bench",
        feedback: "Printer is powered and ready (no jam icon).",
        evaluation: {
          grade: "optimal",
          rationale:
            "Confirming the device is online with no jam rules out offline and paper-jam states before you blame the computer.",
          evidenceGain: "Printer powered and ready — device-side faults ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "open-queue",
        label: "Open print queue",
        kind: "inspect",
        tool: "print-manager",
        patch: { diagnostics: { checkedQueue: true } },
        feedback: "Queue is Paused with documents waiting.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The spooler is where submitted jobs wait — a paused queue with jobs waiting matches the reported symptom exactly.",
          evidenceGain: "Queue paused with documents waiting — hold point identified.",
        },
        isDiagnostic: true,
      },
      {
        id: "resume-queue",
        label: "Resume printing",
        kind: "ui",
        tool: "print-manager",
        appliesWhen: { type: "stateEquals", path: "diagnostics.checkedQueue", value: true },
        patch: { printer: { queuePaused: false }, diagnostics: { resumedQueue: true } },
        feedback: "Queue resumed — jobs are spooling.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Releasing the pause lets already-spooling jobs flow to a device you just proved healthy — the smallest fix that matches the evidence.",
          evidenceGain: "Queue resumed — jobs spooling to a healthy device.",
        },
        isFix: true,
      },
      {
        id: "verify-page",
        label: "Confirm test page prints",
        kind: "ui",
        tool: "print-manager",
        appliesWhen: { type: "stateEquals", path: "printer.queuePaused", value: false },
        patch: { printer: { verified: true } },
        feedback: "Test page printed successfully.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A test page proves the whole path — driver, spooler, and device — instead of trusting the queue state alone.",
          evidenceGain: "Test page printed — path proven end to end.",
        },
        isFix: true,
      },
      {
        id: "reinstall-wrong",
        label: "Delete and reinstall the printer driver",
        kind: "ui",
        tool: "print-manager",
        evaluation: {
          grade: "wrong",
          rationale:
            "Reinstalling the driver skips the one piece of evidence you already have: the queue is paused with jobs waiting. Releasing the queue is the cheap test that matches the symptom.",
        },
        feedback: "Driver reinstall is heavy-handed when the queue is simply paused.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "printer.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "printer.verified", value: true },
      { type: "stateEquals", path: "printer.queuePaused", value: false },
    ],
    wrongPaths: [],
    hints: [
      { level: 1, text: "Start with the spooler queue, not the driver." },
      {
        level: 2,
        text: "Jobs waiting behind a paused queue means the queue itself is the blocker, not the device.",
        category: "concept",
      },
      {
        level: 3,
        text: "Nothing is wrong with the hardware — release whatever is holding the spooled jobs, then prove it with a test page.",
        category: "direct",
      },
    ],
    debrief: {
      rootCause: "The print queue had been paused (possibly manually).",
      whyItWorked:
        "Resuming the queue allowed already-spooling documents to reach the healthy device. Transferable principle: confirm the hold point in the queue before reinstalling drivers.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Device ready + queue paused" },
        { step: "Rule out", whatLearnerDid: "Offline and jam dropped — device reports Ready; jobs waiting behind a pause." },
        { step: "Fix", whatLearnerDid: "Resume queue" },
        { step: "Verify", whatLearnerDid: "Test page" },
      ],
      followUps: ["Ask who paused the queue to prevent surprise pauses."],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "account-lockout",
    version: 1,
    title: "User locked out of account",
    category: "support",
    difficulty: "beginner",
    scenarioType: "COMMUNICATION_SUPPORT",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: ["Safe identity verification", "Lockout reset workflow"],
    prerequisites: [],
    skills: ["identity", "helpdesk", "least-privilege"],
    ticket: {
      id: "HD-1012",
      user: "Noah Kim",
      role: "Intern",
      symptomPlainLanguage: "I typo'd my password too many times and now it says account locked.",
      priority: "medium",
      channel: "phone",
    },
    environment: {
      kind: "mixed",
      shell: "none",
      availableTools: ["identity-portal"],
      enabledCommands: [],
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      showInspector: true,
      initialWorld: {
        identity: {
          verifiedUser: false,
          lockoutActive: true,
          passwordReset: false,
          mfaReset: false,
          loggedIn: false,
          failedAttempts: 8,
        },
      },
    },
    conversation: {
      persona: "Noah Kim",
      opening: "I typo'd my password too many times and now it says account locked.",
      followUpQuestions: [
        "Are you at your desk phone or personal mobile?",
        "Did anyone ask you for your password recently?",
        "Do you share this account with anyone?",
      ],
      replies: [
        {
          match: ["temporary", "back in", "got in", "works now"],
          when: { type: "stateEquals", path: "identity.passwordReset", value: true },
          response:
            "The temporary password worked — I'm back in. Should I change it again right away?",
          once: false,
          revealsConcepts: ["Confirm recovery with the user's own successful login, not just a cleared lock."],
        },
        {
          match: ["typo", "password", "locked", "mistake"],
          response:
            "I fat-fingered my password a few times in a row. Now every login says locked out.",
          once: false,
          revealsConcepts: ["Repeated failures from one user often mean self-lockout, not attack."],
        },
        {
          match: ["desk phone", "mobile", "location", "where"],
          response: "I'm at my desk on the office network right now.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["asked for password", "phish", "social"],
          response: "No one has asked for my password. I use it only on my laptop.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply:
        "Please help — I just need back in. I only use this account on my work laptop.",
      mentorPrompts: [
        "Verify identity before any account change.",
        "Review failure patterns before assuming an attack.",
      ],
    },
    hypotheses: [
      { id: "h-typo", label: "Self lockout from typos", initiallyPlausible: true },
      { id: "h-attack", label: "Password spray", initiallyPlausible: false },
      { id: "h-old-device", label: "Old device with old password", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work this lockout in policy order: identify the caller, read the failure pattern, then restore access and prove the user is back in.",
      "steps": [
        {
          "id": "guide-verify-caller",
          "title": "Verify the caller first",
          "explanation": "Open the ticket brief, then run Verify caller identity (badge + manager) from Tools.",
          "why": "Helpdesk policy makes identity the gate on every account change — a reset without proof is how strangers take accounts over.",
          "expectedObservation": "The identity portal reports Identity verified per helpdesk policy.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip HD-1012 in the topbar" },
          "actionId": "verify-identity",
          "conceptId": "least-privilege-basics"
        },
        {
          "id": "guide-failure-pattern",
          "title": "Review the failure pattern",
          "explanation": "Run Review recent failed logons from Tools, then read the result in the session log.",
          "why": "A lockout count alone cannot tell a typo loop from an attack — the source of the attempts does.",
          "expectedObservation": "The result lists eight failed attempts timestamped on the intern's own workstation.",
          "target": { "componentId": "evidence-board", "label": "Session log in the Evidence drawer" },
          "actionId": "check-recent-failures",
          "fallback": "the Evidence button in the bottom dock",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-unlock-reset",
          "title": "Unlock and issue a temporary password",
          "explanation": "Tell Noah a temporary password is on the way, then run Unlock account and set temporary password.",
          "why": "With the failure pattern read, this is the smallest change that restores access without exposing the real password.",
          "expectedObservation": "The portal reports the account unlocked and a temporary password issued.",
          "target": { "componentId": "customer-chat", "label": "Conversation with Noah Kim" },
          "actionId": "unlock-reset"
        },
        {
          "id": "guide-confirm-login",
          "title": "Confirm the user is back in",
          "explanation": "Ask Noah to sign in with the temporary password, then run User confirms successful login.",
          "why": "The ticket says locked out, so only the user's own successful login proves the original symptom is gone.",
          "expectedObservation": "Noah replies that the temporary password worked and he is back in.",
          "target": { "componentId": "customer-chat", "label": "Noah's reply in the conversation panel" },
          "actionId": "verify-login"
        }
      ]
    },
    actions: [
      {
        id: "verify-identity",
        label: "Verify caller identity (badge + manager)",
        kind: "ui",
        tool: "identity-portal",
        patch: { identity: { verifiedUser: true } },
        feedback: "Identity verified per helpdesk policy.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale: "Identity verification is mandatory before account changes.",
          evidenceGain: "Caller verified against policy.",
        },
        matchHints: ["verify identity", "badge check", "confirm caller"],
      },
      {
        id: "check-recent-failures",
        label: "Review recent failed logons",
        kind: "inspect",
        tool: "identity-portal",
        appliesWhen: { type: "stateEquals", path: "identity.verifiedUser", value: true },
        patch: {},
        feedback:
          "Failures cluster on the intern's own workstation timestamps — consistent with typos, not a spray from foreign IPs.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale: "Failure patterns distinguish self-lockout from external attacks.",
          evidenceGain: "Failures originate from the user's own workstation.",
        },
        matchHints: ["failed logons", "review failures", "lockout events"],
      },
      {
        id: "unlock-reset",
        label: "Unlock account and set temporary password",
        kind: "ui",
        tool: "identity-portal",
        appliesWhen: { type: "stateEquals", path: "identity.verifiedUser", value: true },
        patch: { identity: { lockoutActive: false, passwordReset: true } },
        feedback: "Account unlocked; temp password issued securely.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale: "Policy-compliant unlock after verification restores access safely.",
          evidenceGain: "Lock cleared; temporary password issued.",
        },
        matchHints: ["unlock account", "reset password", "clear lockout"],
      },
      {
        id: "skip-verify-wrong",
        label: "Reset immediately without verification",
        kind: "ui",
        tool: "identity-portal",
        feedback: "Never reset accounts without identity verification — social engineering risk.",
        evaluation: {
          grade: "harmful",
          rationale: "Resetting without verification enables social engineering account takeover.",
        },
        matchHints: ["skip verification", "reset without verify", "no id check"],
      },
      {
        id: "verify-login",
        label: "User confirms successful login",
        kind: "ui",
        tool: "identity-portal",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "identity.passwordReset", value: true },
            { type: "stateEquals", path: "identity.lockoutActive", value: false },
          ],
        },
        patch: { identity: { loggedIn: true } },
        feedback: "User is back in.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale: "Confirming the user can log in closes the ticket with evidence.",
          evidenceGain: "User logged in successfully.",
        },
        matchHints: ["confirm login", "user can log in", "verify access"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "identity.loggedIn", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "identity.loggedIn", value: true },
      { type: "stateEquals", path: "identity.verifiedUser", value: true },
      { type: "stateEquals", path: "identity.lockoutActive", value: false },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["skip-verify-wrong"] },
        feedback: "Unverified resets are a policy violation — stop and verify identity first.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Helpdesk resets require verified identity first.",
        category: "method",
      },
      {
        level: 2,
        text: "Look at failure patterns before assuming an attack.",
        category: "concept",
      },
      {
        level: 3,
        text: "The failure pattern says this is self-lockout — what does policy require you to establish before touching the account, and what proves the user is genuinely back in?",
        category: "method",
      },
    ],
    debrief: {
      rootCause: "Repeated failed passwords from the user's own device triggered lockout policy.",
      whyItWorked:
        "Verified, policy-compliant reset restored access while confirming the failures were not an external attack. Transferable principle: verify identity and failure patterns before changing an account — the policy exists for exactly this moment.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Identity + failure log review" },
        { step: "Rule out", whatLearnerDid: "Password-spray hypothesis dropped — failures cluster on the user's own workstation." },
        { step: "Fix", whatLearnerDid: "Unlock + temp password" },
        { step: "Verify", whatLearnerDid: "User logged in" },
      ],
      followUps: ["Coach the user on password manager usage."],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "email-not-receiving",
    version: 1,
    title: "Partner emails never arrive",
    category: "support",
    difficulty: "beginner",
    scenarioType: "COMMUNICATION_SUPPORT",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 11,
    learningObjectives: [
      "Trace message flow before touching the mail client",
      "Separate transport delivery from local filtering",
    ],
    prerequisites: [],
    skills: ["helpdesk", "email", "troubleshooting-method"],
    ticket: {
      id: "HD-1025",
      user: "Sofia Lang",
      role: "Vendor manager",
      symptomPlainLanguage:
        "Emails from our logistics partner stopped arriving — no bounce, no NDR, and my other mail is fine.",
      priority: "medium",
      channel: "walkup",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["mail-trace", "mail-client"],
      enabledCommands: [],
      initialWorld: {
        mailflow: {
          traceChecked: false,
          traceResult: "",
          quarantineChecked: false,
          quarantineEmpty: false,
          rulesChecked: false,
          ruleFound: false,
          ruleDisabled: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Sofia Lang",
      opening:
        "Emails from our logistics partner stopped arriving — no bounce, no NDR, and my other mail is fine.",
      followUpQuestions: [
        "Did you get any bounce messages?",
        "When did it last work?",
        "Anything change on your mailbox recently?",
      ],
      replies: [
        {
          match: ["bounce", "ndr", "rejected", "delivery report"],
          response:
            "No bounce and no NDR — nothing comes back, the messages just never show up.",
          once: false,
          revealsConcepts: [
            "No NDR means the mailbox accepted the mail — transport is not refusing it.",
          ],
        },
        {
          match: ["last work", "yesterday", "tuesday", "before", "worked"],
          response:
            "It worked until Tuesday, when I cleaned up Outlook and tidied some folders.",
          once: false,
          revealsConcepts: [
            "A recent local change points at mailbox rules, not the sender or the server.",
          ],
        },
        {
          match: ["test", "arrive", "inbox", "resend", "sent again"],
          when: { type: "stateEquals", path: "mailflow.ruleDisabled", value: true },
          response:
            "Their resent test message just landed right in my Inbox — that is the first one in three days.",
          once: false,
          revealsConcepts: [
            "Confirm delivery with a real resent message, not with a rule list alone.",
          ],
        },
        {
          match: ["test", "arrive", "resend", "inbox"],
          response:
            "I asked them to resend twice — nothing appears in the Inbox either time.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["junk", "spam", "quarantine", "folder"],
          response: "Junk and quarantine are empty — I already looked there.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply:
        "No bounce at all — the messages just never appear, and the rest of my mail works normally.",
      mentorPrompts: [
        "Trace the message path before touching the client.",
        "A mailbox that accepts mail but hides it is a filtering problem.",
      ],
    },
    hypotheses: [
      { id: "h-sender", label: "Sender rejected at the gateway", initiallyPlausible: true },
      { id: "h-junk", label: "Filtered to junk or quarantine", initiallyPlausible: true },
      { id: "h-rule", label: "Local rule moved the messages", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Trace the message path from the gateway inward: prove delivery first, then work through each filter layer until the mail appears.",
      "steps": [
        {
          "id": "guide-message-trace",
          "title": "Trace the messages at the gateway",
          "explanation": "Open ticket HD-1025, then run Run message trace at the gateway from Tools.",
          "why": "Mail can fail before arrival or after acceptance — one trace at the gateway settles that split before anyone touches the client.",
          "expectedObservation": "The trace reads Delivered — accepted by recipient mailbox at 09:14.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip HD-1025 in the topbar" },
          "actionId": "run-message-trace",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-quarantine-check",
          "title": "Check junk and quarantine",
          "explanation": "Run Inspect junk and quarantine folders from Tools, then read the result in the session log.",
          "why": "Delivery is proven, so the visible filter layers come next — each one is retired with evidence, not assumption.",
          "expectedObservation": "The result reports junk and quarantine empty for both messages.",
          "target": { "componentId": "evidence-board", "label": "Session log in the Evidence drawer" },
          "actionId": "check-quarantine",
          "fallback": "the Evidence button in the bottom dock"
        },
        {
          "id": "guide-inbox-rules",
          "title": "List the inbox rules",
          "explanation": "Ask Sofia what changed recently, then run List inbox rules and filters from Tools.",
          "why": "With transport and quarantine clear, the mailbox's own filters are the last layer that can still move delivered mail.",
          "expectedObservation": "Sofia mentions Tuesday's Outlook cleanup, and the list shows a rule named Partner mail → Deleted Items.",
          "target": { "componentId": "customer-chat", "label": "Conversation with Sofia Lang" },
          "actionId": "check-inbox-rules"
        },
        {
          "id": "guide-disable-rule",
          "title": "Disable the matching rule",
          "explanation": "Run Disable the inbox filtering rule from Tools, then re-read the rule list.",
          "why": "The evidence names one rule on one folder, so removing exactly that rule is the smallest change that fits.",
          "expectedObservation": "The rule shows disabled, and partner mail now targets the Inbox.",
          "target": { "componentId": "evidence-board", "label": "Latest feedback in the Evidence drawer" },
          "actionId": "disable-rule",
          "fallback": "the Evidence button in the bottom dock"
        },
        {
          "id": "guide-confirm-delivery",
          "title": "Prove delivery with a real resend",
          "explanation": "Ask Sofia to have the partner resend, then run Ask for a resend to confirm delivery.",
          "why": "The ticket says not receiving, so only a fresh message landing in the Inbox proves the path end to end.",
          "expectedObservation": "Sofia replies that the resent thread landed in her Inbox.",
          "target": { "componentId": "customer-chat", "label": "Sofia's reply in the conversation panel" },
          "actionId": "confirm-delivery"
        }
      ]
    },
    actions: [
      {
        id: "run-message-trace",
        label: "Run message trace at the gateway",
        kind: "inspect",
        tool: "mail-trace",
        patch: {
          mailflow: {
            traceChecked: true,
            traceResult: "Delivered — accepted by recipient mailbox at 09:14",
          },
        },
        feedback:
          "Both messages show Delivered — the recipient mailbox accepted them at 09:14.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Start at the boundary: one trace separates transport failure from local filtering before anyone touches the client.",
          evidenceGain: "Gateway delivered both messages — transport ruled out.",
        },
        matchHints: ["message trace", "trace", "gateway log"],
        isDiagnostic: true,
      },
      {
        id: "check-quarantine",
        label: "Inspect junk and quarantine folders",
        kind: "inspect",
        tool: "mail-client",
        appliesWhen: { type: "stateEquals", path: "mailflow.traceChecked", value: true },
        patch: { mailflow: { quarantineChecked: true, quarantineEmpty: true } },
        feedback: "Junk and quarantine folders are empty for both messages.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With delivery proven, the visible filter layers are checked next — an empty quarantine retires the spam-filter hypothesis with evidence.",
          evidenceGain: "Quarantine empty — server-side filtering ruled out.",
        },
        matchHints: ["junk", "quarantine", "spam folder"],
        isDiagnostic: true,
      },
      {
        id: "check-inbox-rules",
        label: "List inbox rules and filters",
        kind: "inspect",
        tool: "mail-client",
        appliesWhen: { type: "stateEquals", path: "mailflow.traceChecked", value: true },
        patch: { mailflow: { rulesChecked: true, ruleFound: true } },
        feedback:
          "Rule 'Partner mail → Deleted Items' created during Tuesday's cleanup moves anything from the partner domain.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Transport and quarantine are cleared, so the local rule list is the only remaining filter layer — and it contains a matching rule.",
          evidenceGain: "Rule found moving partner mail to Deleted Items.",
        },
        matchHints: ["rules", "filters", "inbox rules"],
        isDiagnostic: true,
      },
      {
        id: "disable-rule",
        label: "Disable the inbox filtering rule",
        kind: "ui",
        tool: "mail-client",
        appliesWhen: { type: "stateEquals", path: "mailflow.ruleFound", value: true },
        patch: { mailflow: { ruleDisabled: true } },
        feedback: "Rule disabled — partner mail now targets the Inbox.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence names one rule on one folder — disabling exactly that restores default delivery without rebuilding anything.",
          evidenceGain: "Rule removed from the delivery path.",
        },
        matchHints: ["disable", "turn off the rule", "delete the rule"],
        isFix: true,
      },
      {
        id: "confirm-delivery",
        label: "Ask for a resend to confirm delivery",
        kind: "ui",
        tool: "mail-trace",
        appliesWhen: { type: "stateEquals", path: "mailflow.ruleDisabled", value: true },
        patch: { mailflow: { verified: true } },
        feedback: "The partner's resent thread lands in the Inbox — flow restored.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is 'not receiving' — a real resent message arriving in the Inbox is the only end-to-end proof the path works again.",
          evidenceGain: "Resent message arrived in Inbox.",
        },
        matchHints: ["resend", "send again", "test delivery"],
        isFix: true,
      },
      {
        id: "recreate-mailbox-wrong",
        label: "Recreate the user's mailbox",
        kind: "ui",
        tool: "mail-client",
        evaluation: {
          grade: "wrong",
          rationale:
            "The mailbox is accepting and delivering mail — rebuilding it is hours of disruption, and the same filtering behavior would simply recur.",
        },
        feedback: "Rebuilding skips the evidence: transport and quarantine already proved healthy.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "mailflow.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "mailflow.verified", value: true },
      { type: "stateEquals", path: "mailflow.ruleDisabled", value: true },
      { type: "stateEquals", path: "mailflow.traceChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["recreate-mailbox-wrong"] },
        feedback:
          "The mailbox accepts and delivers mail — the hiding happens after acceptance.",
      },
    ],
    hints: [
      { level: 1, text: "Prove where the messages are before touching the client." },
      { level: 2, text: "The gateway says delivered — so what local layers could still hide a message?" },
      {
        level: 3,
        text: "One rule moves partner mail away from the Inbox — take that out of the path, then get a real resend to prove it.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "An Outlook cleanup on Tuesday created a rule that moved everything from the partner domain to Deleted Items.",
      whyItWorked:
        "The trace proved delivery, the empty quarantine retired spam filtering, and the rule list named the exact mover — so one disabled rule plus a real resend closed the ticket. Transferable principle: 'not receiving' is a location problem until proven otherwise — trace first, filter layers second, client last.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Gateway trace, quarantine inspection, rule list.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Sender rejection and spam filtering dropped — delivered at gateway, quarantine empty.",
        },
        { step: "Apply fix", whatLearnerDid: "Disabled the partner-mail rule." },
        { step: "Verify", whatLearnerDid: "Partner resent the thread; it landed in the Inbox." },
      ],
      followUps: [
        "Teach the team to review rules after any bulk folder cleanup.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [
      {
        title: "Microsoft — Message trace in Exchange Online",
        url: "https://learn.microsoft.com/exchange/security-and-compliance/message-trace/message-trace",
        note: "Public vendor documentation.",
      },
    ],
  },
  {
    id: "phishing-ticket-triage",
    version: 1,
    title: "Suspicious email reported",
    category: "security",
    difficulty: "beginner",
    scenarioType: "SECURITY_TRIAGE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: ["Defensive phishing triage", "Safe reporting workflow"],
    prerequisites: [],
    skills: ["phishing", "security-operations", "awareness"],
    ticket: {
      id: "SEC-2001",
      user: "Casey Wong",
      role: "Payroll specialist",
      symptomPlainLanguage:
        "This email says my mailbox will be deleted in 24h and wants me to log in via a link.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["mail-inspector", "security-portal"],
      enabledCommands: [],
      initialWorld: {
        mail: {
          senderDisplay: "IT Helpdesk",
          senderDomain: "1t-helpdesk-secure.ru",
          subject: "Urgent: mailbox deletion pending",
          linkHost: "mail-verify-login.ru",
          hasAttachment: false,
          reported: false,
          analyzed: false,
          userEducated: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-phish", label: "Phishing", initiallyPlausible: true },
      { id: "h-legit", label: "Legitimate IT notice", initiallyPlausible: true },
      { id: "h-spam", label: "Bulk spam only", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Judge the reported message from its static indicators, report what the evidence supports, then close the loop with the reporter.",
      "steps": [
        {
          "id": "guide-sender-domain",
          "title": "Inspect the sender domain",
          "explanation": "Open SEC-2001, then run Inspect sender domain from the Checks list on the Evidence board.",
          "why": "A friendly display name is cosmetic — the sender domain is the identity claim the message actually makes.",
          "expectedObservation": "The sender reads 1t-helpdesk-secure.ru behind the display name IT Helpdesk.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip SEC-2001 in the topbar" },
          "actionId": "inspect-sender",
          "conceptId": "phishing-awareness"
        },
        {
          "id": "guide-link-host",
          "title": "Read the link destination",
          "explanation": "Run Hover link without clicking from Checks, then read the host it points to.",
          "why": "A second independent indicator, gathered without executing anything — hovering reveals the true destination safely.",
          "expectedObservation": "The link host reads mail-verify-login.ru.",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "inspect-link"
        },
        {
          "id": "guide-report-phish",
          "title": "Report the message as phishing",
          "explanation": "From Tools, run Report as phishing and watch the Evidence board update.",
          "why": "Two hostile indicators mean quarantine-and-report comes before anyone else touches the message.",
          "expectedObservation": "A new row reads Message quarantined; security queue notified.",
          "target": { "componentId": "evidence-board", "label": "Evidence board" },
          "actionId": "report-phish"
        },
        {
          "id": "guide-coach-reporter",
          "title": "Send guidance to the reporter",
          "explanation": "From Tools, run Send safe-guidance to reporter for the person named on this ticket.",
          "why": "Reporting removes this message; coaching the reporter is what reduces the next one.",
          "expectedObservation": "The Evidence board logs that safe guidance was sent to Casey Wong.",
          "target": { "componentId": "ticket-inbox", "label": "Reporter details on ticket SEC-2001" },
          "actionId": "educate-user"
        },
        {
          "id": "guide-close-report",
          "title": "Close with the report ID",
          "explanation": "From Tools, run Confirm ticket closed with report ID, then read the recorded reference.",
          "why": "Closing with a report reference makes the handling auditable — proof the workflow finished rather than an opinion.",
          "expectedObservation": "The Evidence board records a SEC report reference on the ticket.",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "verify-closed"
        }
      ]
    },
    actions: [
      {
        id: "inspect-sender",
        label: "Inspect sender domain",
        kind: "inspect",
        tool: "mail-inspector",
        patch: { mail: { analyzed: true } },
        feedback: "Display name says Helpdesk, but domain is lookalike (1t-helpdesk-secure.ru).",
        evaluation: {
          grade: "optimal",
          rationale:
            "The display name is cosmetic — the actual sender domain is the identity claim to verify first.",
          evidenceGain: "Lookalike domain (1t-helpdesk-secure.ru) — sender claim is false.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-link",
        label: "Hover link without clicking",
        kind: "inspect",
        tool: "mail-inspector",
        appliesWhen: { type: "stateEquals", path: "mail.analyzed", value: true },
        patch: { mail: { analyzed: true } },
        feedback: "Link goes to mail-verify-login.ru — not your mail provider.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Hovering reveals the true destination without executing anything — a second, independent hostile indicator.",
          evidenceGain: "Link targets mail-verify-login.ru — not the mail provider.",
        },
        isDiagnostic: true,
      },
      {
        id: "report-phish",
        label: "Report as phishing",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "mail.analyzed", value: true },
        patch: { mail: { reported: true } },
        feedback: "Reported to security queue; message quarantined for the user.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Both indicators are hostile, so the workflow is quarantine-and-report before anything else touches the message.",
          evidenceGain: "Message quarantined; security queue notified.",
        },
        isFix: true,
      },
      {
        id: "educate-user",
        label: "Send safe-guidance to reporter",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "mail.reported", value: true },
        patch: { mail: { userEducated: true } },
        feedback: "User coached on lookalike domains and reporting.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reporting removes this message; coaching stops the next one — the reporter is the recurring variable.",
          evidenceGain: "Reporter coached on lookalike domains and reporting.",
        },
        isFix: true,
      },
      {
        id: "click-test-wrong",
        label: "Open the link in a browser to 'check'",
        kind: "ui",
        tool: "mail-inspector",
        evaluation: {
          grade: "harmful",
          rationale:
            "Opening the link hands credentials to an attacker if the page is live. The sender domain and link host can both be inspected statically without any risk to the workstation.",
        },
        feedback:
          "Do not open credential phishing links on a workstation. Inspect the URL statically instead.",
      },
      {
        id: "verify-closed",
        label: "Confirm ticket closed with report ID",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "mail.reported", value: true },
            { type: "stateEquals", path: "mail.userEducated", value: true },
          ],
        },
        patch: { mail: { verified: true } },
        feedback: "Ticket closed with SEC report reference.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Closing with a report ID makes the handling auditable — proof the workflow completed rather than an opinion that it went fine.",
          evidenceGain: "SEC report reference recorded on the ticket.",
        },
        isFix: true,
      },
    ],
    successConditions: [{ type: "stateEquals", path: "mail.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "mail.verified", value: true },
      { type: "stateEquals", path: "mail.reported", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["click-test-wrong"] },
        feedback: "Clicked a phishing URL — contain and report instead.",
      },
    ],
    hints: [
      { level: 1, text: "Urgency + mailbox threat + login link is a classic pattern." },
      { level: 2, text: "Compare the display name to the actual sender domain." },
      {
        level: 3,
        text: "Both indicators look hostile — what does the security workflow require you to do with the message, and who else needs to know?",
        category: "method",
      },
    ],
    debrief: {
      rootCause: "Credential phishing using a lookalike helpdesk domain and urgency narrative.",
      whyItWorked:
        "Static inspection confirmed malicious indicators; reporting quarantined the message; education reduced repeat risk. No credentials were submitted. Transferable principle: indicators can be judged statically — never open a suspicious link to 'check' it.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Sender + link analysis" },
        { step: "Rule out", whatLearnerDid: "Legitimate helpdesk request dropped — sender domain and link host both mismatch the provider." },
        { step: "Fix", whatLearnerDid: "Report + educate" },
        { step: "Verify", whatLearnerDid: "Closed with report ID" },
      ],
      followUps: ["Share the indicator with the security awareness channel."],
    },
    knowledgeLinks: ["phishing-awareness", "least-privilege-basics"],
    references: [
      {
        title: "CISA — Phishing",
        url: "https://www.cisa.gov/topics/cyber-threats-and-advisories/types-threats/phishing",
        note: "Public US government guidance.",
      },
    ],
  },
  {
    id: "suspicious-signin",
    version: 1,
    title: "Impossible-travel sign-in alert",
    category: "security",
    difficulty: "intermediate",
    scenarioType: "SECURITY_TRIAGE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Triage an impossible-travel sign-in alert from raw timeline evidence",
      "Contain a stolen session before recovering the account",
    ],
    prerequisites: [],
    skills: ["identity", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2002",
      user: "Mira Novak",
      role: "Financial analyst",
      symptomPlainLanguage:
        "Alert says my account signed in from a country I have never visited, minutes after I logged in at my desk.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["security-portal"],
      enabledCommands: [],
      initialWorld: {
        identity: {
          signInsToday: 3,
          failedAttempts: 4,
          alertReviewed: false,
          geoChecked: false,
          geoOrigin: "203.0.113.44 · Bucharest, RO · consumer VPN exit (AS9009)",
          userAttestedNotMe: false,
          sessionsRevoked: false,
          passwordReset: false,
          alertClosed: false,
        },
      },
    },
    hypotheses: [
      { id: "h-stolen", label: "Stolen password used from elsewhere", initiallyPlausible: true },
      { id: "h-travel", label: "User is actually traveling", initiallyPlausible: true },
      { id: "h-bug", label: "Alerting glitch or sync artifact", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Turn the alert headline into evidence: read the timeline, attribute the address, confirm with the owner, then contain before recovering.",
      "steps": [
        {
          "id": "guide-signin-timeline",
          "title": "Read the raw sign-in timeline",
          "explanation": "Open SEC-2002, then run Review raw sign-in timeline from the Checks list.",
          "why": "An alert headline is already a conclusion — the timeline's timestamps and outcomes are the evidence underneath it.",
          "expectedObservation": "The timeline shows 09:12 and 13:59 from HQ, then 14:02 from 203.0.113.44.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip SEC-2002 in the topbar" },
          "actionId": "review-signin-alert",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-attribute-origin",
          "title": "Attribute the source address",
          "explanation": "Run Attribute the source address from Checks, then read the lookup result.",
          "why": "Attribution turns an address into a fact about who controlled it — an ASN is the registry naming the network behind an address.",
          "expectedObservation": "The lookup returns 203.0.113.44 · Bucharest, RO · consumer VPN exit (AS9009).",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "check-signin-origin"
        },
        {
          "id": "guide-confirm-holder",
          "title": "Ask the account holder",
          "explanation": "Run Confirm with the account holder from Checks, then record what Mira says about the 14:02 sign-in.",
          "why": "Only the person who owns the account can retire the possibility that she is traveling — ask before you contain.",
          "expectedObservation": "Mira is at her HQ desk and denies the 14:02 sign-in.",
          "target": { "componentId": "ticket-inbox", "label": "Account holder on ticket SEC-2002" },
          "actionId": "contact-user"
        },
        {
          "id": "guide-revoke-sessions",
          "title": "Revoke every active session",
          "explanation": "From Tools, run Revoke active sessions before changing anything else on the account.",
          "why": "Containment first: while a live session exists, changing credentials does not evict whoever is using it.",
          "expectedObservation": "A new row reads Sessions: Revoked — forced re-authentication.",
          "target": { "componentId": "evidence-board", "label": "Evidence board" },
          "actionId": "revoke-session"
        },
        {
          "id": "guide-reset-password",
          "title": "Rotate the account password",
          "explanation": "From Tools, run Reset account password now that every session has been revoked.",
          "why": "Recovery follows containment — rotating the credential only helps once nobody is still signed in with the old one.",
          "expectedObservation": "The reset flow reports the password rotated for the account.",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "reset-password"
        }
      ]
    },
    actions: [
      {
        id: "review-signin-alert",
        label: "Review raw sign-in timeline",
        kind: "inspect",
        tool: "security-portal",
        patch: { identity: { alertReviewed: true } },
        feedback:
          "Three sign-ins today: 09:12 and 13:59 from HQ, then 14:02 from 203.0.113.44 — and four failed passwords at 13:57 right before it.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The alert's headline is a conclusion — the raw timeline with the failed-password cluster is the evidence that separates an attack from a routine login.",
          evidenceGain: "Timeline: HQ login → 4 failures → foreign success in 3 minutes.",
        },
        matchHints: ["timeline", "sign-in history", "alert detail"],
        isDiagnostic: true,
      },
      {
        id: "check-signin-origin",
        label: "Attribute the source address",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.alertReviewed", value: true },
        patch: { identity: { geoChecked: true } },
        feedback:
          "203.0.113.44 resolves to a consumer VPN exit node in Bucharest — not a corporate range and not the user's home ISP.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Attributing the address to an ASN turns an IP string into a fact about who controlled the session.",
          evidenceGain: "Origin is a consumer VPN exit — travel hypothesis loses support.",
        },
        matchHints: ["attribute", "ip lookup", "asn", "geoip"],
        isDiagnostic: true,
      },
      {
        id: "contact-user",
        label: "Confirm with the account holder",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.geoChecked", value: true },
        patch: { identity: { userAttestedNotMe: true } },
        feedback:
          "Mira is at her HQ desk and denies the 14:02 sign-in — attestation recorded on the ticket.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The account holder's own statement is the only evidence that can retire the traveling-user hypothesis — ask before containing.",
          evidenceGain: "User attestation: the sign-in was not theirs.",
        },
        matchHints: ["confirm", "contact the user", "ask the user"],
        isDiagnostic: true,
      },
      {
        id: "revoke-session",
        label: "Revoke active sessions",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.userAttestedNotMe", value: true },
        patch: { identity: { sessionsRevoked: true } },
        feedback: "All sessions revoked — the attacker's live cookie is dead.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Evidence proves an attacker holds a valid session right now — revoke first; nothing else matters while they stay logged in.",
          evidenceGain: "Attacker session terminated.",
        },
        matchHints: ["revoke", "sign out everywhere", "kill the session"],
        isFix: true,
      },
      {
        id: "reset-password",
        label: "Reset account password",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.sessionsRevoked", value: true },
        patch: { identity: { passwordReset: true } },
        feedback: "Password rotated through the reset flow; the attacker's password no longer works.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Containment first, then recovery — rotating the credential after revocation closes the door the session came through.",
          evidenceGain: "Credential rotated — replayed password rejected.",
        },
        matchHints: ["reset", "rotate the password"],
        isFix: true,
      },
      {
        id: "close-alert",
        label: "Close alert with containment record",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.passwordReset", value: true },
        patch: { identity: { alertClosed: true } },
        feedback: "Alert closed with revoke + reset notes; SOC queue notified.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Closing with the containment record makes the response auditable — proof the workflow completed rather than an opinion that it is fine.",
          evidenceGain: "Alert closed with containment recorded.",
        },
        isFix: true,
      },
      {
        id: "dismiss-alert-wrong",
        label: "Dismiss alert as false positive",
        kind: "ui",
        tool: "security-portal",
        evaluation: {
          grade: "wrong",
          rationale:
            "The timeline shows a successful foreign session with a preceding password-guessing cluster — dismissing leaves a live attacker session and a known-good password in place.",
        },
        feedback: "Dismissed without containment — the session is still valid.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "identity.alertClosed", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "identity.alertClosed", value: true },
      { type: "stateEquals", path: "identity.sessionsRevoked", value: true },
      { type: "stateEquals", path: "identity.passwordReset", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["dismiss-alert-wrong"] },
        feedback:
          "The alert is grounded in a real foreign session — dismissals do not revoke the attacker's cookie.",
      },
    ],
    hints: [
      { level: 1, text: "Read the raw timeline behind the alert before judging it." },
      { level: 2, text: "Where did 14:02 come from, and does the account holder recognize it?" },
      {
        level: 3,
        text: "Prove the sign-in was not theirs, then contain the live session before touching the credential — order is the whole lesson.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "An attacker guessed the analyst's password at 13:57 and signed in from a consumer VPN exit at 14:02 while the real user was at her HQ desk.",
      whyItWorked:
        "Timeline, attribution and user attestation converted an alert headline into three independent facts; revoking first and resetting second kept the attacker out at every step. Transferable principle: contain the live session first, recover the credential second — a reset without revocation leaves the attacker logged in.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Timeline review, source attribution, account-holder confirmation.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Travel and alerting-glitch hypotheses dropped — consumer VPN origin and an attestation that the sign-in was not hers.",
        },
        { step: "Apply fix", whatLearnerDid: "Revoked sessions, then reset the password." },
        { step: "Verify", whatLearnerDid: "Alert closed with the containment record attached." },
      ],
      followUps: [
        "Enforce phishing-resistant MFA for the finance group so a guessed password is never enough.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [
      {
        title: "NIST SP 800-63B — Digital Identity Guidelines (Authentication and Lifecycle)",
        url: "https://pages.nist.gov/800-63-3/sp800-63b.html",
        note: "Public NIST guidance.",
      },
    ],
  },
  {
    id: "malware-endpoint-alert",
    version: 1,
    title: "EDR alert on the sales laptop",
    category: "security",
    difficulty: "intermediate",
    scenarioType: "SECURITY_TRIAGE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Triage an endpoint malware alert from observed behavior, not the family label",
      "Remove the respawn path before declaring the machine clean",
    ],
    prerequisites: ["phishing-ticket-triage"],
    skills: ["endpoint-security", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2003",
      user: "Devin Park",
      role: "Sales coordinator",
      symptomPlainLanguage:
        "A red EDR warning popped on my laptop this morning and Outlook opened a weird window.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["edr-console"],
      enabledCommands: [],
      initialWorld: {
        endpoint: {
          alertsOpen: 1,
          alertReviewed: false,
          originTraced: false,
          originSource:
            "Downloaded 07:38 — PDF-Pro-Crack.zip bundled installer (not email)",
          persistenceFound: false,
          persistenceKey:
            "HKCU\\...\\CurrentVersion\\Run → C:\\Users\\Public\\syncsvc.exe",
          quarantined: false,
          persistenceCleared: false,
          scanClean: false,
        },
      },
    },
    hypotheses: [
      { id: "h-payload", label: "Cracked-software payload is running", initiallyPlausible: true },
      { id: "h-fp", label: "Vendor tool misidentified", initiallyPlausible: true },
      { id: "h-mail", label: "Delivered by a phishing email", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Triage the alert from raw sensor evidence: behavior first, then arrival, then any path that would bring the file back.",
      "steps": [
        {
          "id": "guide-behavior-record",
          "title": "Read what the sensor saw",
          "explanation": "Open SEC-2003, then run Review EDR behavior record from the Checks list.",
          "why": "The antivirus family name is a guess — observed behavior and file identity are the facts you can act on.",
          "expectedObservation": "The record shows unsigned syncsvc.exe attempting a credential dump and an outbound connection at 07:41.",
          "target": { "componentId": "ticket-inbox", "label": "Ticket chip SEC-2003 in the topbar" },
          "actionId": "review-alert",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-trace-origin",
          "title": "Trace how it arrived",
          "explanation": "Run Trace how the file arrived from Checks, then read the delivery source.",
          "why": "How a file lands on a machine separates mail delivery from a user download, and each points somewhere different.",
          "expectedObservation": "The source reads Downloaded 07:38 — PDF-Pro-Crack.zip bundled installer (not email).",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "trace-origin"
        },
        {
          "id": "guide-check-persistence",
          "title": "Find the respawn path",
          "explanation": "Run Check for persistence from Checks, then read which entry keeps the file alive.",
          "why": "Persistence — whatever restarts a program after reboot — must be located before anything is stopped.",
          "expectedObservation": "A Run key points at C:\\Users\\Public\\syncsvc.exe.",
          "target": { "componentId": "evidence-board", "label": "Evidence board" },
          "actionId": "check-persistence"
        },
        {
          "id": "guide-quarantine-process",
          "title": "Stop the running process",
          "explanation": "From Tools, run Quarantine the running process and watch the threat state change.",
          "why": "Stopping the live process first cuts its outbound channel, so cleanup cannot race a program that is still running.",
          "expectedObservation": "A new row reads Threat state: Quarantined — process stopped.",
          "target": { "componentId": "evidence-board", "label": "Evidence list on the Evidence board" },
          "actionId": "quarantine-process"
        },
        {
          "id": "guide-remove-persistence",
          "title": "Remove the respawn entry",
          "explanation": "From Tools, run Remove the persistence entry now that the process is stopped.",
          "why": "With nothing racing to restart it, dropping the Run key is the smallest change that keeps the next reboot clean.",
          "expectedObservation": "A new row reads Persistence removed — no reboot respawn.",
          "target": { "componentId": "evidence-board", "label": "Evidence board" },
          "actionId": "remove-persistence"
        }
      ]
    },
    actions: [
      {
        id: "review-alert",
        label: "Review EDR behavior record",
        kind: "inspect",
        tool: "edr-console",
        patch: { endpoint: { alertReviewed: true } },
        feedback:
          "Behavior: credential-dump plus outbound C2 attempt from C:\\Users\\Public\\syncsvc.exe — unsigned, spawned by an installer at 07:41.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Start from what the sensor actually observed — behavior and file identity — not the antivirus family label, which is a guess.",
          evidenceGain: "Unsigned binary performing credential dump and C2 beacon.",
        },
        matchHints: ["behavior", "alert detail", "edr record"],
        isDiagnostic: true,
      },
      {
        id: "trace-origin",
        label: "Trace how the file arrived",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.alertReviewed", value: true },
        patch: { endpoint: { originTraced: true } },
        feedback:
          "Source is PDF-Pro-Crack.zip downloaded at 07:38 — no email delivered this file.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Knowing how it arrived discriminates hypotheses — a download origin retires the email-delivery path and points at user behavior to coach.",
          evidenceGain: "Delivered by a downloaded cracked installer — phishing-email hypothesis dropped.",
        },
        matchHints: ["origin", "how did it arrive", "delivery"],
        isDiagnostic: true,
      },
      {
        id: "check-persistence",
        label: "Check for persistence",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.originTraced", value: true },
        patch: { endpoint: { persistenceFound: true } },
        feedback:
          "Run key points at C:\\Users\\Public\\syncsvc.exe — it survives reboot and will respawn.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A live foothold needs its respawn mechanism located before any killing, or the process simply comes back after cleanup.",
          evidenceGain: "Persistence located: HKCU Run → Public\\syncsvc.exe.",
        },
        matchHints: ["persistence", "autorun", "run key", "survives reboot"],
        isDiagnostic: true,
      },
      {
        id: "quarantine-process",
        label: "Quarantine the running process",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.persistenceFound", value: true },
        patch: { endpoint: { quarantined: true } },
        feedback: "Process terminated and sample quarantined in the EDR console.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Stopping the running process cuts the C2 channel first — cleanup is pointless while the beacon keeps talking.",
          evidenceGain: "Threat stopped — C2 beacon gone.",
        },
        matchHints: ["quarantine", "kill the process", "isolate"],
        isFix: true,
      },
      {
        id: "remove-persistence",
        label: "Remove the persistence entry",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.quarantined", value: true },
        patch: { endpoint: { persistenceCleared: true } },
        feedback: "Run key removed; the binary has no respawn path.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the process stopped there is no race — the respawn path can be removed so the next reboot stays clean.",
          evidenceGain: "Persistence removed — no reboot respawn.",
        },
        matchHints: ["remove run key", "remove persistence", "autorun cleanup"],
        isFix: true,
      },
      {
        id: "verify-scan",
        label: "Run full scan verification",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.persistenceCleared", value: true },
        patch: { endpoint: { scanClean: true } },
        feedback: "Full scan clean; no new alerts in the 24-hour window.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket reported a symptom — a clean scan after removal is the observable proof the machine is actually safe to return.",
          evidenceGain: "Full scan clean.",
        },
        isFix: true,
      },
      {
        id: "delete-binary-wrong",
        label: "Delete syncsvc.exe manually",
        kind: "ui",
        tool: "edr-console",
        evaluation: {
          grade: "wrong",
          rationale:
            "The process still holds the file; manual deletion skips the kill and the Run key and destroys the sample for analysis.",
        },
        feedback: "File locked while running — and the Run key still respawns it.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "endpoint.scanClean", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "endpoint.scanClean", value: true },
      { type: "stateEquals", path: "endpoint.quarantined", value: true },
      { type: "stateEquals", path: "endpoint.persistenceCleared", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["delete-binary-wrong"] },
        feedback:
          "Manual deletion with a live process leaves the Run key and the running beacon untouched.",
      },
    ],
    hints: [
      { level: 1, text: "Read what the sensor observed before deciding what the family label means." },
      { level: 2, text: "The alert describes behavior — where did the file come from, and how does it return after reboot?" },
      {
        level: 3,
        text: "Cut the running process first, then the respawn path, then prove it — order keeps cleanup from racing the malware.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A cracked-software installer dropped an unsigned credential stealer with a Run-key respawn path at 07:41.",
      whyItWorked:
        "Behavior, origin and persistence evidence discriminated a real payload from a vendor false positive and from email delivery; the kill → un-persist → scan order stopped the beacon before removing what would have respawned it. Transferable principle: a threat is only removed when its respawn path is removed — kill it, un-persist it, then prove it.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Behavior record, delivery origin, Run-key persistence check.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Vendor false-positive and email-delivery hypotheses dropped — unsigned credential-dump behavior from a cracked installer.",
        },
        { step: "Apply fix", whatLearnerDid: "Quarantined the process, then removed the Run key." },
        { step: "Verify", whatLearnerDid: "Full scan clean with no new alerts." },
      ],
      followUps: [
        "Block cracked-software downloads at the web proxy and coach the user on approved installers.",
      ],
    },
    knowledgeLinks: ["phishing-awareness", "troubleshooting-method"],
    references: [
      {
        title: "MITRE ATT&CK T1547.001 — Registry Run Keys / Startup Folder",
        url: "https://attack.mitre.org/techniques/T1547/001/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
  {
    id: "disk-full-slow-pc",
    version: 1,
    title: "PC extremely slow, disk almost full",
    category: "sysadmin",
    difficulty: "beginner",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: ["Correlate free space with performance", "Safe cleanup verification"],
    prerequisites: [],
    skills: ["storage", "performance", "windows"],
    ticket: {
      id: "HD-1013",
      user: "Robin Sale",
      role: "Consultant",
      symptomPlainLanguage:
        "Everything freezes, updates fail, and the C drive icon is red.",
      priority: "medium",
      channel: "email",
    },
    environment: {
      components: ["event-viewer", "storage"],
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["storage", "task-manager"],
      enabledCommands: ["df", "tasklist", "systeminfo", "help"],
      initialWorld: {
        currentUser: "robin",
        disks: [
          { fs: "C:", size: "256G", used: "252G", avail: "4G", usePercent: "98%", mount: "C:\\" },
        ],
        services: [],
        logs: ["ERROR Windows Update: not enough free disk space (0x80070070)"],
        storage: {
          tempCleared: false,
          recyclePurged: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-disk", label: "Disk full", initiallyPlausible: true },
      { id: "h-malware", label: "Malware", initiallyPlausible: false },
      { id: "h-ram", label: "Not enough RAM", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Correlate the update error with capacity, reclaim the safest space first, then prove the original symptom clears.",
      "steps": [
        {
          "id": "guide-measure-space",
          "title": "Measure free space first",
          "explanation": "Read the Windows Update entry in Event Viewer, then run Open Storage settings from Tools.",
          "why": "Event Viewer — Windows' record of system events — names the failing component; measuring C: tests that claim cheaply.",
          "expectedObservation": "The log shows 0x80070070 for Windows Update, and Storage reports C: at 98 percent with 4 GB free.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "check-storage",
          "conceptId": "windows-event-logs",
          "fallback": "the Event Viewer tab in the Windows workstation panel"
        },
        {
          "id": "guide-clean-temp",
          "title": "Clean temporary files first",
          "explanation": "Run Clean temporary files from Tools, then watch the free-space figure on C:.",
          "why": "Temporary files hold no user data and are recreated as needed, so they are the first gigabytes to take back.",
          "expectedObservation": "About 20 GB freed, leaving 24 GB available on C:.",
          "target": { "componentId": "storage", "label": "Storage tab" },
          "actionId": "clear-temp",
          "fallback": "the Storage tab in the Windows workstation panel"
        },
        {
          "id": "guide-purge-recycle",
          "title": "Empty the Recycle Bin",
          "explanation": "Run Empty Recycle Bin from Tools, then re-read the usage figure for C:.",
          "why": "The bin holds files the user already chose to discard — the next-safest reclaim before user documents are considered.",
          "expectedObservation": "Another 12 GB freed, leaving 36 GB available.",
          "target": { "componentId": "storage", "label": "Disk usage row for C:" },
          "actionId": "purge-recycle",
          "fallback": "the Storage tab in the Windows workstation panel"
        },
        {
          "id": "guide-verify-update",
          "title": "Verify with the failing update",
          "explanation": "Run Recheck free space and update status, then confirm the update that failed retries.",
          "why": "Re-running the original failing update proves the fix end to end instead of trusting a healthier number alone.",
          "expectedObservation": "The result reports 36 GB free and the update error cleared on retry.",
          "target": { "componentId": "storage", "label": "Storage tab" },
          "actionId": "verify-performance",
          "conceptId": "disk-space-slow-pc",
          "fallback": "the Storage tab in the Windows workstation panel"
        }
      ]
    },
    actions: [
      {
        id: "check-storage",
        label: "Open Storage settings",
        kind: "inspect",
        tool: "storage",
        patch: {},
        feedback: "C: has only 4 GB free (98% used).",
        evaluation: {
          grade: "optimal",
          rationale:
            "The red drive icon and update errors both trace to capacity — measuring free space first confirms or kills the hypothesis cheaply.",
          evidenceGain: "C: at 98% (4 GB free) — capacity hypothesis confirmed.",
        },
        isDiagnostic: true,
      },
      {
        id: "clear-temp",
        label: "Clean temporary files",
        kind: "ui",
        tool: "storage",
        patch: { storage: { tempCleared: true }, disks: [{ fs: "C:", size: "256G", used: "232G", avail: "24G", usePercent: "91%", mount: "C:\\" }] },
        feedback: "Freed ~20 GB from temp.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Temp files are the first reclaim because they are recoverable, contain no user data, and typically accumulate by the gigabyte.",
          evidenceGain: "~20 GB freed from temp — safe cleanup path works.",
        },
        isFix: true,
      },
      {
        id: "purge-recycle",
        label: "Empty Recycle Bin",
        kind: "ui",
        tool: "storage",
        patch: { storage: { recyclePurged: true }, disks: [{ fs: "C:", size: "256G", used: "220G", avail: "36G", usePercent: "86%", mount: "C:\\" }] },
        feedback: "Freed another ~12 GB.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The Recycle Bin still holds data the user already meant to discard — the next-safest reclaim before anything else is considered.",
          evidenceGain: "Another ~12 GB freed; 36 GB total available.",
        },
        isFix: true,
      },
      {
        id: "verify-performance",
        label: "Recheck free space and update status",
        kind: "ui",
        tool: "storage",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "storage.tempCleared", value: true },
            { type: "stateEquals", path: "storage.recyclePurged", value: true },
          ],
        },
        patch: { storage: { verified: true } },
        feedback: "36 GB free; update error cleared on retry.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Rechecking capacity and retrying the failing update proves the fix resolved the original symptom, not just the metric.",
          evidenceGain: "36 GB free; update error cleared on retry.",
        },
        isFix: true,
      },
      {
        id: "delete-user-docs-wrong",
        label: "Delete user Documents folder",
        kind: "ui",
        tool: "storage",
        evaluation: {
          grade: "harmful",
          rationale:
            "Deleting the user's documents would trade a recoverable space problem for unrecoverable data loss. Tens of gigabytes of safe space exist in temp and the Recycle Bin before user files should ever be considered.",
        },
        feedback: "Never bulk-delete user data during cleanup without consent and backup.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "storage.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "storage.verified", value: true },
      { type: "stateIn", path: "disks.0.avail", values: ["36G"] },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["delete-user-docs-wrong"],
        },
        feedback: "Never bulk-delete user data during cleanup without consent and backup.",
      },
    ],
    hints: [
      { level: 1, text: "Red drive icon + update errors → look at free space first." },
      { level: 2, text: "Safe wins: temp files and Recycle Bin before touching user data." },
      { level: 3, text: "Clean until free space is healthy, then verify updates." },
    ],
    debrief: {
      rootCause: "C: drive at 98% capacity caused update failures and system sluggishness.",
      whyItWorked:
        "Safe cleanup paths restored free space required by Windows components without destroying user documents. Transferable principle: reclaim recoverable space first — user data is the last resort, never the first.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Storage metrics" },
        { step: "Rule out", whatLearnerDid: "User-data deletion dropped — 36 GB recovered from temp and Recycle Bin." },
        { step: "Fix", whatLearnerDid: "Temp + recycle cleanup" },
        { step: "Verify", whatLearnerDid: "Free space + update retry" },
      ],
      followUps: ["Enable Storage Sense or schedule regular cleanups."],
    },
    knowledgeLinks: ["disk-space-slow-pc", "windows-event-logs"],
    references: [],
  },
  {
    id: "backup-failed",
    version: 1,
    title: "Nightly backup failing for three days",
    category: "sysadmin",
    difficulty: "intermediate",
    scenarioType: "RECOVERY",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Use the job's own history to find the failing step",
      "Prove a stale credential against the target before touching the job",
    ],
    prerequisites: [],
    skills: ["backup", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1026",
      user: "Gordon Pratt",
      role: "Operations lead",
      symptomPlainLanguage:
        "Nightly backup has failed three days in a row — the alert says access denied writing to the NAS share.",
      priority: "medium",
      channel: "email",
    },
    environment: {
      components: ["event-viewer", "services"],
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["backup-console", "terminal"],
      enabledCommands: ["tasklist", "help"],
      initialWorld: {
        backup: {
          targetPath: "\\\\nas01\\backups",
          account: "ops-backup",
          logReviewed: false,
          targetTested: false,
          credsUpdated: false,
          completed: false,
          verified: false,
        },
        services: [
          {
            id: "wbengine",
            name: "Windows Backup",
            status: "running",
            description: "Backup engine service",
          },
        ],
        disks: [
          {
            fs: "NTFS",
            mount: "C:",
            size: "476 GB",
            used: "182 GB",
            avail: "294 GB",
            usePercent: "38%",
          },
        ],
        logs: [
          "Sep 22 02:06 Backup completed successfully — 42.1 GB written to \\\\nas01\\backups",
          "Sep 23 02:00 Backup failed: 0x80070005 Access is denied writing to \\\\nas01\\backups",
          "Sep 24 02:00 Backup failed: 0x80070005 Access is denied writing to \\\\nas01\\backups",
        ],
      },
    },
    hypotheses: [
      { id: "h-creds", label: "Stored target credential stale", initiallyPlausible: true },
      { id: "h-service", label: "Backup engine stopped", initiallyPlausible: true },
      { id: "h-space", label: "Not enough space on the target", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Let the job's own history pick the failing step, test the destination with the job's identity, then prove one clean run.",
      "steps": [
        {
          "id": "guide-job-history",
          "title": "Read the job history",
          "explanation": "Open the Event Viewer tab and read the three nightly backup entries.",
          "why": "The job's own history gives the since-when and the failing step in one read, before any guesswork starts.",
          "expectedObservation": "Sep 22 completes successfully; Sep 23 and 24 fail with 0x80070005 writing to \\\\nas01\\backups.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab" },
          "actionId": "read-backup-logs",
          "conceptId": "windows-event-logs",
          "fallback": "the Event Viewer tab in the Windows workstation panel"
        },
        {
          "id": "guide-test-share",
          "title": "Test the target share",
          "explanation": "Open the terminal, then run Test the target share with the stored account from Tools.",
          "why": "Testing the destination with the job's own identity reproduces the failure directly instead of inferring it from a log line.",
          "expectedObservation": "The share test returns access denied when mapping \\\\nas01\\backups as ops-backup.",
          "target": { "componentId": "terminal", "label": "Terminal" },
          "actionId": "test-target-share"
        },
        {
          "id": "guide-refresh-credential",
          "title": "Refresh the stored credential",
          "explanation": "Confirm Windows Backup shows running in Services, then run Update stored credential from Tools.",
          "why": "The destination rejected the stored account while the engine runs, so refreshing exactly that credential is the smallest matching change.",
          "expectedObservation": "Services lists Windows Backup as running, and the portal reports the credential refreshed.",
          "target": { "componentId": "services", "label": "Services tab" },
          "actionId": "update-credential",
          "fallback": "the Services tab in the Windows workstation panel"
        },
        {
          "id": "guide-run-backup",
          "title": "Run the backup job now",
          "explanation": "Run Backup now from Tools, then compare the result with the history in Event Viewer.",
          "why": "The ticket is a failed job, so one completed run is the honest proof that the fix held.",
          "expectedObservation": "The run reports 42.1 GB written to \\\\nas01\\backups in 6 minutes.",
          "target": { "componentId": "event-viewer", "label": "Event Viewer tab (backup job history)" },
          "actionId": "run-backup-now",
          "fallback": "the Event Viewer tab in the Windows workstation panel"
        }
      ]
    },
    actions: [
      {
        id: "read-backup-logs",
        label: "Read backup job history",
        kind: "inspect",
        tool: "backup-console",
        patch: { backup: { logReviewed: true } },
        feedback:
          "Success on Sep 22, then access denied (0x80070005) at the target write step both nights since — the job itself still runs.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The job's own history gives you the since-when and the failing step in one read: target write, not source collection.",
          evidenceGain:
            "Fails at target write since Sep 23 — source side ruled out by the earlier success.",
        },
        matchHints: ["history", "backup log", "job history"],
        isDiagnostic: true,
      },
      {
        id: "test-target-share",
        label: "Test the target share with the stored account",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "backup.logReviewed", value: true },
        patch: { backup: { targetTested: true } },
        feedback:
          "Mapping \\\\nas01\\backups as ops-backup: access denied — the credential itself is rejected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Testing the destination with the stored account converts a log line into a reproducible credential failure, and the running engine plus healthy local disk stop the other two hypotheses.",
          evidenceGain:
            "Share rejects stored credentials — engine and local-space hypotheses ruled out.",
        },
        matchHints: ["map", "test share", "net use"],
        isDiagnostic: true,
      },
      {
        id: "update-credential",
        label: "Update stored credential for the target",
        kind: "ui",
        tool: "backup-console",
        appliesWhen: { type: "stateEquals", path: "backup.targetTested", value: true },
        patch: { backup: { credsUpdated: true } },
        feedback: "Stored backup credential refreshed for ops-backup on \\\\nas01\\backups.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence names one stale credential on one target — refreshing exactly that pair is the smallest fix that matches the failure.",
          evidenceGain: "Credential updated for the target.",
        },
        matchHints: ["credential", "password", "account"],
        isFix: true,
      },
      {
        id: "run-backup-now",
        label: "Run the backup job immediately",
        kind: "ui",
        tool: "backup-console",
        appliesWhen: { type: "stateEquals", path: "backup.credsUpdated", value: true },
        patch: { backup: { completed: true, verified: true } },
        feedback: "Backup completed: 42.1 GB written to \\\\nas01\\backups in 6 minutes.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a failed job — running it once and watching it complete is the only honest proof the fix held.",
          evidenceGain: "Backup completed successfully to the target.",
        },
        matchHints: ["run now", "backup now", "start backup"],
        isFix: true,
      },
      {
        id: "recreate-backup-job-wrong",
        label: "Delete and recreate the backup job",
        kind: "ui",
        tool: "backup-console",
        evaluation: {
          grade: "wrong",
          rationale:
            "The job definition is intact — it ran nightly and fails only at the target since the credential changed; rebuilding the schedule leaves the rejected credential in place.",
        },
        feedback: "Recreating the job keeps using the same rejected credential.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "backup.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "backup.verified", value: true },
      { type: "stateEquals", path: "backup.completed", value: true },
      { type: "stateEquals", path: "backup.credsUpdated", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["recreate-backup-job-wrong"] },
        feedback: "The schedule was never broken — the target rejects the stored account.",
      },
    ],
    hints: [
      { level: 1, text: "Compare the job's own history — when did it last succeed?" },
      { level: 2, text: "The failure happens at the target write — who is writing there, and with what?" },
      {
        level: 3,
        text: "Refresh exactly the credential the target rejects, then run the job once to prove it.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The NAS service account password was rotated, but Windows Backup kept presenting the old stored credential to \\\\nas01\\backups.",
      whyItWorked:
        "The job history pinned the failing step and the since-when; a direct share test proved the credential rejection while the running engine and healthy local disk closed the other hypotheses. Transferable principle: a job that fails at its destination is a destination conversation — test the destination with the same identity the job uses.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Job history, then a direct share test as the stored account.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Engine stopped and local-space hypotheses dropped — service running, C: at 38%, success until Sep 22.",
        },
        { step: "Apply fix", whatLearnerDid: "Refreshed the stored credential for the target." },
        { step: "Verify", whatLearnerDid: "Job ran immediately and completed to the NAS." },
      ],
      followUps: [
        "Rotate the backup account on a schedule that matches the NAS password policy, or move to a managed service account.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft — Back up and restore with Windows Server Backup",
        url: "https://learn.microsoft.com/windows-server/backup-restore/backup-and-restore",
        note: "Public vendor documentation.",
      },
    ],
  },
  {
    id: "service-dependency",
    version: 1,
    title: "inventory-api will not start after reboot",
    category: "sysadmin",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Read a systemd dependency failure as a graph, not a single unit",
      "Fix the required unit before the dependent one",
    ],
    prerequisites: [],
    skills: ["systemd", "linux", "troubleshooting-method"],
    ticket: {
      id: "HD-1027",
      user: "Tomas Lind",
      role: "Developer",
      symptomPlainLanguage:
        "inventory-api will not come up after this morning's reboots — systemd says a dependency failed.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["systemctl", "journalctl", "cat", "ls", "grep", "help", "ps"],
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "inventory-api",
            name: "inventory-api",
            status: "failed",
            description: "Inventory REST API",
            lastError: ["Failed to start because dependency redis-cache.service failed"],
          },
          {
            id: "redis-cache",
            name: "redis-cache",
            status: "failed",
            description: "In-memory cache for inventory-api",
            lastError: ["Bad directive or wrong number of arguments"],
          },
        ],
        logs: [
          "Sep 26 06:02:11 app01 systemd[1]: Starting inventory-api.service...",
          "Sep 26 06:02:11 app01 systemd[1]: inventory-api.service: Failed to start because a required dependency (redis-cache.service) failed.",
          "Sep 26 06:02:10 app01 redis-server[812]: Bad directive or wrong number of arguments",
          "Sep 26 06:02:10 app01 systemd[1]: redis-cache.service: Main process exited, code=exited, status=1/FAILURE",
        ],
        fs: {
          type: "dir",
          name: "/",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              children: {
                systemd: {
                  type: "dir",
                  name: "systemd",
                  children: {
                    system: {
                      type: "dir",
                      name: "system",
                      children: {
                        "inventory-api.service": {
                          type: "file",
                          name: "inventory-api.service",
                          mode: "644",
                          content:
                            "[Unit]\nRequires=redis-cache.service\nAfter=redis-cache.service\n\n[Service]\nExecStart=/opt/inventory/api\n",
                        },
                      },
                    },
                  },
                },
                redis: {
                  type: "dir",
                  name: "redis",
                  children: {
                    "redis.conf": {
                      type: "file",
                      name: "redis.conf",
                      mode: "644",
                      content: "port 6379\nmaxmemmory 256mb\nappendonly yes\n",
                    },
                  },
                },
              },
            },
          },
        },
        dep: {
          statusChecked: false,
          depsRead: false,
          depUnitChecked: false,
          depConfigFixed: false,
          depStarted: false,
          appStarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-appcfg", label: "App config broken", initiallyPlausible: true },
      { id: "h-depcfg", label: "Required unit itself failing", initiallyPlausible: true },
      { id: "h-port", label: "Port 8080 already taken", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Follow the failure outward from the app's own status to the unit it waits on, then repair the chain in order.",
      "steps": [
        {
          "id": "guide-app-status",
          "title": "Check inventory-api status first",
          "explanation": "Run systemctl status inventory-api in the terminal and read where the unit stopped.",
          "why": "A unit — systemd's name for a service — reports the stage it failed at, so you start from fact, not guess.",
          "expectedObservation": "The unit's failed state with an error line naming the stage where it stopped.",
          "target": { "componentId": "terminal", "label": "Terminal — run systemctl status inventory-api" },
          "actionId": "status-app",
          "commandId": "systemctl-status",
          "conceptId": "systemd-service-basics"
        },
        {
          "id": "guide-unit-file",
          "title": "Read the unit file contract",
          "explanation": "Open /etc/systemd/system/inventory-api.service in the terminal and read its Requires= and After= lines.",
          "why": "The unit file is the contract: it names exactly which unit must be healthy before this one may start.",
          "expectedObservation": "The Requires= and After= lines both naming redis-cache.service.",
          "target": { "componentId": "terminal", "label": "Terminal — open the unit file" },
          "actionId": "read-unit-file",
          "commandId": "cat",
          "conceptId": "systemd-service-basics"
        },
        {
          "id": "guide-dep-status",
          "title": "Check the required unit's status",
          "explanation": "Run systemctl status redis-cache and read the error its own startup produced.",
          "why": "The Requires= line — the dependency declaration — points here, because a dependent unit only waits for this one.",
          "expectedObservation": "redis-cache.service failed with a startup error line of its own.",
          "target": { "componentId": "terminal", "label": "Terminal — run systemctl status redis-cache" },
          "actionId": "status-dep",
          "commandId": "systemctl-status",
          "conceptId": "systemd-service-basics"
        },
        {
          "id": "guide-fix-config",
          "title": "Correct the bad config directive",
          "explanation": "Open /etc/redis/redis.conf in the terminal and fix the directive that fails to parse.",
          "why": "The required unit's own error is the evidence now — correcting exactly that line is the smallest change that matches it.",
          "expectedObservation": "The corrected directive saved in redis.conf with no parse error on the next start.",
          "target": { "componentId": "terminal", "label": "Terminal — correct the redis.conf directive" },
          "actionId": "fix-dep-config"
        },
        {
          "id": "guide-start-dep",
          "title": "Start the required unit first",
          "explanation": "Apply Start redis-cache so the dependency comes up before the app.",
          "why": "The unit file orders startup: the required unit must be active before the dependent unit may start.",
          "expectedObservation": "redis-cache.service reads active (running) and accepting on 6379.",
          "target": { "componentId": "terminal", "label": "Terminal — start redis-cache" },
          "actionId": "start-dependency"
        },
        {
          "id": "guide-start-app",
          "title": "Start the dependent unit",
          "explanation": "Apply Start inventory-api now that its requirement is healthy.",
          "why": "Starting the dependent unit only after its requirement is healthy is the whole lesson of dependency ordering.",
          "expectedObservation": "inventory-api.service reads active (running).",
          "target": { "componentId": "terminal", "label": "Terminal — start inventory-api" },
          "actionId": "start-app"
        },
        {
          "id": "guide-verify-api",
          "title": "Verify the API responds",
          "explanation": "Request the API's health endpoint in the terminal and read the reply.",
          "why": "The ticket was an unreachable API — a real health request proves the whole chain, cache included, rather than two green unit states.",
          "expectedObservation": "The health endpoint returning 200 with a cached lookup answering.",
          "target": { "componentId": "terminal", "label": "Terminal — verify the API responds" },
          "actionId": "verify-api"
        }
      ]
    },
    actions: [
      {
        id: "status-app",
        label: "systemctl status inventory-api",
        kind: "terminal",
        tool: "terminal",
        patch: { dep: { statusChecked: true } },
        feedback:
          "Unit failed at dependency stage: 'Failed to start because a required dependency (redis-cache.service) failed.'",
        evaluation: {
          grade: "optimal",
          rationale:
            "The dependent unit's status names the failing stage — dependency, not its own ExecStart — so the investigation moves along the Requires= edge instead of the app.",
          evidenceGain: "App unit failed at dependency stage — app config hypothesis weakened.",
        },
        matchHints: ["systemctl status inventory-api", "status inventory"],
        isDiagnostic: true,
      },
      {
        id: "read-unit-file",
        label: "Read the unit file (Requires=/After=)",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "dep.statusChecked", value: true },
        patch: { dep: { depsRead: true } },
        feedback:
          "inventory-api.service declares Requires=redis-cache.service and After=redis-cache.service — the dependency is explicit.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The unit file is the contract: it names exactly which unit must be healthy before this one may start.",
          evidenceGain: "Requires= edge identified: redis-cache.service.",
        },
        matchHints: ["cat the unit", "unit file", "requires", "cat /etc/systemd/system/inventory-api.service"],
        isDiagnostic: true,
      },
      {
        id: "status-dep",
        label: "systemctl status redis-cache",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "dep.depsRead", value: true },
        patch: { dep: { depUnitChecked: true } },
        feedback:
          "redis-cache.service is failed since 06:02 — 'Bad directive or wrong number of arguments' on startup.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The required unit carries its own startup error — the failure originates there, not in the app that merely waits on it.",
          evidenceGain: "Dependency failed on its own config line — source of failure located.",
        },
        matchHints: ["systemctl status redis-cache", "status redis"],
        isDiagnostic: true,
      },
      {
        id: "fix-dep-config",
        label: "Fix the redis config directive",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "dep.depUnitChecked", value: true },
        patch: { dep: { depConfigFixed: true } },
        feedback:
          "redis.conf corrected: 'maxmemmory' → 'maxmemory'; the unit now parses.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal named one bad directive — correcting exactly that line is the smallest change that lets the required unit parse and start.",
          evidenceGain: "Config parses — dependency can start.",
        },
        matchHints: ["fix config", "correct directive", "maxmemory"],
        isFix: true,
      },
      {
        id: "start-dependency",
        label: "Start redis-cache",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "dep.depConfigFixed", value: true },
        patch: { dep: { depStarted: true } },
        feedback: "redis-cache.service is active (running) and accepting on 6379.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With a parseable config, bringing the required unit up first respects the ordering contract the app declared.",
          evidenceGain: "Required unit active — dependency edge satisfied.",
        },
        matchHints: ["start redis", "systemctl start redis-cache"],
        isFix: true,
      },
      {
        id: "start-app",
        label: "Start inventory-api",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "dep.depStarted", value: true },
        patch: { dep: { appStarted: true } },
        feedback: "inventory-api.service is active (running).",
        evaluation: {
          grade: "optimal",
          rationale:
            "Starting the dependent unit only after its requirement is healthy is the whole lesson of dependency ordering.",
          evidenceGain: "App unit active — no dependency failure.",
        },
        matchHints: ["start inventory", "systemctl start inventory-api"],
        isFix: true,
      },
      {
        id: "verify-api",
        label: "Verify the API responds",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "dep.appStarted", value: true },
        patch: { dep: { verified: true } },
        feedback: "GET /health returns 200 and a cached lookup answers in 12 ms.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was an unreachable API — a real health request proves the whole chain, cache included, rather than two green unit states.",
          evidenceGain: "API healthy with cache path exercised.",
        },
        isFix: true,
      },
      {
        id: "restart-app-wrong",
        label: "Restart inventory-api repeatedly",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "The app unit fails before ExecStart because its required unit is down — restarting the dependent unit cannot satisfy a dependency.",
        },
        feedback: "Still dependency-failed — the required unit never came up.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "dep.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "dep.verified", value: true },
      { type: "stateEquals", path: "dep.appStarted", value: true },
      { type: "stateEquals", path: "dep.depStarted", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["restart-app-wrong"] },
        feedback: "Restarting the dependent unit never satisfies the Requires= edge.",
      },
    ],
    hints: [
      { level: 1, text: "The status says dependency failed — read which unit it is waiting on." },
      { level: 2, text: "The unit file states the contract; the journal states why the other side broke it." },
      {
        level: 3,
        text: "Repair the required unit first, bring it up, then start the app and hit its health endpoint.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A config push typo'd 'maxmemory' as 'maxmemmory', so redis-cache failed at boot and inventory-api's Requires= edge blocked its start.",
      whyItWorked:
        "Status located the failing stage, the unit file named the required unit, and the journal named the exact bad line — fixing the dependency before the dependent respected the ordering contract. Transferable principle: a dependency failure is a graph problem — repair and start nodes in reverse dependency order, then verify at the edge the user actually uses.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "App status, unit file, dependency status and journal.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "App config and port hypotheses dropped — the unit never reached ExecStart, and the journal names redis's own parse error.",
        },
        { step: "Apply fix", whatLearnerDid: "Corrected the directive, started redis, then the app." },
        { step: "Verify", whatLearnerDid: "GET /health 200 with cache path exercised." },
      ],
      followUps: [
        "Add a systemd drop-in with a restart policy so a failed dependency retries and alerts.",
      ],
    },
    knowledgeLinks: ["systemd-service-basics", "troubleshooting-method"],
    references: [
      {
        title: "systemd.unit — Unit dependencies and ordering",
        url: "https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html",
        note: "Public systemd documentation.",
      },
    ],
  },
  {
    id: "db-connection-refused",
    version: 1,
    title: "App cannot connect to database",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: ["Order DB connectivity checks", "Separate service vs credential failures"],
    prerequisites: [],
    skills: ["databases", "networking", "troubleshooting-method"],
    ticket: {
      id: "HD-1014",
      user: "Backend API team",
      role: "Developers",
      symptomPlainLanguage:
        "API returns 500s. Logs say connect ECONNREFUSED db01:5432 after the DB host reboot.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "network+terminal",
      shell: "linux",
      availableTools: ["terminal", "services", "network"],
      enabledCommands: ["ping", "ss", "systemctl", "journalctl", "help", "ps"],
      initialWorld: {
        currentUser: "ops",
        hosts: [
          {
            id: "app",
            name: "app01",
            os: "linux",
            ips: ["192.168.1.30"],
            mac: "0A:1B:2C:3D:4E:5F",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        services: [
          {
            id: "postgres",
            name: "postgresql",
            status: "failed",
            description: "PostgreSQL DB server",
            lastError: ["FATAL: could not bind IPv4 address: Address already in use"],
          },
        ],
        network: {
          faults: { dbServiceDown: true, portBlocked: false },
        },
        db: {
          host: "db01",
          port: 5432,
          portListening: false,
          portChecked: false,
          serviceStarted: false,
          credsChecked: false,
          verified: false,
        },
        logs: [
          "app: error: connect ECONNREFUSED 192.168.1.31:5432",
          "postgres: FATAL: could not bind IPv4 address: Address already in use",
        ],
      },
    },
    hypotheses: [
      { id: "h-service", label: "Postgres not running", initiallyPlausible: true },
      { id: "h-creds", label: "Bad credentials", initiallyPlausible: true },
      { id: "h-fw", label: "Firewall blocked port", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      "intro": "Start at the client's error, then step outward through journal, socket, and unit before changing anything.",
      "steps": [
        {
          "id": "guide-journal",
          "title": "Read the app and database logs",
          "explanation": "In the terminal, read the app and postgresql journal entries together.",
          "why": "The API's 500 hides the layer; the database's own journal — written by the server — records what happened at each step.",
          "expectedObservation": "An ECONNREFUSED line from the app next to a postgresql FATAL line.",
          "target": { "componentId": "terminal", "label": "Terminal — open the journal" },
          "actionId": "read-logs",
          "commandId": "journalctl",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-socket",
          "title": "Check the listening port",
          "explanation": "Run ss -tuln in the terminal and look for a line holding TCP 5432.",
          "why": "ss — the Linux tool that lists open sockets — measures the transport layer instead of repeating the client's guess.",
          "expectedObservation": "No line in ss output lists TCP 5432 as listening.",
          "target": { "componentId": "terminal", "label": "Terminal — run ss" },
          "actionId": "check-port",
          "commandId": "ss",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-unit",
          "title": "Check the postgresql unit",
          "explanation": "Run systemctl status postgresql and read the unit's state and last error.",
          "why": "A closed socket needs a cause; a systemd unit's status shows the state and last error of the server behind 5432.",
          "expectedObservation": "The postgresql unit showing failed with address already in use (a stale postmaster) as its last error.",
          "target": { "componentId": "terminal", "label": "Terminal — check the unit status" },
          "actionId": "check-service",
          "commandId": "systemctl-status",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-restart",
          "title": "Restart the database service",
          "explanation": "Restart postgresql from the terminal and watch the unit return to active.",
          "why": "With the journal error and the closed socket in hand, a clean restart is the smallest change that matches the evidence.",
          "expectedObservation": "The unit reporting active (running) and ss listing 5432 again.",
          "target": { "componentId": "terminal", "label": "Terminal — restart postgresql" },
          "actionId": "restart-db"
        },
        {
          "id": "guide-verify",
          "title": "Verify the application connects",
          "explanation": "Run the application's connectivity check again, typed here or picked from the available-actions list.",
          "why": "The ticket was a user-facing 500, so only the application's own path proves the fix end to end.",
          "expectedObservation": "The query succeeding and the API's 500 responses clearing.",
          "target": { "componentId": "terminal", "label": "Terminal — run the connectivity check" },
          "actionId": "verify-query",
          "conceptId": "troubleshooting-method"
        }
      ]
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: {},
        feedback: "ECONNREFUSED plus postgres bind error — server side, not client password.",
        evaluation: {
          grade: "optimal",
          rationale:
            "ECONNREFUSED in the app only says the door was closed — the DB's own log says why, separating a server fault from a client fault.",
          evidenceGain: "postgres bind error — server-side fault, not client credentials.",
        },
        matchHints: ["journalctl", "journalctl -u postgresql", "read the database logs"],
        component: "app",
        isDiagnostic: true,
      },
      {
        id: "check-port",
        label: "Check listening port 5432 (ss -tuln)",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { portListening: false, portChecked: true } },
        feedback: "Nothing listening on 5432.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Nothing listening on 5432 turns 'connection refused' from an inference into a measured fact at the transport layer.",
          evidenceGain: "Port 5432 closed — TCP never accepted the connection.",
        },
        matchHints: ["ss -lntp", "ss -tuln", "ss -lnt", "netstat -tuln"],
        component: "port",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "check-service",
        label: "systemctl status postgresql",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.portListening", value: false },
        patch: { db: { credsChecked: true } },
        feedback: "Unit failed: address already in use (stale postmaster).",
        evaluation: {
          grade: "optimal",
          rationale:
            "The closed port needs a cause — a failed unit reporting 'address already in use' names a stale postmaster holding the socket.",
          evidenceGain: "Unit failed: address already in use (stale postmaster).",
        },
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "restart-db",
        label: "Clean restart postgresql",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: {
          services: [
            { id: "postgres", name: "postgresql", status: "active (running)", description: "PostgreSQL DB server" },
          ],
          network: { faults: { dbServiceDown: false } },
          db: { serviceStarted: true, portListening: true, portChecked: true },
        },
        feedback: "PostgreSQL is active; 5432 is listening.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A clean restart clears the stale holder and rebinds the socket — the smallest fix that matches the bind failure the logs showed.",
          evidenceGain: "PostgreSQL active; 5432 listening.",
        },
        matchHints: ["systemctl restart postgresql", "systemctl restart postgres", "restart postgresql"],
        component: "service",
        inspectTarget: "database",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run application connectivity check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.serviceStarted", value: true },
        patch: { db: { verified: true } },
        feedback: "SELECT 1 succeeded; API 500s cleared.",
        evaluation: {
          grade: "optimal",
          rationale:
            "SELECT 1 through the real application path proves clients can connect again — the reported 500s clearing is the honest end state.",
          evidenceGain: "SELECT 1 succeeded; API 500s cleared.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "reset-all-passwords-wrong",
        label: "Reset all DB passwords",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "Password resets do not answer ECONNREFUSED — the connection never reached authentication. The listening socket shows the server side never accepted the TCP connection, so fix the service, not credentials.",
        },
        feedback: "Logs show connection refused, not auth failure — passwords are irrelevant here.",
        component: "app",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.portListening", value: true },
      { type: "stateEquals", path: "network.faults.dbServiceDown", value: false },
    ],
    wrongPaths: [],
    hints: [
      { level: 1, text: "ECONNREFUSED means nothing accepted the TCP connection." },
      { level: 2, text: "Read the database's own log — not just the app's." },
      {
        level: 3,
        text: "The unit failure explains the closed port — get the database listening again, and don't call it done until the application completes a query.",
        category: "direct",
      },
    ],
    debrief: {
      rootCause:
        "PostgreSQL failed after reboot due to a stale lock/port conflict, so 5432 was closed.",
      whyItWorked:
        "A clean service restart cleared the stale state; listening socket returned; app connections succeeded. Transferable principle: trust the service's own log over the client's error message — ECONNREFUSED is a symptom, not a cause.",
      methodologyMap: [
        { step: "Evidence", whatLearnerDid: "Logs + ss + systemctl" },
        { step: "Rule out", whatLearnerDid: "Credentials and app config dropped — bind failure and a closed port are server-side facts." },
        { step: "Root cause", whatLearnerDid: "Service failed to bind" },
        { step: "Verify", whatLearnerDid: "App connectivity check" },
      ],
      followUps: ["Add postgres to boot health checks after reboots."],
    },
    knowledgeLinks: ["database-connection-basics", "systemd-service-basics", "gateway-vs-dns"],
    references: [],
  },
  {
    id: "db-auth-failure",
    version: 1,
    title: "Password authentication failed after secret rotation",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Place an auth failure on the ladder without blaming the server",
      "Match a rotated secret to the stale value the client presents",
    ],
    prerequisites: ["db-connection-refused"],
    skills: ["databases", "secrets", "troubleshooting-method"],
    ticket: {
      id: "HD-1023",
      user: "Checkout API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Checkout returns 500s: password authentication failed for svc_checkout since the 02:00 secret rotation.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "network+terminal",
      shell: "linux",
      availableTools: ["terminal", "services", "network"],
      enabledCommands: ["ping", "ss", "systemctl", "journalctl", "help", "ps"],
      initialWorld: {
        currentUser: "ops",
        hosts: [
          {
            id: "app",
            name: "app01",
            os: "linux",
            ips: ["192.168.1.30"],
            mac: "0A:1B:2C:3D:4E:5F",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        services: [
          {
            id: "postgres",
            name: "postgresql",
            status: "active (running)",
            description: "PostgreSQL DB server",
            lastError: [],
          },
        ],
        network: {
          faults: { dbServiceDown: false, portBlocked: false },
        },
        db: {
          host: "db01",
          port: 5432,
          hostAddress: "192.168.1.31",
          name: "appdb",
          portListening: true,
          portChecked: false,
          serviceStarted: false,
          credsChecked: false,
          verified: false,
          authFailed: true,
          logsReviewed: false,
          secretMismatchSeen: false,
          secretSynced: false,
        },
        logs: [
          "postgres: FATAL:  password authentication failed for user \"svc_checkout\" from 192.168.1.30",
          "app: error: password authentication failed for user \"svc_checkout\"",
          "vault: INFO  secret rotated: apps/checkout/db (nightly rotation 02:00)",
          "app: WARN  using DB_PASSWORD from environment (last changed 30 days ago)",
        ],
      },
    },
    hypotheses: [
      { id: "h-stale", label: "Stale password after rotation", initiallyPlausible: true },
      { id: "h-role", label: "svc_checkout role dropped", initiallyPlausible: true },
      { id: "h-down", label: "Database down", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work down the connection ladder — journal, unit, credential — and touch only the layer your evidence points at.",
      "steps": [
        {
          "id": "guide-journal",
          "title": "Read the authentication failure logs",
          "explanation": "In the terminal, read the app and postgresql journal entries for the rejection.",
          "why": "A 500 hides the layer; the database's own journal — written by the server — shows at which step the session stopped.",
          "expectedObservation": "A FATAL password-authentication line for svc_checkout beside a 02:00 vault rotation entry.",
          "target": { "componentId": "terminal", "label": "Terminal — open the journal" },
          "actionId": "read-logs",
          "commandId": "journalctl",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-unit",
          "title": "Check the postgresql unit",
          "explanation": "Run systemctl status postgresql and read how long the unit has been active.",
          "why": "Authentication only happens after a connection opens, so proving the unit healthy rules out an outage before credentials are blamed.",
          "expectedObservation": "The unit's active state with its start time and no recent errors.",
          "target": { "componentId": "terminal", "label": "Terminal — check the unit status" },
          "actionId": "check-service",
          "commandId": "systemctl-status",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-compare",
          "title": "Compare the app secret with vault",
          "explanation": "Compare the password the app presents with the current version vault holds for it.",
          "why": "With the server proven healthy, the credential — the password the client presents — is the remaining variable to date and compare.",
          "expectedObservation": "Vault's rotation timestamp for apps/checkout/db beside the app's much older environment value.",
          "target": { "componentId": "terminal", "label": "Terminal — compare the secret versions" },
          "actionId": "compare-secret",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-sync",
          "title": "Sync the secret from vault",
          "explanation": "Update the app's stored secret to the rotated value and restart what presents it.",
          "why": "The evidence named one rotated secret and one stale presenter — syncing that pair restores the intended state without touching the healthy server.",
          "expectedObservation": "The checkout service restarting with the current vault secret loaded.",
          "target": { "componentId": "terminal", "label": "Terminal — sync the app secret" },
          "actionId": "sync-secret"
        },
        {
          "id": "guide-verify",
          "title": "Verify checkout connects again",
          "explanation": "Run the application's connectivity check as svc_checkout, typed here or picked from the available-actions list.",
          "why": "The ticket was a user-facing 500, so replaying the application's connection is the honest proof the auth layer agrees again.",
          "expectedObservation": "The query succeeding as svc_checkout and the checkout 500s clearing.",
          "target": { "componentId": "terminal", "label": "Terminal — run the connectivity check" },
          "actionId": "verify-query",
          "conceptId": "troubleshooting-method"
        }
      ]
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "Postgres rejects svc_checkout on password authentication; the connection itself is accepted. A vault rotation ran at 02:00.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The app's 500 hides the layer — the database's own FATAL shows the TCP session opened and was rejected at the password step, which is a completely different failure class than refusal.",
          evidenceGain: "Connection reaches auth and is rejected — not a transport or service failure.",
        },
        matchHints: ["journalctl", "journalctl -u postgresql", "read the database logs"],
        component: "app",
        isDiagnostic: true,
      },
      {
        id: "check-port",
        label: "Check listening port 5432 (ss -tuln)",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { portListening: true, portChecked: true } },
        feedback: "5432 LISTEN 0.0.0.0 — the listener is healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener is positive, observable proof that the server accepted the TCP session — closing off refused/filtered interpretations in one measurement.",
          evidenceGain: "Port open — transport healthy; not a refused or filtered failure.",
        },
        matchHints: ["ss -lntp", "ss -tuln", "ss -lnt", "netstat -tuln"],
        component: "port",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "check-service",
        label: "systemctl status postgresql",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { credsChecked: true } },
        feedback: "postgresql active (running) since 06:12 — unit healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Confirming the unit runs eliminates the server-outage class so the investigation can stay on the credential the client presents.",
          evidenceGain: "Service running — database outage ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "compare-secret",
        label: "Compare app secret with vault version",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { secretMismatchSeen: true } },
        feedback:
          "Vault shows apps/checkout/db rotated at 02:00; the app environment still holds the 30-day-old value.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the server proven healthy, the credential itself is the remaining variable — comparing versions turns 'maybe stale' into a dated, named mismatch.",
          evidenceGain: "Credential version mismatch — rotation, not corruption.",
        },
        matchHints: ["compare the secret", "vault", "check the credential"],
        component: "app",
        isDiagnostic: true,
      },
      {
        id: "sync-secret",
        label: "Sync secret from vault",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.secretMismatchSeen", value: true },
        patch: { db: { authFailed: false, secretSynced: true } },
        feedback: "Checkout service restarted with the current vault secret.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence named one rotated secret and one stale presenter — syncing that pair is the smallest fix that restores the intended state without touching the healthy server.",
          evidenceGain: "App now presents the rotated credential.",
        },
        matchHints: ["sync the secret", "update the credential"],
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run application connectivity check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.secretSynced", value: true },
        patch: { db: { verified: true } },
        feedback: "SELECT 1 as svc_checkout succeeded; checkout 500s cleared.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was a user-facing 500 — replaying the application's own connection is the only honest proof the auth layer agrees again.",
          evidenceGain: "SELECT 1 succeeded through the real application path.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "restart-db-wrong",
        label: "Restart the database",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "The unit has been active since 06:12 and the listener accepts connections — restarting a healthy server does not change the credential the app presents.",
        },
        feedback: "Server healthy; the stale value lives in the app's environment.",
        component: "service",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.authFailed", value: false },
      { type: "stateEquals", path: "db.secretSynced", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-db-wrong"],
        },
        feedback:
          "Restarting a healthy server changes nothing — the app still presents the pre-rotation password.",
      },
    ],
    hints: [
      { level: 1, text: "The error names the layer — authentication happens after the connection opens." },
      { level: 2, text: "The database's own log plus the port check tell you what is already healthy." },
      {
        level: 3,
        text: "A nightly rotation next to a 30-day-old app value is a version mismatch — sync that pair instead of rotating everything again.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The nightly vault rotation replaced svc_checkout's password at 02:00, but the checkout service still presented the 30-day-old value from its environment.",
      whyItWorked:
        "Proving listener and unit health isolated the failure to the credential layer; syncing the app's secret to the rotated value restored authentication without touching the database. Transferable principle: 'authentication failed' means the door opened — fix the credential the client presents, never the server that correctly rejected it.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Logs show the FATAL auth rejection, the 02:00 rotation, and the stale app environment value.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Port LISTEN and unit running dropped outage hypotheses; role-dropped hypothesis dropped — the FATAL names the role, so it exists.",
        },
        { step: "Apply fix", whatLearnerDid: "Synced the app secret to the rotated vault value." },
        { step: "Verify", whatLearnerDid: "SELECT 1 succeeded as svc_checkout; 500s cleared." },
      ],
      followUps: [
        "Move the checkout DB secret to the vault agent so rotation becomes automatic.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [
      {
        title: "PostgreSQL — Client Authentication",
        url: "https://www.postgresql.org/docs/current/client-authentication.html",
        note: "Link only.",
      },
    ],
  },
  {
    id: "db-pool-exhausted",
    version: 1,
    title: "Order API: no connections available at peak",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Separate capacity rejection from service failure",
      "Attribute consumed slots to the sessions holding them",
    ],
    prerequisites: ["db-connection-refused"],
    skills: ["databases", "capacity", "troubleshooting-method"],
    ticket: {
      id: "HD-1024",
      user: "Order API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Order API times out at peak with 'no connections available' — off-peak it behaves fine.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      kind: "network+terminal",
      shell: "linux",
      availableTools: ["terminal", "services", "network"],
      enabledCommands: ["ping", "ss", "systemctl", "journalctl", "help", "ps"],
      initialWorld: {
        currentUser: "ops",
        hosts: [
          {
            id: "app",
            name: "app01",
            os: "linux",
            ips: ["192.168.1.30"],
            mac: "0A:1B:2C:3D:4E:5F",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        services: [
          {
            id: "postgres",
            name: "postgresql",
            status: "active (running)",
            description: "PostgreSQL DB server",
            lastError: [],
          },
        ],
        network: {
          faults: { dbServiceDown: false, portBlocked: false },
        },
        db: {
          host: "db01",
          port: 5432,
          hostAddress: "192.168.1.31",
          name: "appdb",
          portListening: true,
          portChecked: false,
          serviceStarted: false,
          credsChecked: false,
          verified: false,
          poolExhausted: true,
          maxConnections: 200,
          logsReviewed: false,
          sessionsCounted: false,
          leakedFound: false,
          sessionsCleared: false,
        },
        logs: [
          "app: error: no connections available (pool timeout after 5000ms)",
          "postgres: FATAL:  sorry, too many clients already",
          "postgres: LOG:  connection authorized: user=svc_order database=appdb",
          "app: INFO  deploy 7f3c rolled out at 08:57 (pooler settings changed)",
        ],
      },
    },
    hypotheses: [
      { id: "h-leak", label: "Leaked connections from the deploy", initiallyPlausible: true },
      { id: "h-max", label: "max_connections set too low", initiallyPlausible: true },
      { id: "h-mem", label: "Database host out of memory", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the server's own rejection, prove the layers below it healthy, then measure the ceiling before touching any limit.",
      "steps": [
        {
          "id": "guide-journal",
          "title": "Read the rejection in the logs",
          "explanation": "In the terminal, read the app and postgresql journal entries for this peak-time failure.",
          "why": "'No connections available' could be the app, the network, or the server — the server's own line names the rejecting layer.",
          "expectedObservation": "A 'too many clients already' FATAL beside the app's pool-timeout error.",
          "target": { "componentId": "terminal", "label": "Terminal — open the journal" },
          "actionId": "read-logs",
          "commandId": "journalctl",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-unit",
          "title": "Check the postgresql unit",
          "explanation": "Run systemctl status postgresql and read the unit's state under load.",
          "why": "A restarting or crashed unit looks identical to a saturated one from the app, so state it before measuring anything.",
          "expectedObservation": "The unit reporting active (running) with no recent restarts.",
          "target": { "componentId": "terminal", "label": "Terminal — check the unit status" },
          "actionId": "check-service",
          "commandId": "systemctl-status",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-sessions",
          "title": "Count the sessions holding slots",
          "explanation": "List the client sessions on 5432 and note who opened them and when.",
          "why": "Reaching a ceiling is a symptom — naming the sessions, one client's open connections, that hold slots separates a limit question from a consumption question.",
          "expectedObservation": "178 idle-in-transaction sessions from app01 opened by deploy 7f3c at 08:57, with only 6 sessions running queries.",
          "target": { "componentId": "terminal", "label": "Terminal — count sessions on 5432" },
          "actionId": "count-sessions",
          "conceptId": "database-connection-basics"
        },
        {
          "id": "guide-terminate",
          "title": "Terminate the idle sessions",
          "explanation": "Terminate only the idle sessions the count identified, leaving the running queries alone.",
          "why": "The measurement named which slots are held and by what — freeing exactly those reclaims capacity without dropping live work.",
          "expectedObservation": "The connection count falling to a small fraction of the 200-slot ceiling.",
          "target": { "componentId": "terminal", "label": "Terminal — terminate the idle sessions" },
          "actionId": "terminate-idle"
        },
        {
          "id": "guide-verify",
          "title": "Verify connections under load",
          "explanation": "Run the application's connectivity check while the API is under peak-equivalent load.",
          "why": "The failure only appeared at peak, so an idle check proves nothing — verify under the conditions that produced it.",
          "expectedObservation": "The query succeeding under load with order API timeouts clearing.",
          "target": { "componentId": "terminal", "label": "Terminal — run the connectivity check" },
          "actionId": "verify-query",
          "conceptId": "troubleshooting-method"
        }
      ]
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "Postgres is rejecting new clients with 'too many clients already' — sessions are being refused at admission while older ones keep working.",
        evaluation: {
          grade: "optimal",
          rationale:
            "'No connections available' could be app pool, network, or server — the FATAL names the server's own admission ceiling as the rejecting layer.",
          evidenceGain: "Server rejecting at capacity — not auth, not transport refusal.",
        },
        matchHints: ["journalctl", "journalctl -u postgresql", "read the database logs"],
        component: "app",
        isDiagnostic: true,
      },
      {
        id: "check-port",
        label: "Check listening port 5432 (ss -tuln)",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { portListening: true, portChecked: true } },
        feedback: "5432 LISTEN 0.0.0.0 — the door is open; clients are turned away at admission.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener proves the rejection happens after the handshake — capacity is the question, not reachability.",
          evidenceGain: "Listener healthy — transport ruled out.",
        },
        matchHints: ["ss -lntp", "ss -tuln", "ss -lnt", "netstat -tuln"],
        component: "port",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "check-service",
        label: "systemctl status postgresql",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { credsChecked: true } },
        feedback: "postgresql active (running) — the unit is healthy under load.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A crashed or restarting unit would look identical to the app — confirming stable running state keeps the failure class at capacity.",
          evidenceGain: "Unit healthy — outage and crash-loop hypotheses ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "count-sessions",
        label: "Count client sessions on 5432",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { sessionsCounted: true, leakedFound: true } },
        feedback:
          "178 idle-in-transaction sessions from app01, all opened by deploy 7f3c at 08:57; only 6 sessions are running queries.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ceiling being reached is a symptom — naming which sessions hold the slots (idle, same deploy, same minute) turns 'raise the limit?' into a leak to fix.",
          evidenceGain: "Capacity consumed by leaked idle sessions from one deploy.",
        },
        matchHints: ["count sessions", "session list", "who holds the slots"],
        component: "pool",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "terminate-idle",
        label: "Terminate leaked idle sessions",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.leakedFound", value: true },
        patch: {
          db: { sessionsCleared: true, poolExhausted: false },
        },
        feedback: "178 idle-in-transaction sessions terminated; connections drop to 22/200.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence identified idle sessions from one deploy holding the ceiling — terminating exactly those frees capacity without dropping the six live queries.",
          evidenceGain: "Slots reclaimed — 22/200 in use.",
        },
        matchHints: ["terminate idle sessions", "kill the leaked sessions"],
        component: "pool",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run application connectivity check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.sessionsCleared", value: true },
        patch: { db: { verified: true } },
        feedback: "SELECT 1 succeeds under load; order API timeouts cleared.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The failure was load-shaped — verifying through the application's own path under the same conditions is the only proof the ceiling holds.",
          evidenceGain: "Connections available under load; timeouts cleared.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "restart-db-wrong",
        label: "Restart the database",
        kind: "ui",
        tool: "services",
        evaluation: {
          grade: "wrong",
          rationale:
            "The unit is healthy and the port accepts — restarting drops every good session while the deploy's leak refills the slots within minutes.",
        },
        feedback: "A restart delays the same peak-time rejection — the slots are held, not broken.",
        component: "service",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.sessionsCleared", value: true },
      { type: "stateEquals", path: "db.poolExhausted", value: false },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-db-wrong"],
        },
        feedback:
          "Restarting resets the symptom while the deploy's leak refills every slot — identify who holds them first.",
      },
    ],
    hints: [
      { level: 1, text: "Read what the server itself logs when the API reports no connections." },
      { level: 2, text: "The listener answers and the unit runs — so what is consuming the ceiling?" },
      {
        level: 3,
        text: "178 idle sessions from one deploy minute means slots are held, not broken — free exactly those, then prove it under load.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Deploy 7f3c changed pooler settings at 08:57 and leaked idle-in-transaction sessions that never close, filling PostgreSQL's 200-slot ceiling by peak hours.",
      whyItWorked:
        "Proving listener and unit health kept the failure class at capacity; counting sessions attributed the slots to the leak; terminating exactly those freed the ceiling without touching live queries. Transferable principle: a capacity ceiling that fails at peak is a consumption question — find who holds the slots before raising any limit.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Logs show the FATAL admission rejection; checks prove port and unit healthy.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Outage, transport and auth hypotheses dropped — the server answers and authorizes, then refuses at admission.",
        },
        { step: "Apply fix", whatLearnerDid: "Terminated the 178 leaked idle sessions only." },
        { step: "Verify", whatLearnerDid: "Application check passed under peak-equivalent load." },
      ],
      followUps: [
        "Pin the pooler settings from deploy 7f3c and alert on idle-in-transaction counts above 50.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [
      {
        title: "PostgreSQL — Database Role and Client Connections",
        url: "https://www.postgresql.org/docs/current/connect-utility.html",
        note: "Link only.",
      },
    ],
  },
  ...printerScenarios,
  ...routerScenarios,
  ...switchScenarios,
  ...accessPointScenarios,
  ...upsScenarios,
  ...patchScenarios,
  ...windowsScenarios,
  ...linuxScenarios,
  ...sysadminScenarios,
  ...databaseScenarios,
  ...securityScenarios,
  ...supportScenarios,
];
