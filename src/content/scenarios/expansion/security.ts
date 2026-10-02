import type { ScenarioInput } from "@/content/schema";

export const securityScenarios: ScenarioInput[] = [
  {
    id: "security-task-persistence",
    version: 1,
    title: "Adware keeps reopening after we remove it",
    category: "security",
    difficulty: "foundational",
    scenarioType: "SECURITY_TRIAGE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Trace a recurring detection back to its logon trigger",
      "Separate the payload from the mechanism that respawns it",
      "Kill the running instance before removing its launch path",
    ],
    prerequisites: ["malware-endpoint-alert"],
    skills: ["endpoint-security", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2004",
      user: "Owen Fletcher",
      role: "Claims processor",
      symptomPlainLanguage:
        "We uninstalled the toolbar twice this week and it is back every morning when I log in.",
      priority: "medium",
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
            "Toolbar installer 'Download-Manager-Setup.exe' side-loaded 6 days ago — no downloads since",
          persistenceFound: false,
          persistenceKey:
            "Task Scheduler: SyncHealth → C:\\Users\\Public\\systraychk.exe (runs at logon)",
          quarantined: false,
          persistenceCleared: false,
          scanClean: false,
        },
      },
    },
    hypotheses: [
      { id: "h-relapse", label: "The first removal never got everything", initiallyPlausible: true },
      { id: "h-redownload", label: "User downloads it again each day", initiallyPlausible: true },
      { id: "h-legit", label: "It is a legitimate update module", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Turn the recurrence into a timeline: when it fires, where it comes from, and what launches it — then stop the running instance before touching the launch path.",
      steps: [
        {
          id: "guide-alert",
          title: "Read the recurring detections",
          explanation: "Open SEC-2004, then run Review recurring detections from the Checks list.",
          why: "The toolbar the user sees is the symptom — the detection times tell you what keeps producing it.",
          expectedObservation:
            "Detections at 07:58 on three consecutive mornings — same family label, same file under the Public folder.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2004 in the topbar" },
          actionId: "review-recurring-alert",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-origin",
          title: "Trace the install history",
          explanation:
            "Run Trace the install history from Checks, then read how the file keeps arriving.",
          why: "If nothing new has been downloaded, the file on disk is being regenerated — something local keeps restoring it.",
          expectedObservation:
            "A single installer from six days ago, no downloads since — the current file descends from that one install.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "trace-install-history",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-logon-entries",
          title: "Check the logon launch entries",
          explanation:
            "Run Check logon launch entries from Checks, then read which autorun location holds the reference.",
          why: "Something must start the file at logon — autorun locations are a closed list, and each one is checked the same way.",
          expectedObservation:
            "The Run key and Startup folder are clean, but Task Scheduler has an entry pointing at the Public folder file.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "check-logon-entries",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-quarantine",
          title: "Stop the running instance",
          explanation:
            "From Tools, run Quarantine the running instance and watch the threat state change.",
          why: "Stopping the live process first means nothing races you while you remove what would bring it back.",
          expectedObservation: "A new row reads Threat state: Quarantined — process stopped.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "quarantine-process",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-disable-task",
          title: "Remove the logon trigger",
          explanation:
            "From Tools, run Disable the scheduled task now that the process is stopped.",
          why: "The task is the mechanism that recreated the file — with nothing running, dropping its trigger is the smallest durable change.",
          expectedObservation:
            "A new row reads the task disabled with no remaining logon trigger.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "disable-logon-task",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "review-recurring-alert",
        label: "Review recurring detections",
        kind: "inspect",
        tool: "edr-console",
        patch: { endpoint: { alertReviewed: true } },
        feedback:
          "Detections at 07:58 on three consecutive mornings — same family, same file at C:\\Users\\Public\\systraychk.exe.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The daily rhythm of the detections is the first fact: whatever produces the toolbar runs on a schedule, not on a whim.",
          evidenceGain: "Recurrence is tied to logon time, not to a new download each day.",
        },
        matchHints: ["recurring", "alert history", "detections"],
        isDiagnostic: true,
      },
      {
        id: "trace-install-history",
        label: "Trace the install history",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.alertReviewed", value: true },
        patch: { endpoint: { originTraced: true } },
        feedback:
          "One installer six days ago; no downloads since — the file now on disk descends from that single install.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With no new downloads, the daily reappearance cannot come from the user — the machine itself regenerates the file.",
          evidenceGain:
            "No repeat downloads — something local restores the payload; user-re-download hypothesis drops.",
        },
        matchHints: ["install history", "origin", "downloads"],
        isDiagnostic: true,
      },
      {
        id: "check-logon-entries",
        label: "Check logon launch entries",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.originTraced", value: true },
        patch: { endpoint: { persistenceFound: true } },
        feedback:
          "Run key clean, Startup folder clean — but Task Scheduler has SyncHealth → C:\\Users\\Public\\systraychk.exe at logon.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The respawn mechanism has to live somewhere — walking the autorun list finds the launch path that the removals never touched.",
          evidenceGain: "Respawn path located: scheduled task at logon — not a Run key.",
        },
        matchHints: ["autorun", "logon entries", "startup", "scheduled"],
        isDiagnostic: true,
      },
      {
        id: "quarantine-process",
        label: "Quarantine the running instance",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.persistenceFound", value: true },
        patch: { endpoint: { quarantined: true } },
        feedback: "Running instance terminated and the sample quarantined in the console.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Stopping the live process first cuts what is on screen now and removes any race with the task while you disable it.",
          evidenceGain: "Live instance stopped — no process racing the cleanup.",
        },
        matchHints: ["quarantine", "stop the process", "kill the instance"],
        isFix: true,
      },
      {
        id: "disable-logon-task",
        label: "Disable the scheduled task",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.quarantined", value: true },
        patch: { endpoint: { persistenceCleared: true } },
        feedback: "Task 'SyncHealth' disabled — no logon trigger remains.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the process stopped there is no race — removing the launch path is what keeps the next logon clean.",
          evidenceGain: "Logon trigger removed — the payload has no way back.",
        },
        matchHints: ["disable the task", "remove the trigger", "logon task"],
        isFix: true,
      },
      {
        id: "verify-logon-clean",
        label: "Confirm a clean test logon",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.persistenceCleared", value: true },
        patch: { endpoint: { scanClean: true } },
        feedback: "Test logon: no detection, no toolbar; full scan clean.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket says it returns every morning — only a fresh logon with no detection proves the loop is actually broken.",
          evidenceGain: "Fresh logon clean — recurrence ended.",
        },
        isFix: true,
      },
      {
        id: "delete-task-file-wrong",
        label: "Delete systraychk.exe by hand",
        kind: "ui",
        tool: "edr-console",
        evaluation: {
          grade: "wrong",
          rationale:
            "The scheduled task still fires at logon and recreates the file — deleting it by hand repeats yesterday's result and leaves the respawn path live.",
        },
        feedback: "Deleted — but the task still runs at every logon and will rebuild it.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "endpoint.scanClean", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "endpoint.scanClean", value: true },
      { type: "stateEquals", path: "endpoint.persistenceCleared", value: true },
      { type: "stateEquals", path: "endpoint.quarantined", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["delete-task-file-wrong"] },
        feedback: "Manual deletion leaves the scheduled task in place — tomorrow morning it returns.",
      },
    ],
    hints: [
      { level: 1, text: "Three mornings, the same file — what runs at logon?" },
      {
        level: 2,
        text: "The Run key and Startup folder are clean; the autorun list has more locations than those two.",
      },
      {
        level: 3,
        text: "Stop what is running, remove what would bring it back, then prove it on a fresh logon.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A scheduled task registered by the side-loaded installer relaunches the toolbar dropper at every logon — both earlier removals deleted the file but never the task.",
      whyItWorked:
        "Detection timing, install history and the autorun walk separated payload from mechanism; stopping the instance first meant the task could be disabled with no race, and a fresh logon proved the loop broken. Transferable principle: removal is only durable when the respawn mechanism is removed — hunt the launch path before you delete the payload.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Detection timeline, install history, logon launch entries." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Daily re-download dropped — one installer six days ago, no downloads since; legitimate-module hypothesis dropped — unsigned payload in the Public folder behind a hidden logon task.",
        },
        { step: "Apply fix", whatLearnerDid: "Quarantined the instance, then disabled the scheduled task." },
        { step: "Verify", whatLearnerDid: "Clean test logon with a clean full scan." },
      ],
      followUps: [
        "Block side-loaded installers at the web proxy and coach the user on approved software sources.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "least-privilege-basics"],
    references: [
      {
        title: "MITRE ATT&CK T1053.005 — Scheduled Task",
        url: "https://attack.mitre.org/techniques/T1053/005/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
  {
    id: "security-browser-extension",
    version: 1,
    title: "Homepage keeps changing; logins feel off",
    category: "security",
    difficulty: "beginner",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Distinguish a browser-layer fault from endpoint malware",
      "Judge extension trust from permissions and install source",
      "Scale the response to the strongest evidence actually collected",
    ],
    prerequisites: [],
    skills: ["endpoint-security", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2005",
      user: "Hannah Weiss",
      role: "HR coordinator",
      symptomPlainLanguage:
        "My homepage keeps switching to some search site I never set, and I have had to sign in twice this week.",
      priority: "medium",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["browser-inspector", "edr-console"],
      enabledCommands: [],
      initialWorld: {
        browser: {
          settingsChecked: false,
          extensionsChecked: false,
          extensionFound: false,
          scanRun: false,
          removed: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-ext", label: "A browser extension changed the settings", initiallyPlausible: true },
      { id: "h-malware", label: "Something on the machine is hijacking the browser", initiallyPlausible: true },
      { id: "h-policy", label: "Company policy set the homepage", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Work from the browser outward: prove the settings keep rewriting themselves, name what has write access, then decide how big the response actually is.",
      steps: [
        {
          id: "guide-settings",
          title: "Read the browser settings",
          explanation:
            "Open SEC-2005, then run Review homepage and search settings from the Checks list.",
          why: "A setting that reverts after a reset is being rewritten — the current value plus its persistence is the symptom, not yet the cause.",
          expectedObservation:
            "Homepage reads searchmystart.xyz and reverts within a day of being reset.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2005 in the topbar" },
          actionId: "check-browser-settings",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-extensions",
          title: "List the installed extensions",
          explanation:
            "Run List browser extensions from Checks, then read what each one is allowed to do and where it came from.",
          why: "Extensions are the components with standing permission to change browser settings — their permissions and install source are the trust judgment.",
          expectedObservation:
            "One extension installed outside the store, requesting read-and-change access on every site.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "list-extensions",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-scan",
          title: "Prove the machine itself is clean",
          explanation:
            "Run Run endpoint scan from Checks, then read the scan result before deciding the response size.",
          why: "The response should match the strongest evidence you have — a clean endpoint scan keeps one extension from being treated as an infection.",
          expectedObservation:
            "Full scan clean — no persistence, no injected modules, no alert rows.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "run-endpoint-scan",
          fallback: "the Evidence board on the stage",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-remove",
          title: "Remove the unauthorized extension",
          explanation:
            "From Tools, run Remove the unauthorized extension and watch the settings get pinned back.",
          why: "With the endpoint proven clean, the single unauthorized component is the whole problem — removing exactly it is the proportionate fix.",
          expectedObservation: "A new row reads the extension removed and the homepage pinned.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "remove-extension",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-confirm",
          title: "Prove the settings hold",
          explanation:
            "From Tools, run Confirm settings stay put across a reboot.",
          why: "The ticket is about settings that keep coming back — only a reboot-and-recheck proves the rewrite loop is gone.",
          expectedObservation:
            "The homepage holds after a full day and a reboot; one sign-in per session.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "confirm-settings-stable",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "check-browser-settings",
        label: "Review homepage and search settings",
        kind: "inspect",
        tool: "browser-inspector",
        patch: { browser: { settingsChecked: true } },
        feedback:
          "Homepage and default search read searchmystart.xyz; resets revert within a day.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Establish the exact symptom and its persistence first — a setting that comes back is being rewritten by something with standing access.",
          evidenceGain: "Settings revert on their own — something persistent rewrites them.",
        },
        matchHints: ["homepage", "settings", "search"],
        isDiagnostic: true,
      },
      {
        id: "list-extensions",
        label: "List browser extensions",
        kind: "inspect",
        tool: "browser-inspector",
        appliesWhen: { type: "stateEquals", path: "browser.settingsChecked", value: true },
        patch: { browser: { extensionsChecked: true, extensionFound: true } },
        feedback:
          "'Deal Finder' 3.2 — installed by a download bundle, not the store; permission: read and change all data on every website.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Extensions hold the standing permission that matches the symptom — install source and permission breadth are the trust evidence.",
          evidenceGain:
            "One bundle-installed extension with read/change-all-sites — the rewrite suspect, named.",
        },
        matchHints: ["extensions", "add-ons", "plugins"],
        isDiagnostic: true,
      },
      {
        id: "run-endpoint-scan",
        label: "Run endpoint scan",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "browser.extensionFound", value: true },
        patch: { browser: { scanRun: true } },
        feedback:
          "Full scan clean — no persistence, no injected modules, no alert rows on this host.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Before sizing the response, rule out installed malware — the scan result is what separates one bad extension from a compromised machine.",
          evidenceGain: "Endpoint clean — installed-malware hypothesis ruled out.",
        },
        matchHints: ["scan", "edr scan", "malware scan"],
        isDiagnostic: true,
      },
      {
        id: "remove-extension",
        label: "Remove the unauthorized extension",
        kind: "ui",
        tool: "browser-inspector",
        appliesWhen: { type: "stateEquals", path: "browser.scanRun", value: true },
        patch: { browser: { removed: true } },
        feedback: "Extension removed by policy; homepage pinned to the corporate default.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Scan clean plus one named unauthorized component means the fix is exactly that component — smallest change that matches the evidence.",
          evidenceGain: "The single extension was the only unauthorized change on the host.",
        },
        matchHints: ["remove the extension", "uninstall extension", "take it out"],
        isFix: true,
      },
      {
        id: "confirm-settings-stable",
        label: "Confirm settings stay put across a reboot",
        kind: "ui",
        tool: "browser-inspector",
        appliesWhen: { type: "stateEquals", path: "browser.removed", value: true },
        patch: { browser: { verified: true } },
        feedback: "After a full day and a reboot the homepage holds; one sign-in per session.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The complaint is a setting that keeps returning — a reboot-and-recheck is the only honest proof the rewrite loop is broken.",
          evidenceGain: "Settings stable across reboot — rewrite loop ended.",
        },
        isFix: true,
      },
      {
        id: "isolate-host-wrong",
        label: "Isolate the workstation as compromised",
        kind: "ui",
        tool: "edr-console",
        evaluation: {
          grade: "wrong",
          rationale:
            "The scan is clean and the only unauthorized item is one extension — isolation overstates the evidence, stops the user's work, and is not what the findings support.",
        },
        feedback: "Isolation is disproportionate here — the evidence supports removal, not a containment event.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "browser.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "browser.verified", value: true },
      { type: "stateEquals", path: "browser.removed", value: true },
      { type: "stateEquals", path: "browser.scanRun", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["isolate-host-wrong"] },
        feedback: "A clean scan plus one extension does not justify a containment event.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Settings that come back after a reset are being rewritten — what has standing write access to the browser?",
      },
      { level: 2, text: "List what was installed outside the approved path, and with what permissions." },
      {
        level: 3,
        text: "Prove the machine itself is clean before deciding how big the response should be.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A bundle-installed 'Deal Finder' extension with read/change-all-sites permissions rewrote the homepage and forced extra sign-ins; the endpoint itself was clean.",
      whyItWorked:
        "Settings persistence, extension provenance and the scan result discriminated one unauthorized component from installed malware; sizing the response after the scan kept action proportionate to the proof. Transferable principle: match the response to the strongest evidence you actually have — one unauthorized extension is a removal, not an isolation.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Settings review, extension list with permissions, endpoint scan." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Installed-malware hypothesis dropped — full scan clean with no persistence; company-policy hypothesis dropped — the extension arrived via a download bundle.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed the extension and pinned the homepage." },
        { step: "Verify", whatLearnerDid: "Settings held across a full day and a reboot." },
      ],
      followUps: [
        "Allowlist extensions centrally so bundle installs never reach the managed browser again.",
      ],
    },
    knowledgeLinks: ["phishing-awareness", "troubleshooting-method"],
    references: [
      {
        title: "MITRE ATT&CK T1176 — Browser Extensions",
        url: "https://attack.mitre.org/techniques/T1176/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
  {
    id: "security-failed-logins-triage",
    version: 1,
    title: "Alert: 40 failed logins on the shared mailbox",
    category: "security",
    difficulty: "beginner",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Read an anomaly count as a pattern before reading it as an attack",
      "Correlate time, source and recent change history",
      "Fix the credential holder instead of punishing the source",
    ],
    prerequisites: [],
    skills: ["identity", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2006",
      user: "Ines Duarte",
      role: "Finance operations",
      symptomPlainLanguage:
        "The security alert says svc_reports failed to sign in forty times last night — do we need to reset the account?",
      priority: "medium",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["security-portal", "identity-portal"],
      enabledCommands: [],
      initialWorld: {
        identity: {
          failedAttempts: 40,
          signInsToday: 0,
          alertReviewed: false,
          geoChecked: false,
          geoOrigin: "10.10.4.25 · print-server VLAN · nightly finance report job host",
          patternChecked: false,
          credRotated: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-spray", label: "Password attack on the shared account", initiallyPlausible: true },
      { id: "h-stale", label: "A job still uses the old password", initiallyPlausible: true },
      { id: "h-app", label: "A client app is misconfigured", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Treat the count as a pattern to be explained: read when the failures happen, where they come from, and what changed — before anyone spends a response on it.",
      steps: [
        {
          id: "guide-alert",
          title: "Read the failure pattern",
          explanation:
            "Open SEC-2006, then run Review failure alert detail from the Checks list.",
          why: "A raw count is a headline — the timestamps and outcomes underneath it are the evidence that separates spray from schedule.",
          expectedObservation:
            "40 failures between 02:04 and 05:12 nightly, zero successful sign-ins, no lockout.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2006 in the topbar" },
          actionId: "review-failure-alert",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-origin",
          title: "Attribute the source address",
          explanation:
            "Run Attribute the source address from Checks, then read what sits behind it.",
          why: "Attribution turns an IP string into a fact about who was actually failing — one internal source behaves nothing like a distributed spray.",
          expectedObservation:
            "Every attempt comes from 10.10.4.25 — the print server that runs the finance report job.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "attribute-source",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-schedule",
          title: "Correlate the schedule with recent changes",
          explanation:
            "Run Correlate schedule and change history from Checks, then read both columns side by side.",
          why: "Time plus a dated credential change is the pair that explains stale-credential retries without invoking an attacker.",
          expectedObservation:
            "Failures match the 02:00 report schedule, and svc_reports's password was rotated in Monday's vault rotation.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "correlate-schedule",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-update-secret",
          title: "Update where the job keeps the password",
          explanation:
            "From Tools, run Update the job's stored password in the vault secret the report job reads.",
          why: "The account is fine — the job holds a retired credential, so the credential holder is what needs to change.",
          expectedObservation: "A new row reads the job secret updated to match the rotation.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "update-job-credential",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-confirm",
          title: "Watch the next scheduled run",
          explanation:
            "From Tools, run Confirm successful sign-in, then read the result of the next 02:00 run.",
          why: "The ticket asks whether anything is wrong — only the job's own next authentication proves the failures ended.",
          expectedObservation:
            "The 02:00 run authenticates first try, the report delivers, and the alert stays quiet.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "confirm-successful-signin",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "review-failure-alert",
        label: "Review failure alert detail",
        kind: "inspect",
        tool: "security-portal",
        patch: { identity: { alertReviewed: true } },
        feedback:
          "40 failures 02:04–05:12 nightly on svc_reports; zero successes; account never locked.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Open the alert to its timeline — clustering and outcome tell you far more than the number 40 does.",
          evidenceGain: "Failures cluster nightly with no successes — a schedule-shaped pattern.",
        },
        matchHints: ["alert detail", "failure timeline", "review failures"],
        isDiagnostic: true,
      },
      {
        id: "attribute-source",
        label: "Attribute the source address",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.alertReviewed", value: true },
        patch: { identity: { geoChecked: true } },
        feedback: "Every attempt from 10.10.4.25 — the print server running the finance report job.",
        evaluation: {
          grade: "optimal",
          rationale:
            "One internal source on a job host is a fact the attacker hypothesis cannot explain — attribution collapses it.",
          evidenceGain: "Single internal source on the job host — external-attack hypothesis collapses.",
        },
        matchHints: ["attribute", "ip lookup", "source address"],
        isDiagnostic: true,
      },
      {
        id: "correlate-schedule",
        label: "Correlate schedule and change history",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.geoChecked", value: true },
        patch: { identity: { patternChecked: true } },
        feedback:
          "Attempts at 02:00–05:12 match the report schedule; svc_reports's password was rotated in Monday's vault rotation.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Two dated columns — job schedule and credential rotation — explain forty failures without needing an attacker at all.",
          evidenceGain:
            "Schedule matches failures and the password changed after the job last authenticated.",
        },
        matchHints: ["schedule", "change history", "rotation", "correlate"],
        isDiagnostic: true,
      },
      {
        id: "update-job-credential",
        label: "Update the job's stored password",
        kind: "ui",
        tool: "identity-portal",
        appliesWhen: { type: "stateEquals", path: "identity.patternChecked", value: true },
        patch: { identity: { credRotated: true } },
        feedback: "New password written to the job's vault secret; no account change needed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Evidence names a stale credential inside a job — updating the holder is the smallest change that matches the pattern.",
          evidenceGain: "Credential in the job updated to match the rotation.",
        },
        matchHints: ["update the password", "rotate the job secret", "fix the stored credential"],
        isFix: true,
      },
      {
        id: "confirm-successful-signin",
        label: "Confirm successful sign-in",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "identity.credRotated", value: true },
        patch: { identity: { verified: true } },
        feedback:
          "The 02:05 run authenticated first try; report delivered; alert quiet for two nights.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The alert described failures — only the job's own next successful authentication proves they ended.",
          evidenceGain: "Successful sign-in with the rotated credential — failures stopped.",
        },
        isFix: true,
      },
      {
        id: "block-source-wrong",
        label: "Block the source IP at the firewall",
        kind: "ui",
        tool: "security-portal",
        evaluation: {
          grade: "wrong",
          rationale:
            "The source is the company's own report server — blocking it stops the finance job and leaves the stale credential retrying forever.",
        },
        feedback: "Blocked — the report job now fails outright, and the stale password is still in place.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "identity.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "identity.verified", value: true },
      { type: "stateEquals", path: "identity.credRotated", value: true },
      { type: "stateEquals", path: "identity.patternChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["block-source-wrong"] },
        feedback: "The source is an internal job host — blocking it breaks the report and skips the fix.",
      },
    ],
    hints: [
      { level: 1, text: "Read the pattern before you read it as an attack: when do the failures happen?" },
      { level: 2, text: "Where do the attempts come from, and what runs from there?" },
      {
        level: 3,
        text: "A rotation the job never heard about explains forty silent failures — update where the job keeps the secret, then watch the next scheduled run.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Monday's vault rotation changed svc_reports's password; the nightly report job kept retrying with the retired one — forty internal failures and no attacker.",
      whyItWorked:
        "Timestamps, source attribution and the change record turned an anomaly count into a schedule-and-rotation story; fixing the credential holder ended the failures without touching anyone's access. Transferable principle: an anomaly count is not an incident — correlate time, source and change history before you spend a response on it.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Failure timeline, source attribution, schedule-vs-rotation correlation." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Password-spray hypothesis dropped — one internal source on the job's own schedule; broken-client hypothesis dropped — sign-ins succeed the moment the rotated secret is in place.",
        },
        { step: "Apply fix", whatLearnerDid: "Updated the job's stored password." },
        { step: "Verify", whatLearnerDid: "Next scheduled run authenticated and delivered." },
      ],
      followUps: [
        "Add shared-account credential rotations to the job-rotation runbook so integrations update with the vault.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [
      {
        title: "NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide",
        url: "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
        note: "Public NIST guidance.",
      },
    ],
  },
  {
    id: "security-edr-agent-unhealthy",
    version: 1,
    title: "No EDR check-ins from finance laptops for two days",
    category: "security",
    difficulty: "foundational",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 11,
    learningObjectives: [
      "Treat fleet-wide silence as a control-health signal",
      "Confirm service state on a silent host before alleging compromise",
      "Restore telemetry first, then re-read the alerts you could not see",
    ],
    prerequisites: [],
    skills: ["endpoint-security", "security-operations", "troubleshooting-method"],
    ticket: {
      id: "SEC-2007",
      user: "Marcus Ilori",
      role: "IT operations",
      symptomPlainLanguage:
        "The console shows fourteen finance laptops silent since Tuesday — no check-ins, no status on any of them.",
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
          alertsOpen: 0,
          checkinReviewed: false,
          serviceChecked: false,
          scopeChecked: false,
          agentStarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-update", label: "The recent update left agents stopped", initiallyPlausible: true },
      { id: "h-net", label: "Network change blocked their traffic", initiallyPlausible: true },
      { id: "h-comp", label: "The laptops are compromised and silenced", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Silence is a symptom, not a verdict: pin down when it started, what state the agent is in on one silent host, then restore coverage and watch it come back.",
      steps: [
        {
          id: "guide-checkins",
          title: "Read the check-in history",
          explanation:
            "Open SEC-2007, then run Review fleet check-in history from the Checks list.",
          why: "When silence began — and what else happened at that moment — ranks the hypotheses before you touch a single laptop.",
          expectedObservation:
            "Fourteen finance laptops last checked in Tuesday 18:47, inside the 3.4.2 update window; zero detections fleet-wide.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2007 in the topbar" },
          actionId: "review-checkin-history",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-service",
          title: "Check the agent service on one silent host",
          explanation:
            "Run Check agent service state from Checks, then read what the agent itself reports.",
          why: "A stopped process and a blocked network look identical from the console — the host's own service state tells them apart.",
          expectedObservation:
            "The EDR agent service stopped with exit code 1067 after the 18:41 install; policy logs show the same on all fourteen.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "check-agent-service",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-scope",
          title: "Confirm the scope and check for detections",
          explanation:
            "Run Confirm fleet scope from Checks, then read both the service state and the detection columns.",
          why: "Uniform failure with an empty detection column is a health story — the compromise hypothesis needs evidence it does not have.",
          expectedObservation:
            "Same service state on all fourteen; no detection events or edge traffic anomalies anywhere.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "confirm-fleet-scope",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-restart",
          title: "Bring the agent back up",
          explanation:
            "From Tools, run Restart the EDR agent service on the pilot host.",
          why: "Telemetry is the product here — with the process confirmed stopped and nothing else wrong, starting it is the smallest restore.",
          expectedObservation:
            "A new row reads the service running with policy sync resumed.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "restart-agent-service",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-confirm",
          title: "Watch the fleet check in",
          explanation:
            "From Tools, run Confirm fleet check-ins restored, then read the console's new state.",
          why: "The ticket is about missing check-ins — only their return proves coverage, and the pinned update keeps it from recurring.",
          expectedObservation:
            "All fourteen checked in within five minutes, protection state green, update pinned until 3.4.3.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "confirm-checkins",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "review-checkin-history",
        label: "Review fleet check-in history",
        kind: "inspect",
        tool: "edr-console",
        patch: { endpoint: { checkinReviewed: true } },
        feedback:
          "14 finance laptops last checked in Tue 18:47 — inside the 3.4.2 update window; zero detections fleet-wide.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The start time of the silence is the strongest discriminator — one shared window points at one shared change.",
          evidenceGain: "Silence began in one update window, group-wide, with no detections.",
        },
        matchHints: ["check-in history", "last seen", "fleet status"],
        isDiagnostic: true,
      },
      {
        id: "check-agent-service",
        label: "Check agent service state",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.checkinReviewed", value: true },
        patch: { endpoint: { serviceChecked: true } },
        feedback:
          "FIN-LT-07: EDR agent service stopped (exit 1067) after the 3.4.2 install at 18:41; policy logs show the same on all 14.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Console silence cannot distinguish a dead process from a blocked network — the host's own service state can.",
          evidenceGain: "Agent process down on every silent host — service-level fault, not network.",
        },
        matchHints: ["agent service", "service state", "agent process"],
        isDiagnostic: true,
      },
      {
        id: "confirm-fleet-scope",
        label: "Confirm fleet scope",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.serviceChecked", value: true },
        patch: { endpoint: { scopeChecked: true } },
        feedback:
          "Same service state on all 14; no host shows detection events or blocked flows at the edge.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Scope decides response size — a uniform service failure with an empty detection column cannot support a compromise claim.",
          evidenceGain: "Uniform service failure, no detections — compromise hypothesis unsupported.",
        },
        matchHints: ["scope", "all hosts", "fleet wide"],
        isDiagnostic: true,
      },
      {
        id: "restart-agent-service",
        label: "Restart the EDR agent service",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.scopeChecked", value: true },
        patch: { endpoint: { agentStarted: true } },
        feedback: "Service started on the pilot host and policy sync resumed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Evidence shows a stopped process and nothing else — starting it is the smallest change that restores the thing the ticket says is missing.",
          evidenceGain: "Agent running again — policy pulls and check-ins resume.",
        },
        matchHints: ["restart the agent", "start the service", "bring the agent up"],
        isFix: true,
      },
      {
        id: "confirm-checkins",
        label: "Confirm fleet check-ins restored",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "endpoint.agentStarted", value: true },
        patch: { endpoint: { verified: true } },
        feedback:
          "All 14 checked in within five minutes; protection green; update pinned until 3.4.3.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is missing check-ins — their return across the whole silent set is the observable proof of restored coverage.",
          evidenceGain: "Check-ins restored across the fleet — coverage proven.",
        },
        isFix: true,
      },
      {
        id: "raise-incident-wrong",
        label: "Declare a security incident for the fourteen",
        kind: "ui",
        tool: "edr-console",
        evaluation: {
          grade: "wrong",
          rationale:
            "Fourteen simultaneous silences beginning in one update window with zero detections are a control-health problem — an incident declaration diverts the team from restoring telemetry.",
        },
        feedback: "Incident declared while coverage is still down — the silence itself remains unfixed.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "endpoint.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "endpoint.verified", value: true },
      { type: "stateEquals", path: "endpoint.agentStarted", value: true },
      { type: "stateEquals", path: "endpoint.scopeChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["raise-incident-wrong"] },
        feedback: "Coverage is still down — declaring an incident does not bring a single agent back.",
      },
    ],
    hints: [
      { level: 1, text: "When did the silence start, and what else happened at that moment?" },
      { level: 2, text: "Open one silent host and look at the agent itself, not the console's summary." },
      {
        level: 3,
        text: "Telemetry that stops for everyone at once is a health problem — restore the agent, then watch the check-ins come back.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The 3.4.2 update left the EDR agent service stopped on all fourteen finance laptops — protection silently offline with no compromise at all.",
      whyItWorked:
        "Check-in timing tied the silence to one change window, the host's service state named the mechanism, and scope-plus-detections kept the response proportionate; starting the service restored the coverage the ticket actually asked for. Transferable principle: fleet-wide silence starting at one moment is a control-plane health signal, not proof of attack — restore telemetry first, then re-read the alerts you could not see.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Check-in history, host service state, fleet scope with detections." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Compromise hypothesis dropped — zero detections and one uniform service failure; network hypothesis dropped — no blocked flows, the process itself is stopped.",
        },
        { step: "Apply fix", whatLearnerDid: "Restarted the agent service on the pilot host." },
        { step: "Verify", whatLearnerDid: "All fourteen checked in; update pinned." },
      ],
      followUps: [
        "Stage EDR updates in rings with automatic check-in watchdogs so a bad package surfaces in minutes.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [
      {
        title: "MITRE ATT&CK T1562.001 — Impair Defenses: Disable or Modify Tools",
        url: "https://attack.mitre.org/techniques/T1562/001/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
  {
    id: "security-privilege-change",
    version: 1,
    title: "User appears in Domain Admins unexpectedly",
    category: "security",
    difficulty: "intermediate",
    scenarioType: "SECURITY_TRIAGE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Judge a privileged change by authority, not by outcome",
      "Correlate a group change with the granting account's own activity",
      "Revoke privilege before evicting the sessions that came with it",
    ],
    prerequisites: ["suspicious-signin"],
    skills: ["identity", "security-operations", "least-privilege"],
    ticket: {
      id: "SEC-2008",
      user: "Priya Raman",
      role: "Data engineer",
      symptomPlainLanguage:
        "I just saw myself listed in Domain Admins in the portal — I never asked for that.",
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
        priv: {
          auditReviewed: false,
          changeRecord:
            "priya.raman → Domain Admins, Tue 18:32, actor svc_backup — no change ticket, outside the change window",
          correlationChecked: false,
          correlateEvidence:
            "svc_backup interactive sign-in from BLD-WS11 at 18:31 — first interactive use in 90 days",
          ownerConfirmed: false,
          membershipRemoved: false,
          sessionsRevoked: false,
          caseClosed: false,
        },
      },
    },
    hypotheses: [
      { id: "h-stolen", label: "A stolen service account granted itself privilege", initiallyPlausible: true },
      { id: "h-script", label: "An approved provisioning script did it", initiallyPlausible: true },
      { id: "h-mistake", label: "An admin added the wrong person", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "A privileged change is a claim about authority: read the record, follow the granting account, hear the owner — then revoke, evict, and close with the proof.",
      steps: [
        {
          id: "guide-audit",
          title: "Read the group change record",
          explanation:
            "Open SEC-2008, then run Review privileged group audit from the Checks list.",
          why: "Authority lives in the record: who acted, when, and under what ticket — not in the fact that access currently works.",
          expectedObservation:
            "The record shows the grant at 18:32 by svc_backup with no change ticket, outside the change window.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2008 in the topbar" },
          actionId: "review-group-audit",
          conceptId: "least-privilege-basics",
        },
        {
          id: "guide-correlate",
          title: "Correlate the granting account's own activity",
          explanation:
            "Run Correlate granting account activity from Checks, then read what svc_backup was doing moments before.",
          why: "A service account's baseline is its authority — activity outside that baseline changes what the grant means.",
          expectedObservation:
            "svc_backup signed in interactively from BLD-WS11 at 18:31 — its first interactive use in 90 days.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "correlate-service-signin",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-owner",
          title: "Hear the account holder",
          explanation:
            "Run Confirm with the account holder from Checks, then record what Priya says about the change.",
          why: "The named member is the only person who can confirm whether any request was ever made — ask before you conclude.",
          expectedObservation:
            "Priya did not request or approve it and was in the migration call at 18:32.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "confirm-with-owner",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-remove",
          title: "Remove the privileged membership",
          explanation:
            "From Tools, run Remove the Domain Admins membership now that owner and record agree.",
          why: "The privilege itself is the exposure — revoke it first; everything else is secondary while it stands.",
          expectedObservation:
            "A new row reads the membership removed with the privileged token cleared.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "remove-domain-admin",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-revoke",
          title: "Evict the granting account's sessions",
          explanation:
            "From Tools, run Revoke svc_backup sessions after the membership is gone.",
          why: "Containment follows the order: no point evicting sessions while the group membership can still be re-used to grant again.",
          expectedObservation:
            "A new row reads svc_backup sessions revoked with interactive tokens invalidated.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "revoke-service-sessions",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "review-group-audit",
        label: "Review privileged group audit",
        kind: "inspect",
        tool: "security-portal",
        patch: { priv: { auditReviewed: true } },
        feedback:
          "Change log: priya.raman → Domain Admins, Tue 18:32, actor svc_backup — no change ticket, outside the change window.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The record establishes whether anyone had authority to make the change — the question the ticket actually raises.",
          evidenceGain: "Privileged grant with no ticket, made by a service account outside its window.",
        },
        matchHints: ["group audit", "change record", "privileged group"],
        isDiagnostic: true,
      },
      {
        id: "correlate-service-signin",
        label: "Correlate granting account activity",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "priv.auditReviewed", value: true },
        patch: { priv: { correlationChecked: true } },
        feedback:
          "svc_backup signed in interactively from BLD-WS11 at 18:31 — first interactive sign-in in 90 days.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The granting account's own baseline decides what the grant means — interactive use a minute before is outside that baseline.",
          evidenceGain: "Granting account used interactively outside its baseline moments before the grant.",
        },
        matchHints: ["correlate", "granting account", "service account activity"],
        isDiagnostic: true,
      },
      {
        id: "confirm-with-owner",
        label: "Confirm with the account holder",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "priv.correlationChecked", value: true },
        patch: { priv: { ownerConfirmed: true } },
        feedback:
          "Priya: she did not request or approve it and was in the migration call at 18:32.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The named member is the only source that can retire the approved-script hypothesis — ask before concluding.",
          evidenceGain: "Owner denies the change — provisioning-script hypothesis unsupported.",
        },
        matchHints: ["confirm", "contact the user", "ask the holder"],
        isDiagnostic: true,
      },
      {
        id: "remove-domain-admin",
        label: "Remove the Domain Admins membership",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "priv.ownerConfirmed", value: true },
        patch: { priv: { membershipRemoved: true } },
        feedback: "Membership removed; Priya's privileged group token cleared at next logon.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The unauthorized privilege is the live exposure — removing it is the smallest change that ends the access.",
          evidenceGain: "Unauthorized privilege revoked.",
        },
        matchHints: ["remove the membership", "drop from domain admins", "revoke privilege"],
        isFix: true,
      },
      {
        id: "revoke-service-sessions",
        label: "Revoke svc_backup sessions",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "priv.membershipRemoved", value: true },
        patch: { priv: { sessionsRevoked: true } },
        feedback: "svc_backup sessions revoked everywhere; interactive tokens invalidated.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the membership gone, evicting the abnormal sessions closes the channel the grant came through.",
          evidenceGain: "The granting account's live sessions evicted.",
        },
        matchHints: ["revoke sessions", "sign out the account", "evict sessions"],
        isFix: true,
      },
      {
        id: "close-privilege-case",
        label: "Close case with audit record",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "priv.sessionsRevoked", value: true },
        patch: { priv: { caseClosed: true } },
        feedback:
          "Case closed with audit trail: revoke + owner attestation attached; svc_backup credential rotation queued.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Closing with the evidence attached makes the handling auditable — proof the workflow completed, not an opinion.",
          evidenceGain: "Case closed with the privilege change and attestation on record.",
        },
        isFix: true,
      },
      {
        id: "dismiss-as-script-wrong",
        label: "Close it as the approved provisioning script",
        kind: "ui",
        tool: "security-portal",
        evaluation: {
          grade: "wrong",
          rationale:
            "No change ticket, an out-of-baseline interactive use of the service account, and the owner's denial — closing as approved leaves a privileged backdoor standing.",
        },
        feedback: "Closed without revoking — the Domain Admins membership remains in place.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "priv.caseClosed", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "priv.caseClosed", value: true },
      { type: "stateEquals", path: "priv.membershipRemoved", value: true },
      { type: "stateEquals", path: "priv.sessionsRevoked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["dismiss-as-script-wrong"] },
        feedback:
          "Owner denial plus an unticketed grant is not an approved change — the membership is still live.",
      },
    ],
    hints: [
      { level: 1, text: "Read the change record: who acted, when, and under what authority?" },
      { level: 2, text: "Follow the granting account — what was it doing a minute before the grant?" },
      {
        level: 3,
        text: "Owner denial plus an unticketed grant settles it: revoke the privilege, evict the sessions that came with it, then close with the record.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "svc_backup was used interactively to add Priya to Domain Admins with no change ticket — a privileged grant nobody requested.",
      whyItWorked:
        "The audit record, the granting account's out-of-baseline sign-in, and the owner's denial converted an unexpected listing into a proof of unauthorized change; revoke-then-evict kept every step ahead of the exposure. Transferable principle: a privileged change is judged by authority, not by result — no ticket, an actor outside baseline and an owner denial mean unauthorized, whatever the account's normal job is.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Group audit record, granting-account correlation, owner confirmation." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Provisioning-script hypothesis dropped — no change ticket and the owner denies it; admin-mistake hypothesis dropped — the actor is a service account outside its baseline.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed the membership, then revoked the service account's sessions." },
        { step: "Verify", whatLearnerDid: "Case closed with the audit record attached." },
      ],
      followUps: [
        "Alert on any interactive sign-in by service accounts so out-of-baseline use surfaces immediately.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [
      {
        title: "MITRE ATT&CK T1098 — Account Manipulation",
        url: "https://attack.mitre.org/techniques/T1098/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
  {
    id: "security-outbound-beacon",
    version: 1,
    title: "Nightly traffic to a domain nobody recognizes",
    category: "security",
    difficulty: "advanced",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Build a correlation case across network, WHOIS and endpoint evidence",
      "Act on behavioral proof even when no signature has fired",
      "Contain the sending host, not only the network path",
    ],
    prerequisites: ["malware-endpoint-alert"],
    skills: ["endpoint-security", "networking", "security-operations"],
    ticket: {
      id: "SEC-2009",
      user: "Greg Salas",
      role: "Network operations",
      symptomPlainLanguage:
        "Edge telemetry shows fin-lt-07 calling cdn-stats-x.net every night at 23:47 for nine nights — nobody recognizes the domain.",
      priority: "high",
      channel: "portal",
    },
    environment: {
      components: ["ticket-inbox", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["security-portal", "edr-console"],
      enabledCommands: [],
      initialWorld: {
        beacon: {
          trafficReviewed: false,
          domainAttributed: false,
          processCorrelated: false,
          coverageChecked: false,
          isolated: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-c2", label: "Beaconing to attacker infrastructure", initiallyPlausible: true },
      { id: "h-vendor", label: "Vendor telemetry from an unapproved tool", initiallyPlausible: true },
      { id: "h-scan", label: "Internet scanner hitting the host", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Build the case in layers — pattern, ownership, process, coverage — then contain the source and prove the channel stays quiet.",
      steps: [
        {
          id: "guide-traffic",
          title: "Read the traffic pattern",
          explanation:
            "Open SEC-2009, then run Review traffic alert from the Checks list.",
          why: "Time, direction and size over nights describe the behavior — the shape of the pattern is evidence before any attribution.",
          expectedObservation:
            "Outbound to cdn-stats-x.net:443 at 23:47 ±3min, ~84KB, nine consecutive nights; no matching inbound.",
          target: { componentId: "ticket-inbox", label: "Ticket chip SEC-2009 in the topbar" },
          actionId: "review-traffic-alert",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-attribute",
          title: "Attribute the destination domain",
          explanation:
            "Run Attribute the destination domain from Checks, then read its registration and reputation.",
          why: "Ownership answers the vendor hypothesis — a domain's age, content and reputation are registry facts, not guesses.",
          expectedObservation:
            "Registered 11 days ago, privacy-masked, no hosted content, low reputation across feeds.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "attribute-domain",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-process",
          title: "Correlate the calling process on the host",
          explanation:
            "Run Correlate calling process from Checks, then read which program opens the socket.",
          why: "Network evidence names the destination; the endpoint names the sender — correlation needs both halves.",
          expectedObservation:
            "An unsigned updater in the Public folder, absent from the software baseline, opens the socket at 23:47.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "correlate-endpoint-process",
          fallback: "the Evidence board on the stage",
        },
        {
          id: "guide-coverage",
          title: "Check what the scanner did and did not say",
          explanation:
            "Run Check detection coverage from Checks, then read the scan result next to the correlation.",
          why: "A clean scan does not clear proven unauthorized behavior — this step calibrates how strong your proof actually is.",
          expectedObservation:
            "Agent healthy, full scan clean, zero signatures fired — and the caller is still unauthorized.",
          target: { componentId: "evidence-board", label: "Evidence board" },
          actionId: "check-edr-coverage",
          fallback: "the Evidence board on the stage",
          conceptId: "least-privilege-basics",
        },
        {
          id: "guide-isolate",
          title: "Contain the sending host",
          explanation:
            "From Tools, run Isolate the workstation to the remediation VLAN.",
          why: "The evidence proves an active unauthorized sender — containment must reach the host, because the process is what would simply dial the next domain.",
          expectedObservation:
            "A new row reads the host isolated with the outbound channel cut and a sample collected.",
          target: { componentId: "evidence-board", label: "Evidence list on the Evidence board" },
          actionId: "isolate-workstation",
          fallback: "the Evidence board on the stage",
        },
      ],
    },
    actions: [
      {
        id: "review-traffic-alert",
        label: "Review traffic alert",
        kind: "inspect",
        tool: "security-portal",
        patch: { beacon: { trafficReviewed: true } },
        feedback:
          "fin-lt-07 → cdn-stats-x.net:443, 23:47 ±3min, ~84KB, nine consecutive nights; no matching inbound.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Start with the raw pattern — fixed time, fixed direction, fixed size over nights is machine-scheduled behavior, not human use.",
          evidenceGain: "Outbound-only, fixed-time, fixed-size pattern — machine-scheduled traffic.",
        },
        matchHints: ["traffic alert", "telemetry", "connections"],
        isDiagnostic: true,
      },
      {
        id: "attribute-domain",
        label: "Attribute the destination domain",
        kind: "inspect",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "beacon.trafficReviewed", value: true },
        patch: { beacon: { domainAttributed: true } },
        feedback:
          "Registered 11 days ago, privacy-masked WHOIS, no hosted content, low reputation across feeds.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Registry and reputation facts decide the vendor hypothesis — throwaway infrastructure is not an approved tool's backend.",
          evidenceGain:
            "Fresh, contentless, low-reputation domain — vendor-telemetry hypothesis drops.",
        },
        matchHints: ["whois", "attribute", "reputation", "domain"],
        isDiagnostic: true,
      },
      {
        id: "correlate-endpoint-process",
        label: "Correlate calling process",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "beacon.domainAttributed", value: true },
        patch: { beacon: { processCorrelated: true } },
        feedback:
          "EDR process tree: unsigned C:\\Users\\Public\\updater.exe opens the socket at 23:47 — spawned at logon, absent from the software baseline.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Network names the destination, endpoint names the sender — correlation across the two is what turns coincidence into a case.",
          evidenceGain: "A specific unauthorized process schedules the calls — endpoint–network correlation.",
        },
        matchHints: ["process", "correlate", "socket", "process tree"],
        isDiagnostic: true,
      },
      {
        id: "check-edr-coverage",
        label: "Check detection coverage",
        kind: "inspect",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "beacon.processCorrelated", value: true },
        patch: { beacon: { coverageChecked: true } },
        feedback:
          "Agent healthy, full scan clean, zero detections — no signature has fired; the caller remains unauthorized.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Knowing what the scanner did and did not say calibrates confidence — behavioral proof stands on its own without a signature.",
          evidenceGain:
            "Clean scan does not clear unauthorized behavior — behavioral correlation rules the case.",
        },
        matchHints: ["coverage", "detections", "scan result"],
        isDiagnostic: true,
      },
      {
        id: "isolate-workstation",
        label: "Isolate the workstation to the remediation VLAN",
        kind: "ui",
        tool: "edr-console",
        appliesWhen: { type: "stateEquals", path: "beacon.coverageChecked", value: true },
        patch: { beacon: { isolated: true } },
        feedback: "fin-lt-07 moved to the remediation VLAN; callbacks stopped; sample auto-collected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The proof shows an active unauthorized sender — cutting it off at the host is both proportionate and the only containment that reaches the process.",
          evidenceGain: "Host contained — outbound channel cut for analysis.",
        },
        matchHints: ["isolate", "contain the host", "remediation vlan"],
        isFix: true,
      },
      {
        id: "verify-quiet-window",
        label: "Verify a quiet window",
        kind: "ui",
        tool: "security-portal",
        appliesWhen: { type: "stateEquals", path: "beacon.isolated", value: true },
        patch: { beacon: { verified: true } },
        feedback:
          "72-hour window quiet; neighbor sweep finds no other host calling the domain; block list updated.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is traffic that keeps recurring — a quiet window plus a fleet sweep proves the path is closed, not just paused.",
          evidenceGain: "No further callbacks anywhere — path proven closed.",
        },
        isFix: true,
      },
      {
        id: "block-domain-only-wrong",
        label: "Block the domain at the firewall only",
        kind: "ui",
        tool: "security-portal",
        evaluation: {
          grade: "wrong",
          rationale:
            "Blocking one domain cuts one channel but leaves the unauthorized process on the laptop free to rotate to its next domain — the sender itself stays untouched.",
        },
        feedback: "Firewall block in place — the process still runs on fin-lt-07 and owns the next dial.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "beacon.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "beacon.verified", value: true },
      { type: "stateEquals", path: "beacon.isolated", value: true },
      { type: "stateEquals", path: "beacon.coverageChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["block-domain-only-wrong"] },
        feedback:
          "The domain is blocked but the sending process still lives on the endpoint — containment must reach the host.",
      },
    ],
    hints: [
      { level: 1, text: "What pattern do time, direction and size draw across nine nights?" },
      { level: 2, text: "Whose infrastructure is it, and which program on the host is talking to it?" },
      {
        level: 3,
        text: "A clean scan with a proven unauthorized caller still demands containment — reach the sending host, not only the network path.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "An unsigned, unbaselined updater on fin-lt-07 beaconed nightly to a freshly registered low-reputation domain on 443; no signature had fired yet.",
      whyItWorked:
        "Pattern, registry attribution, endpoint correlation and a coverage check built a case strong enough to act on without a signature — and isolation reached the sender instead of only the route. Transferable principle: behavioral correlation can justify action before any signature confirms it, and the response must reach the sending host, not just the network path.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Traffic pattern, domain attribution, process correlation, coverage check." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Vendor-telemetry hypothesis dropped — fresh contentless domain outside any approved tool; scanner hypothesis dropped — outbound-only fixed-time pattern from one internal host.",
        },
        { step: "Apply fix", whatLearnerDid: "Isolated the workstation to the remediation VLAN." },
        { step: "Verify", whatLearnerDid: "Quiet 72-hour window with a clean fleet sweep." },
      ],
      followUps: [
        "Add newly registered low-reputation domains to the egress alerting baseline so nine nights become one.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [
      {
        title: "MITRE ATT&CK T1071.001 — Application Layer Protocol: Web Protocols",
        url: "https://attack.mitre.org/techniques/T1071/001/",
        note: "Public ATT&CK technique page.",
      },
    ],
  },
];
