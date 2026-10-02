import type { ScenarioInput } from "@/content/schema";

/**
 * Access point family scenarios. Worlds seed every derived key exactly as
 * `deriveEquipment` computes it; the `assocChecked` reveal flag stays absent
 * until a check action patches it, so configuration causes stay hidden behind
 * the family's evidence gate.
 */
export const accessPointScenarios: ScenarioInput[] = [
  {
    id: "ap-poe-port-disabled",
    version: 1,
    title: "Ceiling access point went dark after closet work",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Trace an unpowered access point from its face LEDs toward the serving switch port",
      "Separate a healthy Ethernet drop from a port that cannot deliver PoE power",
    ],
    prerequisites: [],
    skills: ["access-point", "poe-power", "troubleshooting-method"],
    ticket: {
      id: "HD-1044",
      user: "Lena Fischer",
      role: "Workplace experience lead",
      symptomPlainLanguage:
        "The ceiling access point above the collaboration area has gone completely dark — no lights at all. Nobody in that part of the floor has seen the office Wi-Fi since Wednesday.",
      priority: "high",
      channel: "portal",
      additionalContext: "Network team replaced a switch in the closet on Wednesday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "ap-poe", cameraPreset: "ap-drop" },
      initialWorld: {
        ap: {
          poeCableSeated: true,
          upstreamPoeCapable: false,
          radioEnabled: true,
          pskOk: true,
          channelClear: true,
          clientAssociated: false,
          clientIpOk: true,
          poePowered: false,
          radioUp: false,
          clientLink: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-drop",
        label: "Ethernet drop came loose during the closet work",
        initiallyPlausible: true,
      },
      {
        id: "h-poe",
        label: "Serving switch port is not delivering power",
        initiallyPlausible: true,
      },
      { id: "h-failed", label: "Access point hardware failed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Follow the one cable that carries this unit's power and data, and record what each end actually delivers.",
      "steps": [
        {
          "id": "guide-ap-face-dark",
          "title": "Read the unit's face LEDs",
          "explanation": "Look at the ceiling unit's face and check whether any status LED is lit.",
          "why": "A dark face sends the search along the supply path — PoE, power delivered over the Ethernet cable — rather than into radio settings.",
          "expectedObservation": "The face is completely dark with no power LED lit.",
          "target": { "componentId": "access-point", "label": "Access point status face", "cameraPreset": "ap-face" },
          "actionId": "check-ap-face"
        },
        {
          "id": "guide-scope-outage",
          "title": "Scope who else lost Wi-Fi",
          "explanation": "Check whether only this unit's clients dropped, or the neighbouring access points too.",
          "why": "Scope separates a single-port fault from a closet-wide failure before any configuration is touched — one dark unit is not the whole closet.",
          "expectedObservation": "Every laptop under this AP dropped at once while neighbouring access points keep normal LEDs and serve clients.",
          "target": { "componentId": "access-point", "label": "Access point and neighbouring units" },
          "actionId": "check-fault-scope"
        },
        {
          "id": "guide-trace-drop",
          "title": "Trace the drop to the closet",
          "explanation": "Follow the single cable from the ceiling unit to its patch panel port in the closet.",
          "why": "One cable carries both data and power, so a perfectly seated lead can still deliver nothing if the port will not supply it.",
          "expectedObservation": "The drop clicks at both ends while the serving switch port reports PoE administratively off.",
          "target": { "componentId": "ap-poe", "label": "PoE drop", "cameraPreset": "ap-drop" },
          "actionId": "check-drop",
          "conceptId": "poe-power-basics"
        },
        {
          "id": "guide-enable-poe",
          "title": "Enable PoE on the serving port",
          "explanation": "Turn power delivery on for the single switch port that feeds this drop.",
          "why": "With the cable proven good at both ends, restoring the missing input on exactly that port is the matched fix.",
          "expectedObservation": "The port negotiates power, the unit's power LED lights, and floor clients reconnect.",
          "target": { "componentId": "ap-poe", "label": "PoE switch port" },
          "actionId": "enable-poe-port"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "inspection",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Read the unit's own indicators before blaming the drop or the closet.",
        feedback:
          "Face fully dark — no power LED even though the drop was re-terminated Wednesday.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A dark face is direct evidence that the AP has no power, which points the search at the PoE path instead of radios or client settings.",
          evidenceGain:
            "No power LED — radio state, passphrase, and client settings ruled out while the unit stays unpowered.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "power led", "status lights", "dark"],
      },
      {
        id: "check-fault-scope",
        label: "Check which clients and neighbouring APs are affected",
        kind: "inspect",
        tool: "inspection",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Establish whether the whole closet is down or only this one unit.",
        feedback:
          "Every laptop under this AP dropped at once, while the neighbouring access points still show normal LEDs and serve their clients.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "Scoping the outage separates a single-port fault from a closet-wide switch or power failure before any configuration is touched.",
          evidenceGain:
            "Single-AP outage with healthy neighbours — client device faults and closet-wide switch failure ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["scope", "other clients", "neighbouring ap", "affected users"],
      },
      {
        id: "check-drop",
        label: "Trace the Ethernet drop from the AP to the closet patch panel",
        kind: "inspect",
        tool: "inspection",
        component: "ap-poe",
        inspectTarget: "ap-poe",
        description:
          "Follow the single cable that carries both data and power to its serving port.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "Drop clicks at the AP and at the closet patch panel — but the serving switch port reports PoE administratively off.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the unit proven dark and the neighbours healthy, tracing the drop is the step that turns a ceiling symptom into a named port state.",
          evidenceGain:
            "Drop seated at both ends with PoE off on the serving port — cabling ruled out, fault located at the port.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["ethernet drop", "patch cable", "patch panel", "closet", "rj45"],
      },
      {
        id: "enable-poe-port",
        label: "Enable PoE on the switch port feeding the AP",
        kind: "ui",
        tool: "device-panel",
        component: "ap-poe",
        inspectTarget: "ap-poe",
        description: "Turn on power delivery for the single port that serves this drop.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { upstreamPoeCapable: true, clientAssociated: true } },
        feedback: "Port negotiates 802.3at — AP boots, radio airs, the floor client re-associates.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence named an administratively disabled PoE port on a sound cable, so restoring power on exactly that port is the matched fix.",
          evidenceGain:
            "PoE delivered over the existing drop — AP powered, radio on air, client re-associated.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["enable poe", "turn on poe", "poe setting", "port power", "switch port"],
      },
      {
        id: "replace-ap-wrong",
        label: "Swap in a spare access point",
        kind: "ui",
        tool: "inspection",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Replace the ceiling unit on the assumption that the hardware failed.",
        patch: { ap: {} },
        feedback:
          "The spare mounts on the same port and stays dark — it never receives power either, and the original AP was never the fault.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "Hardware replacement is wasted work while the serving port still refuses to supply power; the new unit simply reproduces the black face.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace ap", "spare unit", "swap access point", "new hardware"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.poePowered", value: true },
      { type: "stateEquals", path: "ap.radioUp", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-ap-wrong"],
        },
        feedback:
          "A spare on the same unpowered port comes up dark as well — the ceiling box was never the failing part.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Wednesday's closet work touched this AP's path — start from what the ceiling unit is showing you.",
        category: "method",
      },
      {
        level: 2,
        text: "The cable in the ceiling carries the AP's electricity as well as its data; a neatly crimped cable can still deliver no power.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the PoE state on the serving switch port in the closet, not just whether the patch cable is seated.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The replacement closet switch came up with PoE administratively disabled on the port that serves this drop, so the ceiling AP never received power over an otherwise healthy cable.",
      whyItWorked:
        "Evidence was layered rather than guessed: a dark face proved no power, healthy neighbouring APs proved the closet was not broadly down, and the drop trace named the port state. Swapping the AP would have reproduced the black face on the same port. Transferable principle: when a device is unpowered, work outward along its single supply path until some component names the missing input, and check the shared infrastructure around it before condemning the endpoint.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Ceiling AP dark and floor clients offline since the Wednesday switch swap.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "AP face LEDs, neighbouring access points, and the drop traced to its closet port.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Neighbouring APs healthy ruled out a closet-wide failure; both ends seated ruled out a bad drop; the AP hardware ruled out as the cause.",
        },
        { step: "Apply fix", whatLearnerDid: "Enabled PoE delivery on the serving switch port." },
        {
          step: "Verify",
          whatLearnerDid:
            "AP powered up, radio aired, and the floor client re-associated by itself.",
        },
      ],
      followUps: [
        "Try ap-drop-unplugged, where the cable itself hangs free at the ceiling.",
        "Compare with ap-radio-disabled, where the AP is powered but never airs.",
      ],
    },
    knowledgeLinks: ["poe-power-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "ap-drop-unplugged",
    version: 1,
    title: "Wireless dropped in meeting room B after ceiling cleaning",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Read power and radio indicators before touching configuration",
      "Follow a dark access point to the single cable that carries data and power",
    ],
    prerequisites: ["ap-poe-port-disabled"],
    skills: ["access-point", "network-cabling", "troubleshooting-method"],
    ticket: {
      id: "HD-1045",
      user: "Marcus Hall",
      role: "Executive assistant",
      symptomPlainLanguage:
        "Wi-Fi in meeting room B vanished last night. The little unit on the ceiling has no lights, and my phone drops to mobile data the moment I walk in.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Contractors were in the ceiling tiles yesterday evening.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "ap-poe", cameraPreset: "ap-drop" },
      initialWorld: {
        ap: {
          poeCableSeated: false,
          upstreamPoeCapable: true,
          radioEnabled: true,
          pskOk: true,
          channelClear: true,
          clientAssociated: false,
          clientIpOk: true,
          poePowered: false,
          radioUp: false,
          clientLink: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-pigtail",
        label: "AP pigtail knocked loose during ceiling work",
        initiallyPlausible: true,
      },
      { id: "h-closet", label: "Closet switch port stopped working", initiallyPlausible: true },
      { id: "h-failed", label: "Access point failed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the unit first, then prove both ends of the one cable that feeds it before touching any setting.",
      "steps": [
        {
          "id": "guide-ap-face",
          "title": "Read the ceiling unit's LEDs",
          "explanation": "Look at the ceiling unit's face and note whether any LED is lit.",
          "why": "Fixing the symptom as a power problem early stops the search drifting into radios, controllers, or client settings.",
          "expectedObservation": "The face is dark while the neighbouring access point below still shows normal lights.",
          "target": { "componentId": "access-point", "label": "Access point status face", "cameraPreset": "ap-face" },
          "actionId": "check-ap-face"
        },
        {
          "id": "guide-both-ends",
          "title": "Inspect both ends of the drop",
          "explanation": "Look at the pigtail at the ceiling and the port LED at the closet patch panel.",
          "why": "A single-cable device has exactly two physical ends — the pigtail, the short lead from the ceiling unit — so both together prove the whole path.",
          "expectedObservation": "The pigtail hangs free at the ceiling and the closet port LED is dark.",
          "target": { "componentId": "ap-poe", "label": "PoE drop pigtail", "cameraPreset": "ap-drop" },
          "actionId": "check-drop",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-reseat-pigtail",
          "title": "Reseat the drop at the pigtail",
          "explanation": "Push the ceiling connector home until the latch clicks, then watch the unit.",
          "why": "The inspection showed the cable hanging free, so closing that one connection restores power and data without changing any settings.",
          "expectedObservation": "The power LED lights, the radio comes up, and room laptops re-associate.",
          "target": { "componentId": "ap-poe", "label": "PoE drop connector" },
          "actionId": "reseat-ap-drop"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "inspection",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Read the indicators on the unit before opening anything else.",
        feedback:
          "Dark face; the tenant below reports their AP still works — power supply likely fine.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Reading the face first fixes the symptom as a power problem, which stops the search before it drifts into controller or client settings.",
          evidenceGain:
            "No lights on this unit while a neighbouring floor AP runs — building supply ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "power light", "status leds", "dark"],
      },
      {
        id: "check-drop",
        label: "Inspect the drop at the ceiling pigtail and the closet end",
        kind: "inspect",
        tool: "inspection",
        component: "ap-poe",
        inspectTarget: "ap-poe",
        description: "Look at both ends of the one cable that feeds the AP.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "Pigtail hangs free at the AP; closet switch port LED is dark because nothing is attached.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Both ends of a single-cable device are the whole physical path — inspecting them finds the break in one step.",
          evidenceGain:
            "Pigtail unplugged at the ceiling — switch port, patch panel, and closet cabling ruled out.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["pigtail", "ceiling drop", "patch cable", "unplugged", "cable"],
      },
      {
        id: "reseat-ap-drop",
        label: "Reseat the AP drop at the ceiling pigtail",
        kind: "ui",
        tool: "inspection",
        component: "ap-poe",
        inspectTarget: "ap-poe",
        description: "Push the connector home until the latch clicks.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { poeCableSeated: true, clientAssociated: true } },
        feedback: "Click — AP powers up, radio airs, laptops re-associate.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The inspection showed the cable hanging free; closing that one connection restores both power and data without touching any settings.",
          evidenceGain: "Drop seated — power returned and clients re-associated on the room AP.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["reseat", "plug in cable", "ceiling pigtail", "reconnect drop"],
      },
      {
        id: "factory-reset-ap-wrong",
        label: "Factory-reset the access point from its reset pinhole",
        kind: "ui",
        tool: "inspection",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Wipe the unit back to defaults in the hope it recovers.",
        patch: { ap: {} },
        feedback:
          "The reset wipes the adopted configuration and still leaves the cable unplugged — the AP comes back dark and now needs re-provisioning too.",
        evaluation: {
          grade: "risky",
          rationale:
            "Destroying a known-good configuration to fix an unpowered box adds work and loses evidence while the loose pigtail remains untouched.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["factory reset", "reset the ap", "wipe config", "defaults"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.poePowered", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["factory-reset-ap-wrong"],
        },
        feedback:
          "A reset cannot reconnect a cable — the pigtail was still hanging free, so the AP stays dark and loses its profile.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The ceiling tiles were opened last night — begin with the unit itself and what its face is telling you.",
        category: "method",
      },
      {
        level: 2,
        text: "One cable feeds this box both its data and its power, so pulling it makes the lights and the network disappear together.",
        category: "concept",
      },
      {
        level: 3,
        text: "Check the link LED at each end of the drop; a dark port light in the closet usually means nothing is attached to it.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The AP's Ethernet pigtail had been knocked loose at the ceiling during the evening cleaning, so neither power nor data reached the unit.",
      whyItWorked:
        "The dark face narrowed the search to power, the healthy neighbouring unit ruled out a supply problem, and the free-hanging pigtail beside a dark closet port identified the cable in a single trace. A factory reset would have erased the adopted profile and still left the cable disconnected. Transferable principle: with a single-cable device, prove both ends of that one cable before you touch configuration.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Meeting room lost Wi-Fi overnight; ceiling unit shows no lights.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "AP face read, then both ends of the drop inspected.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Neighbouring AP and building supply ruled out; closet port and patch panel ruled out by the free-hanging pigtail.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Reseated the pigtail at the ceiling until it clicked.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Power LED lit, radio aired, and room laptops re-associated.",
        },
      ],
      followUps: [
        "Try ap-poe-port-disabled, where the cable sits perfectly and the port refuses to power the AP.",
      ],
    },
    knowledgeLinks: ["poe-power-basics"],
    references: [],
  },
  {
    id: "ap-wrong-passphrase",
    version: 1,
    title: "One laptop cannot join the office Wi-Fi",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Use association logs to separate a client-side secret problem from a coverage problem",
      "Confirm a single-client fault before changing shared wireless infrastructure",
    ],
    prerequisites: ["ap-poe-port-disabled"],
    skills: ["access-point", "wireless-association", "troubleshooting-method"],
    ticket: {
      id: "HD-1046",
      user: "Sofia Marchetti",
      role: "Marketing intern",
      symptomPlainLanguage:
        "My laptop keeps trying to join the office Wi-Fi and then gives up with a cannot-connect message. My phone joins the same network fine from the same chair.",
      priority: "low",
      channel: "portal",
      additionalContext: "Her phone joins the same network fine.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "ap-radio", cameraPreset: "ap-face" },
      initialWorld: {
        ap: {
          poeCableSeated: true,
          upstreamPoeCapable: true,
          radioEnabled: true,
          pskOk: false,
          channelClear: true,
          clientAssociated: false,
          clientIpOk: true,
          poePowered: true,
          radioUp: true,
          clientLink: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-passphrase",
        label: "Saved passphrase on that laptop is stale",
        initiallyPlausible: true,
      },
      {
        id: "h-coverage",
        label: "Weak signal in her corner of the floor",
        initiallyPlausible: true,
      },
      { id: "h-acl", label: "Access control list blocking the device", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Confirm the shared radio is healthy, then find where the failing laptop stops during the join.",
      "steps": [
        {
          "id": "guide-ap-face-lights",
          "title": "Read the face LEDs",
          "explanation": "Check the access point's face for power, radio, and client indicators.",
          "why": "A healthy face with a dead client LED shows the radio still serves everyone else, moving the fault off shared hardware.",
          "expectedObservation": "Power and radio LEDs are green while the client LED stays dark for this laptop.",
          "target": { "componentId": "access-point", "label": "Access point status face", "cameraPreset": "ap-face" },
          "actionId": "check-ap-face",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-assoc-log",
          "title": "Read the association log",
          "explanation": "Open the radio's association log and see where this laptop stops joining.",
          "why": "Association, the handshake proving both ends know the same passphrase, should name the client and the stage where it stops.",
          "expectedObservation": "The log lists repeated 4-way handshake failures from laptop-3-14.",
          "target": { "componentId": "ap-radio", "label": "Radio association log", "cameraPreset": "ap-face" },
          "actionId": "check-assoc"
        },
        {
          "id": "guide-update-passphrase",
          "title": "Update the laptop's saved passphrase",
          "explanation": "Forget the network on that laptop, enter the current passphrase, and rejoin.",
          "why": "The log proved the mismatch sits on one laptop, so correcting that laptop's stored secret is the smallest change that answers it.",
          "expectedObservation": "Association completes and the laptop pulls an address.",
          "target": { "componentId": "ap-radio", "label": "Radio passphrase setting" },
          "actionId": "update-client-passphrase"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Confirm the AP itself is healthy before blaming it for one client.",
        feedback: "Power and radio LEDs green; client LED never lights for this laptop.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A healthy face with a dead client LED shows the radio is working for everyone else, which moves the fault off the shared hardware.",
          evidenceGain:
            "Power and radio healthy — AP hardware and coverage for other clients ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "radio led", "client light", "status"],
      },
      {
        id: "check-assoc",
        label: "Read the association log on the radio",
        kind: "inspect",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "See exactly where this laptop stops during the join process.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "AP log: repeated 4-way handshake failures from laptop-3-14 — passphrase mismatch, not a coverage issue.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The log names the client and the failing stage, converting a vague cannot-connect report into a specific cryptographic mismatch.",
          evidenceGain:
            "Handshake failures isolated to one client MAC — coverage and radio faults ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["association log", "handshake", "4-way", "client mac", "failures"],
      },
      {
        id: "update-client-passphrase",
        label: "Update the client's saved passphrase",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Replace the stale secret stored on the laptop and rejoin.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { pskOk: true, clientAssociated: true } },
        feedback: "Association completes and the client pulls an address.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The log proved the mismatch lives on one laptop, so correcting that laptop's stored secret is the smallest change that addresses the evidence.",
          evidenceGain: "Handshake completed — laptop associated and address acquired.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["update passphrase", "wifi password", "forget and rejoin", "saved password"],
      },
      {
        id: "disable-encryption-wrong",
        label: "Open the SSID with encryption disabled",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Remove the security requirement so any client can join.",
        patch: { ap: {} },
        feedback:
          "Her laptop connects, but so does anyone with a radio — one machine's trouble has become a network-wide security hole.",
        evaluation: {
          grade: "risky",
          rationale:
            "Trading an open network for a single client's stale secret puts every user's traffic at risk and still leaves the laptop misconfigured.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["disable encryption", "open network", "no password", "turn off security"],
      },
      {
        id: "reboot-ap-wrong",
        label: "Reboot the access point",
        kind: "ui",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Power-cycle the AP to clear the connection problem.",
        patch: { ap: {} },
        feedback:
          "The AP comes back with the same logs and the same laptop still fails — every other client re-associated in the meantime.",
        evaluation: {
          grade: "premature",
          rationale:
            "The association log is already conclusive and the fault sits on one client, so a reboot repeats the same failure without adding evidence.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "restart access point", "power cycle"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.pskOk", value: true },
      { type: "stateEquals", path: "ap.clientAssociated", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["disable-encryption-wrong"],
        },
        feedback:
          "Removing encryption connects her laptop by opening the network to everyone — a security hole traded for one bad passphrase.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Her phone joins from the same chair — a fault that follows one device rather than the room is a client problem.",
        category: "method",
      },
      {
        level: 2,
        text: "Joining wireless is a handshake: both ends must prove they know the same pre-shared secret before traffic flows.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the association log on the radio — it names the client and the exact stage where the handshake stops.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The laptop still stored last quarter's Wi-Fi passphrase, so its 4-way handshake with the AP failed while every other client associated normally.",
      whyItWorked:
        "Scope came first — one failing device against many healthy ones — then the association log named the client and the failing stage, so the change went to the laptop instead of the shared AP. Disabling encryption would have connected her machine by removing protection for everyone, and a reboot would simply replay the same failure. Transferable principle: when a single client fails against healthy infrastructure, correct that client's copy of the shared secret rather than weakening the infrastructure.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "One laptop cannot join while her phone and other clients connect normally.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "AP face LEDs read, then the radio's association log pulled for the failing client.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Healthy LEDs and other clients ruled out power, radio, and coverage; the handshake failures named a credential mismatch.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Updated the passphrase saved on the laptop and rejoined.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Laptop completed association and pulled a usable address.",
        },
      ],
      followUps: [
        "Try ap-channel-congestion, where association succeeds for everyone but throughput collapses.",
        "Try ap-client-addressing, where the laptop joins cleanly and still cannot reach the internet.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "ap-channel-congestion",
    version: 1,
    title: "Wi-Fi crawl speed after the neighbouring fit-out",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Distinguish an association problem from an airtime contention problem",
      "Read utilisation and retry counters before changing radio settings",
    ],
    prerequisites: ["ap-poe-port-disabled"],
    skills: ["access-point", "wireless-optimisation", "troubleshooting-method"],
    ticket: {
      id: "HD-1047",
      user: "Jonas Weber",
      role: "Video producer",
      symptomPlainLanguage:
        "Everything over Wi-Fi has been crawling since last week. Calls stutter and transfers take forever, but every laptop still shows full bars and says connected.",
      priority: "medium",
      channel: "phone",
      additionalContext: "The agency next door hung their APs on the same wall last week.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "ap-radio", cameraPreset: "ap-face" },
      initialWorld: {
        ap: {
          poeCableSeated: true,
          upstreamPoeCapable: true,
          radioEnabled: true,
          pskOk: true,
          channelClear: false,
          clientAssociated: true,
          clientIpOk: true,
          poePowered: true,
          radioUp: true,
          clientLink: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-channel",
        label: "Channel crowded by the neighbouring fit-out",
        initiallyPlausible: true,
      },
      { id: "h-backhaul", label: "Wired uplink saturated", initiallyPlausible: true },
      {
        id: "h-client",
        label: "One misbehaving client flooding the air",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      "intro": "Confirm the clients still join, then measure how the radio medium behaves before changing any setting.",
      "steps": [
        {
          "id": "guide-face-leds",
          "title": "Read the face and client LED",
          "explanation": "Check the access point's face for power, radio, and client indicators.",
          "why": "A solid client LED rules out power, radio, and association in one look, stopping a join problem being chased that does not exist.",
          "expectedObservation": "All face LEDs read nominal and the client LED stays solid.",
          "target": { "componentId": "access-point", "label": "Access point status face", "cameraPreset": "ap-face" },
          "actionId": "check-ap-face",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-retry-counters",
          "title": "Read retries and channel utilisation",
          "explanation": "Open the radio's association stats and note the retry rate and channel utilisation.",
          "why": "Wireless is shared airtime: every device takes a slice of one medium, and utilisation — the share of channel time already busy — measures how crowded it is.",
          "expectedObservation": "Clients are associated at full rate with a 38% retry rate on a channel at 92% utilisation.",
          "target": { "componentId": "ap-radio", "label": "Radio association statistics", "cameraPreset": "ap-face" },
          "actionId": "check-assoc"
        },
        {
          "id": "guide-spectrum-survey",
          "title": "Survey the surrounding spectrum",
          "explanation": "Run a spectrum survey of the bay and list which channels are quiet.",
          "why": "Channels — the numbered frequency slices a radio uses — should be ranked by measured quietness before any setting is changed.",
          "expectedObservation": "The 2.4 GHz band looks crowded while channels 1 and 11 are quiet in this bay.",
          "target": { "componentId": "ap-radio", "label": "Spectrum survey for the bay" },
          "actionId": "scan-spectrum"
        },
        {
          "id": "guide-retune-radio",
          "title": "Move the radio to quiet spectrum",
          "explanation": "Retune this radio onto a channel the survey showed as free.",
          "why": "Utilisation and the survey together named an overcrowded channel with free alternatives, so retuning is the smallest change the evidence supports.",
          "expectedObservation": "The radio hops to channel 11, retries fall to 2%, and throughput recovers.",
          "target": { "componentId": "ap-radio", "label": "Radio channel setting" },
          "actionId": "move-radio-to-clear-channel"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Confirm the AP and its client link before suspecting the radio medium.",
        feedback: "All LEDs nominal; client LED solid — association is not the problem.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A solid client LED rules out power, radio, and association in one look, which stops the investigation from chasing a join problem that does not exist.",
          evidenceGain:
            "Power, radio, and client link healthy — AP-side failures ruled out for the slow clients.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "leds", "client light", "status"],
      },
      {
        id: "check-assoc",
        label: "Read association stats and retry counters on the radio",
        kind: "inspect",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Measure how well the associated client is actually talking.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "Client associated at full rate but retry rate 38% — channel 6 at 92% utilised by six neighbouring APs.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Retry rate and channel utilisation quantify the slowdown instead of guessing; a full-rate association with heavy retries points at contention, not authentication.",
          evidenceGain:
            "Association healthy at full rate while retries climb — authentication and coverage ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["retry rate", "utilisation", "association", "airtime", "log"],
      },
      {
        id: "scan-spectrum",
        label: "Run a spectrum survey of the bay",
        kind: "inspect",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Look at the whole 2.4 GHz band rather than just this radio's own channel.",
        feedback: "Spectrum shows 2.4 GHz crowded; channel 1 and 11 are quiet in this bay.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "The survey converts a suspected congestion finding into a ranked choice of alternatives before any setting is changed.",
          evidenceGain: "clean channels identified — channels 1 and 11 quiet in this bay",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["spectrum", "scan", "channel survey", "interference", "neighbours"],
      },
      {
        id: "move-radio-to-clear-channel",
        label: "Move the radio to a clear channel",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Retune this AP onto spectrum the survey showed as free.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { channelClear: true } },
        feedback: "AP hops to channel 11 — retries collapse to 2%, throughput recovers.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Utilisation and the survey together named an overcrowded channel with free alternatives, so retuning is the exact change the evidence supports.",
          evidenceGain: "Retries collapsed and airtime recovered on the quieter channel.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["change channel", "clear channel", "switch channel", "channel 11"],
      },
      {
        id: "raise-transmit-power-wrong",
        label: "Raise the transmit power to push through the interference",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Turn up the radio in the hope of drowning out the neighbours.",
        patch: { ap: {} },
        feedback:
          "Shouting louder into a crowded channel raises the noise floor for everyone — retries climb further and the neighbouring APs answer in kind.",
        evaluation: {
          grade: "risky",
          rationale:
            "More power on a channel already at 92% utilisation deepens contention for every tenant on that channel and still leaves this AP starved.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["transmit power", "boost signal", "increase power", "power level"],
      },
      {
        id: "reboot-ap-wrong",
        label: "Reboot the access point to clear the congestion",
        kind: "ui",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Power-cycle the AP and hope the slow rate returns to normal.",
        patch: { ap: {} },
        feedback:
          "The AP comes back on the same crowded channel and the retry rate climbs straight back — the airtime problem lives outside this box.",
        evaluation: {
          grade: "premature",
          rationale:
            "Counters already show external contention; a reboot changes no radio plan and repeats the same measurement a few minutes later.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "restart access point", "power cycle"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.channelClear", value: true },
      { type: "stateEquals", path: "ap.clientAssociated", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["raise-transmit-power-wrong"],
        },
        feedback:
          "More power on a channel already at 92% raises the noise floor for every neighbour and deepens the retry storm.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Association staying solid while throughput collapses tells you the fault is not in joining the network.",
        category: "method",
      },
      {
        level: 2,
        text: "Wireless is shared airtime rather than a private cable — six neighbours on one channel each take a slice of the same medium.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the channel utilisation and retry counters, then survey which channels are quiet in this bay.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The neighbouring agency's new APs stacked onto channel 6, driving it to 92% utilisation with a 38% client retry rate while association itself stayed perfect.",
      whyItWorked:
        "Healthy LEDs and a solid association ruled out power, radio, and authentication; the retry and utilisation counters then named contention, and the spectrum survey identified quiet channels before anything was changed. Boosting transmit power would have argued louder with six neighbours, and a reboot would have returned to the same crowded channel. Transferable principle: wireless capacity is shared airtime — measure utilisation and retries before changing power or rebooting, then move to spectrum that is actually free.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Whole floor reports crawling Wi-Fi since the neighbouring fit-out.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "AP face LEDs, association stats with retry counters, and a spectrum survey.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Solid client LED and full-rate association ruled out power, radio, and authentication; survey ruled out an empty band.",
        },
        { step: "Apply fix", whatLearnerDid: "Retuned the radio onto a quiet channel." },
        {
          step: "Verify",
          whatLearnerDid: "Retries fell to 2% and throughput recovered for the associated clients.",
        },
      ],
      followUps: ["Try ap-wrong-passphrase, where the client never completes association at all."],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "ap-radio-disabled",
    version: 1,
    title: "The guest SSID vanished after a profile rollout",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Separate a powered-but-silent radio from failed hardware",
      "Prove a configuration cause by diffing the running config against a known-good copy",
    ],
    prerequisites: ["ap-poe-port-disabled"],
    skills: ["access-point", "device-profiles", "troubleshooting-method"],
    ticket: {
      id: "HD-1048",
      user: "Amara Diallo",
      role: "HR business partner",
      symptomPlainLanguage:
        "The guest Wi-Fi network vanished from my phone and from the visitor laptops this morning. Staff Wi-Fi is still listed, but guests have nothing to pick from the network list.",
      priority: "medium",
      channel: "email",
      additionalContext: "Device profiles were rolled out to all APs on Monday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "ap-radio", cameraPreset: "ap-face" },
      initialWorld: {
        ap: {
          poeCableSeated: true,
          upstreamPoeCapable: true,
          radioEnabled: false,
          pskOk: true,
          channelClear: true,
          clientAssociated: false,
          clientIpOk: true,
          poePowered: true,
          radioUp: false,
          clientLink: false,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-profile",
        label: "Monday's profile rollout changed this AP",
        initiallyPlausible: true,
      },
      {
        id: "h-guest",
        label: "Guest network switched off in the controller",
        initiallyPlausible: true,
      },
      { id: "h-power", label: "AP lost power or its uplink", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Read the face to see which state is missing, then compare the live settings with a copy you trust.",
      "steps": [
        {
          "id": "guide-face",
          "title": "Read power and radio LEDs",
          "explanation": "Look at the ceiling unit's face and note the power LED and the radio LED as two separate readings.",
          "why": "Power and radio are independent states; splitting them in one look keeps the search on the state that is actually missing.",
          "expectedObservation": "Power LED green while the radio LED stays off.",
          "target": {
            "componentId": "access-point",
            "label": "Access point status face",
            "cameraPreset": "ap-face"
          },
          "actionId": "check-ap-face",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-config-diff",
          "title": "Compare the live radio settings",
          "explanation": "Open the Radio component and compare the configuration it is running — the settings in effect now — against last week's known-good copy.",
          "why": "A config diff — the live settings set against an older copy — tells you whether the radio was switched off administratively, meaning by configuration rather than by failure.",
          "expectedObservation": "A diff line dated Monday marking the radio administratively disabled.",
          "target": {
            "componentId": "ap-radio",
            "label": "AP radio",
            "cameraPreset": "ap-face"
          },
          "actionId": "check-radio-config"
        },
        {
          "id": "guide-enable-radio",
          "title": "Re-enable the radio",
          "explanation": "Re-enable the radio in the pushed AP profile, then confirm the guest network name returns to the list.",
          "why": "The diff named one setting, so restoring exactly that setting is the smallest change that answers the evidence.",
          "expectedObservation": "The radio LED lighting up and the guest network name reappearing for the visitor laptops.",
          "target": {
            "componentId": "ap-radio",
            "label": "AP radio"
          },
          "actionId": "enable-radio",
          "conceptId": "troubleshooting-method"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Read power and radio indicators before assuming the SSID was deleted.",
        feedback: "Power LED green, radio LED off — powered but not airing.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Green power with a dark radio LED splits the problem in two immediately: the box is alive, so the search belongs on the radio's state.",
          evidenceGain:
            "Power present with the radio dark — PoE path and hardware power ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "power led", "radio led", "status"],
      },
      {
        id: "check-radio-config",
        label: "Diff the running radio configuration",
        kind: "inspect",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Compare the live config with last week's known-good copy.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "Config diff from Monday: radio administratively disabled by the profile rollout.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A diff turns a silent radio into a named change with an owner, separating an administrative setting from failed hardware.",
          evidenceGain:
            "Running config differs from last week — hardware radio failure ruled out, fault named as a setting.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["config diff", "running config", "profile", "radio settings"],
      },
      {
        id: "enable-radio",
        label: "Re-enable the radio in the AP profile",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Restore the administratively disabled radio in the pushed profile.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { radioEnabled: true, clientAssociated: true } },
        feedback: "Radio airs; guest clients re-associate within seconds.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The diff named an administratively disabled radio, so re-enabling exactly that setting is the smallest change that answers the evidence.",
          evidenceGain: "Radio on air — guest SSID broadcasting and clients re-associated.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["enable radio", "turn on radio", "radio on", "radio enabled"],
      },
      {
        id: "reboot-ap-wrong",
        label: "Reboot the access point",
        kind: "ui",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Power-cycle the unit to bring the network back.",
        patch: { ap: {} },
        feedback:
          "The AP rejoins with the same pushed profile — the radio comes back administratively disabled and the guest SSID stays missing.",
        evaluation: {
          grade: "premature",
          rationale:
            "A reboot reloads the very profile that switched the radio off, so it repeats the fault while hiding the config diff that named it.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "restart access point", "power cycle"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.radioEnabled", value: true },
      { type: "stateEquals", path: "ap.radioUp", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-ap-wrong"],
        },
        feedback:
          "The reboot reloads the same pushed profile, so the radio stays administratively off and the guest network never returns.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "A green power LED proves the box is alive — ask what should happen next and is missing.",
        category: "method",
      },
      {
        level: 2,
        text: "A radio switched off by administration looks identical to dead hardware when you are standing under it.",
        category: "concept",
      },
      {
        level: 3,
        text: "Diff the running configuration against last week's copy and see exactly what Monday's rollout changed.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Monday's device profile rollout pushed an administratively disabled radio to this AP, so the box stayed powered while the guest SSID stopped broadcasting.",
      whyItWorked:
        "The green power LED with a dark radio LED separated power from radio state, and the config diff against last week's copy named the rollout as the change — proof that the radio was switched off rather than failed. A reboot would have reloaded the same pushed profile with the radio still off. Transferable principle: when a device is powered but silent, compare its running configuration with a known-good copy before condemning hardware.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "Guest SSID disappeared for everyone after Monday's profile rollout.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Face LEDs read, then the running config diffed against last week's copy.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Green power LED ruled out the PoE path; the diff ruled out hardware failure and named the rollout as the change.",
        },
        { step: "Apply fix", whatLearnerDid: "Re-enabled the radio in the pushed AP profile." },
        {
          step: "Verify",
          whatLearnerDid: "Radio aired, guest SSID returned, and clients re-associated.",
        },
      ],
      followUps: [
        "Try ap-channel-congestion, where the radio airs but the channel is saturated.",
        "Try ap-poe-port-disabled, where the AP never powers up at all.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "ap-client-addressing",
    version: 1,
    title: "Connected to Wi-Fi but no internet on one laptop",
    category: "hardware",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Separate a successful association from address acquisition",
      "Recognise link-local addresses as evidence of a missing DHCP lease",
    ],
    prerequisites: ["ap-poe-port-disabled"],
    skills: ["access-point", "ip-addressing", "troubleshooting-method"],
    ticket: {
      id: "HD-1049",
      user: "Peter Novak",
      role: "Field sales engineer",
      symptomPlainLanguage:
        "My laptop says it is connected to the Wi-Fi with full signal, but nothing loads — no email, no browser, no Teams. On the dock at my desk everything works.",
      priority: "medium",
      channel: "phone",
      additionalContext: "Works fine on the dock at his desk.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "access-point",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["access-point", "ap-poe", "ap-radio"],
      showInspector: true,
      focusTarget: { componentId: "access-point", cameraPreset: "ap-face" },
      initialWorld: {
        ap: {
          poeCableSeated: true,
          upstreamPoeCapable: true,
          radioEnabled: true,
          pskOk: true,
          channelClear: true,
          clientAssociated: true,
          clientIpOk: false,
          poePowered: true,
          radioUp: true,
          clientLink: true,
          pathOk: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-lease",
        label: "Client has no valid address from the pool",
        initiallyPlausible: true,
      },
      { id: "h-dns", label: "Name resolution broken for this laptop", initiallyPlausible: true },
      { id: "h-ap", label: "Access point is not passing traffic", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Start at the ceiling unit, then follow the laptop from joining the network to the address it is actually holding.",
      "steps": [
        {
          "id": "guide-face",
          "title": "Read the access point LEDs",
          "explanation": "Check the ceiling unit's face and note the power, radio, and client LEDs before you touch the laptop.",
          "why": "Three healthy lights put the fault past the access point, so the search moves to the one client instead of the shared hardware.",
          "expectedObservation": "Power, radio, and client LEDs all lit.",
          "target": {
            "componentId": "access-point",
            "label": "Access point status face",
            "cameraPreset": "ap-face"
          },
          "actionId": "check-ap-face",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-assoc-address",
          "title": "Read association and IP settings",
          "explanation": "Open the Radio component and read the association record together with the laptop's IP configuration.",
          "why": "Joining the network proves only the link; the address comes next — DHCP is the service that hands that address out — so read both together.",
          "expectedObservation": "Association at full rate while the laptop shows 169.254.17.4.",
          "target": {
            "componentId": "ap-radio",
            "label": "AP radio",
            "cameraPreset": "ap-face"
          },
          "actionId": "check-assoc",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-automatic-address",
          "title": "Switch the interface to automatic",
          "explanation": "Set the laptop's wireless interface back to obtaining an address automatically, then watch it rejoin.",
          "why": "An address the machine picked itself never reaches the gateway, so returning the interface to automatic addressing is the smallest change that matches it.",
          "expectedObservation": "The client taking 10.32.7.44 with pages loading again.",
          "target": {
            "componentId": "ap-radio",
            "label": "AP radio"
          },
          "actionId": "set-client-dhcp",
          "conceptId": "ip-addressing-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-ap-face",
        label: "Inspect the access point face and status LEDs",
        kind: "inspect",
        tool: "device-panel",
        component: "access-point",
        inspectTarget: "access-point",
        description: "Confirm the AP is serving before investigating the laptop.",
        feedback: "All three LEDs nominal; client LED solid — the AP is doing its job.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Three solid LEDs with a lit client LED show power, radio, and association are all healthy, so the fault sits beyond the AP.",
          evidenceGain:
            "Power, radio, and client link healthy — access point and cabling ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["face", "leds", "client light", "status"],
      },
      {
        id: "check-assoc",
        label: "Read the association record and the client's IP configuration",
        kind: "inspect",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Check what the client received after it joined.",
        patch: { ap: { assocChecked: true } },
        feedback:
          "Associated at full rate; client holds 169.254.17.4 — APIPA, no lease from the DHCP server.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The association record plus the address shows layer 2 succeeded and layer 3 never did, which locates the fault above the wireless link.",
          evidenceGain: "association ruled out — fault is addressing above layer 2",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["ip config", "apipa", "169.254", "association", "address"],
      },
      {
        id: "set-client-dhcp",
        label: "Set the client interface to obtain an address automatically",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Return the wireless interface to managed addressing.",
        appliesWhen: {
          type: "stateEquals",
          path: "ap.assocChecked",
          value: true,
        },
        patch: { ap: { clientIpOk: true } },
        feedback: "Client takes 10.32.7.44 — gateway reachable, internet up.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A link-local address proves the lease request never succeeded, so restoring managed addressing on the interface is the fix the evidence supports.",
          evidenceGain: "Valid lease acquired — gateway reachable and path passing end to end.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["dhcp", "obtain ip automatically", "automatic address", "renew lease"],
      },
      {
        id: "manual-static-wrong",
        label: "Type a static address on the laptop",
        kind: "ui",
        tool: "device-panel",
        component: "ap-radio",
        inspectTarget: "ap-radio",
        description: "Hand-configure an address so the laptop works right now.",
        patch: { ap: {} },
        feedback:
          "The laptop loads pages today and then collides with the next lease the DHCP server hands out — or points at the wrong gateway after a subnet change.",
        evaluation: {
          grade: "risky",
          rationale:
            "A hand-typed static bypasses the managed pool, works briefly, and creates a duplicate-IP fault waiting to surface for the next user.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["static ip", "manual address", "type an ip", "fixed address"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ap.pathOk", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ap.clientIpOk", value: true },
      { type: "stateEquals", path: "ap.clientLink", value: true },
      { type: "stateEquals", path: "ap.pathOk", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["manual-static-wrong"],
        },
        feedback:
          "A hand-typed static bypasses the managed pool and works until the DHCP server leases that same address to someone else.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The wireless icon only proves association — which layer still has to succeed before anything loads?",
        category: "method",
      },
      {
        level: 2,
        text: "An address starting 169.254 is the machine reporting that it never received a lease.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the laptop's IP configuration and compare it with a working machine on the same floor.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The laptop's wireless interface was set to a manual address instead of obtaining a lease, so it associated cleanly and then held link-local 169.254.17.4 with no route to the gateway.",
      whyItWorked:
        "Healthy LEDs and a full-rate association ruled out the AP, and the client's IP configuration showed an APIPA address — the classic sign of no lease. Hand-typing a static would have looked like a fix until the pool handed the same address to someone else. Transferable principle: 'connected' only proves layer 2 — read the address next, because a 169.254 result moves the fault above the association.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Laptop shows full Wi-Fi signal yet no application can reach the network.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "AP face LEDs read, then association record and client IP configuration inspected.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Three healthy LEDs and full-rate association ruled out the AP; the APIPA address ruled out a radio or passphrase fault.",
        },
        { step: "Apply fix", whatLearnerDid: "Returned the interface to automatic addressing." },
        {
          step: "Verify",
          whatLearnerDid: "Client took 10.32.7.44, reached the gateway, and loaded the internet.",
        },
      ],
      followUps: [
        "Try ap-wrong-passphrase, where the client cannot even complete association.",
        "Compare with printer-ip-conflict, where a duplicated address breaks an otherwise healthy path.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics", "troubleshooting-method"],
    references: [],
  },
];
