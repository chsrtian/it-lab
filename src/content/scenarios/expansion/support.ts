import type { ScenarioInput } from "@/content/schema";

export const supportScenarios: ScenarioInput[] = [
  {
    id: "support-file-locked",
    version: 1,
    title: "Budget file opens read-only for edit",
    category: "support",
    difficulty: "beginner",
    scenarioType: "COMMUNICATION_SUPPORT",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Separate what the application reports from what the file system holds",
      "Name the specific session holding a write lock",
      "Release one stale handle instead of disrupting the whole share",
    ],
    prerequisites: [],
    skills: ["helpdesk", "storage", "troubleshooting-method"],
    ticket: {
      id: "HD-1086",
      user: "Dana Ortiz",
      role: "FP&A analyst",
      symptomPlainLanguage:
        "Q4-budget.xlsx opens read-only on the shared drive — I need to edit it and the deadline is today.",
      priority: "high",
      channel: "walkup",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["file-manager"],
      enabledCommands: [],
      initialWorld: {
        lock: {
          fileAttributed: false,
          sessionsListed: false,
          holderConfirmed: false,
          handleClosed: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Dana Ortiz",
      opening:
        "Q4-budget.xlsx opens read-only on the shared drive — I need to edit it and the deadline is today.",
      followUpQuestions: [
        "Is it only that one file?",
        "Can anyone else edit it?",
        "Did anything crash this morning?",
      ],
      replies: [
        {
          match: ["only this", "one file", "other files", "rest"],
          response: "Other files in the same folder open and save fine — just this one.",
          once: false,
          revealsConcepts: [
            "One file failing while its neighbours pass points at that file, not the folder or her rights.",
          ],
        },
        {
          match: ["jonah", "crash", "blue", "died", "morning"],
          when: { type: "stateEquals", path: "lock.holderConfirmed", value: true },
          response:
            "I just heard — Jonah's laptop blue-screened mid-edit this morning, that matches the time you found.",
          once: false,
          revealsConcepts: ["The holder's own account confirms the session died instead of closing."],
        },
        {
          match: ["jonah", "crash", "blue", "died", "who has it"],
          response: "I don't know who else has it — Jonah mentioned his laptop died earlier, maybe ask him.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["read-only", "attribute", "marked", "checkbox"],
          response: "Windows shows the read-only checkbox unchecked, if that matters.",
          once: false,
          revealsConcepts: ["The app banner and the file attribute are different statements."],
        },
        {
          match: ["save now", "can i edit", "fixed", "worked"],
          when: { type: "stateEquals", path: "lock.verified", value: true },
          response: "It just saved with my changes in it — finally.",
          once: false,
          revealsConcepts: ["The original file at the original path is the proof the ticket wanted."],
        },
      ],
      defaultReply: "It just says read-only at the top — I have a deadline today.",
      mentorPrompts: [
        "Separate what the application says from what the file system says.",
        "One file failing while its neighbours pass points at that file's sessions.",
      ],
    },
    hypotheses: [
      { id: "h-holder", label: "Another session still holds it", initiallyPlausible: true },
      { id: "h-attr", label: "The file is marked read-only", initiallyPlausible: true },
      { id: "h-perm", label: "I lost write permission", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      intro:
        "Believe neither the banner nor the user's guess: check what Windows says about the file, find who holds it, and release exactly that session.",
      steps: [
        {
          id: "guide-properties",
          title: "Check what Windows says about the file",
          explanation:
            "Ask Dana what the file's own properties show, then run Check file properties from Tools.",
          why: "The application's read-only banner is a report — the attribute and permission columns say what the file system actually holds.",
          expectedObservation:
            "The read-only attribute is not set and Dana has Modify on the folder, yet the file still opens read-only.",
          target: { componentId: "customer-chat", label: "Conversation with Dana Ortiz" },
          actionId: "check-file-properties",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-sessions",
          title: "List the open sessions on the file",
          explanation:
            "Run List open sessions from Tools, then read which workstation holds it and for how long.",
          why: "Read-only with a clean attribute means a lock — the open-files list names the holder instead of guessing.",
          expectedObservation:
            "The file is held by JMORA-PC since 09:12 with the session idle for forty minutes.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "list-open-sessions",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-holder",
          title: "Confirm with the holding user",
          explanation:
            "Ask Dana whether Jonah's machine had trouble, then run Confirm with the holding user.",
          why: "An idle session might be someone still editing — only the holder's own account separates stale from live before you touch it.",
          expectedObservation:
            "Jonah's laptop blue-screened at 09:40 and he signed back in on a loaner — the old session never released.",
          target: { componentId: "customer-chat", label: "Conversation with Dana Ortiz" },
          actionId: "confirm-with-holder",
        },
        {
          id: "guide-release",
          title: "Release the stale handle",
          explanation:
            "From Tools, run Close the stale session handle now that both sides agree it is dead.",
          why: "One identified dead session is the entire problem — closing exactly it changes nothing for anyone else on the share.",
          expectedObservation:
            "A new row reads the stale handle closed and the write lock released.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "close-stale-handle",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-edit",
          title: "Prove the original file edits again",
          explanation:
            "From Tools, run Confirm edit and save, then compare with the symptom on the ticket.",
          why: "The ticket asked for an editable file, so a real save of the original file is the only honest end-to-end proof.",
          expectedObservation:
            "Dana edits and saves Q4-budget.xlsx — write lock acquired, version stored.",
          target: { componentId: "ticket-inbox", label: "Ticket chip HD-1086" },
          actionId: "confirm-edit-save",
        },
      ],
    },
    actions: [
      {
        id: "check-file-properties",
        label: "Check file properties",
        kind: "inspect",
        tool: "file-manager",
        patch: { lock: { fileAttributed: true } },
        feedback:
          "Read-only attribute NOT set on Q4-budget.xlsx; Dana has Modify on the folder — the file opens read-only anyway.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The banner is an application's claim — the attribute and permission columns are what the file system says, and they disagree with it.",
          evidenceGain:
            "Attribute and permissions both fine — file-level and permission-layer faults ruled out.",
        },
        matchHints: ["properties", "attributes", "read-only flag"],
        isDiagnostic: true,
      },
      {
        id: "list-open-sessions",
        label: "List open sessions on the file",
        kind: "inspect",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "lock.fileAttributed", value: true },
        patch: { lock: { sessionsListed: true } },
        feedback:
          "\\\\fs01\\Finance\\Q4-budget.xlsx held by JMORA-PC (Jonah Mora) since 09:12 — session idle 40 minutes.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A lock must have a holder — the open-files list names the session so the next step asks rather than guesses.",
          evidenceGain: "A specific idle session holds the write lock — holder identified.",
        },
        matchHints: ["open files", "sessions", "who has it open"],
        isDiagnostic: true,
      },
      {
        id: "confirm-with-holder",
        label: "Confirm with the holding user",
        kind: "inspect",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "lock.sessionsListed", value: true },
        patch: { lock: { holderConfirmed: true } },
        feedback:
          "Jonah's laptop blue-screened at 09:40 and he signed back in on a loaner — the old session never released.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An idle session could still be someone working — the holder's statement is what proves it is dead before you touch it.",
          evidenceGain: "Crash confirmed by the holder — handle is stale, not live editing.",
        },
        matchHints: ["confirm", "ask the holder", "contact jonah"],
        isDiagnostic: true,
      },
      {
        id: "close-stale-handle",
        label: "Close the stale session handle",
        kind: "ui",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "lock.holderConfirmed", value: true },
        patch: { lock: { handleClosed: true } },
        feedback: "Stale handle closed on FS01; the write lock is released.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence names one dead session on one file — closing exactly it is the smallest change that fits.",
          evidenceGain: "Lock source removed — one session, one file, nothing else touched.",
        },
        matchHints: ["close the handle", "release the lock", "disconnect the session"],
        isFix: true,
      },
      {
        id: "confirm-edit-save",
        label: "Confirm edit and save",
        kind: "ui",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "lock.handleClosed", value: true },
        patch: { lock: { verified: true } },
        feedback: "Dana edits and saves Q4-budget.xlsx — write lock acquired, version stored.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is 'I need to edit it' — a real save of the original file at the original path is the end-to-end proof.",
          evidenceGain: "Edit and save succeed on the original file — ticket symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "reboot-server-wrong",
        label: "Reboot the file server to clear the locks",
        kind: "ui",
        tool: "file-manager",
        evaluation: {
          grade: "wrong",
          rationale:
            "Rebooting FS01 drops every user's open files across the finance share to clear one stale handle — the open-files check already names the single session to release.",
        },
        feedback: "Server-wide reboot requested for one file's stale lock — every colleague's session would drop.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "lock.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "lock.verified", value: true },
      { type: "stateEquals", path: "lock.handleClosed", value: true },
      { type: "stateEquals", path: "lock.holderConfirmed", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["reboot-server-wrong"] },
        feedback:
          "One stale handle does not justify dropping every open file on the share — release the session that holds it.",
      },
    ],
    hints: [
      { level: 1, text: "What does Windows itself say about the file, before you believe the app's banner?" },
      { level: 2, text: "Who else has it open right now, and is that session actually alive?" },
      {
        level: 3,
        text: "A crashed editor leaves its handle behind — release that one session, then prove the original file edits again.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Jonah's blue-screen left a stale write handle on Q4-budget.xlsx — the read-only banner reflected the live lock, not the file or Dana's rights.",
      whyItWorked:
        "Attribute, permissions and holder confirmation checked the layers the banner could have been standing for, and releasing one named session changed nothing for anyone else. Transferable principle: an application's message is a report, not a diagnosis — verify each layer it could stand for (attribute, permission, session) before changing anything.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "File properties, open-files list, holder confirmation." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Read-only attribute and permission loss dropped — attribute unchecked, neighbours save fine; live editing dropped — holder confirms his session died at 09:40.",
        },
        { step: "Apply fix", whatLearnerDid: "Closed the one stale handle." },
        { step: "Verify", whatLearnerDid: "Dana edited and saved the original file." },
      ],
      followUps: [
        "Enable session timeouts on the share so crashed clients release locks automatically.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "support-share-permissions",
    version: 1,
    title: "Colleagues can open the folder but not save",
    category: "support",
    difficulty: "intermediate",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Evaluate share and NTFS grants as one effective-access question",
      "Prove which layer caps instead of assuming either one",
      "Fix the capping layer and leave the correct layer untouched",
    ],
    prerequisites: [],
    skills: ["helpdesk", "least-privilege", "troubleshooting-method"],
    ticket: {
      id: "HD-1087",
      user: "Ravi Mehta",
      role: "Project coordinator",
      symptomPlainLanguage:
        "Everyone on the team can open \\\\fs01\\Projects but every save fails — this started right after the folder move.",
      priority: "medium",
      channel: "phone",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["file-manager"],
      enabledCommands: [],
      initialWorld: {
        share: {
          shareChecked: false,
          ntfsChecked: false,
          effectiveChecked: false,
          shareFixed: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Ravi Mehta",
      opening:
        "Everyone on the team can open \\\\fs01\\Projects but every save fails — this started right after the folder move.",
      followUpQuestions: [
        "Did it work before the move?",
        "Can you save anywhere else?",
        "What does the error say?",
      ],
      replies: [
        {
          match: ["before", "move", "worked", "tuesday", "fine"],
          response:
            "Before Tuesday's move it saved fine — read-write for the whole team, same folder.",
          once: false,
          revealsConcepts: ["A dated change is evidence: compare the layers that change rewrote."],
        },
        {
          match: ["anywhere else", "other folder", "personal", "everywhere"],
          response: "Everywhere else saves fine — only \\\\fs01\\Projects refuses a save.",
          once: false,
          revealsConcepts: [
            "Scope matters: one folder failing isolates that folder's grant chain, not the user.",
          ],
        },
        {
          match: ["error", "message", "denied", "says"],
          response: "Windows says 'you do not have permission to modify' the moment I save.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["save now", "works now", "fixed", "saved"],
          when: { type: "stateEquals", path: "share.verified", value: true },
          response: "Two of us just saved files in place — it works again.",
          once: false,
          revealsConcepts: ["Team-wide success proves the fix landed on the shared layer."],
        },
      ],
      defaultReply: "Open works, save fails — permission denied every time, only in that folder.",
      mentorPrompts: [
        "Two layers can each say yes and still produce a no.",
        "Test the layer that evaluates first.",
      ],
    },
    hypotheses: [
      { id: "h-share", label: "The share is read-only", initiallyPlausible: true },
      { id: "h-ntfs", label: "NTFS denies the team", initiallyPlausible: true },
      { id: "h-owner", label: "Files are owned by someone else", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "A save crosses two gates before it lands — read both grants, prove which one caps the team, then change only that one.",
      steps: [
        {
          id: "guide-share",
          title: "Read the share grant",
          explanation:
            "Ask Ravi which folder the team uses, then run Check share grant from Tools.",
          why: "The share is the first gate every request crosses — its grant is half of the effective-access answer.",
          expectedObservation:
            "The share lists Domain Users with Read only — no Change.",
          target: { componentId: "customer-chat", label: "Conversation with Ravi Mehta" },
          actionId: "check-share-grant",
          conceptId: "least-privilege-basics",
        },
        {
          id: "guide-ntfs",
          title: "Read the NTFS grant",
          explanation:
            "Run Check NTFS grant from Tools, then compare it with the share grant you just read.",
          why: "Effective access is judged across both layers — a yes at one gate means nothing while the other says Read.",
          expectedObservation:
            "NTFS lists Domain Users with Modify — the file-system gate already allows the save.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "check-ntfs-acl",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-effective",
          title: "Prove the effective access",
          explanation:
            "Run Evaluate effective access as the team member from Tools, then read the verdict and where it was decided.",
          why: "Two printed grants are inputs — the effective-access test states which gate actually decided the denial.",
          expectedObservation:
            "Effective access reads Read — the share caps the team before NTFS is ever evaluated.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "evaluate-effective-access",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-grant",
          title: "Correct the capping layer",
          explanation:
            "From Tools, run Grant Change on the share — and leave the NTFS grant exactly as it is.",
          why: "Only the gate that says Read needs changing; widening the gate that already says Modify would over-grant for nothing.",
          expectedObservation:
            "A new row reads the share grant updated to Change with NTFS untouched.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "grant-share-change",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-save",
          title: "Prove the team can save",
          explanation:
            "From Tools, run Confirm team save, then compare with the symptom on the ticket.",
          why: "The ticket is about everyone's saves — two colleagues saving in place is the proof, across the shared layer.",
          expectedObservation:
            "Two teammates open and save a file in place with the NTFS audit unchanged.",
          target: { componentId: "ticket-inbox", label: "Ticket chip HD-1087" },
          actionId: "confirm-team-save",
        },
      ],
    },
    actions: [
      {
        id: "check-share-grant",
        label: "Check share grant",
        kind: "inspect",
        tool: "file-manager",
        patch: { share: { shareChecked: true } },
        feedback: "Share '\\Projects': Domain Users → Read (no Change). Everyone connects through this share.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The share is the first gate every save crosses — reading its grant establishes half the answer before any conclusion.",
          evidenceGain: "Share layer caps the team at Read — first candidate, pending both layers.",
        },
        matchHints: ["share grant", "share permissions", "shared folder"],
        isDiagnostic: true,
      },
      {
        id: "check-ntfs-acl",
        label: "Check NTFS grant",
        kind: "inspect",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "share.shareChecked", value: true },
        patch: { share: { ntfsChecked: true } },
        feedback: "NTFS on \\Projects: Domain Users → Modify; CREATOR OWNER → Full control.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Effective access is the lower of both gates — the file-system grant decides whether NTFS can even be the culprit.",
          evidenceGain: "NTFS already allows write — the restriction is not at the file-system layer.",
        },
        matchHints: ["ntfs", "acl", "security tab"],
        isDiagnostic: true,
      },
      {
        id: "evaluate-effective-access",
        label: "Evaluate effective access as the team member",
        kind: "inspect",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "share.ntfsChecked", value: true },
        patch: { share: { effectiveChecked: true } },
        feedback:
          "Effective access test as the user: Read — the lower grant across both layers wins; denial happens at the share before NTFS is evaluated.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Printed grants are inputs; the evaluated verdict names the gate that actually refused, so the fix lands on the right layer.",
          evidenceGain: "Share Read caps otherwise-writable NTFS — effective access proven, not guessed.",
        },
        matchHints: ["effective access", "as the user", "test access"],
        isDiagnostic: true,
      },
      {
        id: "grant-share-change",
        label: "Grant Change on the share",
        kind: "ui",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "share.effectiveChecked", value: true },
        patch: { share: { shareFixed: true } },
        feedback: "Share grant updated: Domain Users → Change. NTFS untouched.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Evidence names the share as the cap and NTFS as already correct — changing only the capping gate is the smallest complete fix.",
          evidenceGain: "The capping layer corrected; the already-correct layer preserved.",
        },
        matchHints: ["grant change", "update the share", "share to change"],
        isFix: true,
      },
      {
        id: "confirm-team-save",
        label: "Confirm team save",
        kind: "ui",
        tool: "file-manager",
        appliesWhen: { type: "stateEquals", path: "share.shareFixed", value: true },
        patch: { share: { verified: true } },
        feedback:
          "Two teammates open and save a file in place; NTFS audit unchanged; no over-grant introduced.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket speaks for the whole team — colleague saves prove the shared layer while the untouched NTFS grant shows no over-grant.",
          evidenceGain: "Saves succeed across the team — both layers still least-privilege.",
        },
        isFix: true,
      },
      {
        id: "grant-ntfs-full-wrong",
        label: "Add the team to NTFS Full control",
        kind: "ui",
        tool: "file-manager",
        evaluation: {
          grade: "wrong",
          rationale:
            "NTFS already grants Modify — widening it changes nothing at the share layer while over-granting the file system the ticket never asked for.",
        },
        feedback: "NTFS widened to Full control — the share still caps every save at Read.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "share.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "share.verified", value: true },
      { type: "stateEquals", path: "share.shareFixed", value: true },
      { type: "stateEquals", path: "share.effectiveChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["grant-ntfs-full-wrong"] },
        feedback: "The cap sits at the share layer — widening NTFS neither unblocks nor stays least-privilege.",
      },
    ],
    hints: [
      { level: 1, text: "A save crosses two gates before it lands — read both of them." },
      { level: 2, text: "A gate that says yes cannot be the one refusing; find the gate that says Read." },
      {
        level: 3,
        text: "Correct the layer that caps, prove the team can save, and leave the layer that was already right alone.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The folder move recreated the share with Domain Users at Read while NTFS kept Modify — effective access collapsed to the lower grant.",
      whyItWorked:
        "Reading both gates and evaluating effective access proved which layer refused, so one share-level change fixed saves without touching a file system that was already correct. Transferable principle: effective permission is the lowest grant across every layer the request traverses — evaluate share and NTFS together, and fix only the layer that actually caps.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Share grant, NTFS grant, effective-access evaluation." },
        {
          step: "Rule out",
          whatLearnerDid:
            "NTFS denial and ownership dropped — NTFS grants Modify and creators own their files; app-side error dropped — the save fails identically in every client.",
        },
        { step: "Apply fix", whatLearnerDid: "Granted Change on the share only." },
        { step: "Verify", whatLearnerDid: "Two teammates saved files in place." },
      ],
      followUps: [
        "Add a share-vs-NTFS comparison to the folder-move checklist so recreations keep the original intent.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "support-webcam-app",
    version: 1,
    title: "Camera works in Camera app, black in meetings",
    category: "support",
    difficulty: "foundational",
    scenarioType: "COMMUNICATION_SUPPORT",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 11,
    learningObjectives: [
      "Use a working second app to bound the layers you still have to test",
      "Separate OS camera permission from the app's device choice",
      "Prove the fix inside the app where the symptom lived",
    ],
    prerequisites: [],
    skills: ["helpdesk", "endpoint-security", "troubleshooting-method"],
    ticket: {
      id: "HD-1088",
      user: "Tomas Weber",
      role: "Account executive",
      symptomPlainLanguage:
        "My camera works when I open the Camera app, but in video calls the picture is black.",
      priority: "medium",
      channel: "phone",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["settings-center", "meeting-app"],
      enabledCommands: [],
      initialWorld: {
        webcam: {
          deviceConfirmed: false,
          bindingChecked: false,
          bindingFound: false,
          permissionChecked: false,
          permissionOk: false,
          bound: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Tomas Weber",
      opening: "My camera works when I open the Camera app, but in video calls the picture is black.",
      followUpQuestions: [
        "Does the Camera app show your picture?",
        "Does it fail in every call app?",
        "Did anything change on the laptop?",
      ],
      replies: [
        {
          match: ["camera app", "photos", "selfie", "works", "fine"],
          response: "The Camera app shows me perfectly — clear picture, no lag.",
          once: false,
          revealsConcepts: [
            "A second working app localizes the fault above hardware, driver and shutter.",
          ],
        },
        {
          match: ["every app", "teams", "zoom", "all calls", "same"],
          response: "It's black in every meeting app I've tried, but only in meeting apps.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["change", "refresh", "monday", "update", "install"],
          response: "The laptop was refreshed on Monday — I didn't touch any camera settings myself.",
          once: false,
          revealsConcepts: ["A refresh event explains how an app's own choice could change unnoticed."],
        },
        {
          match: ["see me", "video now", "fixed", "worked", "call"],
          when: { type: "stateEquals", path: "webcam.verified", value: true },
          response: "Just ran a test call — they see me clearly now.",
          once: false,
          revealsConcepts: ["Proof belongs in the app where the symptom appeared."],
        },
      ],
      defaultReply: "Camera app is fine, calls are black — I don't get it.",
      mentorPrompts: [
        "What still works tells you which layers you can stop testing.",
        "Black in one app while another works means the fault sits in the failing app's own configuration.",
      ],
    },
    hypotheses: [
      { id: "h-input", label: "The app is using the wrong camera", initiallyPlausible: true },
      { id: "h-perm", label: "Windows blocks the camera for that app", initiallyPlausible: true },
      { id: "h-hw", label: "The camera hardware is failing", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Let the working app shrink the problem: confirm the device through it, then check the failing app's own two settings — its camera choice and its permission.",
      steps: [
        {
          id: "guide-camera-app",
          title: "Confirm the camera through the working app",
          explanation:
            "Ask Tomas what the Camera app shows, then run Confirm camera app from Tools.",
          why: "A second app that works is free evidence — hardware, driver and privacy shutter are cleared before you touch the failing one.",
          expectedObservation:
            "The Camera app shows a live, clear picture — the device itself is healthy.",
          target: { componentId: "customer-chat", label: "Conversation with Tomas Weber" },
          actionId: "confirm-camera-app",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-binding",
          title: "Read the meeting app's camera choice",
          explanation:
            "Run Check app camera choice from Tools, then read which device the meeting app has selected.",
          why: "The app picks its input independently — its list is where 'black in calls but fine elsewhere' is usually decided.",
          expectedObservation:
            "The app is bound to 'OEM Virtual Cam' while 'Integrated Webcam' sits unselected in the same list.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "check-app-camera-choice",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-permission",
          title: "Clear the OS permission layer",
          explanation:
            "Run Check camera permission from Tools, then read what Windows allows for desktop apps.",
          why: "Permission is the other layer that can silently produce black video — rule it out so the fix targets the app's choice with confidence.",
          expectedObservation:
            "Camera access is allowed for desktop apps and the privacy switch is on — the permission layer is clear.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "check-camera-permission",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-select",
          title: "Point the app at the working camera",
          explanation:
            "From Tools, run Select the integrated webcam in the meeting app.",
          why: "The evidence cleared every other layer and named one wrong selection — binding the app to the proven device is the whole fix.",
          expectedObservation:
            "The app's preview shows the room with the integrated camera selected.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "select-integrated-camera",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-call",
          title: "Prove it where the symptom lived",
          explanation:
            "From Tools, run Confirm call video, then compare with Tomas's report.",
          why: "The ticket is about meeting apps — only a live call in that same app proves the black screen is gone.",
          expectedObservation: "A test call shows Tomas's video live with clear audio.",
          target: { componentId: "customer-chat", label: "Conversation with Tomas Weber" },
          actionId: "confirm-call-video",
        },
      ],
    },
    actions: [
      {
        id: "confirm-camera-app",
        label: "Confirm camera app works",
        kind: "inspect",
        tool: "settings-center",
        patch: { webcam: { deviceConfirmed: true } },
        feedback: "Camera app shows a live picture — hardware, driver and shutter all healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The working second app is the cheapest evidence available — it retires device, driver and shutter layers in one step.",
          evidenceGain: "Working app rules out hardware, driver and privacy-shutter layers.",
        },
        matchHints: ["camera app", "test the camera", "works elsewhere"],
        isDiagnostic: true,
      },
      {
        id: "check-app-camera-choice",
        label: "Check app camera choice",
        kind: "inspect",
        tool: "meeting-app",
        appliesWhen: { type: "stateEquals", path: "webcam.deviceConfirmed", value: true },
        patch: { webcam: { bindingChecked: true, bindingFound: true } },
        feedback:
          "Meeting app camera list: bound to 'OEM Virtual Cam'; 'Integrated Webcam' present but not selected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the device proven healthy, the failing app's own input selection is the layer that explains black video in one app only.",
          evidenceGain: "The app points at a virtual device with no frames — app layer, not device layer.",
        },
        matchHints: ["camera choice", "selected camera", "input device"],
        isDiagnostic: true,
      },
      {
        id: "check-camera-permission",
        label: "Check camera permission",
        kind: "inspect",
        tool: "settings-center",
        appliesWhen: { type: "stateEquals", path: "webcam.bindingFound", value: true },
        patch: { webcam: { permissionChecked: true, permissionOk: true } },
        feedback:
          "Windows camera privacy: allowed for desktop apps; camera access on. Permission layer clear.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Per-app privacy can silently produce black video — clearing it means the remaining evidence points at one thing only.",
          evidenceGain: "Permission layer ruled out — only the app's device choice remains.",
        },
        matchHints: ["permission", "privacy", "camera access"],
        isDiagnostic: true,
      },
      {
        id: "select-integrated-camera",
        label: "Select the integrated webcam",
        kind: "ui",
        tool: "meeting-app",
        appliesWhen: { type: "stateEquals", path: "webcam.permissionOk", value: true },
        patch: { webcam: { bound: true } },
        feedback: "Meeting app now bound to Integrated Webcam; preview shows the room.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Every other layer is proven clean and one selection is proven wrong — binding the app to the working device is the exact change.",
          evidenceGain: "Correct device selected in the one layer that was wrong.",
        },
        matchHints: ["select the camera", "choose the webcam", "switch camera"],
        isFix: true,
      },
      {
        id: "confirm-call-video",
        label: "Confirm call video",
        kind: "ui",
        tool: "meeting-app",
        appliesWhen: { type: "stateEquals", path: "webcam.bound", value: true },
        patch: { webcam: { verified: true } },
        feedback: "Test call: Tomas's video is live; the counterpart sees him clearly.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The symptom lived in meeting apps — a live call in that same app is the end-to-end proof the ticket wanted.",
          evidenceGain: "Video confirmed in the meeting app where the symptom appeared.",
        },
        isFix: true,
      },
      {
        id: "update-driver-wrong",
        label: "Reinstall the camera driver",
        kind: "ui",
        tool: "settings-center",
        evaluation: {
          grade: "wrong",
          rationale:
            "The Camera app already proves the driver delivers frames — reinstalling it cannot change which device the meeting app selects.",
        },
        feedback: "Driver reinstalled — the meeting app still points at the virtual camera.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "webcam.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "webcam.verified", value: true },
      { type: "stateEquals", path: "webcam.bound", value: true },
      { type: "stateEquals", path: "webcam.permissionChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["update-driver-wrong"] },
        feedback: "A working Camera app means the driver is fine — the app's own device choice is what changed.",
      },
    ],
    hints: [
      { level: 1, text: "Which apps still show a picture?" },
      { level: 2, text: "Compare what the working app uses with what the failing app has selected." },
      {
        level: 3,
        text: "Clear the permission layer first — then point the failing app at the device that already works, and prove it in a call.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "After Monday's laptop refresh the meeting app was bound to a leftover virtual camera — Windows permission was never blocked and the hardware never failed.",
      whyItWorked:
        "The working Camera app bounded the search before any change, the app's own list named the wrong device, and the permission check removed the last alternative so one selection fixed it. Transferable principle: a fault visible in one app but not another belongs to that app's configuration — use the working app to define the layers you can stop testing.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Camera-app confirmation, app device choice, OS permission check." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Hardware and driver dropped — the Camera app streams fine; permission dropped — desktop apps allowed; wrong-app-scope dropped — every meeting app fails identically.",
        },
        { step: "Apply fix", whatLearnerDid: "Selected the integrated webcam in the meeting app." },
        { step: "Verify", whatLearnerDid: "Live test call showed video." },
      ],
      followUps: [
        "Pin the approved camera device per app in the refresh image so selections survive rebuilds.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "support-bluetooth-profile",
    version: 1,
    title: "Bluetooth headset pairs but mic is silent",
    category: "support",
    difficulty: "foundational",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Separate the playback connection from the microphone connection",
      "Read a device's connected profiles instead of assuming pairing",
      "Restore the missing profile and prove it on a live call",
    ],
    prerequisites: [],
    skills: ["helpdesk", "endpoint-security", "troubleshooting-method"],
    ticket: {
      id: "HD-1089",
      user: "Aisha Bello",
      role: "Recruiter",
      symptomPlainLanguage:
        "My headset connects and music plays, but callers can't hear me — the mic is silent on every call.",
      priority: "low",
      channel: "walkup",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["bluetooth-settings"],
      enabledCommands: [],
      initialWorld: {
        bt: {
          profileChecked: false,
          hfpConnected: false,
          inputChecked: false,
          repaired: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Aisha Bello",
      opening: "My headset connects and music plays, but callers can't hear me — the mic is silent on every call.",
      followUpQuestions: [
        "Does music play through them?",
        "Does the laptop's voice recorder pick you up?",
        "When did this start?",
      ],
      replies: [
        {
          match: ["music", "sound", "hear", "play", "fine"],
          response: "Music plays perfectly — it's only my voice that never gets through.",
          once: false,
          revealsConcepts: [
            "Playback working proves the audio half of the link — isolate what carries the microphone.",
          ],
        },
        {
          match: ["recorder", "dictate", "voice test", "test sound"],
          when: { type: "stateEquals", path: "bt.repaired", value: true },
          response: "The recorder hears me on the headset now — and the last call worked too.",
          once: false,
          revealsConcepts: ["A live input test confirms the microphone path end to end."],
        },
        {
          match: ["recorder", "dictate", "voice test", "test sound"],
          response: "The voice recorder only ever sees the laptop mic, never the headset.",
          once: false,
          revealsConcepts: ["No headset input endpoint exists — the device never offered one."],
        },
        {
          match: ["start", "paired", "new", "yesterday", "friday"],
          response: "Paired them fresh on Friday — music worked straight out of the box.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply: "They pair, music plays, but nobody can hear me on calls.",
      mentorPrompts: [
        "What carries the microphone is a separate connection from what carries music.",
        "Check the profile before you blame the mic.",
      ],
    },
    hypotheses: [
      { id: "h-profile", label: "The mic profile never connected", initiallyPlausible: true },
      { id: "h-muted", label: "The headset mic is muted", initiallyPlausible: true },
      { id: "h-app", label: "The call app uses the wrong input", initiallyPlausible: true },
    ],
    guidedWalkthrough: {
      intro:
        "Paired is not complete: read which connections actually negotiated, confirm the endpoint the missing one would create, then re-pair and prove it on a call.",
      steps: [
        {
          id: "guide-profile",
          title: "Read the connected profiles",
          explanation:
            "Ask Aisha whether music still plays, then run Check connection profile from Tools.",
          why: "A headset holds several independent connections — music and microphone ride different ones, so 'connected' can be half true.",
          expectedObservation:
            "The device shows Connected with A2DP stereo only — Hands-Free profile disconnected.",
          target: { componentId: "customer-chat", label: "Conversation with Aisha Bello" },
          actionId: "check-connection-profile",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-input",
          title: "Check the input devices and mic state",
          explanation:
            "Run Check input devices from Tools, then read the input list and the headset's own state.",
          why: "Missing endpoint and muted hardware look identical from a call — the input list plus mute state tells them apart.",
          expectedObservation:
            "Only the laptop mic exists as an input; the headset mute switch is off with battery at 84%.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "check-input-devices",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-repair",
          title: "Renegotiate both profiles",
          explanation:
            "From Tools, run Remove and re-pair the headset so both profiles negotiate fresh.",
          why: "The evidence shows one half of a healthy device never connected — a clean re-pair is the standard way to offer both connections again.",
          expectedObservation:
            "The device re-pairs with both Hands-Free and A2DP connected.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "remove-and-re-pair",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-call",
          title: "Prove the mic on a live call",
          explanation:
            "From Tools, run Confirm call audio, then compare with Aisha's symptom.",
          why: "The ticket is about callers not hearing her — only a live call where they do is the honest end-to-end proof.",
          expectedObservation: "A test call comes back with the counterpart hearing her clearly.",
          target: { componentId: "customer-chat", label: "Conversation with Aisha Bello" },
          actionId: "confirm-call-audio",
        },
      ],
    },
    actions: [
      {
        id: "check-connection-profile",
        label: "Check connection profile",
        kind: "inspect",
        tool: "bluetooth-settings",
        patch: { bt: { profileChecked: true } },
        feedback:
          "Device 'AeroBuds Pro': Connected — A2DP (stereo) only; Hands-Free Profile shows Disconnected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Pairing covers several independent connections — reading the profile list shows exactly which half of the device is present.",
          evidenceGain: "Stereo profile carries playback only — the mic rides a profile that never connected.",
        },
        matchHints: ["profile", "connected devices", "hands free"],
        isDiagnostic: true,
      },
      {
        id: "check-input-devices",
        label: "Check input devices",
        kind: "inspect",
        tool: "bluetooth-settings",
        appliesWhen: { type: "stateEquals", path: "bt.profileChecked", value: true },
        patch: { bt: { inputChecked: true } },
        feedback:
          "Input list: laptop mic only — no hands-free endpoint exists; headset mute switch off, battery 84%.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A missing endpoint and a muted mic look the same from a call — the input list and mute state retire the hardware explanations.",
          evidenceGain: "No hands-free endpoint and an unmuted mic — hardware-mute hypothesis ruled out.",
        },
        matchHints: ["input devices", "microphone list", "mute"],
        isDiagnostic: true,
      },
      {
        id: "remove-and-re-pair",
        label: "Remove and re-pair the headset",
        kind: "ui",
        tool: "bluetooth-settings",
        appliesWhen: { type: "stateEquals", path: "bt.inputChecked", value: true },
        patch: { bt: { repaired: true, hfpConnected: true } },
        feedback: "Device removed and re-paired — both Hands-Free and A2DP profiles connected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Evidence shows one missing connection on an otherwise healthy device — a clean re-pair is the smallest change that offers both profiles again.",
          evidenceGain: "Both profiles negotiated — the microphone endpoint now exists.",
        },
        matchHints: ["re-pair", "remove device", "pair again"],
        isFix: true,
      },
      {
        id: "confirm-call-audio",
        label: "Confirm call audio",
        kind: "ui",
        tool: "bluetooth-settings",
        appliesWhen: { type: "stateEquals", path: "bt.repaired", value: true },
        patch: { bt: { verified: true } },
        feedback: "Test call: the counterpart hears Aisha clearly through the headset mic.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is 'callers can't hear me' — a live call where they can is the proof that matches the symptom exactly.",
          evidenceGain: "Live call confirms the microphone path end to end.",
        },
        isFix: true,
      },
      {
        id: "reinstall-driver-wrong",
        label: "Reinstall the Bluetooth driver",
        kind: "ui",
        tool: "bluetooth-settings",
        evaluation: {
          grade: "wrong",
          rationale:
            "Playback already streams through the same radio and driver — the failure is the missing hands-free connection, which a driver reinstall does not renegotiate.",
        },
        feedback: "Driver reinstalled — the hands-free profile is still not connected.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "bt.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "bt.verified", value: true },
      { type: "stateEquals", path: "bt.hfpConnected", value: true },
      { type: "stateEquals", path: "bt.inputChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["reinstall-driver-wrong"] },
        feedback:
          "Music already proves the driver works — the missing piece is a profile, which reinstallation never negotiates.",
      },
    ],
    hints: [
      { level: 1, text: "Music playing means half the link works — which half is silent?" },
      { level: 2, text: "Open the device's connection list — what is connected besides the speakers?" },
      {
        level: 3,
        text: "Negotiate the connection that carries the microphone, then prove it on a live call.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The fresh pairing negotiated only the A2DP stereo profile — the hands-free connection that carries the microphone never came up, so no input endpoint existed to select.",
      whyItWorked:
        "The profile list showed the half that was missing, the input list plus mute state retired the hardware explanations, and a clean re-pair let both connections negotiate before a live call proved it. Transferable principle: paired is not the same as complete — a wireless device holds several independent connections; identify which one is missing before touching hardware or drivers.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Profile list, input-device list with mute and battery state." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Hardware mute dropped — switch off and battery fine; wrong-app-input dropped — no hands-free endpoint exists to select anywhere.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed and re-paired the headset." },
        { step: "Verify", whatLearnerDid: "Test call heard through the headset mic." },
      ],
      followUps: [
        "Re-pair peripherals after laptop refreshes so both profiles come up together.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
  {
    id: "support-smtp-outbound",
    version: 1,
    title: "We receive client emails but replies never arrive",
    category: "support",
    difficulty: "beginner",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Prove which mail direction works before diagnosing the other",
      "Separate connection timeouts from recipient rejections in the queue",
      "Restore exactly the path a change window removed",
    ],
    prerequisites: ["email-not-receiving"],
    skills: ["helpdesk", "email", "networking"],
    ticket: {
      id: "HD-1090",
      user: "Lena Fischer",
      role: "Customer success lead",
      symptomPlainLanguage:
        "Clients write us all day and we answer right back — but half our replies never arrive and nobody gets a bounce.",
      priority: "high",
      channel: "phone",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["mail-relay"],
      enabledCommands: [],
      initialWorld: {
        smtp: {
          inboundConfirmed: false,
          outboundTested: false,
          queueChecked: false,
          pathChecked: false,
          ruleRestored: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Lena Fischer",
      opening:
        "Clients write us all day and we answer right back — but half our replies never arrive and nobody gets a bounce.",
      followUpQuestions: [
        "Do you get any bounce messages?",
        "When did replies last arrive?",
        "Is it everyone or just you?",
      ],
      replies: [
        {
          match: ["bounce", "ndr", "spam folder", "rejection"],
          response: "No bounces at all — silence on the other side every time.",
          once: false,
          revealsConcepts: [
            "A missing NDR means no recipient ever rejected it — the mail never arrived to be rejected.",
          ],
        },
        {
          match: ["last", "tuesday", "week", "worked", "before"],
          response: "Everything worked until Tuesday's network maintenance window.",
          once: false,
          revealsConcepts: ["A dated change window is evidence — correlate the failure with what moved."],
        },
        {
          match: ["everyone", "team", "only me", "who else"],
          response:
            "Three of us in customer success see it — clients say they only ever got our first replies.",
          once: false,
          revealsConcepts: [],
        },
        {
          match: ["arrive", "delivery", "received", "test", "backlog"],
          when: { type: "stateEquals", path: "smtp.verified", value: true },
          response:
            "Delivery receipts just came back for the whole backlog — and the client confirmed the reply landed.",
          once: false,
          revealsConcepts: ["Receipts on the backlog prove the restored path end to end."],
        },
      ],
      defaultReply: "Inbound is fine, outbound goes into thin air, and no one gets a bounce.",
      mentorPrompts: [
        "Prove one direction before you diagnose the other.",
        "A timeout and a rejection are different facts — the queue tells them apart.",
      ],
    },
    hypotheses: [
      { id: "h-block", label: "The outbound path is blocked", initiallyPlausible: true },
      { id: "h-reject", label: "Recipients reject our domain", initiallyPlausible: true },
      { id: "h-rule", label: "A local rule diverts replies", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Mail has a direction: prove the half that works, then follow the failing half from the queue to the exact gate that stops it.",
      steps: [
        {
          id: "guide-inbound",
          title: "Prove the inbound direction still works",
          explanation:
            "Open HD-1090, then run Confirm inbound flow from Tools.",
          why: "One healthy direction narrows every later question to the send path — before that, the fault could be anywhere in mail.",
          expectedObservation:
            "Inbound trace shows client messages accepted and delivered at 10:41 — receive path healthy.",
          target: { componentId: "ticket-inbox", label: "Ticket chip HD-1090 in the topbar" },
          actionId: "confirm-inbound-flow",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-test-send",
          title: "Test the outbound direction",
          explanation:
            "Run Test outbound send from Tools, then read how the connection ends.",
          why: "How a send dies — timeout or rejection — decides whether you look at your own path or at the receivers.",
          expectedObservation:
            "The relay's connection to port 25 times out after 21 seconds with the message held.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "test-outbound-send",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-queue",
          title: "Read the mail queue",
          explanation:
            "Run Check mail queue from Tools, then read what the held messages are waiting on.",
          why: "The queue separates 'nobody accepted it' from 'we never got it there' — timeouts and rejections mean different owners.",
          expectedObservation:
            "Six messages queued as connection timeouts, oldest 14 hours — no NDRs, no policy rejections.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "check-mail-queue",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-edge",
          title: "Find the gate that stops the path",
          explanation:
            "Run Check edge path from Tools, then read what the recent change touched.",
          why: "A failure that starts mid-week needs a mid-week cause — the change record plus the path check names the exact gate.",
          expectedObservation:
            "CHG-3312 removed the relay→internet:25 allow rule in Tuesday's edge refresh; egress is default-deny.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "check-edge-path",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-restore",
          title: "Restore exactly that path",
          explanation:
            "From Tools, run Restore the outbound firewall rule for the relay alone.",
          why: "The evidence names one missing permission on one host — reinstating it narrowly fixes senders without opening the edge.",
          expectedObservation:
            "A new row reads the allow rule reinstated: mail-relay → any:25 as a pinned object.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "restore-outbound-rule",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-drain",
          title: "Watch the backlog drain",
          explanation:
            "From Tools, run Confirm queue drained, then compare with the symptom on the ticket.",
          why: "The ticket says replies never arrive — delivery receipts on the backlog are the proof the whole path works again.",
          expectedObservation:
            "The queue drains and receipts return for all six messages plus the test reply.",
          target: { componentId: "ticket-inbox", label: "Ticket chip HD-1090" },
          actionId: "confirm-queue-drained",
        },
      ],
    },
    actions: [
      {
        id: "confirm-inbound-flow",
        label: "Confirm inbound flow",
        kind: "inspect",
        tool: "mail-relay",
        patch: { smtp: { inboundConfirmed: true } },
        feedback: "Inbound trace: client messages accepted and delivered at 10:41 — receive path healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Prove the healthy direction first — one working half narrows every subsequent question to the send path.",
          evidenceGain: "Inbound delivered — direction narrowed to the send side.",
        },
        matchHints: ["inbound", "receive path", "incoming trace"],
        isDiagnostic: true,
      },
      {
        id: "test-outbound-send",
        label: "Test outbound send",
        kind: "inspect",
        tool: "mail-relay",
        appliesWhen: { type: "stateEquals", path: "smtp.inboundConfirmed", value: true },
        patch: { smtp: { outboundTested: true } },
        feedback:
          "Test reply to an external address: relay connection to port 25 times out after 21s; message held.",
        evaluation: {
          grade: "optimal",
          rationale:
            "How the send dies is the fork — a timeout means we never reached anyone, which no receiver-side theory can explain.",
          evidenceGain: "Send path cannot reach outside on 25 — transport-level, before any recipient acts.",
        },
        matchHints: ["test send", "outbound", "send test"],
        isDiagnostic: true,
      },
      {
        id: "check-mail-queue",
        label: "Check mail queue",
        kind: "inspect",
        tool: "mail-relay",
        appliesWhen: { type: "stateEquals", path: "smtp.outboundTested", value: true },
        patch: { smtp: { queueChecked: true } },
        feedback:
          "Queue: 6 messages 'retry: connection timed out', oldest 14h — no NDRs, no policy or recipient rejections.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The queue is where timeout and rejection separate — no rejections means recipients never saw the mail; local rules are off the path.",
          evidenceGain:
            "Timeouts, not rejections — recipients never saw the mail; recipient-blocking and local-rule hypotheses ruled out.",
        },
        matchHints: ["queue", "message queue", "held messages"],
        isDiagnostic: true,
      },
      {
        id: "check-edge-path",
        label: "Check edge path",
        kind: "inspect",
        tool: "mail-relay",
        appliesWhen: { type: "stateEquals", path: "smtp.queueChecked", value: true },
        patch: { smtp: { pathChecked: true } },
        feedback:
          "Change CHG-3312 (Tuesday edge refresh) removed the relay→internet:25 allow rule; egress now default-deny.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A failure starting mid-week needs a mid-week cause — pairing the path check with the change record names the exact missing gate.",
          evidenceGain: "The exact path gap — a change window explains the timing.",
        },
        matchHints: ["edge", "firewall", "change record", "path"],
        isDiagnostic: true,
      },
      {
        id: "restore-outbound-rule",
        label: "Restore the outbound firewall rule",
        kind: "ui",
        tool: "mail-relay",
        appliesWhen: { type: "stateEquals", path: "smtp.pathChecked", value: true },
        patch: { smtp: { ruleRestored: true } },
        feedback: "Allow rule reinstated: mail-relay → any:25, pinned to the relay object only.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence names one removed permission on one host — reinstating it narrowly is the smallest complete fix.",
          evidenceGain: "Least-privilege restore — one host, one port, named object.",
        },
        matchHints: ["restore the rule", "allow rule", "open port 25"],
        isFix: true,
      },
      {
        id: "confirm-queue-drained",
        label: "Confirm queue drained",
        kind: "ui",
        tool: "mail-relay",
        appliesWhen: { type: "stateEquals", path: "smtp.ruleRestored", value: true },
        patch: { smtp: { verified: true } },
        feedback: "Queue drained; all six messages plus the test reply delivered with receipts.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket says replies never arrive — receipts on the backlog prove the restored path end to end.",
          evidenceGain: "Delivery receipts for the backlog — send path proven restored.",
        },
        isFix: true,
      },
      {
        id: "switch-to-webmail-wrong",
        label: "Send the replies from personal webmail",
        kind: "ui",
        tool: "mail-relay",
        evaluation: {
          grade: "wrong",
          rationale:
            "Personal webmail bypasses the company relay entirely — the six queued replies stay stuck and the shared send path stays broken for everyone else.",
        },
        feedback: "Workaround used — the backlog is still queued and the relay path remains broken.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "smtp.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "smtp.verified", value: true },
      { type: "stateEquals", path: "smtp.ruleRestored", value: true },
      { type: "stateEquals", path: "smtp.pathChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["switch-to-webmail-wrong"] },
        feedback:
          "Out-of-band sends hide the fault instead of fixing it — the shared relay path is what the ticket needs working.",
      },
    ],
    hints: [
      { level: 1, text: "Which direction still works?" },
      { level: 2, text: "Timeout or rejection — what does the queue say the messages are waiting on?" },
      {
        level: 3,
        text: "The change window names the missing permission — reinstate exactly that path, then watch the backlog clear.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Tuesday's edge refresh dropped the relay's allow rule for outbound port 25 — replies queued and timed out while inbound delivery continued untouched.",
      whyItWorked:
        "Proving the inbound half first framed every later question on the send side; the queue's timeout-versus-rejection split removed receiver-side theories, and the change record paired with the path check named the exact gate to reinstate. Transferable principle: mail problems have a direction — prove which half works first, then separate timeouts from rejections, because only one of them points at your own path.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Inbound trace, outbound test send, queue state, edge path with change record." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Recipient-blocking and local-rule hypotheses dropped — no NDRs or rejections in the queue; inbound fault dropped — trace shows accepted deliveries.",
        },
        { step: "Apply fix", whatLearnerDid: "Restored the relay's outbound allow rule." },
        { step: "Verify", whatLearnerDid: "Queue drained with delivery receipts on the backlog." },
      ],
      followUps: [
        "Require firewall change records to list affected egress dependencies so refreshes stop dropping relay rules.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [
      {
        title: "RFC 5321 — Simple Mail Transfer Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc5321",
        note: "Public IETF specification.",
      },
    ],
  },
  {
    id: "support-dock-peripherals",
    version: 1,
    title: "Dock drops monitor, keyboard, and mouse together",
    category: "support",
    difficulty: "beginner",
    scenarioType: "INTERMITTENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read simultaneous multi-device failure as one shared-component signal",
      "Confirm the shared upstream with link evidence before blaming devices",
      "Test the cheapest shared layer first and prove stability across the trigger",
    ],
    prerequisites: [],
    skills: ["helpdesk", "troubleshooting-method"],
    ticket: {
      id: "HD-1091",
      user: "Chloe Barnes",
      role: "Legal assistant",
      symptomPlainLanguage:
        "When the laptop sleeps, everything plugged into the dock dies at once — screen, keyboard, and mouse — and it comes back when I jiggle the cable.",
      priority: "medium",
      channel: "walkup",
    },
    environment: {
      components: ["ticket-inbox", "customer-chat", "evidence-board"],
      kind: "mixed",
      shell: "none",
      availableTools: ["dock-manager"],
      enabledCommands: [],
      initialWorld: {
        dock: {
          fateChecked: false,
          linkChecked: false,
          powerChecked: false,
          reseated: false,
          verified: false,
        },
      },
    },
    conversation: {
      persona: "Chloe Barnes",
      opening:
        "When the laptop sleeps, everything plugged into the dock dies at once — screen, keyboard, and mouse — and it comes back when I jiggle the cable.",
      followUpQuestions: [
        "Does everything come back on its own?",
        "Did anything change on the desk?",
        "How often does it happen?",
      ],
      replies: [
        {
          match: ["all at once", "together", "same time", "everything"],
          response: "All three die in the same instant — screen, keyboard, and mouse together.",
          once: false,
          revealsConcepts: [
            "Simultaneous failure across different devices means one shared upstream, not three faults.",
          ],
        },
        {
          match: ["jiggle", "bump", "cable", "touch", "move"],
          response:
            "If I push the thick cable into the dock, everything comes back — until the next time.",
          once: false,
          revealsConcepts: [
            "A physical correlation that restores service is evidence about the connection itself.",
          ],
        },
        {
          match: ["change", "moved", "desk", "friday", "monitor arm"],
          response: "The desk was rearranged Friday — the dock sits under the monitor arm now.",
          once: false,
          revealsConcepts: ["A recent physical change is part of the timeline for an intermittent fault."],
        },
        {
          match: ["still working", "stable", "since", "no drops"],
          when: { type: "stateEquals", path: "dock.verified", value: true },
          response: "It has been a full day without a single drop — including two sleep cycles.",
          once: false,
          revealsConcepts: ["Surviving the exact trigger that used to break it is the honest proof."],
        },
      ],
      defaultReply: "Everything on the dock dies together and comes back if I touch the cable.",
      mentorPrompts: [
        "When three devices fail at once, stop counting devices and find the shared point.",
        "A symptom that a physical nudge fixes is evidence too.",
      ],
    },
    hypotheses: [
      { id: "h-link", label: "The dock link keeps dropping", initiallyPlausible: true },
      { id: "h-cable", label: "The monitor cable is loose", initiallyPlausible: true },
      { id: "h-power", label: "The power supply is insufficient", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Count the failure moments, not the devices: confirm they share one upstream, prove which shared layer is failing, then restore it and survive the trigger.",
      steps: [
        {
          id: "guide-fate",
          title: "Confirm the shared fate",
          explanation:
            "Ask Chloe whether all three die together, then run Check failure timeline from Tools.",
          why: "Three devices failing in one instant is one event wearing three faces — the timeline decides whether you are hunting one fault or three.",
          expectedObservation:
            "Monitor, keyboard and mouse drop in the same two-second window — one shared upstream.",
          target: { componentId: "customer-chat", label: "Conversation with Chloe Barnes" },
          actionId: "check-shared-fate",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-link",
          title: "Read the dock link state",
          explanation:
            "Run Check dock link status from Tools, then read the link and retrain history.",
          why: "Everything downstream hangs off the dock's own upstream link — its state is the shared layer closest to the symptom.",
          expectedObservation:
            "The link negotiated then dropped six times since the desk change, each with a retrain logged.",
          target: { componentId: "evidence-board", label: "Session log in the Evidence drawer" },
          actionId: "check-dock-link",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-power",
          title: "Rule out the power budget",
          explanation:
            "Run Check power budget from Tools, then read the adapter draw against its rating.",
          why: "Under-powering looks identical to a link drop from the user's chair — measure it so the fix targets the right shared layer.",
          expectedObservation:
            "135W adapter at 0.9A draw with no under-voltage events — power is ample.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "check-power-budget",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-reseat",
          title: "Restore the shared connection",
          explanation:
            "From Tools, run Reseat the dock connector so the link renegotiates cleanly.",
          why: "Link retrains plus a nudge that fixes it both point at the physical connection — it is also the cheapest shared layer to test.",
          expectedObservation:
            "The connector is latched and the link renegotiates at full bandwidth with no retrain.",
          target: { componentId: "evidence-board", label: "Evidence drawer (latest feedback)" },
          actionId: "reseat-dock-connector",
          fallback: "the Evidence button in the bottom dock",
        },
        {
          id: "guide-stable",
          title: "Survive the cycles that used to break it",
          explanation:
            "From Tools, run Verify stable session and compare with the pattern on the ticket.",
          why: "An intermittent fault is only proven gone by living through its trigger — sleep and wake are the ticket's own test.",
          expectedObservation:
            "Three sleep/wake cycles and a workday later with zero drops across all peripherals.",
          target: { componentId: "ticket-inbox", label: "Ticket chip HD-1091" },
          actionId: "verify-stable-session",
        },
      ],
    },
    actions: [
      {
        id: "check-shared-fate",
        label: "Check failure timeline",
        kind: "inspect",
        tool: "dock-manager",
        patch: { dock: { fateChecked: true } },
        feedback:
          "Failure log: monitor, keyboard and mouse drop in the same 2-second window — one shared upstream, not three devices.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The count of failure moments decides the whole search — simultaneous loss localizes the fault upstream of every downstream port.",
          evidenceGain: "Simultaneous drop across devices — one shared upstream, not three faults.",
        },
        matchHints: ["timeline", "failure log", "all at once"],
        isDiagnostic: true,
      },
      {
        id: "check-dock-link",
        label: "Check dock link status",
        kind: "inspect",
        tool: "dock-manager",
        appliesWhen: { type: "stateEquals", path: "dock.fateChecked", value: true },
        patch: { dock: { linkChecked: true } },
        feedback:
          "Dock link negotiated then dropped 6 times since Friday, each with a retrain logged at the moment of failure.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The shared upstream is where all three devices meet — its own drop history is direct evidence, not inference.",
          evidenceGain: "The dock's upstream link retrains at each failure — shared layer confirmed.",
        },
        matchHints: ["link status", "dock link", "retrain"],
        isDiagnostic: true,
      },
      {
        id: "check-power-budget",
        label: "Check power budget",
        kind: "inspect",
        tool: "dock-manager",
        appliesWhen: { type: "stateEquals", path: "dock.linkChecked", value: true },
        patch: { dock: { powerChecked: true } },
        feedback: "135W adapter at 0.9A draw — power budget ample, no under-voltage events logged.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Under-powering masquerades as a link drop — measuring it retires the electrical explanation before anything is changed.",
          evidenceGain: "Power supply ruled out — drops are link-level, not electrical starvation.",
        },
        matchHints: ["power", "adapter", "wattage"],
        isDiagnostic: true,
      },
      {
        id: "reseat-dock-connector",
        label: "Reseat the dock connector",
        kind: "ui",
        tool: "dock-manager",
        appliesWhen: { type: "stateEquals", path: "dock.powerChecked", value: true },
        patch: { dock: { reseated: true } },
        feedback: "Dock connector reseated and latched; link renegotiated at full bandwidth.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Link retrains plus a nudge that restores service both name the physical connection — one reseat is the cheapest test of the proven layer.",
          evidenceGain: "Physical layer restored — one connection, one fix.",
        },
        matchHints: ["reseat", "reconnect the dock", "unplug and replug"],
        isFix: true,
      },
      {
        id: "verify-stable-session",
        label: "Verify stable session",
        kind: "ui",
        tool: "dock-manager",
        appliesWhen: { type: "stateEquals", path: "dock.reseated", value: true },
        patch: { dock: { verified: true } },
        feedback:
          "Three sleep/wake cycles and a workday later — zero drops, all peripherals stay up.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The fault is intermittent and trigger-shaped — only surviving the exact cycles that used to break it proves it is gone.",
          evidenceGain: "Stable across the trigger cycles — intermittency proven ended.",
        },
        isFix: true,
      },
      {
        id: "replace-dock-wrong",
        label: "Order a replacement dock",
        kind: "ui",
        tool: "dock-manager",
        evaluation: {
          grade: "premature",
          rationale:
            "Power and link evidence point at the physical connection — a reseat is the zero-cost test; ordering hardware first spends budget on an unproven hypothesis.",
        },
        feedback: "Replacement ordered without testing the connection the evidence already names.",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "dock.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "dock.verified", value: true },
      { type: "stateEquals", path: "dock.reseated", value: true },
      { type: "stateEquals", path: "dock.powerChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["replace-dock-wrong"] },
        feedback:
          "The connection was never tested — new hardware would arrive to the same retrains until it is.",
      },
    ],
    hints: [
      { level: 1, text: "How many failures does the ticket really describe — count the devices, then count the moments." },
      { level: 2, text: "What do all three peripherals share upstream of the laptop?" },
      {
        level: 3,
        text: "Prove the power is fine, restore the one physical link they share, then survive the cycles that used to break it.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The dock's upstream link was retraining under a stressed connection after Friday's desk rearrangement — one link drop took every downstream device with it.",
      whyItWorked:
        "The shared-fate timeline collapsed three complaints into one fault, link history plus the power measurement named the failing shared layer while retiring the electrical one, and reseating it survived the sleep cycles that used to break it. Transferable principle: simultaneous failure of multiple devices is a shared-component signal — count the failure moments, not the devices, and test the cheapest shared layer first.",
      methodologyMap: [
        { step: "Gather evidence", whatLearnerDid: "Failure timeline, dock link history, power-budget measurement." },
        {
          step: "Rule out",
          whatLearnerDid:
            "Three independent device faults dropped — all failures share one two-second window; power starvation dropped — draw well under rating with no under-voltage events.",
        },
        { step: "Apply fix", whatLearnerDid: "Reseated the dock connector." },
        { step: "Verify", whatLearnerDid: "Stable across sleep/wake cycles and a full workday." },
      ],
      followUps: [
        "Route the dock cable away from the monitor arm so the desk setup cannot stress the link again.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  },
];
