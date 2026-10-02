import type { ScenarioInput } from "@/content/schema";

/**
 * Printer family scenarios (Phase 11.1–11.5). Worlds seed every derived key
 * exactly as `deriveWorld` computes it; reveal flags stay absent until a
 * check action patches them.
 */
export const printerScenarios: ScenarioInput[] = [
  {
    id: "printer-queue-paused",
    version: 1,
    title: "Printer accepts jobs but nothing prints",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Read the device panel status before touching cabling or software",
      "Separate a held queue from a broken network path",
    ],
    prerequisites: [],
    skills: ["printer", "print-queue", "troubleshooting-method"],
    ticket: {
      id: "HD-1028",
      user: "Priya Raman",
      role: "Office administrator",
      symptomPlainLanguage:
        "Jobs leave my laptop and sit in the printer queue forever. The printer itself looks fine — lights on, no errors.",
      priority: "medium",
      channel: "portal",
      additionalContext: "It printed a shipping label this morning.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "printer",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["printer", "printer-network", "printer-paper"],
      showInspector: true,
      focusTarget: { componentId: "printer", cameraPreset: "printer-controls" },
      initialWorld: {
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
          spoolerRunning: true,
          queuePaused: true,
          jamPresent: false,
          powerOk: true,
          netLink: true,
          printReady: false,
        },
      },
    },
    conceptsOnStart: [
      "The print queue holds jobs until it is released — a paused queue looks exactly like a broken printer to the person waiting.",
    ],
    hypotheses: [
      { id: "h-queue", label: "Queue paused or jobs held", initiallyPlausible: true },
      { id: "h-network", label: "Printer lost its network connection", initiallyPlausible: true },
      { id: "h-paper", label: "Paper or toner fault", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work from the printer's own reporting outward — panel, link, then queue — before changing any setting.",
      "steps": [
        {
          "id": "guide-panel-status",
          "title": "Read the panel status first",
          "explanation": "Look at the control panel display and note the ready lamp and any alarm code.",
          "why": "Reading the device's own status first costs nothing and stops hardware alarms being confused with a path problem.",
          "expectedObservation": "The ready lamp sits amber with no alarm code on the display.",
          "target": {
            "componentId": "printer-panel",
            "label": "Printer status panel",
            "cameraPreset": "printer-controls"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method",
          "fallback": "the status panel on the printer body"
        },
        {
          "id": "guide-cable-link",
          "title": "Check the cable and link LED",
          "explanation": "Inspect the RJ-45 at the printer's network port and read the LED beside it.",
          "why": "A paused queue and a dead link look identical from the laptop; the link LED, the light a port shows once a connection negotiates, proves the path.",
          "expectedObservation": "The RJ-45 sits fully seated with the link LED solid green at printer and switch.",
          "target": { "componentId": "printer-network", "label": "Printer network port", "cameraPreset": "printer-network" },
          "actionId": "check-cables"
        },
        {
          "id": "guide-queue-state",
          "title": "Read the queue status",
          "explanation": "Open the queue item on the panel menu and read what it says about the waiting jobs.",
          "why": "The queue is the last unverified link between laptop and printer; the spooler, the software that feeds jobs to the device, either releases or holds them.",
          "expectedObservation": "The queue status reads PAUSED with the spooler running and three jobs held.",
          "target": {
            "componentId": "printer-panel",
            "label": "Printer status panel",
            "cameraPreset": "printer-controls"
          },
          "actionId": "check-queue",
          "fallback": "the status panel on the printer body"
        },
        {
          "id": "guide-resume-queue",
          "title": "Release the paused queue",
          "explanation": "Choose resume on the panel menu to release the held jobs.",
          "why": "With the link proven and the pause observed, releasing the queue is the smallest change that matches your evidence.",
          "expectedObservation": "The three held jobs print and the queue accepts new work.",
          "target": { "componentId": "printer-panel", "label": "Printer status panel" },
          "actionId": "resume-queue",
          "fallback": "the status panel on the printer body"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check printer panel and power",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Read the control-panel state before assuming a fault.",
        feedback: "Panel is lit, ready lamp amber, no hardware alarm codes shown.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Reading the device's own status first separates hardware alarms from queue problems at zero cost.",
          evidenceGain: "Power and panel healthy — no hardware alarm rules out power and cover faults.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "power", "lights", "display"],
      },
      {
        id: "check-cables",
        label: "Inspect network cable and link LED",
        kind: "inspect",
        tool: "inspection",
        component: "printer-network",
        inspectTarget: "printer-network",
        description: "Confirm the printer is still on the network.",
        feedback: "RJ-45 fully seated, link LED solid green at the printer and the switch.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A paused queue and a dead link look identical from the laptop; proving the link up rules out the network path.",
          evidenceGain: "Link LED solid at both ends — cabling and switch port ruled out.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["cable", "link", "network", "rj45", "ethernet"],
      },
      {
        id: "check-queue",
        label: "Open queue status on the panel",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Read the job queue state from the device menu.",
        patch: { printer: { queueChecked: true } },
        feedback: "Queue status: PAUSED. Spooler running, three jobs held.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The queue state is the last unverified link between a working laptop and a working printer.",
          evidenceGain: "Queue paused with jobs held — connectivity ruled out, fault isolated to queue state.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["queue", "jobs", "held", "status", "menu"],
      },
      {
        id: "resume-queue",
        label: "Release the paused queue",
        kind: "ui",
        tool: "device-panel",
        component: "printer",
        description: "Resume printing from the device panel.",
        appliesWhen: {
          type: "stateEquals",
          path: "printer.queueChecked",
          value: true,
        },
        patch: { printer: { queuePaused: false } },
        feedback: "Queue resumed — the three held jobs printed immediately.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the link proven and the pause observed, releasing the queue is the exact match for the evidence.",
          evidenceGain: "Held jobs released and printed; queue flowing again.",
        },
        matchHints: ["resume", "release", "continue jobs", "unpause"],
      },
      {
        id: "restart-printer-wrong",
        label: "Power-cycle the printer and resend the jobs",
        kind: "ui",
        tool: "device-panel",
        component: "printer",
        description: "Reboot the device without checking why jobs are held.",
        patch: { printer: {} },
        feedback:
          "Reboot cleared the panel message, but the queue comes back paused on the next job.",
        evaluation: {
          grade: "premature",
          rationale:
            "Rebooting without reading the queue state hides the pause instead of addressing it, and the jobs return held.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "power cycle", "restart printer", "turn off and on"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "printer.queuePaused", value: false },
      { type: "stateEquals", path: "printer.netLink", value: true },
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-printer-wrong"],
        },
        feedback:
          "A reboot without evidence treats the symptom — the queue pause returns on the next job.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The panel is already telling you something — read it before you touch a cable.",
        category: "method",
      },
      {
        level: 2,
        text: "Link LED green and no alarm codes: connectivity and hardware are probably not the problem.",
        category: "concept",
      },
      {
        level: 3,
        text: "Look at the queue entry itself — something is holding the jobs back on the device.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The print queue was paused on the device; the laptop, cable, and switch port were all healthy.",
      whyItWorked:
        "Evidence came in the right order: panel first (no hardware alarm), link second (path good), queue last (pause found). Rebooting first would have looked like progress and changed nothing. Transferable principle: read the device's own status before rebuilding the path around it.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Jobs reach the printer but none print; panel shows no alarm." },
        { step: "Gather evidence", whatLearnerDid: "Panel status, link LED, and queue menu read in order." },
        { step: "Rule out", whatLearnerDid: "Power, cabling, and switch port ruled out by LED and panel evidence." },
        { step: "Apply fix", whatLearnerDid: "Released the paused queue from the panel." },
        { step: "Verify", whatLearnerDid: "Held jobs printed; queue accepted new work." },
      ],
      followUps: [
        "Try printer-network-unreachable, where the link LED is dark and the panel is happy.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "printer-paper-jam",
    version: 1,
    title: "Printer stops mid-job with a jam alarm",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Follow a panel alarm to the physical fault instead of clearing it blindly",
      "Verify the paper path is fully closed before resuming",
    ],
    prerequisites: ["printer-queue-paused"],
    skills: ["printer", "paper-path", "troubleshooting-method"],
    ticket: {
      id: "HD-1029",
      user: "Tom Okafor",
      role: "Facilities coordinator",
      symptomPlainLanguage:
        "The printer stopped halfway through a stack and started flashing. It won't accept new jobs.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Someone was refilling paper just before it happened.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "printer",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["printer", "printer-paper", "printer-cartridge"],
      showInspector: true,
      focusTarget: { componentId: "printer-paper", cameraPreset: "printer-paper" },
      initialWorld: {
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
          spoolerRunning: true,
          queuePaused: false,
          jamPresent: true,
          powerOk: true,
          netLink: true,
          printReady: false,
        },
      },
    },
    hypotheses: [
      { id: "h-jam", label: "Paper jam in the feed path", initiallyPlausible: true },
      { id: "h-cover", label: "Cover left open during refill", initiallyPlausible: true },
      { id: "h-toner", label: "Cartridge problem", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro: "Follow the panel alarm to the physical fault, then clear only what the evidence points at.",
      steps: [
        {
          id: "guide-jam-alarm",
          title: "Read the panel alarm",
          explanation:
            "Look at the printer's status panel and note the code it is showing before you open anything.",
          why: "The panel names the zone the device thinks has failed; starting there avoids hunting through unrelated areas.",
          expectedObservation: "Which error code is displayed and which area of the printer it refers to.",
          target: {
            componentId: "printer-panel",
            label: "Printer status panel",
            cameraPreset: "printer-controls",
          },
          actionId: "check-panel",
          fallback: "the status panel on the top-right of the printer body",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-cover",
          title: "Check the toner cover",
          explanation: "Confirm the cover opened during the refill is fully latched.",
          why: "A rushed refill often leaves the cover slightly ajar; ruling that out first keeps the search honest.",
          expectedObservation: "Whether both cover latches click shut and the interlock sits flush.",
          target: { componentId: "printer-cartridge", label: "Toner cover (cartridge door)" },
          actionId: "check-door",
        },
        {
          id: "guide-feed",
          title: "Inspect the paper feed path",
          explanation: "Open the front area and look into the feed rollers where fresh sheets enter.",
          why: "Someone refilled paper just before the stop, so the fresh sheets' entry point is the likeliest place for an obstruction.",
          expectedObservation: "Whether a sheet is caught at the rollers or wedged under the guide.",
          target: {
            componentId: "printer-paper",
            label: "Paper tray and feed path",
            cameraPreset: "printer-paper",
          },
          actionId: "check-paper-path",
        },
        {
          id: "guide-clear",
          title: "Remove the obstruction and reseat the tray",
          explanation: "Pull the caught sheet out in one piece and push the tray back until it sits flush.",
          why: "Clearing only after the sheet is visible removes the actual obstruction instead of masking the alarm.",
          expectedObservation: "The jam alarm clearing and the panel returning to a ready state.",
          target: { componentId: "printer-paper", label: "Jammed sheet in the feed path" },
          actionId: "clear-jam",
        },
      ],
    },
    actions: [
      {
        id: "check-panel",
        label: "Read the jam alarm on the panel",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Locate the jam indicator before opening anything.",
        patch: { printer: { alarmChecked: true } },
        feedback: "Alarm E-01: paper jam at the tray-1 feed. Output path is clear.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The panel names the jam zone — following the alarm avoids hunting through unrelated areas.",
          evidenceGain: "Jam located at tray-1 feed; output path ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["alarm", "error code", "panel", "flashing"],
      },
      {
        id: "check-door",
        label: "Check that the toner cover is fully closed",
        kind: "inspect",
        tool: "inspection",
        component: "printer-cartridge",
        inspectTarget: "printer-cartridge",
        description: "Confirm the interlock is seated after the refill.",
        feedback: "Cover latches both sides — interlock closed, not the cause.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "A refill often leaves the cover slightly ajar; checking the interlock rules that out quickly.",
          evidenceGain: "Cover interlock closed — cover fault ruled out.",
        },
        matchHints: ["cover", "door", "latch", "interlock"],
      },
      {
        id: "check-paper-path",
        label: "Open the front area and inspect the feed path",
        kind: "inspect",
        tool: "inspection",
        component: "printer-paper",
        inspectTarget: "printer-paper",
        description: "Look for the sheet stuck at the feed rollers.",
        patch: { printer: { pathInspected: true } },
        feedback: "A folded sheet is wedged at the tray-1 rollers, caught under the guide.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Inspecting the exact zone the alarm named finds the physical fault without disturbing other parts.",
          evidenceGain: "Crumpled sheet located at the feed rollers — jam cause confirmed.",
        },
        matchHints: ["feed", "rollers", "path", "stuck paper", "tray"],
      },
      {
        id: "clear-jam",
        label: "Remove the jammed sheet and reseat the tray",
        kind: "ui",
        tool: "inspection",
        component: "printer-paper",
        description: "Clear the obstruction and restore the paper path.",
        appliesWhen: {
          type: "stateEquals",
          path: "printer.pathInspected",
          value: true,
        },
        patch: { printer: { jamPresent: false } },
        feedback: "Sheet removed in one piece, tray reseated, alarm cleared.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The sheet seen in the feed path is the jam; removing it after locating it is the exact fix.",
          evidenceGain: "Jam cleared; panel returned to ready state.",
        },
        matchHints: ["remove sheet", "clear jam", "pull paper", "reseat tray"],
      },
      {
        id: "replace-cartridge-wrong",
        label: "Replace the toner cartridge to clear the alarm",
        kind: "ui",
        tool: "inspection",
        component: "printer-cartridge",
        description: "Swap consumables without locating the jam.",
        patch: { printer: {} },
        feedback:
          "A new cartridge does not move the jammed sheet — the alarm stays until the path is clear.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "The alarm names a paper-path jam; replacing a healthy consumable wastes stock and clears nothing.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace toner", "new cartridge", "swap cartridge"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "printer.jamPresent", value: false },
      { type: "stateEquals", path: "printer.doorClosed", value: true },
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-cartridge-wrong"],
        },
        feedback:
          "The consumable was healthy — the fault is a sheet in the feed path, and the alarm proves it.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The flashing panel is pointing at a specific zone — start there.",
        category: "method",
      },
      {
        level: 2,
        text: "Someone refilled paper just before this: look where fresh sheets enter the path.",
        category: "concept",
      },
      {
        level: 3,
        text: "Find the obstruction before clearing it, then confirm the tray sits flush again.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "A folded sheet wedged at the tray-1 feed rollers after a rushed refill, tripping the jam sensor.",
      whyItWorked:
        "Reading the alarm located the zone, the inspection found the sheet, and the clear happened only after the cause was visible — no consumables were wasted. Transferable principle: alarms are evidence, not noise — follow the code to the physical spot before touching parts.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Mid-job stop with flashing alarm after a paper refill." },
        { step: "Gather evidence", whatLearnerDid: "Panel code, cover interlock, and feed-path inspection." },
        { step: "Rule out", whatLearnerDid: "Cover fault and cartridge fault ruled out by direct checks." },
        { step: "Apply fix", whatLearnerDid: "Removed the wedged sheet and reseated the tray." },
        { step: "Verify", whatLearnerDid: "Alarm cleared; device returned to ready and accepted jobs." },
      ],
      followUps: [
        "Compare with printer-low-toner, where the panel reports a consumable instead of a path fault.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "printer-network-unreachable",
    version: 1,
    title: "Printer is online but unreachable from the floor",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Work the path from the printer's link LED toward the closet",
      "Rule out desk cabling before suspecting switch configuration",
    ],
    prerequisites: ["printer-queue-paused"],
    skills: ["printer", "network-path", "troubleshooting-method"],
    ticket: {
      id: "HD-1030",
      user: "Elena Vasquez",
      role: "HR specialist",
      symptomPlainLanguage:
        "Everyone on 3rd floor lost the printer this morning. It has power and the screen works, but no one can reach it.",
      priority: "high",
      channel: "phone",
      additionalContext: "IT pushed switch maintenance last night.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "printer",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["printer", "printer-network"],
      showInspector: true,
      focusTarget: { componentId: "printer-network", cameraPreset: "printer-network" },
      initialWorld: {
        printer: {
          powerOn: true,
          powerCableSeated: true,
          netCableSeated: true,
          netPortOk: false,
          netEnabled: true,
          addressOk: true,
          paperOk: true,
          tonerOk: true,
          doorClosed: true,
          spoolerRunning: true,
          queuePaused: false,
          jamPresent: false,
          powerOk: true,
          netLink: false,
          printReady: false,
        },
      },
    },
    hypotheses: [
      { id: "h-cable", label: "Desk cable unplugged", initiallyPlausible: true },
      { id: "h-port", label: "Switch port problem after maintenance", initiallyPlausible: true },
      { id: "h-address", label: "Printer IP conflict", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Walk the shared path outward — device, desk cable, wall drop, closet — and record what each hop shows.",
      "steps": [
        {
          "id": "guide-device-status",
          "title": "Check the panel before cabling",
          "explanation": "Read the printer's status panel for alarms before you touch any cable.",
          "why": "A floor-wide outage still starts at the device; a calm, alarm-free panel moves the search onto the path everyone shares.",
          "expectedObservation": "The panel shows ready with no alarm code displayed.",
          "target": {
            "componentId": "printer-panel",
            "label": "Printer status panel",
            "cameraPreset": "printer-controls"
          },
          "actionId": "check-panel",
          "conceptId": "troubleshooting-method",
          "fallback": "the status panel on the printer body"
        },
        {
          "id": "guide-desk-rj45",
          "title": "Inspect the desk-end RJ-45",
          "explanation": "Reseat the cable at the printer's network port and read the LED beside it.",
          "why": "The link LED, the light a port shows once a connection negotiates, tells you whether the desk end is live.",
          "expectedObservation": "The cable clicks into the jack while the printer's link LED stays dark.",
          "target": { "componentId": "printer-network", "label": "Printer network port", "cameraPreset": "printer-network" },
          "actionId": "check-cable"
        },
        {
          "id": "guide-wall-drop",
          "title": "Follow the drop toward the closet",
          "explanation": "Inspect the wall jack's link light, then read the switch port state for that drop in the closet.",
          "why": "Moving one hop toward the closet turns a desk symptom into a named port state; admin-down means an administrator has switched the port off.",
          "expectedObservation": "The wall jack LED is off and closet switch port 4 reads amber, admin-down.",
          "target": { "componentId": "printer-network", "label": "Printer network port (path to the wall jack)" },
          "actionId": "check-wall-drop"
        },
        {
          "id": "guide-enable-port",
          "title": "Enable the serving switch port",
          "explanation": "Turn the switch port for this drop back on so it can carry a link.",
          "why": "With the cable proven seated at both ends, the port's own state is the last input this path is missing.",
          "expectedObservation": "Link LEDs light at both ends and the port reports up.",
          "target": { "componentId": "printer-network", "label": "Printer network port (link LED)" },
          "actionId": "enable-port"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Check printer panel status",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Confirm the device itself is healthy.",
        feedback: "Panel ready, no alarms, jobs can be queued locally — the device is up.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Proving the printer is powered and alarm-free narrows the fault to the path before anything is moved.",
          evidenceGain: "Device healthy — power and internal faults ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "status", "power", "screen"],
      },
      {
        id: "check-cable",
        label: "Inspect the RJ-45 at the printer",
        kind: "inspect",
        tool: "inspection",
        component: "printer-network",
        inspectTarget: "printer-network",
        description: "Seating check at the desk end.",
        feedback: "Cable clicks at the jack, but the printer's link LED is dark.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Seating the desk end first distinguishes a loose lead from an upstream port problem.",
          evidenceGain: "Desk cable seated but LED dark — fault is upstream of the wall jack.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["cable", "rj45", "jack", "plug", "link led"],
      },
      {
        id: "check-wall-drop",
        label: "Inspect the wall drop and its link light",
        kind: "inspect",
        tool: "inspection",
        component: "printer-network",
        inspectTarget: "printer-network",
        description: "Check whether the wall jack shows a link toward the closet.",
        patch: { printer: { neighborChecked: true } },
        feedback:
          "Wall jack LED is off; the patch side in the closet shows port 4 in amber admin-down state after last night's maintenance.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Moving one hop toward the closet turns a desk symptom into a named upstream state.",
          evidenceGain: "Switch port 4 admin-down — desk cabling ruled out, fault located at the port.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["wall", "jack", "closet", "switch port", "amber"],
      },
      {
        id: "enable-port",
        label: "Enable the switch port for the printer drop",
        kind: "ui",
        tool: "inspection",
        component: "printer-network",
        description: "Bring the admin-down port back into service.",
        appliesWhen: {
          type: "stateEquals",
          path: "printer.neighborChecked",
          value: true,
        },
        patch: { printer: { netPortOk: true } },
        feedback: "Port 4 enabled — link LED lights on both ends, printer reachable again.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The maintenance left the port admin-down; re-enabling the exact named port is the matched fix.",
          evidenceGain: "Link restored end to end; printer reachable from the floor.",
        },
        matchHints: ["enable port", "no shutdown", "port 4", "admin up"],
      },
      {
        id: "reinstall-printer-wrong",
        label: "Reinstall the printer driver on one laptop",
        kind: "ui",
        tool: "device-panel",
        component: "printer",
        description: "Treat a floor-wide outage as a client software issue.",
        patch: { printer: {} },
        feedback:
          "The driver reinstall on one machine changes nothing — every desk is still dark.",
        evaluation: {
          grade: "wrong",
          rationale:
            "A fault affecting the whole floor is a path problem, not a single client's driver.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reinstall driver", "add printer again", "driver"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "printer.netLink", value: true },
      { type: "stateEquals", path: "printer.netPortOk", value: true },
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reinstall-printer-wrong"],
        },
        feedback:
          "Every desk lost the printer at once — a single laptop's software cannot explain a floor-wide outage.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The panel works and no alarm is showing — the device is alive; look at the path.",
        category: "method",
      },
      {
        level: 2,
        text: "Maintenance ran last night: what state should that wall drop's port be in?",
        category: "concept",
      },
      {
        level: 3,
        text: "Follow the link LED from the printer to the closet and find where it goes dark.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The switch port serving the printer's wall drop was left admin-down after last night's maintenance, so the link never came up.",
      whyItWorked:
        "Evidence walked outward — device healthy, desk cable seated, wall drop dark, closet port amber — until one state named the fault. Reinstalling drivers would never have reached the port. Transferable principle: for a shared outage, walk the shared path hop by hop instead of fixing one client.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Whole floor lost the printer; device panel still healthy." },
        { step: "Gather evidence", whatLearnerDid: "Panel, desk RJ-45, wall drop LED, closet port state." },
        { step: "Rule out", whatLearnerDid: "Device faults and desk cabling ruled out before touching the closet." },
        { step: "Apply fix", whatLearnerDid: "Enabled the admin-down switch port." },
        { step: "Verify", whatLearnerDid: "Link LEDs lit both ends; printer reachable from the floor." },
      ],
      followUps: [
        "Try printer-ip-conflict, where the link is green yet the printer still cannot be reached.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "printer-low-toner",
    version: 1,
    title: "Printer reports output rejected for low toner",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Confirm a consumable fault from the gauge before replacing anything",
      "Distinguish a genuine empty cartridge from a counter fault",
    ],
    prerequisites: ["printer-queue-paused"],
    skills: ["printer", "consumables", "troubleshooting-method"],
    ticket: {
      id: "HD-1031",
      user: "Marco Silva",
      role: "Sales operations",
      symptomPlainLanguage:
        "Pages come out blank or faded and the printer says toner is out, but we replaced it recently.",
      priority: "low",
      channel: "email",
      additionalContext: "The replacement was a compatible cartridge.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "printer",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["printer", "printer-cartridge", "printer-paper"],
      showInspector: true,
      focusTarget: { componentId: "printer-cartridge", cameraPreset: "printer-controls" },
      initialWorld: {
        printer: {
          powerOn: true,
          powerCableSeated: true,
          netCableSeated: true,
          netPortOk: true,
          netEnabled: true,
          addressOk: true,
          paperOk: true,
          tonerOk: false,
          doorClosed: true,
          spoolerRunning: true,
          queuePaused: false,
          jamPresent: false,
          powerOk: true,
          netLink: true,
          printReady: false,
        },
      },
    },
    hypotheses: [
      { id: "h-toner", label: "Toner actually exhausted", initiallyPlausible: true },
      { id: "h-counter", label: "Cartridge counter not reset", initiallyPlausible: true },
      { id: "h-path", label: "Paper path or imaging fault", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Match what comes out against what the panel claims, then confirm the consumable physically before replacing it.",
      "steps": [
        {
          "id": "guide-output-vs-message",
          "title": "Compare output with the message",
          "explanation": "Print a test page and read the panel message shown beside it.",
          "why": "Comparing physical output with the device's own claim tells you whether the two agree before anything is swapped.",
          "expectedObservation": "The panel reads 'Toner low' and the test page fades evenly across the whole sheet.",
          "target": {
            "componentId": "printer-panel",
            "label": "Printer status panel",
            "cameraPreset": "printer-controls"
          },
          "actionId": "check-output",
          "conceptId": "troubleshooting-method",
          "fallback": "the status panel on the printer body"
        },
        {
          "id": "guide-cartridge-gauge",
          "title": "Read the cartridge gauge",
          "explanation": "Open the toner door and read the gauge window on the installed cartridge.",
          "why": "The gauge is ground truth for the consumable — the part you replace as it wears out — and it reads the level without trusting a warning light.",
          "expectedObservation": "The cartridge sits fully seated and its gauge window shows empty.",
          "target": {
            "componentId": "printer-cartridge",
            "label": "Toner cartridge gauge window",
            "cameraPreset": "printer-full"
          },
          "actionId": "check-cartridge"
        },
        {
          "id": "guide-fit-fresh-toner",
          "title": "Install a fresh toner cartridge",
          "explanation": "Fit a new cartridge and push the drawer home until it latches.",
          "why": "An empty gauge behind a correctly seated cartridge is direct evidence, so fitting a fresh unit is the smallest change that answers it.",
          "expectedObservation": "A density test page prints solid black and the toner warning clears.",
          "target": { "componentId": "printer-cartridge", "label": "Toner cartridge" },
          "actionId": "replace-toner"
        }
      ]
    },
    actions: [
      {
        id: "check-output",
        label: "Inspect a printed page and the panel message",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Compare the physical output with what the panel claims.",
        feedback: "Panel shows 'Toner low'; the test page is faint overall, not blank sections.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Matching physical output to the panel message distinguishes imaging faults from a depleted consumable.",
          evidenceGain: "Uniform fading matches the panel's toner warning — imaging path ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["output", "page", "faded", "message", "test page"],
      },
      {
        id: "check-cartridge",
        label: "Check the cartridge gauge and seating",
        kind: "inspect",
        tool: "inspection",
        component: "printer-cartridge",
        inspectTarget: "printer-cartridge",
        description: "Read the physical gauge on the installed cartridge.",
        patch: { printer: { tonerChecked: true } },
        feedback: "Cartridge is seated correctly; the gauge window is empty — toner is spent.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The gauge is the ground truth for a consumable — reading it rules out a seating fault before any swap.",
          evidenceGain: "Gauge empty with the cartridge fully seated — depletion confirmed.",
        },
        matchHints: ["gauge", "cartridge", "seating", "window", "toner level"],
      },
      {
        id: "replace-toner",
        label: "Install a fresh toner cartridge",
        kind: "ui",
        tool: "inspection",
        component: "printer-cartridge",
        description: "Replace the depleted consumable.",
        appliesWhen: {
          type: "stateEquals",
          path: "printer.tonerChecked",
          value: true,
        },
        patch: { printer: { tonerOk: true } },
        feedback: "Fresh cartridge installed; density test page prints full black.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "An empty gauge with correct seating is direct evidence for replacement — the fix matches the finding.",
          evidenceGain: "Toner level restored; density page confirms imaging quality.",
        },
        matchHints: ["replace toner", "new cartridge", "install cartridge"],
      },
      {
        id: "reset-counter-wrong",
        label: "Reset the toner counter without replacing",
        kind: "ui",
        tool: "device-panel",
        component: "printer",
        description: "Clear the warning in software only.",
        patch: { printer: {} },
        feedback:
          "The warning clears for a day, then returns — the cartridge really is empty and pages stay faint.",
        evaluation: {
          grade: "risky",
          rationale:
            "Resetting a counter that reflects a physically empty gauge masks a real depletion and keeps output bad.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reset counter", "clear warning", "bypass toner"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "printer.tonerOk", value: true },
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reset-counter-wrong"],
        },
        feedback:
          "A counter reset cannot add toner — the gauge already showed the cartridge is spent.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Compare what the panel says with what the paper actually shows.",
        category: "method",
      },
      {
        level: 2,
        text: "Before swapping anything, the cartridge has a physical indicator you can read directly.",
        category: "concept",
      },
      {
        level: 3,
        text: "Confirm depletion from the gauge, then fit a fresh unit to restore density.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The installed cartridge was genuinely spent — the gauge window was empty behind a correct seating.",
      whyItWorked:
        "Output pattern plus panel message raised the hypothesis, and the physical gauge confirmed it before stock was used. Resetting the counter would have hidden a real depletion. Transferable principle: for consumables, trust the physical indicator over the software warning.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Faint output with a toner warning after a recent replacement." },
        { step: "Gather evidence", whatLearnerDid: "Compared printed output, panel message, and cartridge gauge." },
        { step: "Rule out", whatLearnerDid: "Imaging path and seating ruled out by uniform fading and secure fit." },
        { step: "Apply fix", whatLearnerDid: "Installed a fresh cartridge." },
        { step: "Verify", whatLearnerDid: "Density page printed full black; warning cleared." },
      ],
      followUps: [
        "Try printer-paper-jam, where the panel alarm points at the paper path instead of a consumable.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "printer-ip-conflict",
    version: 1,
    title: "Printer link is green but jobs never arrive",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate layer-1 link state from layer-3 addressing faults",
      "Confirm an address conflict with evidence before re-addressing the device",
    ],
    prerequisites: ["printer-queue-paused", "printer-network-unreachable"],
    skills: ["printer", "ip-addressing", "troubleshooting-method"],
    ticket: {
      id: "HD-1032",
      user: "Sofia Lindqvist",
      role: "Finance team lead",
      symptomPlainLanguage:
        "The printer shows connected with a green light, but print jobs vanish — nothing arrives and no error shows.",
      priority: "medium",
      channel: "portal",
      additionalContext: "A new label printer was installed on the same floor this week.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "printer",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["printer", "printer-network"],
      showInspector: true,
      focusTarget: { componentId: "printer-network", cameraPreset: "printer-network" },
      initialWorld: {
        printer: {
          powerOn: true,
          powerCableSeated: true,
          netCableSeated: true,
          netPortOk: true,
          netEnabled: true,
          addressOk: false,
          paperOk: true,
          tonerOk: true,
          doorClosed: true,
          spoolerRunning: true,
          queuePaused: false,
          jamPresent: false,
          powerOk: true,
          netLink: true,
          printReady: false,
        },
      },
    },
    hypotheses: [
      { id: "h-conflict", label: "IP address in use by another device", initiallyPlausible: true },
      { id: "h-queue", label: "Queue holds the jobs", initiallyPlausible: true },
      { id: "h-driver", label: "Wrong driver on the laptops", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Keep the layers apart — jobs at the device, then the link, then the address — before re-addressing anything.",
      "steps": [
        {
          "id": "guide-jobs-at-device",
          "title": "See where the jobs stop",
          "explanation": "Open the printer's queue on the status panel and check whether incoming jobs arrive.",
          "why": "Jobs reaching the queue — where the printer holds incoming work — prove the path to the device and move the search above the cable.",
          "expectedObservation": "Jobs appear in the printer's queue sitting at 'sending to device'.",
          "target": {
            "componentId": "printer-panel",
            "label": "Printer status panel",
            "cameraPreset": "printer-controls"
          },
          "actionId": "check-panel",
          "fallback": "the status panel on the printer body"
        },
        {
          "id": "guide-link-lights",
          "title": "Verify the link lights",
          "explanation": "Read the link LED at the printer and the matching LED on the switch port.",
          "why": "A solid link LED, the light a port shows once a connection negotiates, keeps the cable layer out of the investigation.",
          "expectedObservation": "Link LED solid green at both ends with the port negotiated at full speed.",
          "target": { "componentId": "printer-network", "label": "Printer network port", "cameraPreset": "printer-network" },
          "actionId": "check-link"
        },
        {
          "id": "guide-read-address",
          "title": "Read the printer's IP address",
          "explanation": "Open the IP settings on the network port and check the address against the rest of the LAN.",
          "why": "An address, the number that identifies this printer on the network, must be unique; an ARP scan, a query that names who owns each address, shows any duplicate.",
          "expectedObservation": "Static address 10.32.4.18, with an ARP scan showing the same address claimed by the label printer.",
          "target": { "componentId": "printer-network", "label": "Printer IP settings" },
          "actionId": "check-address",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-switch-to-dhcp",
          "title": "Switch the printer to DHCP",
          "explanation": "Change the addressing mode to automatic so the server issues an address from its free pool.",
          "why": "DHCP, the service that hands out free addresses, makes uniqueness automatic, so this is the smallest change matching your evidence.",
          "expectedObservation": "The printer renews and holds 10.32.4.77, and the scan reports no device claiming that address.",
          "target": { "componentId": "printer-network", "label": "Printer addressing settings" },
          "actionId": "set-dhcp"
        }
      ]
    },
    actions: [
      {
        id: "check-panel",
        label: "Check printer panel and queue",
        kind: "inspect",
        tool: "device-panel",
        component: "printer",
        inspectTarget: "printer",
        description: "Confirm jobs land in the printer's own queue.",
        feedback: "Jobs arrive in the printer queue and sit at 'sending to device' — link is fine.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Seeing jobs reach the device queue proves the path to the printer and narrows the fault to addressing.",
          evidenceGain: "Jobs present at the device — driver and cabling ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["panel", "queue", "jobs arrive", "status"],
      },
      {
        id: "check-link",
        label: "Verify link LED at printer and switch",
        kind: "inspect",
        tool: "inspection",
        component: "printer-network",
        inspectTarget: "printer-network",
        description: "Rule out the physical layer explicitly.",
        feedback: "Link LED solid green at both ends; link negotiated at full speed.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Stating the link is good prevents layer-1 work on a layer-3 symptom.",
          evidenceGain: "Physical layer ruled out — fault is above the link.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["link", "led", "cable", "speed"],
      },
      {
        id: "check-address",
        label: "Inspect the printer's IP configuration",
        kind: "inspect",
        tool: "device-panel",
        component: "printer-network",
        inspectTarget: "printer-network",
        description: "Read the address and scan for duplicates.",
        patch: { printer: { addressChecked: true } },
        feedback:
          "Static 10.32.4.18 — an ARP scan shows the same address claimed by the new label printer.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the link proven, checking the address against the LAN is the correct next evidence step.",
          evidenceGain: "Address duplicate confirmed — conflict isolated as the fault.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["ip", "address", "arp", "duplicate", "static"],
      },
      {
        id: "set-dhcp",
        label: "Switch the printer to DHCP addressing",
        kind: "ui",
        tool: "device-panel",
        component: "printer-network",
        description: "Let the server assign a unique lease.",
        appliesWhen: {
          type: "stateEquals",
          path: "printer.addressChecked",
          value: true,
        },
        patch: { printer: { addressOk: true } },
        feedback: "Printer renewed via DHCP and holds 10.32.4.77 — no duplicate on the LAN.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A confirmed duplicate is cured by unique addressing; DHCP guarantees a free lease from the pool.",
          evidenceGain: "Unique address assigned; conflict window closed.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["dhcp", "renew address", "automatic address", "release static"],
      },
      {
        id: "reboot-printer-wrong",
        label: "Reboot the printer to clear the conflict",
        kind: "ui",
        tool: "device-panel",
        component: "printer",
        description: "Power-cycle without changing the duplicated address.",
        patch: { printer: {} },
        feedback:
          "After reboot the printer claims 10.32.4.18 again — the duplicate is still on the network.",
        evaluation: {
          grade: "premature",
          rationale:
            "A reboot renews the same conflicting address; without evidence of where the duplicate lives, nothing changes.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["reboot", "power cycle", "restart", "renew dhcp"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "printer.addressOk", value: true },
      { type: "stateEquals", path: "printer.netLink", value: true },
      { type: "stateEquals", path: "printer.printReady", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-printer-wrong"],
        },
        feedback:
          "Rebooting renews the same duplicate address — the conflict needs unique addressing, not a restart.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Green link lights and jobs reaching the device point above the cable — what happens next in the path?",
        category: "method",
      },
      {
        level: 2,
        text: "A new device appeared on the floor this week — two machines cannot share one address.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the printer's configured address and check whether anything else on the LAN already claims it.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The printer's static address 10.32.4.18 was duplicated by the newly installed label printer, so replies never returned to the right device.",
      whyItWorked:
        "The sequence kept each layer separate: jobs at the device proved the path, the green LED proved the link, and the address scan named the duplicate. Transferable principle: a healthy link proves transport, not addressing — check the layer the symptom actually lives at.",
      methodologyMap: [
        { step: "Understand the problem", whatLearnerDid: "Jobs vanish with a green link and a quiet panel." },
        { step: "Gather evidence", whatLearnerDid: "Device queue, link LEDs, and IP/ARP inspection." },
        { step: "Rule out", whatLearnerDid: "Drivers, cabling, and physical link ruled out before addressing work." },
        { step: "Apply fix", whatLearnerDid: "Moved the printer to DHCP for a unique lease." },
        { step: "Verify", whatLearnerDid: "New address held with no duplicate; jobs printed." },
      ],
      followUps: [
        "Try printer-network-unreachable, where the link itself is dark instead of addressing.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics", "troubleshooting-method"],
    references: [],
  },
];
