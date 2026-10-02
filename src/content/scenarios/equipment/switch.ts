import type { ScenarioInput } from "@/content/schema";

/**
 * Switch family scenarios (Phase 11). Worlds seed every derived key exactly as
 * `deriveWorld` computes it; reveal flags (portChecked, trunkChecked,
 * uplinkChecked, poeChecked) stay absent until a check action patches them.
 * `ports` is an array — any patch that touches it replaces the whole list.
 */
export const switchScenarios: ScenarioInput[] = [
  {
    id: "switch-port-shutdown",
    version: 1,
    title: "One desk lost connectivity after closet maintenance",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Distinguish an administratively down port from a cable or hardware fault",
      "Use neighbouring port LEDs as a baseline before changing any configuration",
    ],
    prerequisites: [],
    skills: ["switch", "access-ports", "troubleshooting-method"],
    ticket: {
      id: "HD-1039",
      user: "Ravi Menon",
      role: "Payroll analyst",
      symptomPlainLanguage:
        "Since the closet tidy-up yesterday my desk machine reports that the network cable is unplugged. Everyone else on our row is fine, and I already swapped my patch lead with no change.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Maintenance closed ports yesterday to 'clean up the closet'.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "switch",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["switch", "switch-uplink", "switch-port", "switch-vlan"],
      showInspector: true,
      focusTarget: { componentId: "switch-port", cameraPreset: "switch-ports" },
      initialWorld: {
        switch: {
          powerOn: true,
          uplinkCableSeated: true,
          uplinkPortOk: true,
          trunkCarries: [1, 10, 20],
          poeBudgetW: 60,
          poeUsedW: 10,
          poeBudgetOk: true,
          powerOk: true,
          uplinkLink: true,
          ports: [
            { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 3, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 4, cableSeated: true, enabled: false, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
          ],
        },
      },
    },
    hypotheses: [
      { id: "h-port", label: "Port closed during yesterday's maintenance", initiallyPlausible: true },
      { id: "h-cable", label: "Desk cable or wall drop failed", initiallyPlausible: true },
      { id: "h-switch", label: "Switch hardware fault", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Clear the chassis, compare this desk's port with its healthy neighbours, then change only what the evidence names.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check switch power and chassis",
          "explanation": "Read the switch's power and chassis indicators before touching the desk.",
          "why": "A closet-wide power fault looks the same as one dead desk from the seat; the chassis — the switch's own status — comes first.",
          "expectedObservation": "Power indicator green, all eight port lights live, no chassis alarm.",
          "target": { "componentId": "switch", "label": "Switch chassis status", "cameraPreset": "switch-full" },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-led-bank",
          "title": "Compare the port LED bank",
          "explanation": "Look at all eight access-port LEDs together and note the one that differs.",
          "why": "One desk among a working row is a single-port question; a healthy neighbour's LED is the baseline to measure against.",
          "expectedObservation": "Neighbouring ports green while one port sits amber with no link.",
          "target": { "componentId": "switch-port", "label": "Access-port LED bank", "cameraPreset": "switch-ports" },
          "actionId": "check-port-leds",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-uplink",
          "title": "Inspect the uplink port",
          "explanation": "Check the uplink's LED and whether the trunk toward the core still carries traffic.",
          "why": "The uplink is the one link every VLAN — a logical network segment — on this switch shares; one desk must not become a closet ticket.",
          "expectedObservation": "The uplink LED green with the trunk carrying traffic while one access port stays dark.",
          "target": { "componentId": "switch-uplink", "label": "Uplink port and LED", "cameraPreset": "switch-uplink" },
          "actionId": "check-uplink",
          "conceptId": "vlan-basics"
        },
        {
          "id": "guide-enable-port",
          "title": "Re-enable the closed access port",
          "explanation": "Open the desk's port status page and set that port back to enabled.",
          "why": "The checks left one port closed by configuration on a healthy switch — this is the smallest change that matches them.",
          "expectedObservation": "The port's link light going green and the desk picking up an address.",
          "target": { "componentId": "switch-port", "label": "Port 4 admin state", "cameraPreset": "switch-ports" },
          "actionId": "enable-port"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check switch power and chassis status",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Read the switch's own status before blaming the desk.",
        feedback:
          "Power LED solid green, fans steady, no chassis alarm — the switch is up and the rest of the row is forwarding normally.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A dead or alarmed box produces the same 'cable unplugged' report as one bad port, so clearing power first keeps every later conclusion honest.",
          evidenceGain:
            "Power and chassis healthy — supply, boot, and hardware alarms ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "chassis", "status", "leds"],
      },
      {
        id: "check-port-leds",
        label: "Compare the port LEDs across the bank",
        kind: "inspect",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Read every access-port indicator together — one odd lamp out of eight is the anomaly.",
        patch: { switch: { portChecked: true } },
        feedback:
          "Ports 1-3 link green; port 4 sits amber steady while its neighbours are green — an admin-down state, not a link fault.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The complaint is about a single desk, so reading the whole LED bank in one pass separates a one-port problem from a closet-wide one before anything is re-patched.",
          evidenceGain:
            "Port 4 admin-down with ports 1-3 green — fault isolated to one port's configuration; uplink and chassis ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["port leds", "link lights", "port bank", "amber light", "admin state"],
      },
      {
        id: "check-uplink",
        label: "Inspect the uplink port and its LED",
        kind: "inspect",
        tool: "inspection",
        component: "switch-uplink",
        inspectTarget: "switch-uplink",
        description: "Confirm the shared path toward the core is still healthy.",
        feedback:
          "Uplink LED green and the trunk is carrying traffic — the shared path is healthy, so the fault stays local to one access port.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "The uplink carries every VLAN on the switch; ruling it out stops a local port problem from being written up as a closet-wide outage.",
          evidenceGain:
            "Uplink linked — core path ruled out, fault confirmed local to a single access port.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["uplink", "trunk port", "core link", "uplink led"],
      },
      {
        id: "enable-port",
        label: "Re-enable the access port",
        kind: "ui",
        tool: "device-panel",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Bring the administratively closed port back into service.",
        appliesWhen: {
          type: "stateEquals",
          path: "switch.portChecked",
          value: true,
        },
        patch: {
          switch: {
            ports: [
              { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 3, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 4, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            ],
          },
        },
        feedback:
          "Port 4 admin up — the desk link goes green and the workstation picks up an address again.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The check named an admin-down port on a healthy switch, so restoring that one port's enabled state is the smallest change that matches the evidence.",
          evidenceGain:
            "Port 4 enabled and linked — desk connectivity restored with no other change.",
        },
        matchHints: ["enable port", "no shutdown", "admin up", "unshut", "port 4"],
      },
      {
        id: "replace-switch-wrong",
        label: "Replace the switch to get the port back",
        kind: "ui",
        tool: "inspection",
        component: "switch",
        inspectTarget: "switch",
        description: "Order new hardware instead of reopening one closed port.",
        patch: { switch: {} },
        feedback:
          "Seven ports and the uplink are still forwarding — a replacement switch would arrive with the same port closed and this desk still dark.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "Swapping an otherwise healthy eight-port switch for one administratively closed port spends budget and downtime without touching the actual fault.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace switch", "new switch", "rma", "swap hardware"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "switch.ports.3.link", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "switch.ports.3.enabled", value: true },
      { type: "stateEquals", path: "switch.ports.3.link", value: true },
      { type: "stateEquals", path: "switch.uplinkLink", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-switch-wrong"],
        },
        feedback:
          "The other seven ports forward normally — new hardware would not reopen the one port that maintenance closed.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Only one desk is down — compare its port indicator with the ports either side of it before you touch a cable.",
        category: "method",
      },
      {
        level: 2,
        text: "Amber on an access port usually means the port is administratively shut or still negotiating; green means the link trained.",
        category: "concept",
      },
      {
        level: 3,
        text: "Open the port status page and read the admin-state column for the port that serves this desk.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Maintenance left port 4 administratively down during yesterday's closet tidy-up, so the desk's cable and NIC were healthy but the port never forwarded a frame.",
      whyItWorked:
        "Evidence stayed ordered: power cleared the chassis, the full LED bank isolated one odd port, and the uplink ruled out the shared path before anything was changed. Replacing the switch would have looked decisive and changed nothing. Transferable principle: compare the failing port against its healthy neighbours — a single outlier indicator names the fault faster than any hardware swap.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "One desk reports an unplugged cable while the rest of the row keeps working.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Chassis status, the full port LED bank, then the uplink LED.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power, chassis alarms, and the uplink ruled out; only port 4's admin state remained suspect.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Re-enabled the administratively closed access port.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Port 4 link went green and the desk obtained an address.",
        },
      ],
      followUps: [
        "Try switch-uplink-down, where one loose cable takes the whole closet off the server VLAN.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics", "vlan-basics"],
    references: [],
  },
  {
    id: "switch-vlan-mismatch",
    version: 1,
    title: "Ports show green links but the finance VLAN traffic dies at the uplink",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate a green link light from a working forwarding path",
      "Confirm trunk membership before troubleshooting access-port addressing",
    ],
    prerequisites: ["switch-port-shutdown"],
    skills: ["switch", "vlans", "troubleshooting-method"],
    ticket: {
      id: "HD-1040",
      user: "Chloe Barnes",
      role: "Finance systems admin",
      symptomPlainLanguage:
        "The finance printers we moved onto VLAN 10 this week show a steady green link light, but nothing on that VLAN reaches the print server. Ports still on the default VLAN work normally.",
      priority: "high",
      channel: "portal",
      additionalContext: "New finance printers were moved to VLAN 10 this week.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "switch",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["switch", "switch-uplink", "switch-port", "switch-vlan"],
      showInspector: true,
      focusTarget: { componentId: "switch-vlan", cameraPreset: "switch-full" },
      initialWorld: {
        switch: {
          powerOn: true,
          uplinkCableSeated: true,
          uplinkPortOk: true,
          trunkCarries: [1],
          poeBudgetW: 60,
          poeUsedW: 12,
          poeBudgetOk: true,
          powerOk: true,
          uplinkLink: true,
          ports: [
            { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 10, poe: false, link: true, path: false },
            { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 3, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 4, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
          ],
        },
      },
    },
    hypotheses: [
      { id: "h-trunk", label: "Uplink trunk missing the finance VLAN", initiallyPlausible: true },
      { id: "h-access", label: "Access port assigned to the wrong VLAN", initiallyPlausible: true },
      { id: "h-cabling", label: "Cabling fault at the printer", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro: "Prove each layer above the cable before you change anything — chassis, link, then forwarding path.",
      steps: [
        {
          id: "guide-chassis",
          title: "Check switch power and status LEDs",
          explanation: "Look at the chassis indicators before touching ports or configuration.",
          why: "A power scare and a forwarding problem look identical from the user's seat; clearing the chassis stops the investigation starting in the wrong place.",
          expectedObservation: "Whether the power LED and the whole port bank are live.",
          target: {
            componentId: "switch",
            label: "Switch chassis status LEDs",
            cameraPreset: "switch-full",
          },
          actionId: "check-power",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-port",
          title: "Read the finance port link state",
          explanation: "Check the negotiated link on the port the finance printers sit on (port 1).",
          why: "A steady green link proves the cable layer; recording it explicitly keeps the search above the cable, where the symptom lives.",
          expectedObservation: "The port's link speed and state — linked or down.",
          target: {
            componentId: "switch-port",
            label: "Finance access port (port 1)",
            cameraPreset: "switch-ports",
          },
          actionId: "check-port-state",
          conceptId: "vlan-basics",
        },
        {
          id: "guide-trunk",
          title: "Read the uplink trunk membership",
          explanation: "List which VLANs the uplink toward the router is permitted to carry.",
          why: "With the link proven, trunk membership is the last unverified element between a healthy access port and the rest of the network.",
          expectedObservation: "Which VLAN ids appear in the trunk's allowed list.",
          target: {
            componentId: "switch-vlan",
            label: "Uplink trunk VLAN membership",
            cameraPreset: "switch-uplink",
          },
          actionId: "check-trunk",
        },
        {
          id: "guide-permit",
          title: "Permit the finance VLAN on the trunk",
          explanation: "Add the finance VLAN to the uplink's allowed list.",
          why: "An access VLAN only forwards if that same VLAN is permitted on the trunk toward the router.",
          expectedObservation: "The trunk list containing both the default and the finance VLAN.",
          target: { componentId: "switch-vlan", label: "Trunk allowed-VLAN list" },
          actionId: "add-vlan-to-trunk",
        },
      ],
    },
    actions: [
      {
        id: "check-power",
        label: "Check switch power and status LEDs",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Confirm the closet switch survived the week unchanged.",
        feedback:
          "Power LED green and the whole port bank is live — this is not a power event, and the switch is forwarding for the default VLAN.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A power scare and a broken VLAN look identical from the user's seat; clearing the chassis first stops the investigation from starting in the wrong place.",
          evidenceGain:
            "Power and port bank healthy — supply, boot, and chassis alarms ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "status", "leds", "chassis"],
      },
      {
        id: "check-port-state",
        label: "Read the link state on the finance port",
        kind: "inspect",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Verify the physical layer on the port the finance printers sit on.",
        feedback:
          "Port 1 is linked at 1 Gbps with a clean signal — layer 1 is healthy even though the traffic dies on its way to the uplink.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Green LEDs invite cable work; recording the negotiated link explicitly keeps the search above the cable, where the symptom actually lives.",
          evidenceGain:
            "Port 1 linked at full speed — cabling and PHY ruled out; fault sits above the link.",
          learnMore: "vlan-basics",
        },
        matchHints: ["link state", "port status", "negotiated", "speed", "port 1"],
      },
      {
        id: "check-trunk",
        label: "Read the uplink trunk membership",
        kind: "inspect",
        tool: "device-panel",
        component: "switch-vlan",
        inspectTarget: "switch-vlan",
        description: "List the VLANs the uplink is actually permitted to carry.",
        patch: { switch: { trunkChecked: true } },
        feedback:
          "Uplink trunk carries VLAN 1 only; port 1 access VLAN 10 — green LEDs at both ends, but no forwarding path for the finance traffic.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With the link proven, trunk membership is the last unverified element between a healthy access port and the rest of the network.",
          evidenceGain:
            "Trunk missing VLAN 10 — port 1 links but its frames are dropped at the uplink; fault isolated to trunk configuration.",
          learnMore: "vlan-basics",
        },
        matchHints: ["trunk", "vlan membership", "allowed vlans", "uplink config", "802.1q"],
      },
      {
        id: "add-vlan-to-trunk",
        label: "Add VLAN 10 to the uplink trunk",
        kind: "ui",
        tool: "device-panel",
        component: "switch-vlan",
        inspectTarget: "switch-vlan",
        description: "Permit the finance VLAN on the uplink toward the router.",
        appliesWhen: {
          type: "stateEquals",
          path: "switch.trunkChecked",
          value: true,
        },
        patch: { switch: { trunkCarries: [1, 10] } },
        feedback:
          "Trunk now carries VLANs 1 and 10 — the finance printers reach the print server again.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The membership table named the missing VLAN, so permitting exactly that VLAN on the uplink is the smallest configuration change that matches the evidence.",
          evidenceGain:
            "Trunk permits VLAN 10 — port 1's forwarding path restored end to end.",
        },
        matchHints: ["permit vlan 10", "allowed vlan", "add vlan", "vlan 10", "trunk membership"],
      },
      {
        id: "reseat-all-cables-wrong",
        label: "Reseat every patch lead in the closet",
        kind: "ui",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Pull and re-plug the whole patch panel as a first move.",
        patch: { switch: {} },
        feedback:
          "Every link was already green — reseating proves nothing new and briefly drops the healthy ports you just confirmed.",
        evaluation: {
          grade: "low-value",
          rationale:
            "Cables that already link teach you nothing you did not know, and re-patching them takes working ports offline while you do it.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["reseat cables", "replug", "patch leads", "unplug everything"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "switch.ports.0.path", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "switch.ports.0.path", value: true },
      { type: "stateEquals", path: "switch.trunkCarries", value: [1, 10] },
      { type: "stateEquals", path: "switch.uplinkLink", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reseat-all-cables-wrong"],
        },
        feedback:
          "All the links were green before you touched them — reseating working cables cannot explain traffic that dies only at the uplink.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Green link light and no reachability — the cable layer is proven, so which layer above it is still missing?",
        category: "method",
      },
      {
        level: 2,
        text: "An access VLAN only forwards if that same VLAN is permitted on the trunk toward the router.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the trunk membership table and compare it with the access VLAN configured on the finance port.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The uplink trunk carried only VLAN 1 after the printers moved to VLAN 10, so port 1 linked at layer 1 while every frame it sent was dropped on the way out of the switch.",
      whyItWorked:
        "The link-state reading removed the cable layer, and the membership table then showed the uplink and the access port disagreeing about VLAN 10. Reseating green cables would have cost time and taught nothing. Transferable principle: a green LED proves the cable, not the VLAN — always check that the access VLAN exists on the trunk before you troubleshoot the endpoint.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Finance VLAN traffic fails while default-VLAN ports keep working, all with green link lights.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Chassis status, negotiated link on port 1, then trunk membership.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power and layer 1 ruled out by the green LED and 1 Gbps link; fault narrowed to trunk configuration.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Permitted VLAN 10 on the uplink trunk.",
        },
        {
          step: "Verify",
          whatLearnerDid:
            "Trunk listed 1 and 10, port 1 path restored, and the print server responded.",
        },
      ],
      followUps: [
        "Try switch-port-shutdown, where the port itself is administratively down instead of mis-trunked.",
      ],
    },
    knowledgeLinks: ["vlan-basics", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "switch-uplink-down",
    version: 1,
    title: "Whole closet lost the server VLAN after a rack move",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Identify the uplink as the single shared dependency for every VLAN on a switch",
      "Confirm a physical connection before reloading working hardware",
    ],
    prerequisites: ["switch-port-shutdown"],
    skills: ["switch", "uplink", "troubleshooting-method"],
    ticket: {
      id: "HD-1041",
      user: "Ethan Cole",
      role: "Warehouse supervisor",
      symptomPlainLanguage:
        "We shifted the rack about two metres on Friday and since then the whole closet has lost the server VLAN. The port lights look green but the handhelds cannot reach the warehouse system.",
      priority: "high",
      channel: "phone",
      additionalContext: "The rack was shifted two metres on Friday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "switch",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["switch", "switch-uplink", "switch-port", "switch-vlan"],
      showInspector: true,
      focusTarget: { componentId: "switch-uplink", cameraPreset: "switch-uplink" },
      initialWorld: {
        switch: {
          powerOn: true,
          uplinkCableSeated: false,
          uplinkPortOk: true,
          trunkCarries: [1, 10, 20],
          poeBudgetW: 60,
          poeUsedW: 8,
          poeBudgetOk: true,
          powerOk: true,
          uplinkLink: false,
          ports: [
            { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: false },
            { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: false },
            { id: 3, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 4, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
          ],
        },
      },
    },
    hypotheses: [
      { id: "h-uplink", label: "Uplink cable disturbed during the rack move", initiallyPlausible: true },
      { id: "h-power", label: "Switch lost power or rebooted", initiallyPlausible: true },
      { id: "h-router", label: "Router side of the link failed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Clear the chassis first, then compare what each failing path shares before touching any of them.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check power after the rack move",
          "explanation": "Confirm the switch came through Friday's rack move powered and alarmed-free.",
          "why": "Dragging a rack pulls a power lead as easily as a data lead, so power is the cheapest fact to establish first.",
          "expectedObservation": "Power indicator green with all eight ports powered and no alarm.",
          "target": { "componentId": "switch", "label": "Switch power indicators", "cameraPreset": "switch-full" },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-uplink",
          "title": "Inspect the uplink cable",
          "explanation": "Look at the RJ-45 leaving the switch and at the LED beside it.",
          "why": "Every VLAN — a logical network segment — on this switch shares that one link, so a closet-wide loss points there before any single port.",
          "expectedObservation": "The uplink RJ-45 hanging loose at the switch end with its LED dark while access ports stay green.",
          "target": { "componentId": "switch-uplink", "label": "Uplink cable and LED", "cameraPreset": "switch-uplink" },
          "actionId": "check-uplink",
          "conceptId": "vlan-basics"
        },
        {
          "id": "guide-reseat",
          "title": "Reseat the uplink cable",
          "explanation": "Push the RJ-45 home at the switch end until the latch clicks.",
          "why": "The inspection found the connection physically unseated, so restoring that one seat is the smallest change that matches the evidence.",
          "expectedObservation": "The uplink LED turning green and the access-port paths returning.",
          "target": { "componentId": "switch-uplink", "label": "Uplink RJ-45 socket", "cameraPreset": "switch-uplink" },
          "actionId": "reseat-uplink",
          "conceptId": "network-cabling-basics"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check switch power and port-bank status",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Confirm the switch survived the rack move with power intact.",
        feedback:
          "Power LED green, all eight ports powered, no alarm — the switch is running normally after Friday's move.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Dragging a rack can pull a power lead as easily as a data lead, so proving power first keeps the rest of the inspection grounded in fact.",
          evidenceGain:
            "Power and port bank healthy — supply, boot, and chassis alarms ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "status", "alarm", "leds"],
      },
      {
        id: "check-uplink",
        label: "Inspect the uplink cable and its LED",
        kind: "inspect",
        tool: "inspection",
        component: "switch-uplink",
        inspectTarget: "switch-uplink",
        description: "Look at the one cable that carries every VLAN out of this closet.",
        patch: { switch: { uplinkChecked: true } },
        feedback:
          "Uplink RJ-45 hangs loose at the switch end; the uplink LED is dark while the access ports stay green.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Access-port LEDs stay green when the uplink is unplugged, so checking the single shared cable is the fastest way to explain a closet-wide loss.",
          evidenceGain:
            "Uplink unseated — access ports still link locally, so the shared path is the single fault.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["uplink", "rj45", "uplink led", "trunk cable", "cable end"],
      },
      {
        id: "reseat-uplink",
        label: "Reseat the uplink cable",
        kind: "ui",
        tool: "inspection",
        component: "switch-uplink",
        inspectTarget: "switch-uplink",
        description: "Push the RJ-45 home until the latch clicks and watch the link train.",
        appliesWhen: {
          type: "stateEquals",
          path: "switch.uplinkChecked",
          value: true,
        },
        patch: { switch: { uplinkCableSeated: true } },
        feedback:
          "Uplink LED green; the trunk trains and paths to the server VLAN restore for every port.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The inspection found the cable physically unseated, so restoring that one connection — not reloading the switch — is the exact fix the evidence supports.",
          evidenceGain:
            "Uplink re-linked — trunk restored and access-port forwarding resumes.",
        },
        matchHints: ["reseat uplink", "plug in uplink", "click the latch", "push cable home"],
      },
      {
        id: "reboot-switch-wrong",
        label: "Reboot the switch to clear the fault",
        kind: "ui",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Reload the box before confirming why the closet dropped.",
        patch: { switch: {} },
        feedback:
          "The reload drops every healthy port for a minute and boots straight back to the same loose uplink — the server VLAN is still down.",
        evaluation: {
          grade: "premature",
          rationale:
            "Reloading with an unseated cable adds downtime to the ports that were still working and proves nothing about the fault.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "reload", "power cycle", "restart switch"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "switch.uplinkLink", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "switch.uplinkLink", value: true },
      { type: "stateEquals", path: "switch.ports.0.path", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-switch-wrong"],
        },
        feedback:
          "A reload with a loose cable only delays recovery — every healthy port drops while the uplink stays unplugged.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Every access port is green but nothing leaves the closet — ask which single cable carries all of them.",
        category: "method",
      },
      {
        level: 2,
        text: "One uplink is a single point of failure: every VLAN on this switch depends on that one link.",
        category: "concept",
      },
      {
        level: 3,
        text: "Look at the RJ-45 at the switch end and the LED beside it — one end of this path is not latched.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The uplink RJ-45 worked loose when the rack was shifted two metres, so every access port kept its local link while the trunk to the server VLAN was gone.",
      whyItWorked:
        "Power was cleared first, then the single shared cable was inspected and found unseated — no reload, no config edits, one physical correction. Rebooting would have taken healthy ports down and returned to the same fault. Transferable principle: when many things fail at once, inspect the one component they all share before touching any of them.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Whole closet lost the server VLAN after the rack moved, while local port lights stayed green.",
        },
        { step: "Gather evidence", whatLearnerDid: "Chassis status, then the uplink cable and LED." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power and the access ports ruled out — green LEDs proved local links, leaving only the shared uplink.",
        },
        { step: "Apply fix", whatLearnerDid: "Reseated the uplink RJ-45 until it latched." },
        {
          step: "Verify",
          whatLearnerDid: "Uplink LED green and port 1's path to the server VLAN restored.",
        },
      ],
      followUps: [
        "Try switch-port-shutdown, where only one desk is affected instead of the whole closet.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "switch-port-faulty",
    version: 1,
    title: "One port keeps dropping a desk phone even when reseated",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Isolate a failed port by substituting a known-good device and cable",
      "Confirm PoE delivery before condemning the endpoint",
    ],
    prerequisites: ["switch-port-shutdown"],
    skills: ["switch", "port-faults", "troubleshooting-method"],
    ticket: {
      id: "HD-1042",
      user: "Nina Petrova",
      role: "Reception supervisor",
      symptomPlainLanguage:
        "The reception desk phone keeps dropping off the network. It worked for months on this port, and pushing the cable fully home still doesn't bring the port light on.",
      priority: "medium",
      channel: "portal",
      additionalContext: "The phone worked for months on this port.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "switch",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["switch", "switch-uplink", "switch-port", "switch-vlan"],
      showInspector: true,
      focusTarget: { componentId: "switch-port", cameraPreset: "switch-ports" },
      initialWorld: {
        switch: {
          powerOn: true,
          uplinkCableSeated: true,
          uplinkPortOk: true,
          trunkCarries: [1, 10, 20],
          poeBudgetW: 60,
          poeUsedW: 14,
          poeBudgetOk: true,
          powerOk: true,
          uplinkLink: true,
          ports: [
            { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
            { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 3, cableSeated: true, enabled: true, faulty: true, vlan: 1, poe: true, link: false, path: false },
            { id: 4, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: true, link: false, path: false },
            { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
          ],
        },
      },
    },
    hypotheses: [
      { id: "h-port", label: "Port 3 has failed at the hardware level", initiallyPlausible: true },
      { id: "h-cable", label: "Worn patch lead at reception", initiallyPlausible: true },
      { id: "h-phone", label: "Desk phone power adapter failing", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Split the fault with substitution — prove the phone and cable good elsewhere — before replacing any hardware.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check power and PoE status",
          "explanation": "Read the switch's power indicator and PoE state before blaming the port.",
          "why": "A phone that drops looks like a dead switch from the desk; PoE — power delivered over the data cable — starts here.",
          "expectedObservation": "Power indicator green with the PoE indicator steady and no chassis alarm.",
          "target": { "componentId": "switch", "label": "Switch power and PoE indicators", "cameraPreset": "switch-full" },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-substitute",
          "title": "Compare port 3 with a neighbour",
          "explanation": "Try the phone and cable on a port that already links, then compare both LEDs.",
          "why": "Substitution — swapping the environment around a failing device — splits four suspects into two sides in a single move.",
          "expectedObservation": "Port 3's LED staying dark while the same phone and cable link on the neighbour port.",
          "target": { "componentId": "switch-port", "label": "Port 3 and neighbour LEDs", "cameraPreset": "switch-ports" },
          "actionId": "check-port-leds"
        },
        {
          "id": "guide-poe-budget",
          "title": "Compare PoE draw with budget",
          "explanation": "Read the current PoE draw against the switch's rated budget.",
          "why": "An exhausted power pool starves a PoE phone exactly like a failed port, so rule it out before condemning hardware.",
          "expectedObservation": "The draw reading 14 W against the 60 W budget - plenty of headroom.",
          "target": { "componentId": "switch", "label": "PoE draw and budget", "cameraPreset": "switch-full" },
          "actionId": "check-poe-budget",
          "conceptId": "poe-power-basics"
        },
        {
          "id": "guide-spare-port",
          "title": "Move the phone to another port",
          "explanation": "Patch the reception phone onto the free port beside the one that stays dark.",
          "why": "The phone and cable are proven good elsewhere, so moving to a proven spare restores service without touching healthy hardware.",
          "expectedObservation": "The phone linking on the new port and negotiating PoE while port 3 stays dark.",
          "target": { "componentId": "switch-port", "label": "Spare access port", "cameraPreset": "switch-ports" },
          "actionId": "swap-to-spare-port"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check switch power and PoE status",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Confirm the switch is up and delivering power before blaming the port.",
        feedback:
          "Power LED green and the PoE indicator steady — the switch is up and feeding the ports that are already linked.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A failing phone can mimic a dead switch; clearing power and the PoE indicator first keeps the search on the port where the symptom lives.",
          evidenceGain:
            "Power and PoE indicators healthy — supply and chassis alarms ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "poe status", "leds", "chassis"],
      },
      {
        id: "check-port-leds",
        label: "Compare port 3's LED with its neighbours",
        kind: "inspect",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Test the phone and cable against a port you already know works.",
        patch: { switch: { portChecked: true } },
        feedback:
          "Port 3's LED stays dark with the known-good cable; the neighbour port links instantly with that same cable and phone.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Substitution is the cheapest proof at the bench — it splits a four-way fault (phone, cable, port, configuration) into two sides in a single move.",
          evidenceGain:
            "Port ruled faulty by substitution — the same phone and cable link on a neighbour port, so only port 3 is left.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["port 3", "port leds", "neighbour port", "substitution", "link light"],
      },
      {
        id: "check-poe-budget",
        label: "Read the PoE draw against the budget",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Confirm the switch is not starving the port of power.",
        patch: { switch: { poeChecked: true } },
        feedback:
          "PoE draw is 14 W against a 60 W budget — plenty of headroom, so the phone is not being power-starved.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "A PoE phone that drops looks just like a port fault when the budget is exhausted, so ruling out the power pool keeps the substitution result unambiguous.",
          evidenceGain:
            "PoE draw well inside budget — power starvation ruled out; the fault stays on port 3 itself.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["poe budget", "power draw", "watts", "class draw", "poe status"],
      },
      {
        id: "swap-to-spare-port",
        label: "Move the device to a spare port",
        kind: "ui",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Patch the phone onto the free port beside the failed one.",
        appliesWhen: {
          type: "stateEquals",
          path: "switch.portChecked",
          value: true,
        },
        patch: {
          switch: {
            ports: [
              { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
              { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 3, cableSeated: false, enabled: true, faulty: true, vlan: 1, poe: true, link: false, path: false },
              { id: 4, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
              { id: 5, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            ],
          },
        },
        feedback:
          "Phone moved to port 4 — it links immediately and starts negotiating PoE, with no configuration change needed.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The substitution proved the phone and cable good and port 3 bad, so moving to a proven spare restores service without touching healthy hardware.",
          evidenceGain:
            "Phone linked on port 4 — service restored and port 3 confirmed as the failed component.",
        },
        matchHints: ["spare port", "move to port 4", "patch to another port", "repatch phone"],
      },
      {
        id: "replace-switch-wrong",
        label: "Replace the whole switch",
        kind: "ui",
        tool: "inspection",
        component: "switch",
        inspectTarget: "switch",
        description: "Order a new eight-port switch rather than moving one phone.",
        patch: { switch: {} },
        feedback:
          "Ports 1, 2, 4 and the uplink all work — replacing the switch discards seven healthy ports to fix one.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "One failed port out of eight does not justify new hardware, and the spare ports already prove the rest of the chassis is healthy.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["replace switch", "new switch", "rma switch", "swap switch"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "switch.ports.3.link", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "switch.ports.3.link", value: true },
      { type: "stateEquals", path: "switch.ports.2.link", value: false },
      { type: "stateEquals", path: "switch.uplinkLink", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-switch-wrong"],
        },
        feedback:
          "The spare ports prove the chassis is healthy — new hardware would waste budget to replace one failed port.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Prove the phone and cable are innocent first — try them where you already know a link works.",
        category: "method",
      },
      {
        level: 2,
        text: "Substitution isolates the fault: if the same cable and phone link elsewhere, the failing side is the port.",
        category: "concept",
      },
      {
        level: 3,
        text: "Compare port 3's indicator with port 2 and port 4 under the same conditions before you condemn anything.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Port 3 failed at the hardware level — link training never completed even with a cable and phone that link instantly on the neighbouring port.",
      whyItWorked:
        "Substitution moved the doubt instead of arguing with it: the same phone and lead proved good next door, the PoE counter proved power delivery fine, and only the port was left. Replacing the switch would have preserved the fault in the new chassis. Transferable principle: swap the environment around a failing device, not the device itself — whichever side still fails is the side at fault.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid: "A reception phone drops repeatedly on a port it had used for months.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Chassis and PoE status, port LED comparison with a substitution test, then the PoE draw counter.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Phone, cable, power delivery, and the rest of the chassis ruled out — only port 3 remained.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Patched the phone onto the proven spare port beside the failed one.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Port 4 linked and negotiated PoE while port 3 stayed dark.",
        },
      ],
      followUps: [
        "Try switch-poe-overload, where the ports are healthy but the shared power pool is exhausted.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics"],
    references: [],
  },
  {
    id: "switch-poe-overload",
    version: 1,
    title: "Two ceiling access points stopped powering up",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Read the PoE class draw against the switch's rated budget",
      "Recover PoE capacity by relocating loads instead of replacing the switch",
    ],
    prerequisites: ["switch-vlan-mismatch"],
    skills: ["switch", "poe", "troubleshooting-method"],
    ticket: {
      id: "HD-1043",
      user: "Owen Fraser",
      role: "Facilities manager",
      symptomPlainLanguage:
        "Two of the ceiling access points stopped powering up this morning. They were fine until we plugged a bench tester and an IP camera into the closet switch on Friday.",
      priority: "medium",
      channel: "email",
      additionalContext: "A bench tester and a IP camera were plugged in on Friday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "switch",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["switch", "switch-uplink", "switch-port", "switch-vlan"],
      showInspector: true,
      focusTarget: { componentId: "switch", cameraPreset: "switch-full" },
      initialWorld: {
        switch: {
          powerOn: true,
          uplinkCableSeated: true,
          uplinkPortOk: true,
          trunkCarries: [1, 10, 20],
          poeBudgetW: 60,
          poeUsedW: 74,
          poeBudgetOk: false,
          powerOk: true,
          uplinkLink: true,
          ports: [
            { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
            { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
            {
              id: 3, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true,
              poePowered: false, link: false, path: false,
            },
            {
              id: 4, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true,
              poePowered: false, link: false, path: false,
            },
            { id: 5, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
            { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
          ],
        },
      },
    },
    hypotheses: [
      { id: "h-budget", label: "PoE draw exceeds the switch budget", initiallyPlausible: true },
      { id: "h-cabling", label: "AP patch leads came loose", initiallyPlausible: false },
      { id: "h-aps", label: "Both access points failed at once", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work from the chassis outward, letting the switch's own power readings narrow the field before anything moves.",
      "steps": [
        {
          "id": "guide-chassis",
          "title": "Check power and PoE lights",
          "explanation": "Open the device panel and read the chassis indicators before touching any port or cable.",
          "why": "Two ceiling access points going dark together can read like a power event. PoE — power delivered over the Ethernet cable — has its own indicator here.",
          "expectedObservation": "Power LED green, PoE indicator red, no thermal or chassis alarm.",
          "target": {
            "componentId": "switch",
            "label": "Switch chassis status LEDs",
            "cameraPreset": "switch-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-budget",
          "title": "Read the PoE draw counter",
          "explanation": "In the device panel, compare the watts the switch draws with the watts it can hand out.",
          "why": "Loads that share one supply fail together. The PoE budget — the total watts a switch may hand out — is the counter that reports that shared pool.",
          "expectedObservation": "PoE drawn reads 74 W beside a PoE budget of 60 W.",
          "target": {
            "componentId": "switch",
            "label": "PoE drawn and PoE budget counters"
          },
          "actionId": "check-poe-budget",
          "conceptId": "poe-power-basics"
        },
        {
          "id": "guide-ap-leads",
          "title": "Inspect the AP patch leads",
          "explanation": "Look at ports 3 and 4 in the switch view and confirm both access-point leads sit fully home.",
          "why": "Dark ports invite a cable hunt; recording that the leads are seated stops you re-patching a path that was never broken.",
          "expectedObservation": "Both leads fully seated with latches closed while ports 3 and 4 stay unlit.",
          "target": {
            "componentId": "switch-port",
            "label": "Access-point ports 3 and 4",
            "cameraPreset": "switch-ports"
          },
          "actionId": "check-ap-cables",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-offload",
          "title": "Move the tester to an injector",
          "explanation": "Take the bench tester — added Friday and easiest to spare — off the switch's power pool onto a PoE injector.",
          "why": "The counter put the pool past its rating, so removing one load is the smallest change that matches the evidence you just gathered.",
          "expectedObservation": "PoE drawn settles at 52 W inside budget and ports 3 and 4 light with link.",
          "target": {
            "componentId": "switch-port",
            "label": "PoE port bank",
            "cameraPreset": "switch-ports"
          },
          "actionId": "move-bench-tester-to-injector"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check switch power and PoE indicator",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Confirm the chassis is running and note which indicator is in alarm.",
        feedback:
          "Power LED green with no thermal alarm, PoE indicator red — the switch is up, and only the power pool is complaining.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A tripped supply and a shed PoE load both present as devices that stopped working, so confirming the chassis first separates the two.",
          evidenceGain:
            "Power healthy with the PoE indicator in alarm — supply and boot ruled out, fault narrowed to the power pool.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "poe indicator", "alarm", "leds"],
      },
      {
        id: "check-poe-budget",
        label: "Read the PoE class-draw counter",
        kind: "inspect",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Compare the watts the switch is drawing with the watts it is rated to supply.",
        patch: { switch: { poeChecked: true } },
        feedback:
          "PoE class draw is 74 W on a 60 W budget — the switch is shedding the last devices it tried to power.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Two devices failing together points at something they share, and the draw counter is the switch's own account of that shared resource.",
          evidenceGain:
            "Draw exceeds the budget — power shedding confirmed; links and cabling are not the cause.",
          learnMore: "poe-power-basics",
        },
        matchHints: ["class draw", "poe budget", "watts", "power draw", "budget counter"],
      },
      {
        id: "check-ap-cables",
        label: "Check the AP patch cables on ports 3 and 4",
        kind: "inspect",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Rule out the physical path to the two dark access points.",
        feedback:
          "Both AP cables are fully seated and latched — draw, not cabling, is the limit.",
        isDiagnostic: true,
        evaluation: {
          grade: "good",
          rationale:
            "Dark access points invite a cable hunt; recording the seating explicitly prevents a pointless re-patch of a path that was never broken.",
          evidenceGain:
            "AP cabling seated and ports enabled — physical layer ruled out; the fault is the shared power pool.",
          learnMore: "network-cabling-basics",
        },
        matchHints: ["ap cables", "patch cable", "ports 3 and 4", "seated", "cable check"],
      },
      {
        id: "move-bench-tester-to-injector",
        label: "Move the bench tester to a PoE injector",
        kind: "ui",
        tool: "inspection",
        component: "switch-port",
        inspectTarget: "switch-port",
        description: "Take the non-critical load off the switch's power pool.",
        appliesWhen: {
          type: "stateEquals",
          path: "switch.poeChecked",
          value: true,
        },
        patch: {
          switch: {
            poeUsedW: 52,
            poeBudgetOk: true,
            ports: [
              { id: 1, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
              { id: 2, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true, link: true, path: true },
              {
                id: 3, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true,
                poePowered: true, link: true, path: true,
              },
              {
                id: 4, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: true,
                poePowered: true, link: true, path: true,
              },
              { id: 5, cableSeated: true, enabled: true, faulty: false, vlan: 1, poe: false, link: true, path: true },
              { id: 6, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 7, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
              { id: 8, cableSeated: false, enabled: true, faulty: false, vlan: 1, poe: false, link: false, path: false },
            ],
          },
        },
        feedback:
          "Draw drops to 52 W — both APs negotiate power and link up within seconds.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The counter named an exceeded budget and the bench tester was the newest non-critical load, so removing it restores headroom without touching the access points.",
          evidenceGain:
            "Draw back inside budget — ports 3 and 4 deliver PoE again and both APs link.",
        },
        matchHints: ["bench tester", "poe injector", "move tester", "external injector", "offload power"],
      },
      {
        id: "reboot-switch-wrong",
        label: "Reboot the switch to reset the power pool",
        kind: "ui",
        tool: "device-panel",
        component: "switch",
        inspectTarget: "switch",
        description: "Reload the switch in the hope the PoE fault clears.",
        patch: { switch: {} },
        feedback:
          "The reload drops every healthy port for a minute, then boots straight back to 74 W on a 60 W budget — the APs stay dark.",
        evaluation: {
          grade: "premature",
          rationale:
            "A reload adds downtime to healthy ports, and the budget is exceeded again the moment the switch re-powers the same devices.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "power cycle", "restart switch", "reload"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "switch.poeBudgetOk", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "switch.poeBudgetOk", value: true },
      { type: "stateEquals", path: "switch.poeUsedW", value: 52 },
      { type: "stateEquals", path: "switch.ports.2.link", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-switch-wrong"],
        },
        feedback:
          "A reload briefly drops every healthy port and the budget is exceeded again the moment the switch boots — the APs will still be dark.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Two access points went dark at once — ask what was plugged into the closet on Friday.",
        category: "method",
      },
      {
        level: 2,
        text: "PoE is one shared budget across the switch, not a promise per port; the last devices to ask can be refused.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the class-draw counter and compare the watts drawn with the watts the switch is rated to supply.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "PoE draw reached 74 W against a 60 W budget after Friday's additions, so the switch refused power to the last ports it serviced and the two ceiling access points stayed dark.",
      whyItWorked:
        "The red PoE indicator pointed at the power pool, the draw counter quantified the overshoot, and the cable check cleared the physical path before anything was moved. Rebooting would have dropped healthy ports and reproduced the same 74 W on boot. Transferable principle: shared resources fail by shedding their newest claimants — read the budget counter before you troubleshoot individual devices.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Two ceiling APs stopped powering up while every other port kept working after Friday's additions.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Chassis and PoE indicator, the class-draw counter, then the AP patch cables.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Supply, chassis, and AP cabling ruled out — the 74 W draw against a 60 W budget was the only outstanding fact.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Moved the bench tester onto an external PoE injector.",
        },
        {
          step: "Verify",
          whatLearnerDid:
            "Draw settled at 52 W inside budget and both access points negotiated power.",
        },
      ],
      followUps: [
        "Try switch-port-faulty, where a single port fails instead of the whole power pool.",
      ],
    },
    knowledgeLinks: ["poe-power-basics", "ip-addressing-basics"],
    references: [],
  },
];
