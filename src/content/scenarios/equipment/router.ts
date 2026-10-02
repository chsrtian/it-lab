import type { ScenarioInput } from "@/content/schema";

/**
 * Router family scenarios (Phase 11). Worlds seed every derived key exactly as
 * `deriveWorld` computes it; reveal flags (wanChecked, dhcpChecked, natChecked,
 * lanChecked, probeDone) stay absent until a check action patches them.
 */
export const routerScenarios: ScenarioInput[] = [
  {
    id: "router-wan-misconfigured",
    version: 1,
    title: "Branch router has link but no internet",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Prove each layer of the WAN path before editing any configuration",
      "Match a WAN interface to the parameters the ISP now publishes for the handoff",
    ],
    prerequisites: [],
    skills: ["router", "wan-configuration", "troubleshooting-method"],
    ticket: {
      id: "HD-1033",
      user: "Daniel Osei",
      role: "Branch operations manager",
      symptomPlainLanguage:
        "The WAN lights on the router are green and the office network is fine, but nothing on this floor reaches the internet anymore. It started right after the ISP changed the handoff equipment.",
      priority: "high",
      channel: "phone",
      additionalContext: "ISP swapped the handoff equipment on Tuesday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-wan", cameraPreset: "router-wan" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: true,
          wanPortOk: true,
          upstreamOk: true,
          wanConfigOk: false,
          natEnabled: true,
          lanCableSeated: true,
          dhcpEnabled: true,
          dhcpPoolFree: 20,
          powerOk: true,
          wanLink: true,
          wanReachable: false,
          lanLink: true,
          dhcpServing: true,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-handoff",
        label: "WAN settings still describe the old ISP handoff",
        initiallyPlausible: true,
      },
      { id: "h-isp", label: "ISP side fault after the equipment swap", initiallyPlausible: true },
      {
        id: "h-nat",
        label: "NAT or filtering rules blocking outbound traffic",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      "intro": "Prove each layer in turn — chassis, cable, then configuration — before changing anything the branch depends on.",
      "steps": [
        {
          "id": "guide-chassis",
          "title": "Check router power and chassis",
          "explanation": "Open the device panel and read the power LED and chassis alarms first.",
          "why": "The ticket reports green WAN lights with the office network fine, so confirm the chassis itself before trusting those lights.",
          "expectedObservation": "Power LED solid green, fans steady, no chassis alarm entries.",
          "target": {
            "componentId": "router",
            "label": "Router chassis status",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-wan-cable",
          "title": "Inspect the WAN uplink cable",
          "explanation": "Look at the WAN port and its link LED at the router and at the modem.",
          "why": "The WAN — the link toward the provider — carries the office's traffic out. Green lights here prove the cable and the modem handoff.",
          "expectedObservation": "WAN LED green at both ends with the link negotiated at 1 Gbps full duplex.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN port and link LED",
            "cameraPreset": "router-wan"
          },
          "actionId": "check-wan-cable",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-wan-config",
          "title": "Read the WAN interface settings",
          "explanation": "Open the WAN interface page and compare its encapsulation and gateway with the ISP's current handoff sheet.",
          "why": "Encapsulation — the framing protocol a link speaks — must match what the ISP publishes. The gateway — the address used to leave the network — is published alongside it.",
          "expectedObservation": "Encapsulation reads PPPoE with no gateway established, while the sheet calls for DHCP and gateway 203.0.113.1.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN interface settings",
            "cameraPreset": "router-wan"
          },
          "actionId": "check-wan-config",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-correct-wan",
          "title": "Correct the WAN configuration",
          "explanation": "Rebuild the interface around the ISP's published handoff parameters: DHCP with gateway 203.0.113.1.",
          "why": "The check named the exact mismatch, so aligning the interface with the handoff is the smallest change that fits the evidence you just gathered.",
          "expectedObservation": "The default route resolves and gateway probes answer in about 3 ms.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN interface settings",
            "cameraPreset": "router-wan"
          },
          "actionId": "correct-wan-config"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and chassis status",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Read the router's own status before assuming a network fault.",
        feedback:
          "Power LED solid green, fans steady, no chassis alarms — the router booted normally and is under management.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A dead or faulted box produces the same 'no internet' report as a bad uplink, so clearing power first keeps later conclusions honest.",
          evidenceGain:
            "Power and chassis healthy — supply, boot, and hardware alarms ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "status", "chassis", "leds", "panel"],
      },
      {
        id: "check-wan-cable",
        label: "Inspect the WAN cable and link LEDs",
        kind: "inspect",
        tool: "inspection",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Confirm the physical uplink at both ends of the handoff.",
        feedback:
          "WAN LED green at router and modem — physical path good; link negotiated at 1 Gbps full duplex on both ends.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Green link lights after an ISP visit are easy to over-trust; recording them explicitly prevents layer-1 work on a layer-3 symptom.",
          evidenceGain:
            "WAN LED green at router and modem — physical path good, so cabling, port, and modem handoff ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["wan cable", "link led", "modem", "ethernet", "port light"],
      },
      {
        id: "check-wan-config",
        label: "Read the WAN interface configuration",
        kind: "inspect",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Compare what the interface is set to with what the ISP now expects.",
        patch: { router: { wanChecked: true } },
        feedback:
          "WAN set to the old PPPoE encapsulation; the new handoff expects DHCP with gateway 203.0.113.1 — no gateway established.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With power and link proven, the stored interface profile is the last unverified layer between a healthy port and a working internet path.",
          evidenceGain:
            "WAN profile mismatched to the current handoff — gateway never established, fault isolated to configuration.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["wan config", "interface settings", "encapsulation", "pppoe", "gateway"],
      },
      {
        id: "correct-wan-config",
        label: "Correct the WAN configuration",
        kind: "ui",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Rebuild the interface around the ISP's published handoff parameters.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.wanChecked",
          value: true,
        },
        patch: { router: { wanConfigOk: true } },
        feedback:
          "WAN reconfigured for DHCP with gateway 203.0.113.1 — the default route resolves and gateway probes answer in 3 ms.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The check named the exact mismatch, so aligning the interface with the handoff the ISP actually supplied is the smallest change that fits the evidence.",
          evidenceGain:
            "Gateway reachable — WAN reachability restored and the client path verified end to end.",
        },
        matchHints: ["wan settings", "handoff", "set gateway", "dhcp handoff", "apply interface"],
      },
      {
        id: "reboot-router-wrong",
        label: "Reboot the router to pick up the new handoff",
        kind: "ui",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Power-cycle the box without correcting the stored WAN profile.",
        patch: { router: {} },
        feedback:
          "The router reloads with the same PPPoE profile still stored — link returns green, gateway still missing, branch still offline.",
        evaluation: {
          grade: "premature",
          rationale:
            "A reboot replays whatever configuration is already saved; without correcting the encapsulation it only adds downtime and erases the evidence you just read.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "power cycle", "restart router", "reload the box"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.wanReachable", value: true },
      { type: "stateEquals", path: "router.dhcpServing", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-router-wrong"],
        },
        feedback:
          "A reboot reloads the stale PPPoE profile unchanged — the branch comes back with the same missing gateway.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Prove one layer at a time: power, then the physical link, then what the WAN interface actually speaks.",
        category: "method",
      },
      {
        level: 2,
        text: "The ISP swapped the handoff equipment on Tuesday — the router may still be speaking the protocol the old equipment accepted.",
        category: "concept",
      },
      {
        level: 3,
        text: "Open the WAN interface and read its encapsulation and gateway side by side with the parameters the ISP now publishes for this site.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The WAN interface still held the pre-swap PPPoE profile after Tuesday's handoff replacement, so the router never established a gateway on the new DHCP handoff.",
      whyItWorked:
        "Power and link evidence were cleared first, which made the interface profile the only unverified layer left, and the fix then matched the ISP's published parameters instead of a guess. Rebooting would have looked busy and changed nothing. Transferable principle: when someone changes their side of a handoff, re-read your own settings against their new contract before you change anything else.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Green WAN LEDs and a working LAN, with the internet gone since Tuesday's ISP handoff swap.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Power and chassis status, WAN link LEDs at both ends, then the WAN interface profile.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power supply and physical cabling ruled out by solid LEDs; fault narrowed to the stored WAN parameters.",
        },
        {
          step: "Apply fix",
          whatLearnerDid:
            "Reconfigured the WAN interface for the DHCP handoff with gateway 203.0.113.1.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Gateway probes answered and clients reached the internet again.",
        },
      ],
      followUps: [
        "Try router-cable-loose-wan, where the WAN link LED is dark instead of misconfigured.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics", "gateway-vs-dns"],
    references: [],
  },
  {
    id: "router-dhcp-exhausted",
    version: 1,
    title: "New hires cannot get an address on the guest floor",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Distinguish an exhausted address scope from a broken uplink",
      "Recover address capacity by reclaiming leases instead of hand-addressing clients",
    ],
    prerequisites: ["router-wan-misconfigured"],
    skills: ["router", "dhcp", "troubleshooting-method"],
    ticket: {
      id: "HD-1034",
      user: "Hannah Brecht",
      role: "IT coordinator",
      symptomPlainLanguage:
        "Several of the new laptops show 'no internet' the moment they join the guest floor, while every machine that was already here keeps working. It is only the new starters who are affected.",
      priority: "medium",
      channel: "portal",
      additionalContext: "Twenty starters arrived this week.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-dhcp", cameraPreset: "router-full" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: true,
          wanPortOk: true,
          upstreamOk: true,
          wanConfigOk: true,
          natEnabled: true,
          lanCableSeated: true,
          dhcpEnabled: true,
          dhcpPoolFree: 0,
          powerOk: true,
          wanLink: true,
          wanReachable: true,
          lanLink: true,
          dhcpServing: false,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      { id: "h-pool", label: "Address scope has no free leases", initiallyPlausible: true },
      { id: "h-uplink", label: "Uplink or WAN fault on that floor", initiallyPlausible: true },
      {
        id: "h-wifi",
        label: "Guest wireless dropping the new devices",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      "intro": "Start from the split between the laptops that fail and the ones that keep working, and follow that difference up the stack.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check router power and uptime",
          "explanation": "Open the device panel and read the power LED, service alarms, and uptime counter.",
          "why": "Twenty starters arrived this week; a hardware alarm would invalidate every service reading taken after it.",
          "expectedObservation": "Power LED steady, no service alarms, uptime showing 41 days.",
          "target": {
            "componentId": "router",
            "label": "Router service status",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-links",
          "title": "Check LAN and WAN link LEDs",
          "explanation": "Look across the LAN port bank and the WAN port to see which links are lit.",
          "why": "Machines already working on the guest floor suggest the cabling is good; reading the LEDs turns that suggestion into recorded evidence.",
          "expectedObservation": "All four LAN LEDs green with clients attached and the WAN LED solid.",
          "target": {
            "componentId": "router-lan",
            "label": "LAN switch port LEDs",
            "cameraPreset": "router-lan"
          },
          "actionId": "check-links"
        },
        {
          "id": "guide-scope",
          "title": "Read the DHCP scope counters",
          "explanation": "Open the DHCP service and read how many leases are in use and how many are free.",
          "why": "DHCP — the service that hands each device its address — leases from a scope, a pool of fixed size that these counters report directly.",
          "expectedObservation": "Scope 10.32.4.0/24 shows 254 of 254 leases in use with 12 requests waiting in the decline queue.",
          "target": {
            "componentId": "router-dhcp",
            "label": "DHCP scope counters",
            "cameraPreset": "router-full"
          },
          "actionId": "check-dhcp",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-reclaim",
          "title": "Reclaim leases and widen the scope",
          "explanation": "Release the lapsed leases back to the pool and extend the scope range for the new starters.",
          "why": "The counters showed no free leases with links proven, so recovering abandoned addresses is the smallest change that matches the evidence.",
          "expectedObservation": "Free leases rise to 12 and the new laptops pull 10.32.4.63 and 10.32.4.64.",
          "target": {
            "componentId": "router-dhcp",
            "label": "DHCP scope range",
            "cameraPreset": "router-full"
          },
          "actionId": "reclaim-and-extend-scope"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and service status",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Confirm the router is running normally before reading services.",
        feedback:
          "Power LED steady, service panel free of alarms, uptime 41 days — the router itself is healthy.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A hardware alarm would invalidate every service reading taken afterwards, so power is cleared first at almost no cost.",
          evidenceGain: "Power and chassis healthy — hardware faults ruled out before addressing work.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "service status", "uptime", "panel", "leds"],
      },
      {
        id: "check-links",
        label: "Check link LEDs across the LAN ports",
        kind: "inspect",
        tool: "inspection",
        component: "router-lan",
        inspectTarget: "router-lan",
        description: "Rule out the internal switching path and the uplink in one look.",
        feedback:
          "All four LAN LEDs green with clients attached, WAN LED solid — no cabling fault anywhere in the box.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Working machines on the same floor already suggest the cables are good; confirming the LEDs turns that suggestion into recorded evidence.",
          evidenceGain:
            "Link LEDs green on LAN and WAN — cabling and uplink ruled out, fault sits above layer 1.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["link led", "lan ports", "cable light", "switch ports"],
      },
      {
        id: "check-dhcp",
        label: "Read the DHCP scope counters",
        kind: "inspect",
        tool: "device-panel",
        component: "router-dhcp",
        inspectTarget: "router-dhcp",
        description: "Open the scope and read how many addresses are actually available.",
        patch: { router: { dhcpChecked: true } },
        feedback:
          "Scope 10.32.4.0/24: 254 of 254 leases in use, 12 requests in the decline queue",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With links proven and only new machines failing, the scope counters are the direct measurement of the resource those machines are competing for.",
          evidenceGain:
            "Every address in the scope is allocated — new clients have nothing to lease; uplink ruled out.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["scope", "leases", "dhcp pool", "address counters", "decline queue"],
      },
      {
        id: "reclaim-and-extend-scope",
        label: "Reclaim expired leases and extend the scope",
        kind: "ui",
        tool: "device-panel",
        component: "router-dhcp",
        inspectTarget: "router-dhcp",
        description: "Release lapsed leases and widen the pool for the new starters.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.dhcpChecked",
          value: true,
        },
        patch: { router: { dhcpPoolFree: 12 } },
        feedback:
          "Twelve lapsed leases released back to the pool and the scope widened to .128–.250 — the new laptops are leasing 10.32.4.63 and 10.32.4.64 within seconds.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The counter showed zero free leases with healthy links, so recovering abandoned addresses and adding headroom restores capacity without redesigning addressing.",
          evidenceGain: "Free leases available again — clients obtain addresses and reach the network.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["free up leases", "extend pool", "widen scope", "release expired"],
      },
      {
        id: "manual-static-wrong",
        label: "Give each new laptop a static address",
        kind: "ui",
        tool: "device-panel",
        component: "router-dhcp",
        inspectTarget: "router-dhcp",
        description: "Bypass the exhausted scope by hand-addressing the new machines.",
        patch: { router: {} },
        feedback:
          "Hand-addressing twenty machines works today, but the next starter repeats the work and every typo becomes a duplicate-address ticket next month.",
        evaluation: {
          grade: "risky",
          rationale:
            "Static addressing hides a capacity problem instead of solving it, and twenty manually entered addresses are twenty future conflicts waiting to happen.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["static ip", "manual address", "hardcode the address", "assign manually"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.dhcpServing", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["manual-static-wrong"],
        },
        feedback:
          "Static addressing papers over a full pool — the scope still has no room for the next machine that walks in.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Compare the machines that fail with the machines that work — the split tells you which layer to open first.",
        category: "method",
      },
      {
        level: 2,
        text: "A DHCP lease is borrowed, not owned: addresses only return to the pool when their time runs out.",
        category: "concept",
      },
      {
        level: 3,
        text: "The scope view reports leases in use, leases free, and anything waiting in the decline queue — read those three numbers.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The 10.32.4.0/24 scope had allocated all 254 usable addresses, many of them to laptops that left months ago, so every new client's discover request went unanswered.",
      whyItWorked:
        "Green link LEDs and the failing-versus-working split pointed at address supply rather than cabling, and the scope counters named the exhaustion with hard numbers before anything was changed. Hand-addressing twenty laptops would have masked the shortage and created a duplicate-address backlog. Transferable principle: when only newly joined clients fail, read the resource counter — capacity exhaustion presents itself as a connectivity failure.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Twenty starters cannot get online on the guest floor while existing machines continue to work.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Power and service status, LAN and WAN link LEDs, then the scope counters.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Cabling, uplink, and router hardware ruled out by solid LEDs; failure isolated to address supply.",
        },
        {
          step: "Apply fix",
          whatLearnerDid:
            "Released twelve lapsed leases and widened the scope to give the floor headroom.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Free leases reported and the new laptops pulled fresh addresses.",
        },
      ],
      followUps: [
        "Try router-nat-disabled, where leases are handed out cleanly but nothing returns from the internet.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics"],
    references: [],
  },
  {
    id: "router-cable-loose-wan",
    version: 1,
    title: "Internet dropped after the cleaner visited the comms room",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Start a no-internet fault at the physical layer when a room was worked on overnight",
      "Confirm an uplink fault from both link LEDs before replacing any hardware",
    ],
    prerequisites: ["router-wan-misconfigured"],
    skills: ["router", "network-cabling", "troubleshooting-method"],
    ticket: {
      id: "HD-1035",
      user: "Aisha Karim",
      role: "Office manager",
      symptomPlainLanguage:
        "We have had no internet since the office opened. Wi-Fi connects and the computers are fine — it is only anything outside the building that will not load.",
      priority: "medium",
      channel: "walkup",
      additionalContext: "Cleaning crew was in the comms room overnight.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-wan", cameraPreset: "router-wan" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: false,
          wanPortOk: true,
          upstreamOk: true,
          wanConfigOk: true,
          natEnabled: true,
          lanCableSeated: true,
          dhcpEnabled: true,
          dhcpPoolFree: 20,
          powerOk: true,
          wanLink: false,
          wanReachable: false,
          lanLink: true,
          dhcpServing: true,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      { id: "h-loose", label: "WAN cable knocked loose overnight", initiallyPlausible: true },
      { id: "h-isp", label: "ISP outage overnight", initiallyPlausible: true },
      { id: "h-config", label: "Router configuration changed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Work from the box outward — power, then the connector the room was worked around — before ordering anything.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check router power and status lights",
          "explanation": "Read the power LED and alarm codes in the device panel before anything else.",
          "why": "A tripped supply during the overnight clean would produce this same total outage, so power is the cheapest fact to clear first.",
          "expectedObservation": "Power LED green, fans spinning, no alarm codes.",
          "target": {
            "componentId": "router",
            "label": "Router status lights",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-wan-physical",
          "title": "Inspect the WAN connector and LED",
          "explanation": "Look at the WAN uplink where it enters the router and compare its LED with the modem's.",
          "why": "The WAN uplink — the single cable carrying all site traffic out — is what someone working in the room could have touched.",
          "expectedObservation": "The RJ-45 sits proud of its latch and the WAN LED is dark while the modem link stays up.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN uplink connector and LED",
            "cameraPreset": "router-wan"
          },
          "actionId": "check-wan-physical",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-reseat",
          "title": "Reseat the WAN uplink cable",
          "explanation": "Push the connector into the WAN port until the latch clicks fully home.",
          "why": "The inspection found an unseated connector with the modem still healthy, so seating it is the entire repair and costs nothing.",
          "expectedObservation": "The latch clicks past the port and the WAN LED lights within a second.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN uplink connector",
            "cameraPreset": "router-wan"
          },
          "actionId": "reseat-wan-cable"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and status lights",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Confirm the box survived the overnight visit.",
        feedback:
          "Power LED green, fans spinning, no alarm codes — the router restarted cleanly this morning.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A tripped supply during cleaning would produce the same total outage, so power is the cheapest thing to clear first.",
          evidenceGain: "Power confirmed — dead hardware and a supply cut ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "status light", "alarm", "leds"],
      },
      {
        id: "check-wan-physical",
        label: "Inspect the WAN cable and its link LED",
        kind: "inspect",
        tool: "inspection",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Look at the uplink the cleaning crew worked around.",
        patch: { router: { wanChecked: true } },
        feedback:
          "WAN RJ-45 not latched in the port; WAN LED dark while the modem link stays up",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Overnight physical work in the room is the strongest lead available, and the connector itself is the fastest evidence to collect.",
          evidenceGain:
            "WAN LED dark at the router with the modem still linked — modem, ISP, and LAN ruled out; uplink cable ruled in.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["wan cable", "rj45", "link led", "connector", "unplugged"],
      },
      {
        id: "reseat-wan-cable",
        label: "Reseat the WAN uplink cable",
        kind: "ui",
        tool: "inspection",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Push the connector home until the latch engages.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.wanChecked",
          value: true,
        },
        patch: { router: { wanCableSeated: true } },
        feedback:
          "The RJ-45 clicked past the latch and the WAN LED lit within a second — link restored to the modem.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The inspection found an unseated connector with the modem still healthy, so seating it is the entire repair and costs nothing.",
          evidenceGain: "WAN link restored — internet path re-proven end to end.",
        },
        matchHints: ["reseat", "push the cable in", "click connector", "reconnect uplink"],
      },
      {
        id: "replace-router-wrong",
        label: "Swap in a spare router from stores",
        kind: "ui",
        tool: "inspection",
        component: "router",
        inspectTarget: "router",
        description: "Replace hardware without reseating the uplink.",
        patch: { router: {} },
        feedback:
          "The spare boots into the same unseated lead — you spend the morning re-cabling for nothing while the branch stays offline.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "An unseated RJ-45 follows the cable, not the box; a replacement inherits exactly the same loose connection.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["spare router", "replace router", "swap the box", "new hardware"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.wanLink", value: true },
      { type: "stateEquals", path: "router.wanReachable", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["replace-router-wrong"],
        },
        feedback:
          "A spare router plugged into the same loose lead fails identically — the fault travels with the cable, not the box.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Someone was physically in the comms room overnight — what could a trolley or a vacuum have touched?",
        category: "method",
      },
      {
        level: 2,
        text: "Uplinks have a LED at each end: a dark one at the router while the modem stays lit points at the cable between them.",
        category: "concept",
      },
      {
        level: 3,
        text: "Inspect the WAN port before you order anything — the connector's latch tells you the whole story.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The WAN RJ-45 had been knocked out of its latch during the overnight clean, so the router lost its uplink while the LAN carried on normally.",
      whyItWorked:
        "Power cleared the box in seconds, and one look at the WAN port showed the connector sitting proud with its LED dark — evidence collected before any part was ordered. Swapping the router would have reproduced the fault in new hardware. Transferable principle: when a room was physically touched overnight, prove the connectors before you suspect configuration or replacements.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Total loss of internet since arrival, with an overnight cleaning crew in the comms room.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Power and status lights, then the WAN connector and its link LED.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power, modem sync, and the LAN side ruled out; fault isolated to the uplink connector.",
        },
        { step: "Apply fix", whatLearnerDid: "Seated the WAN RJ-45 until the latch engaged." },
        {
          step: "Verify",
          whatLearnerDid: "WAN LED lit, gateway reachable, clients back online.",
        },
      ],
      followUps: [
        "Try router-wan-misconfigured, where the cable is seated but the interface speaks the wrong protocol.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "router-nat-disabled",
    version: 1,
    title: "Router reaches the internet but clients cannot",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate router-originated success from client-originated traffic",
      "Recognise missing source translation from an empty NAT table",
    ],
    prerequisites: ["router-wan-misconfigured"],
    skills: ["router", "nat", "troubleshooting-method"],
    ticket: {
      id: "HD-1036",
      user: "Victor Nguyen",
      role: "Network technician",
      symptomPlainLanguage:
        "After yesterday's maintenance the router itself pings out fine — I can reach 203.0.113.1 from its CLI — but every laptop on the LAN times out on the same target.",
      priority: "high",
      channel: "portal",
      additionalContext: "A colleague tidied firewall rules yesterday.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-nat", cameraPreset: "router-full" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: true,
          wanPortOk: true,
          upstreamOk: true,
          wanConfigOk: true,
          natEnabled: false,
          lanCableSeated: true,
          dhcpEnabled: true,
          dhcpPoolFree: 20,
          powerOk: true,
          wanLink: true,
          wanReachable: true,
          lanLink: true,
          dhcpServing: true,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      { id: "h-nat", label: "Masquerade rule removed in the tidy-up", initiallyPlausible: true },
      {
        id: "h-clients",
        label: "Clients mis-addressed or missing a gateway",
        initiallyPlausible: true,
      },
      {
        id: "h-acl",
        label: "Upstream ACL dropping the LAN subnet",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      "intro": "Separate what the router can reach itself from what its clients need, then inspect the stage only client traffic crosses.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check power and front panel",
          "explanation": "Confirm in the device panel that the router is healthy after yesterday's maintenance.",
          "why": "The reporter already pings out from the router's own CLI, so confirm the panel agrees before reading services.",
          "expectedObservation": "Power LED green, management responsive, no alarm entries.",
          "target": {
            "componentId": "router",
            "label": "Router front panel",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-client-leases",
          "title": "Check client leases and gateway",
          "explanation": "Open the DHCP service and read the leases the ten laptops hold, including their gateway.",
          "why": "Clients that reach nothing might simply lack a gateway — the address devices use to leave their own network — so addressing is cleared first.",
          "expectedObservation": "Ten clients hold 10.32.4.x leases with gateway and DNS both set to 10.32.4.1.",
          "target": {
            "componentId": "router-dhcp",
            "label": "DHCP client bindings",
            "cameraPreset": "router-full"
          },
          "actionId": "check-client-dhcp",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-nat-table",
          "title": "Read the NAT translation table",
          "explanation": "Open the NAT / forwarding view and look for live source translations from LAN to WAN.",
          "why": "NAT — network address translation — rewrites private LAN addresses into the public address before traffic leaves; its table shows what is rewritten right now.",
          "expectedObservation": "The NAT table is empty and the masquerade rule is listed as missing.",
          "target": {
            "componentId": "router-nat",
            "label": "NAT / forwarding table",
            "cameraPreset": "router-full"
          },
          "actionId": "check-nat"
        },
        {
          "id": "guide-enable-nat",
          "title": "Enable NAT masquerading",
          "explanation": "Restore source translation for traffic leaving the WAN interface.",
          "why": "The empty table named the missing stage, so restoring translation is the single change that reconnects private clients to the internet.",
          "expectedObservation": "The table fills with 10.32.4.x sessions rewriting to 203.0.113.26 and clients browse again.",
          "target": {
            "componentId": "router-nat",
            "label": "NAT / forwarding rules",
            "cameraPreset": "router-full"
          },
          "actionId": "enable-nat"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and front panel",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Confirm the device is healthy after yesterday's work.",
        feedback:
          "Power LED green, management responsive, no alarm entries — the router itself is in good order.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A healthy panel matches the reporter's own probe success, so hardware can be dismissed before the search moves to services.",
          evidenceGain: "Power and management access confirmed — hardware faults ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "front panel", "management", "alarms"],
      },
      {
        id: "check-client-dhcp",
        label: "Check client leases and gateway on the LAN",
        kind: "inspect",
        tool: "device-panel",
        component: "router-dhcp",
        inspectTarget: "router-dhcp",
        description: "Prove the clients are addressed correctly before blaming translation.",
        patch: { router: { dhcpChecked: true } },
        feedback:
          "Ten clients hold valid 10.32.4.0/24 leases with 10.32.4.1 as gateway and DNS — addressing is fine.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Clients that cannot reach anything might simply lack a gateway; clearing addressing first keeps the translation hypothesis honest.",
          evidenceGain:
            "Clients hold valid leases with the correct gateway — addressing ruled out as the cause.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["leases", "client address", "gateway", "dhcp bindings"],
      },
      {
        id: "check-nat",
        label: "Read the NAT translation table",
        kind: "inspect",
        tool: "device-panel",
        component: "router-nat",
        inspectTarget: "router-nat",
        description: "Look for live source translations from the LAN to the WAN.",
        patch: { router: { natChecked: true } },
        feedback:
          "NAT table empty, masquerade rule missing — LAN packets leave untranslated and the upstream drops them",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "With addressing cleared and the router's own probes passing, the translation table is the one remaining place a client-only failure can hide.",
          evidenceGain:
            "No masquerade entry present — translation identified as the missing stage; uplink and addressing ruled out.",
          learnMore: "gateway-vs-dns",
        },
        matchHints: ["nat table", "translations", "masquerade rule", "source address"],
      },
      {
        id: "enable-nat",
        label: "Enable NAT masquerading",
        kind: "ui",
        tool: "device-panel",
        component: "router-nat",
        inspectTarget: "router-nat",
        description: "Restore source translation for traffic leaving the WAN interface.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.natChecked",
          value: true,
        },
        patch: { router: { natEnabled: true } },
        feedback:
          "Masquerade rule restored — the table fills with 10.32.4.x sessions rewriting to 203.0.113.26 and clients browse again.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The empty table named the fault exactly, so restoring source translation is the single change that reconnects private clients to the public internet.",
          evidenceGain: "Translations flowing — client path verified end to end.",
        },
        matchHints: ["enable nat", "masquerade", "source translation", "nat rule"],
      },
      {
        id: "bypass-router-wrong",
        label: "Point the clients straight at the modem",
        kind: "ui",
        tool: "inspection",
        component: "router",
        inspectTarget: "router",
        description: "Work around the gateway instead of fixing translation.",
        patch: { router: {} },
        feedback:
          "The laptops would browse with no firewall and no translation discipline — you have traded one ticket for a flat, exposed network.",
        evaluation: {
          grade: "risky",
          rationale:
            "Bypassing the gateway removes the firewall and the address translation protecting the LAN, and it never explains why translation stopped.",
          learnMore: "gateway-vs-dns",
        },
        matchHints: ["bypass router", "direct to modem", "drop the gateway", "client direct out"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.natEnabled", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["bypass-router-wrong"],
        },
        feedback:
          "Sending clients around the router hides the missing translation and strips away the firewall the site depends on.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The router's own probes succeed while every client fails — which hop does only client traffic have to cross?",
        category: "method",
      },
      {
        level: 2,
        text: "Private LAN addresses are not routable on the public internet; something has to rewrite them before they leave.",
        category: "concept",
      },
      {
        level: 3,
        text: "The NAT table lists live translations as sessions pass — an empty one while clients are trying to browse is the answer in plain sight.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "Yesterday's firewall tidy-up removed the masquerade rule, so client traffic left the WAN interface carrying private 10.32.4.x source addresses and was dropped upstream.",
      whyItWorked:
        "Proving the router could reach the internet isolated the fault to the client-only path, the lease check cleared addressing, and the empty NAT table named the missing stage. Bypassing the gateway would have restored browsing while removing protection. Transferable principle: when the device works but its clients do not, inspect the service the device is supposed to provide for them rather than the device's own connectivity.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Router-originated pings succeed after maintenance while every LAN client times out.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Power and panel status, client lease and gateway bindings, then the NAT translation table.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Hardware, uplink, and client addressing ruled out; fault narrowed to source translation.",
        },
        { step: "Apply fix", whatLearnerDid: "Restored the masquerade rule on the WAN interface." },
        {
          step: "Verify",
          whatLearnerDid:
            "Translation table populated and clients reached external targets again.",
        },
      ],
      followUps: [
        "Compare with router-dhcp-exhausted, where addressing fails before translation is ever reached.",
      ],
    },
    knowledgeLinks: ["gateway-vs-dns", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "router-upstream-outage",
    version: 1,
    title: "Everything looks configured but the site is offline",
    category: "hardware",
    difficulty: "intermediate",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Prove your own configuration correct before editing it under outage pressure",
      "Locate the first dead hop and escalate across the responsibility boundary with evidence",
    ],
    prerequisites: ["router-wan-misconfigured"],
    skills: ["router", "wan-configuration", "troubleshooting-method"],
    ticket: {
      id: "HD-1037",
      user: "Grace Adeyemi",
      role: "Regional IT lead",
      symptomPlainLanguage:
        "The branch is down. I have been through the router configuration myself and it matches the ISP handoff sheet line for line, but nothing gets out.",
      priority: "high",
      channel: "phone",
      additionalContext: "A neighbouring site reported the same problem at 08:10.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-wan", cameraPreset: "router-wan" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: true,
          wanPortOk: true,
          upstreamOk: false,
          wanConfigOk: true,
          natEnabled: true,
          lanCableSeated: true,
          dhcpEnabled: true,
          dhcpPoolFree: 20,
          powerOk: true,
          wanLink: true,
          wanReachable: false,
          lanLink: true,
          dhcpServing: true,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-config",
        label: "WAN configuration drifted from the ISP sheet",
        initiallyPlausible: true,
      },
      { id: "h-upstream", label: "Fault beyond the handoff in the ISP network", initiallyPlausible: true },
      { id: "h-port", label: "Router WAN port failing", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Prove everything inside your responsibility first, then find the exact hop where answers stop before you escalate.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check power and system status",
          "explanation": "Read the power LED, management response, and uptime in the device panel.",
          "why": "An escalation has to state that local hardware was checked, so power and uptime are recorded before the pressure to act grows.",
          "expectedObservation": "Power LED green, management responsive, uptime 87 days with no resets.",
          "target": {
            "componentId": "router",
            "label": "Router system status",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-verify-wan",
          "title": "Verify WAN settings against the sheet",
          "explanation": "Compare every handoff parameter on the WAN page with the values the ISP published for this site.",
          "why": "Under outage pressure re-reading your own settings feels slow, but an escalation only carries weight once your side is documented as correct.",
          "expectedObservation": "Each parameter matches the ISP sheet and the modem link reads up.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN interface settings",
            "cameraPreset": "router-wan"
          },
          "actionId": "check-wan-config",
          "conceptId": "ip-addressing-basics"
        },
        {
          "id": "guide-probe",
          "title": "Trace to the first ISP hop",
          "explanation": "Run the path trace from the WAN page and watch where replies stop coming back.",
          "why": "A hop is one router the traffic passes through; the first one that never answers marks where responsibility moves to the provider.",
          "expectedObservation": "The trace dies at the first ISP hop while the modem's sync LED stays normal.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN path trace",
            "cameraPreset": "router-wan"
          },
          "actionId": "probe-upstream"
        },
        {
          "id": "guide-escalate",
          "title": "Escalate the outage with the trace",
          "explanation": "Raise a provider ticket carrying the trace output and the verified configuration.",
          "why": "Every layer your team owns is now cleared, so the only action that restores service is handing the provider proof of where the path dies.",
          "expectedObservation": "The provider confirms a fault past the handoff and the trace completes to the internet.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN uplink and provider handoff",
            "cameraPreset": "router-wan"
          },
          "actionId": "escalate-outage"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and system status",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Confirm the local box is alive before questioning anyone else's.",
        feedback:
          "Power LED green, management responsive, uptime 87 days with no resets — the site's own router is healthy.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "An outage escalation has to state that local hardware was checked, so power and uptime are recorded first.",
          evidenceGain: "Power and management access healthy — local hardware ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "uptime", "system status", "management", "panel"],
      },
      {
        id: "check-wan-config",
        label: "Verify the WAN settings against the ISP sheet",
        kind: "inspect",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Re-read every handoff parameter against the published values.",
        patch: { router: { wanChecked: true } },
        feedback:
          "Config verified against the ISP sheet — matches; link to the modem is up",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Pressure to act quickly makes re-verifying local settings feel slow, but escalation only carries weight once your side is documented as correct.",
          evidenceGain:
            "WAN configuration matches the ISP sheet and the modem link is up — local configuration ruled out.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["wan settings", "isp sheet", "handoff parameters", "verify config"],
      },
      {
        id: "probe-upstream",
        label: "Trace the path to the first ISP hop",
        kind: "inspect",
        tool: "inspection",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Find the exact hop where responses stop coming back.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.wanChecked",
          value: true,
        },
        patch: { router: { probeDone: true } },
        feedback:
          "Traceroute dies at the first ISP hop; the modem's sync LED is normal — fault is beyond our equipment",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A dead first hop behind a green local link splits the path precisely at the handoff, which is the boundary any escalation has to name.",
          evidenceGain:
            "first hop dead with healthy local config — upstream ruled in, our gear ruled out",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["traceroute", "trace", "first hop", "probe", "path test"],
      },
      {
        id: "escalate-outage",
        label: "Escalate the outage to the ISP with the probe evidence",
        kind: "ui",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Raise a provider ticket carrying the trace output and the verified config.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.probeDone",
          value: true,
        },
        patch: { router: { upstreamOk: true } },
        feedback:
          "ISP confirms a metro fibre cut; traffic restored over the protected path once they cleared it",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Every layer the team owns has been cleared, so the only action that can restore service is the one that hands the provider proof of where the path dies.",
          evidenceGain:
            "Upstream restored by the provider — reachability re-proven and the client path back to normal.",
        },
        matchHints: ["escalate", "raise with isp", "provider ticket", "call the carrier"],
      },
      {
        id: "reconfigure-wan-wrong",
        label: "Rewrite the WAN settings from the ISP portal",
        kind: "ui",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Change settings that were just verified as correct.",
        patch: { router: {} },
        feedback:
          "You overwrite a configuration that already matched the sheet — the branch stays down and you can no longer prove what changed.",
        evaluation: {
          grade: "risky",
          rationale:
            "Editing verified-good settings hides the real fault behind your own change and can lock the handoff while a neighbouring site is reporting the same outage.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["reconfigure", "rewrite wan", "apply isp defaults", "reset settings"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.upstreamOk", value: true },
      { type: "stateEquals", path: "router.wanReachable", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reconfigure-wan-wrong"],
        },
        feedback:
          "Rewriting settings you already verified replaces real evidence with your own guess — and the neighbouring site's identical outage never depended on your configuration.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The configuration matches the ISP sheet and a neighbouring site reported the same outage at 08:10 — what does that do to your hypothesis list?",
        category: "method",
      },
      {
        level: 2,
        text: "Every handoff has a boundary: past the modem's sync point, the fault and the fix belong to the provider.",
        category: "concept",
      },
      {
        level: 3,
        text: "Trace toward the internet and find the first hop that never answers — that hop is where responsibility sits.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "A metro fibre cut upstream of the handoff took the site offline; the router's configuration was correct throughout and needed no changes.",
      whyItWorked:
        "The local checks closed every layer the team owned — power, WAN settings, modem sync — and the trace named the first dead hop outside that boundary, so escalation arrived with proof instead of a hunch. Editing a verified interface would have hidden the fault behind a self-inflicted change. Transferable principle: rule out everything inside your responsibility first, then escalate past the boundary showing exactly where the path dies.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Site offline with a configuration that already matches the ISP sheet, and a neighbouring site reporting the same at 08:10.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Power and uptime, WAN parameters checked line by line against the ISP sheet, traceroute toward the first provider hop.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Local configuration, modem sync, and router hardware ruled out — the fault sits beyond the handoff.",
        },
        {
          step: "Apply fix",
          whatLearnerDid:
            "Raised the outage with the ISP and attached the probe output showing the dead first hop.",
        },
        {
          step: "Verify",
          whatLearnerDid:
            "Provider cleared the fibre cut; reachability and the client path returned over the protected route.",
        },
      ],
      followUps: [
        "Try router-wan-misconfigured, where the local configuration genuinely does not match the handoff.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "router-lan-link-down",
    version: 1,
    title: "Wired desks went dark while Wi-Fi kept working",
    category: "hardware",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Use the difference between working and failing clients as the first piece of evidence",
      "Work from a dead LAN LED to the trunk cable that feeds the floor",
    ],
    prerequisites: ["router-wan-misconfigured"],
    skills: ["router", "network-cabling", "troubleshooting-method"],
    ticket: {
      id: "HD-1038",
      user: "Owen Hale",
      role: "Service desk analyst",
      symptomPlainLanguage:
        "Four wired desks on the second floor dropped off the network at lunchtime. Everyone on Wi-Fi and the whole third floor are unaffected — it is only the second-floor wired row.",
      priority: "medium",
      channel: "phone",
      additionalContext: "The rack was wheeled back into place during a delivery.",
    },
    environment: {
      kind: "equipment-bench",
      deviceFamily: "router",
      shell: "none",
      availableTools: ["device-panel", "inspection"],
      enabledCommands: [],
      components: ["router", "router-wan", "router-lan", "router-dhcp", "router-nat"],
      showInspector: true,
      focusTarget: { componentId: "router-lan", cameraPreset: "router-lan" },
      initialWorld: {
        router: {
          powerOn: true,
          wanCableSeated: true,
          wanPortOk: true,
          upstreamOk: true,
          wanConfigOk: true,
          natEnabled: true,
          lanCableSeated: false,
          dhcpEnabled: true,
          dhcpPoolFree: 20,
          powerOk: true,
          wanLink: true,
          wanReachable: true,
          lanLink: false,
          dhcpServing: false,
          clientPath: false,
        },
      },
    },
    hypotheses: [
      { id: "h-trunk", label: "Trunk cable to the patch panel pulled out", initiallyPlausible: true },
      { id: "h-isp", label: "Internet outage affecting the whole site", initiallyPlausible: true },
      { id: "h-dhcp", label: "Address scope ran out", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      "intro": "Start from the split between Wi-Fi that works and the wired row that does not, then isolate one layer at a time.",
      "steps": [
        {
          "id": "guide-power",
          "title": "Check power after the rack move",
          "explanation": "Read the power LED and chassis alarms in the device panel first.",
          "why": "A rack shift can pinch a power lead as easily as a data lead, so power is cleared before the network search.",
          "expectedObservation": "Power LED green, fans steady, no chassis alarms.",
          "target": {
            "componentId": "router",
            "label": "Router chassis status",
            "cameraPreset": "router-full"
          },
          "actionId": "check-power",
          "conceptId": "troubleshooting-method"
        },
        {
          "id": "guide-wan",
          "title": "Confirm the WAN side is healthy",
          "explanation": "Read the WAN LED and run the gateway trace to see whether the whole site is affected.",
          "why": "A clean WAN read removes the provider from the suspect list and keeps the search inside the building, where the failing row lives.",
          "expectedObservation": "WAN LED green, the gateway answering, and a clean trace to 203.0.113.1.",
          "target": {
            "componentId": "router-wan",
            "label": "WAN port and status",
            "cameraPreset": "router-wan"
          },
          "actionId": "check-wan"
        },
        {
          "id": "guide-lan-physical",
          "title": "Inspect the LAN ports and LEDs",
          "explanation": "Look at the four LAN ports and follow the trunk cable that feeds the second-floor patch panel.",
          "why": "A trunk — the single cable carrying a whole floor's traffic — shows its state in the port LEDs at a glance.",
          "expectedObservation": "All four LAN LEDs dark with the trunk connector hanging a centimetre clear of its port.",
          "target": {
            "componentId": "router-lan",
            "label": "LAN ports and trunk cable",
            "cameraPreset": "router-lan"
          },
          "actionId": "check-lan-physical",
          "conceptId": "network-cabling-basics"
        },
        {
          "id": "guide-reseat-trunk",
          "title": "Reconnect the LAN trunk cable",
          "explanation": "Seat the trunk connector at both ends — router port and second-floor patch panel — until it clicks.",
          "why": "The dark LEDs and the proud connector describe the same break, so seating the trunk is the smallest change that restores the whole row.",
          "expectedObservation": "All four LAN LEDs light together and the desks pull fresh leases within seconds.",
          "target": {
            "componentId": "router-lan",
            "label": "Trunk cable at the LAN ports",
            "cameraPreset": "router-lan"
          },
          "actionId": "reseat-lan-trunk"
        }
      ]
    },
    actions: [
      {
        id: "check-power",
        label: "Check router power and chassis status",
        kind: "inspect",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Confirm the router survived the rack being moved.",
        feedback:
          "Power LED green, fans steady, no chassis alarms — the router restarted cleanly after the rack shift.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A rack move can pinch a power lead as easily as a data lead, so power is cleared before the network search begins.",
          evidenceGain: "Power confirmed — a supply fault ruled out.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["power", "chassis", "status", "leds"],
      },
      {
        id: "check-wan",
        label: "Confirm the WAN side is still healthy",
        kind: "inspect",
        tool: "device-panel",
        component: "router-wan",
        inspectTarget: "router-wan",
        description: "Check whether the whole site or only the wired floor is affected.",
        feedback:
          "WAN LED green, gateway answering, traceroute clean to 203.0.113.1 — the internet side of the box is untouched.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "A clean WAN read removes the provider from the suspect list and keeps the search inside the building, where the failing group actually lives.",
          evidenceGain:
            "WAN reachability confirmed — ISP, uplink, and WAN configuration ruled out.",
          learnMore: "ip-addressing-basics",
        },
        matchHints: ["wan", "uplink", "traceroute", "gateway", "internet side"],
      },
      {
        id: "check-lan-physical",
        label: "Inspect the LAN ports and their link LEDs",
        kind: "inspect",
        tool: "inspection",
        component: "router-lan",
        inspectTarget: "router-lan",
        description: "Look at the internal switch ports that serve the wired row.",
        patch: { router: { lanChecked: true } },
        feedback:
          "All four LAN LEDs dark; the trunk to the second-floor patch panel hangs a centimetre clear of its port.",
        isDiagnostic: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "Only the wired row failed, so the shared internal switch fabric is the natural place to look, and the LEDs show its state in one glance.",
          evidenceGain:
            "LAN LEDs dark with the trunk unseated — WAN and addressing ruled out, fault located at the internal switch.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["lan ports", "link led", "trunk", "patch panel", "switch ports"],
      },
      {
        id: "reseat-lan-trunk",
        label: "Reconnect the LAN trunk to the patch panel",
        kind: "ui",
        tool: "inspection",
        component: "router-lan",
        inspectTarget: "router-lan",
        description: "Seat the trunk connector at both ends of the floor run.",
        appliesWhen: {
          type: "stateEquals",
          path: "router.lanChecked",
          value: true,
        },
        patch: { router: { lanCableSeated: true } },
        feedback:
          "The trunk clicked home and all four LAN LEDs lit together — the second-floor desks pulled fresh leases within seconds.",
        isFix: true,
        evaluation: {
          grade: "optimal",
          rationale:
            "The dark LEDs and the proud connector describe the same break, so seating the trunk is the smallest change that restores the whole row.",
          evidenceGain: "LAN link restored — DHCP serving again and the client path verified.",
        },
        matchHints: ["reconnect trunk", "seat the cable", "plug in trunk", "reseat connector"],
      },
      {
        id: "reboot-router-wrong",
        label: "Reboot the router to refresh the LAN",
        kind: "ui",
        tool: "device-panel",
        component: "router",
        inspectTarget: "router",
        description: "Restart the box instead of seating the trunk cable.",
        patch: { router: {} },
        feedback:
          "The WAN side was already proven healthy and the LAN LEDs are dark — a reboot leaves the trunk exactly where it is hanging and drops the Wi-Fi clients too.",
        evaluation: {
          grade: "unnecessary",
          rationale:
            "Rebooting a router whose WAN side is verified good cannot re-seat an internal trunk; it only interrupts the wireless clients who were never affected.",
          learnMore: "troubleshooting-method",
        },
        matchHints: ["reboot", "restart the router", "power cycle", "refresh the lan"],
      },
    ],
    successConditions: [
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    verificationSteps: [
      { type: "stateEquals", path: "router.lanLink", value: true },
      { type: "stateEquals", path: "router.dhcpServing", value: true },
      { type: "stateEquals", path: "router.clientPath", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-router-wrong"],
        },
        feedback:
          "A reboot cannot plug a cable back in — the desks stay dark and you have taken the working wireless network down with them.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Wi-Fi clients work while the wired row does not — treat that difference as evidence before you change anything.",
        category: "method",
      },
      {
        level: 2,
        text: "A switch only serves ports that have link: a dark LAN LED means the segment never came up at all.",
        category: "concept",
      },
      {
        level: 3,
        text: "Read the LAN port LEDs on the rear panel, then follow the trunk cable to the panel it is supposed to sit in.",
        category: "tool",
      },
    ],
    debrief: {
      rootCause:
        "The trunk cable between the router's LAN switch and the second-floor patch panel had been pulled clear when the rack was shifted, so the whole wired segment lost link while Wi-Fi carried on.",
      whyItWorked:
        "Comparing the working wireless clients against the dark wired row kept the search on the internal path, the healthy WAN read removed the provider, and the dark LAN LEDs led straight to the unseated trunk. Rebooting would have disturbed the working clients and changed nothing on the floor. Transferable principle: when part of the network still works, the difference between the working and failing groups is your first and cheapest evidence.",
      methodologyMap: [
        {
          step: "Understand the problem",
          whatLearnerDid:
            "Second-floor wired desks offline at lunchtime while Wi-Fi and the third floor stay up.",
        },
        {
          step: "Gather evidence",
          whatLearnerDid: "Power and chassis status, WAN health, then the LAN port LEDs.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Power, ISP, and WAN configuration ruled out — fault isolated to the internal switch fabric.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Seated the trunk connector at the router and the patch panel.",
        },
        {
          step: "Verify",
          whatLearnerDid: "All four LAN LEDs lit and the desks pulled fresh leases.",
        },
      ],
      followUps: [
        "Try router-cable-loose-wan, where the same class of fault sits on the WAN uplink instead of the internal trunk.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
];
