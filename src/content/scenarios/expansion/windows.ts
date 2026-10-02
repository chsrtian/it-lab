import type { ScenarioInput } from "@/content/schema";

export const windowsScenarios: ScenarioInput[] = [
  {
    id: "windows-profile-temp",
    version: 1,
    title: "Desktop and files missing after every login",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate a temporary-profile sign-in from deleted profile data",
      "Rule out disk capacity before touching profile storage",
      "Trace where Windows believes a profile lives when the load fails",
    ],
    prerequisites: ["windows-wont-boot"],
    skills: ["event-logs", "user-profiles", "troubleshooting-method"],
    ticket: {
      id: "HD-1059",
      user: "Dana Whitfield",
      role: "Claims adjuster",
      symptomPlainLanguage:
        "Everything on my desktop vanished after I logged in this morning - my files, my shortcuts, all of it. It even warned me about a temporary profile.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "She logged off cleanly last night and insists she deleted nothing. It happens on every logon since this morning.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "storage"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer", "storage"],
      showInspector: true,
      initialWorld: {
        currentUser: "dwhitfield",
        logs: [
          "2026-09-28 17:22:10 INFO  User dwhitfield logged off (profile unloaded cleanly)",
          "2026-09-29 08:41:53 WARN  Windows cannot find the local profile and is signing on with a temporary profile (Event 1511)",
          "2026-09-29 08:41:54 WARN  The previous profile could not be opened; changes will be discarded at logoff (Event 1515)",
          "2026-09-29 08:41:55 INFO  Temporary profile loaded for dwhitfield",
          "2026-09-29 08:44:02 INFO  Other user profiles on this machine loaded normally",
        ],
        disks: [
          { fs: "C:", size: "476G", used: "358G", avail: "118G", usePercent: "75%", mount: "C:" },
        ],
        profile: {
          eventsRead: false,
          storageChecked: false,
          registrySeen: false,
          staleEntryCleared: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-temp", label: "Profile failed to load and Windows used a temporary copy", initiallyPlausible: true },
      { id: "h-disk", label: "Disk is full so the profile cannot be written", initiallyPlausible: true },
      { id: "h-deleted", label: "Profile data was deleted", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Read what Windows recorded at logon first, prove capacity is not the blocker, then look at where the system believes this profile lives.",
      steps: [
        {
          id: "guide-profile-events",
          title: "Read this morning's profile events",
          explanation: "Open the Event Viewer tab and read the profile events from this morning's logon.",
          why: "The profile service writes an event every time a load fails, so the log names what Windows actually did before anyone guesses.",
          expectedObservation:
            "Event 1511 at 08:41 says Windows cannot find the profile and is using a temporary one, after a clean logoff last night.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-profile-events",
          cue: "INSPECT",
          conceptId: "windows-event-logs",
        },
        {
          id: "guide-free-space",
          title: "Rule out disk capacity",
          explanation: "Open the Storage tab and read the free space on C:.",
          why: "A full system volume is the classic way a profile write silently fails - measuring free space drops that hypothesis before anything is changed.",
          expectedObservation: "C: shows 118G free of 476G (75% used) - capacity is not the blocker.",
          target: { componentId: "storage", label: "Storage tab" },
          actionId: "check-free-space",
          cue: "INSPECT",
        },
        {
          id: "guide-profile-list",
          title: "Inspect the profile list",
          explanation: "Run the profile list check from the Checks list and read the recorded profile path.",
          why: "Windows records where each profile lives in the profile list - an entry pointing somewhere unreachable explains a load that quietly falls back to a temporary copy.",
          expectedObservation:
            "One entry for this account whose profile path points at a retired server share from before the March move.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "inspect-profile-list",
          cue: "CLICK",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-clear-entry",
          title: "Clear the stale profile entry",
          explanation: "From Actions, run Clear the stale profile list entry.",
          why: "Removing the dead pointer lets Windows rebuild the profile mapping locally instead of chasing a path that no longer exists.",
          expectedObservation: "The log records the stale profile list entry being removed for this account.",
          target: { componentId: "actions", label: "Actions drawer (Clear stale profile entry)" },
          actionId: "clear-stale-profile-entry",
          cue: "CLICK",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-logon",
          title: "Verify with a fresh logon",
          explanation: "From Actions, run Sign in again to verify the profile loads.",
          why: "The ticket is about what the user sees at logon - only a fresh sign-in proves the symptom is gone rather than the flag.",
          expectedObservation:
            "A new logon event loads the user's own profile with no temporary-profile warning.",
          target: { componentId: "actions", label: "Actions drawer (Sign in again)" },
          actionId: "verify-login",
          cue: "CLICK",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-profile-events",
        label: "Read user profile events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        patch: { profile: { eventsRead: true } },
        feedback:
          "08:41 Event 1511: Windows cannot find the profile and is signing on with a temporary profile. Last night's logoff was clean.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A desktop that vanishes only at logon while the machine works is a load failure, not data loss - the profile events say what Windows did at sign-in.",
          evidenceGain: "Sign-in used a temporary profile after a clean logoff - silent data deletion ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "check-free-space",
        label: "Check free disk space",
        kind: "inspect",
        tool: "storage",
        patch: { profile: { storageChecked: true } },
        feedback: "C: has 118G free of 476G (75% used) - plenty of room for a profile to write.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A full system volume blocks profile writes; measuring free space first keeps a capacity problem from masquerading as corruption.",
          evidenceGain: "118G free - disk capacity ruled out as the write blocker.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-profile-list",
        label: "Inspect the profile list entry",
        kind: "inspect",
        appliesWhen: { type: "stateEquals", path: "profile.eventsRead", value: true },
        patch: { profile: { registrySeen: true } },
        feedback:
          "ProfileList holds one entry for this account: the profile path points at \\\\SRV-FS01\\profiles\\dwhitfield, a server path retired in March.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The profile list is where Windows records where a profile lives; an entry pointing at an unreachable path explains why the load falls back to a temporary copy.",
          evidenceGain: "Profile list points at a retired server path while local data is intact - hypothesis confirmed.",
        },
        isDiagnostic: true,
        matchHints: ["profilelist", "registry profile", "profile path"],
      },
      {
        id: "clear-stale-profile-entry",
        label: "Clear the stale profile list entry",
        kind: "ui",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "profile.eventsRead", value: true },
            { type: "stateEquals", path: "profile.storageChecked", value: true },
            { type: "stateEquals", path: "profile.registrySeen", value: true },
          ],
        },
        patch: {
          profile: { staleEntryCleared: true },
          logs: [
            "2026-09-28 17:22:10 INFO  User dwhitfield logged off (profile unloaded cleanly)",
            "2026-09-29 08:41:53 WARN  Windows cannot find the local profile and is signing on with a temporary profile (Event 1511)",
            "2026-09-29 08:41:54 WARN  The previous profile could not be opened; changes will be discarded at logoff (Event 1515)",
            "2026-09-29 08:41:55 INFO  Temporary profile loaded for dwhitfield",
            "2026-09-29 08:44:02 INFO  Other user profiles on this machine loaded normally",
            "2026-09-29 09:02:11 INFO  Stale ProfileList entry for dwhitfield removed (path \\\\SRV-FS01\\profiles\\dwhitfield)",
          ],
        },
        feedback:
          "Removed the orphaned profile list entry; Windows will rebuild the profile mapping locally on the next logon.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Deleting the dead pointer addresses the load failure itself - the account stops chasing a retired share and the profile maps to local storage again.",
          evidenceGain: "Orphaned profile pointer removed - load path rebuilt on next logon.",
        },
        isFix: true,
      },
      {
        id: "verify-login",
        label: "Sign in again to verify the profile loads",
        kind: "ui",
        appliesWhen: { type: "stateEquals", path: "profile.staleEntryCleared", value: true },
        patch: {
          profile: { verified: true },
          logs: [
            "2026-09-28 17:22:10 INFO  User dwhitfield logged off (profile unloaded cleanly)",
            "2026-09-29 08:41:53 WARN  Windows cannot find the local profile and is signing on with a temporary profile (Event 1511)",
            "2026-09-29 08:41:54 WARN  The previous profile could not be opened; changes will be discarded at logoff (Event 1515)",
            "2026-09-29 08:41:55 INFO  Temporary profile loaded for dwhitfield",
            "2026-09-29 08:44:02 INFO  Other user profiles on this machine loaded normally",
            "2026-09-29 09:02:11 INFO  Stale ProfileList entry for dwhitfield removed (path \\\\SRV-FS01\\profiles\\dwhitfield)",
            "2026-09-29 09:05:47 INFO  User dwhitfield logged on with local profile S-1-5-21-4471-1141 (no temporary profile)",
          ],
        },
        feedback:
          "Fresh logon loads the user's own profile - desktop and files restored, no temporary-profile warning.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is about what the user sees at logon; only a fresh sign-in proves the reported symptom is gone instead of a flag.",
          evidenceGain: "Profile loads normally at logon - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "rebuild-profile-wrong",
        label: "Delete the profile folder so Windows recreates it",
        kind: "ui",
        feedback:
          "Deleting profile data to fix a load failure destroys the very files the user asked to recover.",
        evaluation: {
          grade: "harmful",
          rationale:
            "The events show the profile was never loaded, not that it is corrupt - the data sits on disk intact, and removing the folder destroys it while leaving the load failure in place.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "profile.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "profile.verified", value: true },
      { type: "stateEquals", path: "profile.staleEntryCleared", value: true },
      { type: "stateEquals", path: "profile.eventsRead", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["rebuild-profile-wrong"],
        },
        feedback:
          "Wiping the profile folder deletes the user's files while the load failure persists - the evidence said the profile was never loaded, not that it was bad.",
      },
    ],
    hints: [
      { level: 1, text: "Read what Windows logged at logon this morning before assuming files are gone." },
      {
        level: 2,
        text: "Check the machine's own capacity facts - a profile that fails to write and a full disk look identical from the desktop.",
      },
      {
        level: 3,
        text: "If logon events and free space are normal, look at where Windows thinks this profile lives.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The profile list entry still pointed at the SRV-FS01 profile share retired in March, so Windows could not load the profile and fell back to a temporary copy on every logon.",
      whyItWorked:
        "The events proved the profile was never loaded rather than deleted, free space ruled out a write blocker, and the profile list exposed the dead pointer; clearing it let Windows rebuild the mapping locally. Transferable principle: when data only 'disappears' at logon, trace where the system looks for it before touching the data itself.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Profile events show a temporary-profile load after a clean logoff.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "118G free rules out capacity; clean logoff plus intact local files rule out deletion.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed the orphaned profile list entry." },
        {
          step: "Verify",
          whatLearnerDid: "Fresh logon loads the user's profile with no temporary-profile event.",
        },
      ],
      followUps: [
        "Audit other accounts migrated in March for profile paths still pointing at retired shares.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [],
  },
  {
    id: "windows-dns-cache-stale",
    version: 1,
    title: "Browser keeps loading the old webmail server",
    category: "windows",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Compare a fresh resolver answer with a cached one",
      "Recognize the DNS client cache as a separate layer from the resolver",
      "Verify a name-mapping fix with a brand-new lookup",
    ],
    prerequisites: ["dns-some-sites-broken"],
    skills: ["dns", "caching", "troubleshooting-method"],
    ticket: {
      id: "HD-1060",
      user: "Priya Raman",
      role: "HR coordinator",
      symptomPlainLanguage:
        "After yesterday's webmail move my browser still opens the old page, or says the server is gone. The note says the new address works fine.",
      priority: "medium",
      channel: "email",
      additionalContext: "She already cleared cookies. Apps that talk to the address directly work.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "terminal"],
      enabledCommands: ["ipconfig", "nslookup", "ping", "help"],
      components: ["event-viewer"],
      showInspector: true,
      initialWorld: {
        currentUser: "praman",
        hosts: [
          {
            id: "ws-41",
            name: "DESKTOP-PRAMAN",
            os: "windows",
            ips: ["192.168.1.72"],
            mac: "9C:7B:EF:12:4A:31",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        dnsZones: { "webmail.corp.local": "10.20.30.44" },
        logs: [
          "2026-09-28 14:05:31 INFO  DNS Client cache populated: webmail.corp.local -> 10.20.30.19",
          "2026-09-28 16:00:00 INFO  webmail.corp.local published at 10.20.30.44 (move complete)",
          "2026-09-29 08:52:10 WARN  DNS Client served cached A record webmail.corp.local -> 10.20.30.19",
          "2026-09-29 08:52:12 WARN  Connection to 10.20.30.19 refused (service retired)",
        ],
        net: {
          freshLookup: false,
          cacheSeen: false,
          resolverChecked: false,
          flushApplied: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-cache", label: "DNS client cache serving a stale record", initiallyPlausible: true },
      { id: "h-resolver", label: "Wrong DNS server configured on the adapter", initiallyPlausible: true },
      { id: "h-hosts", label: "Hosts file overriding the name", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Ask the resolver what the truth is right now, compare it with what this machine still remembers, then fix the layer that remembers.",
      steps: [
        {
          id: "guide-nslookup",
          title: "Ask the resolver directly",
          explanation: "In the terminal, run nslookup webmail.corp.local and read the answer.",
          why: "A fresh query goes straight to the resolver - it tells you the current truth independent of what any app remembers.",
          expectedObservation: "The resolver answers 10.20.30.44, the address published after the move.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "check-nslookup",
          commandId: "nslookup-ok",
          conceptId: "what-is-dns",
        },
        {
          id: "guide-cache-dump",
          title: "Read the DNS client cache",
          explanation:
            "Run ipconfig /displaydns from Checks (or the terminal) and compare the cached record with the fresh answer.",
          why: "Windows DNS Client keeps answers in memory - comparing cached against live separates a stale local answer from a wrong resolver.",
          expectedObservation:
            "The cache still maps webmail.corp.local to 10.20.30.19 from yesterday afternoon.",
          target: {
            componentId: "event-viewer",
            label: "Checks list (DNS client entries in Event Viewer)",
          },
          actionId: "display-dns-cache",
          commandId: "ipconfig",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-adapter-dns",
          title: "Read the adapter's DNS settings",
          explanation: "Run ipconfig in the terminal and read the DNS line for the adapter.",
          why: "An adapter pointed at the wrong resolver produces wrong answers for everything - this checks the settings layer while the cache question is still open.",
          expectedObservation:
            "DNS Servers 192.168.1.1 (the working gateway resolver) - settings are correct.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "check-dns-client",
          commandId: "ipconfig",
          conceptId: "ip-addressing-basics",
        },
        {
          id: "guide-flush",
          title: "Flush the remembered answers",
          explanation: "From Actions, run Flush the DNS client cache.",
          why: "Cached entries only leave memory when they are told to - nothing else clears remembered answers mid-session.",
          expectedObservation: "The log records the DNS client cache being cleared at flush time.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (cache cleared)" },
          actionId: "flush-dns-cache",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-webmail",
          title: "Prove the page loads from the new server",
          explanation: "From Actions, run Open webmail and confirm the new server loads.",
          why: "The ticket is about a page that will not open - only a fresh request proves the symptom is gone.",
          expectedObservation:
            "A fresh lookup records webmail.corp.local resolving to 10.20.30.44 with no cached entry.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (fresh lookup)" },
          actionId: "verify-webmail",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "check-nslookup",
        label: "nslookup webmail.corp.local",
        kind: "terminal",
        tool: "terminal",
        patch: { net: { freshLookup: true } },
        feedback:
          "Server 192.168.1.1 answers webmail.corp.local with 10.20.30.44 - a brand-new lookup already gets the moved address.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A fresh query is independent of anything the machine remembers - it establishes what the resolver currently serves before any local layer is inspected.",
          evidenceGain: "Resolver answers 10.20.30.44 - resolver itself healthy.",
        },
        isDiagnostic: true,
        matchHints: ["nslookup", "dns lookup"],
      },
      {
        id: "display-dns-cache",
        label: "ipconfig /displaydns",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "net.freshLookup", value: true },
        patch: { net: { cacheSeen: true } },
        feedback:
          "The DNS client cache still holds webmail.corp.local -> 10.20.30.19 from yesterday while a fresh lookup answers 10.20.30.44 - the two disagree.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A cached answer that contradicts the live resolver is the disagreement itself - the browser is reading the remembered record, not the resolver's.",
          evidenceGain: "Stale cached record identified - the layer that remembers is at fault.",
        },
        isDiagnostic: true,
        matchHints: ["displaydns", "show dns cache"],
      },
      {
        id: "check-dns-client",
        label: "ipconfig",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "net.freshLookup", value: true },
        patch: { net: { resolverChecked: true } },
        feedback:
          "Adapter uses DNS 192.168.1.1 (the working gateway resolver) with address 192.168.1.72 - settings are correct, so the stale answer is coming from this machine's memory.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reading the adapter rules out a misconfigured resolver - the settings layer is correct, which narrows the stale answer to the cache.",
          evidenceGain: "Resolver settings correct - adapter misconfiguration ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["ipconfig", "adapter config"],
      },
      {
        id: "flush-dns-cache",
        label: "Flush the DNS client cache",
        kind: "ui",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "net.freshLookup", value: true },
            { type: "stateEquals", path: "net.cacheSeen", value: true },
          ],
        },
        patch: {
          net: { flushApplied: true },
          logs: [
            "2026-09-28 14:05:31 INFO  DNS Client cache populated: webmail.corp.local -> 10.20.30.19",
            "2026-09-28 16:00:00 INFO  webmail.corp.local published at 10.20.30.44 (move complete)",
            "2026-09-29 08:52:10 WARN  DNS Client served cached A record webmail.corp.local -> 10.20.30.19",
            "2026-09-29 08:52:12 WARN  Connection to 10.20.30.19 refused (service retired)",
            "2026-09-29 09:06:02 INFO  DNS Client cache cleared (ipconfig /flushdns)",
          ],
        },
        feedback: "DNS client cache cleared - the next lookup goes to the resolver instead of memory.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The cache is the layer holding the contradiction; clearing it forces every future lookup to the resolver that already answers correctly.",
          evidenceGain: "Stale answers purged from the client cache.",
        },
        isFix: true,
      },
      {
        id: "verify-webmail",
        label: "Open webmail and confirm the new server loads",
        kind: "ui",
        appliesWhen: { type: "stateEquals", path: "net.flushApplied", value: true },
        patch: {
          net: { verified: true },
          logs: [
            "2026-09-28 14:05:31 INFO  DNS Client cache populated: webmail.corp.local -> 10.20.30.19",
            "2026-09-28 16:00:00 INFO  webmail.corp.local published at 10.20.30.44 (move complete)",
            "2026-09-29 08:52:10 WARN  DNS Client served cached A record webmail.corp.local -> 10.20.30.19",
            "2026-09-29 08:52:12 WARN  Connection to 10.20.30.19 refused (service retired)",
            "2026-09-29 09:06:02 INFO  DNS Client cache cleared (ipconfig /flushdns)",
            "2026-09-29 09:06:44 INFO  webmail.corp.local resolved to 10.20.30.44 from resolver (cache empty)",
          ],
        },
        feedback:
          "Webmail loads from 10.20.30.44 - the original symptom is gone for this session.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a page that will not open - a brand-new request that succeeds proves the reported symptom, not just the flag.",
          evidenceGain: "Webmail loads from the moved address - end-to-end verification.",
        },
        isFix: true,
        matchHints: ["webmail", "verify webmail"],
      },
      {
        id: "hosts-file-wrong",
        label: "Pin webmail.corp.local in the hosts file",
        kind: "ui",
        feedback:
          "Pinning the name locally masks this one machine's stale cache instead of clearing it - the next move recreates the same ticket.",
        evaluation: {
          grade: "risky",
          rationale:
            "Editing the hosts file freezes one mapping forever and skips the DNS client cache that is actually serving the stale answer - it hides the symptom on this machine only.",
        },
        matchHints: ["hosts file", "pin hosts"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "net.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "net.verified", value: true },
      { type: "stateEquals", path: "net.flushApplied", value: true },
      { type: "stateEquals", path: "net.freshLookup", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["hosts-file-wrong"],
        },
        feedback:
          "The hosts file is the wrong layer - the resolver already answers correctly, so the machine's own cache is what keeps serving the old address.",
      },
    ],
    hints: [
      { level: 1, text: "Ask the resolver first: what does a brand-new lookup say right now?" },
      {
        level: 2,
        text: "Compare that answer with what this machine still remembers in memory.",
      },
      {
        level: 3,
        text: "Settings that look right and a resolver that answers right still leave one place a stale answer can live - clear it and retest the page.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The Windows DNS client cache still held yesterday's record (10.20.30.19) for webmail.corp.local after the move to 10.20.30.44, so the browser kept reaching the retired server.",
      whyItWorked:
        "A fresh nslookup proved the resolver already serves the new address, the cache dump exposed the stale entry the browser was reading, and the adapter check ruled out resolver misconfiguration; flushing replaced the remembered answer. Transferable principle: when a fresh lookup and a saved answer disagree, the disagreement itself is the diagnosis - fix the layer that remembers, not the layer that answers.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "nslookup shows the resolver answering 10.20.30.44.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Adapter uses the correct resolver and a fresh lookup already returns the moved address - resolver and hosts hypotheses dropped.",
        },
        { step: "Apply fix", whatLearnerDid: "Flushed the DNS client cache." },
        {
          step: "Verify",
          whatLearnerDid: "Webmail loads from the new address on a cache-free lookup.",
        },
      ],
      followUps: [
        "Shorten the TTL on internal webmail records so future moves converge faster for cached clients.",
      ],
    },
    knowledgeLinks: ["what-is-dns", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn - flush the DNS resolver cache",
        url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig",
        note: "Link only.",
      },
    ],
  },
  {
    id: "windows-service-timeout",
    version: 1,
    title: "Monitoring agent silent after reboot",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Read the 7000/7009 event pair as a dependency failure signature",
      "Trace a dependent service to its prerequisite's startup type",
      "Fix boot-order state so the symptom does not return after the next reboot",
    ],
    prerequisites: ["windows-app-crash"],
    skills: ["services", "event-logs", "dependency-diagnosis"],
    ticket: {
      id: "HD-1061",
      user: "Nadia Osei",
      role: "Network operations analyst",
      symptomPlainLanguage:
        "The monitoring agent has not checked in since the 2am maintenance reboot - no heartbeat for the last hour. Other machines report fine.",
      priority: "high",
      channel: "portal",
      additionalContext: "The reboot applied the scheduled patch window; nothing else changed on her side.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "services"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer", "services"],
      showInspector: true,
      initialWorld: {
        currentUser: "admin",
        services: [
          {
            id: "sqlbatch",
            name: "SQLBatch Database",
            status: "disabled",
            description: "Batch processing database the agent jobs depend on",
            lastError: ["Startup type changed to Disabled (maintenance script M-7741)"],
          },
          {
            id: "monagent",
            name: "MonAgent Monitor",
            status: "stopped",
            description: "Endpoint monitoring agent",
            lastError: ["Service terminated with service-specific error 1067 (process exited unexpectedly)"],
          },
          {
            id: "bits",
            name: "BITS",
            status: "running",
            description: "Background Intelligent Transfer Service",
          },
        ],
        logs: [
          "2026-09-29 02:00:04 INFO  Maintenance reboot initiated (patch window)",
          "2026-09-29 02:13:47 INFO  SQLBatch Database startup type changed to Disabled by maintenance script M-7741",
          "2026-09-29 02:14:11 WARN  The MonAgent Monitor service failed to start due to the following error: A dependent service or group failed to start. (Event 7000)",
          "2026-09-29 02:14:41 WARN  A timeout was reached (30000 milliseconds) while waiting for the MonAgent Monitor service to connect. (Event 7009)",
          "2026-09-29 07:58:02 WARN  Heartbeat upload missed for monitor key HQ-02",
        ],
        agent: {
          eventsRead: false,
          depChecked: false,
          depEnabled: false,
          agentStarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-dep", label: "A dependency failed during the maintenance reboot", initiallyPlausible: true },
      { id: "h-binary", label: "Patch corrupted the agent binaries", initiallyPlausible: false },
      { id: "h-network", label: "Firewall blocks the heartbeat endpoint", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Work from the reboot's own event record outward: identify the failure class, read the prerequisite it names, restore that, then prove a heartbeat arrives.",
      steps: [
        {
          id: "guide-boot-events",
          title: "Read the boot-time service events",
          explanation: "Open the Event Viewer tab and read the events from the maintenance reboot.",
          why: "Service failures at boot record their error class and timestamp - 7000 and 7009 name the failure and its shape before anything is changed.",
          expectedObservation:
            "Event 7000 says the agent failed because a dependent service failed, and the log shows SQLBatch's startup type changed one minute earlier.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-startup-events",
          conceptId: "windows-event-logs",
        },
        {
          id: "guide-dependency",
          title: "Read the dependency's startup type",
          explanation:
            "Select SQLBatch Database in the Services tab (or run its check) and read its startup type.",
          why: "A dependency that is disabled cannot satisfy a dependent's start request - this reads the 7000 hypothesis directly instead of guessing at the agent.",
          expectedObservation:
            "SQLBatch Database shows Startup type Disabled while the agent lists it as a hard dependency.",
          target: { componentId: "services", label: "Services tab (SQLBatch Database)" },
          actionId: "inspect-sqlbatch",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-enable-dep",
          title: "Restore the prerequisite",
          explanation:
            "From the SQLBatch row or Actions, set the dependency back to Automatic and start it.",
          why: "The dependent can only start when its prerequisite is running - fixing the prerequisite addresses both this boot and the next one.",
          expectedObservation:
            "SQLBatch Database shows running with startup type Automatic in the Services tab.",
          target: { componentId: "services", label: "Services tab (SQLBatch Database row)" },
          actionId: "enable-sqlbatch",
        },
        {
          id: "guide-start-agent",
          title: "Start the monitoring agent",
          explanation: "Select MonAgent Monitor and start the service.",
          why: "With its dependency up, starting the agent tests whether the restored prerequisite really clears the start timeout.",
          expectedObservation:
            "MonAgent Monitor shows running and stays up past the 30-second connect window.",
          target: { componentId: "services", label: "Services tab (MonAgent Monitor row)" },
          actionId: "start-monagent",
        },
        {
          id: "guide-heartbeat",
          title: "Confirm the heartbeat",
          explanation: "From Actions, confirm the agent heartbeat reaches the dashboard.",
          why: "The ticket reports a missing heartbeat - verification must reproduce the reported signal, not just a green service row.",
          expectedObservation: "A fresh heartbeat entry for HQ-02 appears after the restart.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (heartbeat)" },
          actionId: "verify-heartbeat",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-startup-events",
        label: "Read startup service events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        patch: { agent: { eventsRead: true } },
        feedback:
          "02:14 Event 7000: MonAgent failed because a dependent service failed. Event 7009: a 30-second start timeout. The maintenance script changed SQLBatch's startup type at 02:13.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Boot-time service failures name their error class in the event log - the 7000/7009 pair says 'dependency' before any service console is opened.",
          evidenceGain: "7000/7009 pair identifies a dependency failure timed 40 seconds after the script change.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-sqlbatch",
        label: "Inspect SQLBatch Database startup type",
        kind: "inspect",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "agent.eventsRead", value: true },
        patch: { agent: { depChecked: true } },
        feedback:
          "SQLBatch Database - Startup type: Disabled, status stopped. The agent lists this unit as a hard dependency.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A dependent service cannot start when its prerequisite is disabled - reading the dependency's startup type tests the 7000 hypothesis directly.",
          evidenceGain: "Dependency disabled - the agent's start condition cannot be satisfied.",
        },
        isDiagnostic: true,
        matchHints: ["sqlbatch", "startup type"],
      },
      {
        id: "enable-sqlbatch",
        label: "Set SQLBatch to Automatic and start it",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "agent.eventsRead", value: true },
            { type: "stateEquals", path: "agent.depChecked", value: true },
          ],
        },
        patch: {
          services: [
            {
              id: "sqlbatch",
              name: "SQLBatch Database",
              status: "running",
              description: "Batch processing database the agent jobs depend on",
              lastError: ["Startup type restored to Automatic"],
            },
            {
              id: "monagent",
              name: "MonAgent Monitor",
              status: "stopped",
              description: "Endpoint monitoring agent",
              lastError: ["Service terminated with service-specific error 1067 (process exited unexpectedly)"],
            },
            {
              id: "bits",
              name: "BITS",
              status: "running",
              description: "Background Intelligent Transfer Service",
            },
          ],
          agent: { depEnabled: true },
        },
        feedback:
          "SQLBatch Database startup type set to Automatic and the service is running - the prerequisite is up.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Dependencies must be running before dependents can start; restoring automatic start fixes both this session and the next boot order.",
          evidenceGain: "Dependency running - agent start condition satisfied.",
        },
        isFix: true,
        matchHints: ["sqlbatch automatic", "start sqlbatch"],
      },
      {
        id: "start-monagent",
        label: "Start the monitoring agent service",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "agent.depEnabled", value: true },
        patch: {
          services: [
            {
              id: "sqlbatch",
              name: "SQLBatch Database",
              status: "running",
              description: "Batch processing database the agent jobs depend on",
              lastError: ["Startup type restored to Automatic"],
            },
            {
              id: "monagent",
              name: "MonAgent Monitor",
              status: "running",
              description: "Endpoint monitoring agent",
              lastError: ["Started successfully after dependency came up"],
            },
            {
              id: "bits",
              name: "BITS",
              status: "running",
              description: "Background Intelligent Transfer Service",
            },
          ],
          agent: { agentStarted: true },
        },
        feedback: "MonAgent Monitor started and stayed up past the 30-second connect window.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With its dependency running, starting the agent tests the fix where it matters - the service now connects instead of timing out.",
          evidenceGain: "Agent running - start timeout cleared.",
        },
        isFix: true,
        matchHints: ["monagent"],
      },
      {
        id: "verify-heartbeat",
        label: "Confirm the agent heartbeat reaches the dashboard",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "agent.agentStarted", value: true },
        patch: {
          agent: { verified: true },
          logs: [
            "2026-09-29 02:00:04 INFO  Maintenance reboot initiated (patch window)",
            "2026-09-29 02:13:47 INFO  SQLBatch Database startup type changed to Disabled by maintenance script M-7741",
            "2026-09-29 02:14:11 WARN  The MonAgent Monitor service failed to start due to the following error: A dependent service or group failed to start. (Event 7000)",
            "2026-09-29 02:14:41 WARN  A timeout was reached (30000 milliseconds) while waiting for the MonAgent Monitor service to connect. (Event 7009)",
            "2026-09-29 07:58:02 WARN  Heartbeat upload missed for monitor key HQ-02",
            "2026-09-29 09:12:35 INFO  Heartbeat received for monitor key HQ-02 (agent uptime 42s)",
          ],
        },
        feedback: "Dashboard shows a fresh heartbeat for HQ-02 - the original symptom is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is about a missing heartbeat rather than a service state - only a received heartbeat proves the reported symptom resolved.",
          evidenceGain: "Heartbeat received - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "reinstall-agent-wrong",
        label: "Reinstall the monitoring agent",
        kind: "ui",
        feedback:
          "Reinstalling skips the dependency the event log identified - the agent would fail the same way on its first start.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Reinstalling over a machine whose events name a failed dependency repeats the same start failure; the log already identified what the agent waits for.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "agent.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "agent.verified", value: true },
      { type: "stateEquals", path: "agent.agentStarted", value: true },
      { type: "stateEquals", path: "agent.depEnabled", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reinstall-agent-wrong"],
        },
        feedback:
          "The events already name a dependent-service failure and a disabled prerequisite - a reinstall changes neither state and the agent dies again on start.",
      },
    ],
    hints: [
      { level: 1, text: "Read what the event log recorded during the maintenance reboot - timestamps included." },
      {
        level: 2,
        text: "A dependent service cannot outrank its prerequisite - read the startup type of what the agent waits on.",
      },
      {
        level: 3,
        text: "Bring the prerequisite up the way Windows expects at boot, bring the agent up, then prove a heartbeat arrives.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "Maintenance script M-7741 set SQLBatch Database to Disabled at 02:13; MonAgent depends on it, so the reboot produced Event 7000/7009 and no heartbeat.",
      whyItWorked:
        "The events named the failure class and the one-minute change, the dependency's startup type confirmed the mechanism, restoring it to Automatic let the agent start, and the heartbeat proved the reported symptom gone. Transferable principle: a start-timeout pair (7000 plus 7009) is a dependency question - fix the prerequisite's boot behavior, not the dependent's binary.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Boot events show 7000/7009 timed 40 seconds after the script change.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Reinstall and firewall hypotheses dropped - the failure is local, ordered, and timestamped to the script.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Restored SQLBatch to Automatic, started it, then started the agent.",
        },
        { step: "Verify", whatLearnerDid: "Fresh heartbeat received for HQ-02." },
      ],
      followUps: [
        "Restrict maintenance scripts from changing service startup types outside an approved change record.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn - service control manager events",
        url: "https://learn.microsoft.com/en-us/windows/win32/services/service-control-manager",
        note: "Link only.",
      },
    ],
  },
  {
    id: "windows-acl-local",
    version: 1,
    title: "Staff can open the shared folder but cannot save files",
    category: "windows",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Use the read/write split in a symptom to isolate which right is missing",
      "Read a folder DACL after inheritance changes",
      "Restore access at group scope instead of widening permission to everyone",
    ],
    prerequisites: [],
    skills: ["permissions", "ntfs-acl", "troubleshooting-method"],
    ticket: {
      id: "HD-1062",
      user: "Alice Fontaine",
      role: "Accounts payable specialist",
      symptomPlainLanguage:
        "I can open the shared folder and read the files, but saving gives me access denied. Renaming fails the same way.",
      priority: "medium",
      channel: "walkup",
      additionalContext:
        "Started some time last week. Her coworker Carl saves to the same folder without any trouble.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "file-panel"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer"],
      showInspector: true,
      initialWorld: {
        currentUser: "afontaine",
        logs: [
          "2026-09-24 16:41:12 WARN  ACL change on \\\\FS01\\Finance: inheritance disabled by cruiz",
          "2026-09-28 11:02:33 INFO  Share Finance mapped for afontaine (read allowed)",
          "2026-09-29 09:17:04 ERROR Access denied: afontaine write to \\\\FS01\\Finance\\invoices-sept.xlsx",
          "2026-09-29 09:17:09 ERROR Access denied: afontaine rename in \\\\FS01\\Finance",
          "2026-09-29 09:20:55 INFO  cruiz write to \\\\FS01\\Finance\\invoices-sept.xlsx succeeded",
        ],
        acl: {
          eventsRead: false,
          aclRead: false,
          accessTested: false,
          grantApplied: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-group-right", label: "Her group lost write rights on the folder", initiallyPlausible: true },
      { id: "h-share", label: "The share itself is read-only", initiallyPlausible: true },
      { id: "h-user", label: "Her account is corrupt", initiallyPlausible: false },
    ],
    conversation: {
      persona: "Alice Fontaine",
      opening:
        "I can open the folder fine, but saving anything gives me access denied. It started some time last week.",
      followUpQuestions: [
        "Can Carl save files in that folder?",
        "Has anything been changed in the folder recently?",
        "Do you open the folder the same way every day?",
      ],
      replies: [
        {
          match: ["carl", "he can", "yes carl", "ruiz"],
          response:
            "Carl saves in there all the time - he's the one who reorganized the folder on Friday.",
          once: false,
          revealsConcepts: [
            "A colleague with identical access succeeding points at an identity-specific permission, not a broken share.",
          ],
        },
        {
          match: ["friday", "changed", "reorganiz", "last week"],
          response:
            "Friday afternoon Carl was cleaning the folder up - after that my saves started failing.",
          once: false,
          revealsConcepts: ["A permission change on Friday lines up with the start of the failures."],
        },
        {
          match: ["denied", "error", "rename", "save"],
          response:
            "It says access denied whether I save or rename. Opening and reading work perfectly.",
          once: false,
          revealsConcepts: [
            "Read succeeding while write fails isolates the difference between read and modify rights.",
          ],
        },
      ],
      defaultReply:
        "All I know is opening works and saving doesn't - I never touched the folder permissions myself.",
      mentorPrompts: [
        "Ask what works and what fails - the split between them is the first clue.",
        "Confirm whether anyone else can write before blaming the share.",
      ],
    },
    guidedWalkthrough: {
      intro:
        "Start from the audit trail, read the folder's own entries now that inheritance has changed, prove the mapping, then restore the missing right at group scope.",
      steps: [
        {
          id: "guide-audit",
          title: "Read the folder's audit trail",
          explanation: "Open the Event Viewer tab and read the access and ACL events for this folder.",
          why: "Denials and ACL changes both land in the log - their sequence tells you which came first.",
          expectedObservation:
            "Inheritance was disabled Friday at 16:41, then access-denied events for this account start Monday while Carl's writes succeed.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-audit-events",
          conceptId: "windows-event-logs",
        },
        {
          id: "guide-dacl",
          title: "Read the folder's DACL",
          explanation: "Run the folder ACL check from the Checks list and read the entries.",
          why: "With inheritance off, the folder's own entries are the whole truth - the DACL shows exactly which right her group holds.",
          expectedObservation:
            "Accounts-Dept appears with Read and execute only; Carl Ruiz holds Full control.",
          target: {
            componentId: "event-viewer",
            label: "Checks list (folder DACL check)",
          },
          actionId: "inspect-folder-acl",
          conceptId: "least-privilege-basics",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-effective",
          title: "Test her effective access",
          explanation: "Run the effective access test for her account from the Checks list.",
          why: "It converts the ACL into the outcome the user experiences, closing the loop between configuration and symptom.",
          expectedObservation: "Read allowed, Modify denied - matching the audit events exactly.",
          target: {
            componentId: "event-viewer",
            label: "Checks list (effective access check)",
          },
          actionId: "test-effective-access",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-grant",
          title: "Restore the missing right at group scope",
          explanation: "From Actions, grant the Accounts-Dept group Modify on the folder.",
          why: "Granting the group at the folder level restores the right inheritance used to supply - scoped to the people who need it, not everyone.",
          expectedObservation: "The ACL check now reports Accounts-Dept with Modify.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (group grant)" },
          actionId: "grant-modify-group",
          conceptId: "least-privilege-basics",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-save",
          title: "Repeat her exact failing operations",
          explanation: "From Actions, save and rename a file as Alice to confirm.",
          why: "Her ticket was about writes - only her exact failing operations prove the fix.",
          expectedObservation: "Save and rename both succeed with no access-denied event.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (save test)" },
          actionId: "verify-save",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-audit-events",
        label: "Read folder access events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        patch: { acl: { eventsRead: true } },
        feedback:
          "Friday 16:41 inheritance disabled on the Finance share by cruiz; today's audit shows access denied for afontaine writes while cruiz writes succeed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Access-control audits record who was denied and who changed the ACL - the timeline ties her failures to one specific change by one specific person.",
          evidenceGain: "Inheritance change Friday precedes account-specific denials - share-level failure ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-folder-acl",
        label: "Inspect the folder permission entries",
        kind: "inspect",
        tool: "file-panel",
        appliesWhen: { type: "stateEquals", path: "acl.eventsRead", value: true },
        patch: { acl: { aclRead: true } },
        feedback:
          "Folder DACL: Accounts-Dept = Read and execute (explicit, inheritance OFF); Carl Ruiz = Full control; SYSTEM = Full control. No inherited Modify entry remains.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With inheritance off, the explicit entries are the entire truth - reading the DACL shows exactly which right her group holds and which one vanished.",
          evidenceGain: "Accounts-Dept holds only Read on the folder - write gap identified.",
        },
        isDiagnostic: true,
        matchHints: ["icacls", "folder permissions", "acl"],
      },
      {
        id: "test-effective-access",
        label: "Test effective access for her account",
        kind: "inspect",
        tool: "file-panel",
        appliesWhen: { type: "stateEquals", path: "acl.aclRead", value: true },
        patch: { acl: { accessTested: true } },
        feedback:
          "Effective access for afontaine: Read allowed, Modify denied. The simulation matches the audit events exactly.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Effective-access simulation confirms the DACL explains the observed behavior - the mapping from cause to symptom is complete before any change is made.",
          evidenceGain: "Simulated effective access reproduces the denial - diagnosis confirmed.",
        },
        isDiagnostic: true,
        matchHints: ["effective access", "test permissions"],
      },
      {
        id: "grant-modify-group",
        label: "Grant the Accounts-Dept group Modify on the folder",
        kind: "ui",
        tool: "file-panel",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "acl.eventsRead", value: true },
            { type: "stateEquals", path: "acl.aclRead", value: true },
            { type: "stateEquals", path: "acl.accessTested", value: true },
          ],
        },
        patch: {
          acl: { grantApplied: true },
          logs: [
            "2026-09-24 16:41:12 WARN  ACL change on \\\\FS01\\Finance: inheritance disabled by cruiz",
            "2026-09-28 11:02:33 INFO  Share Finance mapped for afontaine (read allowed)",
            "2026-09-29 09:17:04 ERROR Access denied: afontaine write to \\\\FS01\\Finance\\invoices-sept.xlsx",
            "2026-09-29 09:17:09 ERROR Access denied: afontaine rename in \\\\FS01\\Finance",
            "2026-09-29 09:20:55 INFO  cruiz write to \\\\FS01\\Finance\\invoices-sept.xlsx succeeded",
            "2026-09-29 09:33:12 INFO  ACL updated: Accounts-Dept = Modify on \\\\FS01\\Finance (inheritance still off)",
          ],
        },
        feedback:
          "Accounts-Dept now holds Modify on the folder - the right added at the level where inheritance stopped.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The denial traces to one missing right at folder level; granting the group (not the individual, not everyone) restores intended access with least privilege intact.",
          evidenceGain: "Group-level Modify granted - write path restored.",
        },
        isFix: true,
      },
      {
        id: "verify-save",
        label: "Save and rename a file as Alice",
        kind: "ui",
        tool: "file-panel",
        appliesWhen: { type: "stateEquals", path: "acl.grantApplied", value: true },
        patch: { acl: { verified: true } },
        feedback: "Save succeeds and the rename completes - the reported symptom is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reproducing her exact failing operations is the only honest proof - the ticket was about writes, so writes must now pass.",
          evidenceGain: "Write and rename succeed - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "grant-everyone-wrong",
        label: "Give Everyone Full control on the share",
        kind: "ui",
        feedback:
          "Full control for Everyone fixes Alice by exposing every financial file to the whole company.",
        evaluation: {
          grade: "harmful",
          rationale:
            "Widening access for every identity because one group lacks a right removes all containment on financial records - the evidence already names the exact group and the exact right missing.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "acl.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "acl.verified", value: true },
      { type: "stateEquals", path: "acl.grantApplied", value: true },
      { type: "stateEquals", path: "acl.accessTested", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["grant-everyone-wrong"],
        },
        feedback:
          "The evidence named one group and one right - handing Full control to Everyone trades a single user's write failure for company-wide exposure.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "What works and what fails tells you which right to look for - read the audit trail first.",
      },
      {
        level: 2,
        text: "With inheritance off, the folder's own entries are the whole truth - read them before changing anything.",
      },
      {
        level: 3,
        text: "Restore the missing right for the group that owns the work, then repeat her exact failing operations.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "Disabling inheritance on the Finance folder left Accounts-Dept holding only its explicit Read entry, so Alice could open files but every write and rename was denied.",
      whyItWorked:
        "The audit tied the failures to Friday's inheritance change and showed a colleague succeeding, the DACL exposed the Read-only entry, and effective access proved the mapping before the fix; granting Modify to the group restored writes without widening anyone else's access. Transferable principle: when read works and write fails, the missing right is named by the difference - grant it at the scope that owns the work.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Audit shows Friday's inheritance change and today's account-specific denials.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Carl's successful writes drop the share and server hypotheses; read succeeding drops account corruption.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Granted Accounts-Dept Modify on the folder - group scope only.",
        },
        { step: "Verify", whatLearnerDid: "Her save and rename both succeed with no denial event." },
      ],
      followUps: [
        "Review other folders where inheritance was disabled for a leftover explicit Read-only entry.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn - how ACLs work",
        url: "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-model",
        note: "Link only.",
      },
    ],
  },
  {
    id: "windows-memory-exhaustion",
    version: 1,
    title: "Workstation slows to a crawl since this morning",
    category: "windows",
    difficulty: "beginner",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Attribute a slow workstation to a named process before changing anything",
      "Correlate a resource-exhaustion event with the process that triggered it",
      "Restore a runaway consumer instead of blaming the hardware",
    ],
    prerequisites: ["windows-app-crash"],
    skills: ["task-manager", "resource-monitoring", "troubleshooting-method"],
    ticket: {
      id: "HD-1063",
      user: "Marcus Hale",
      role: "Inside sales rep",
      symptomPlainLanguage:
        "Since about nine this morning my machine has been painfully slow - typing lags and windows freeze for seconds. It was fine yesterday.",
      priority: "high",
      channel: "email",
      additionalContext: "Rebooting this morning did not help. He runs the same apps every day.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["task-manager", "event-viewer"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer", "task-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "mhale",
        processes: [
          "Name                     PID       CPU      Memory",
          "FileSync.exe             4188      12%      1,931,264 K",
          "outlook.exe              2214      3%       412,008 K",
          "chrome.exe               6902      7%       845,512 K",
          "explorer.exe             1502      1%       188,440 K",
          "System Idle Process      0         96%      8 K",
        ],
        logs: [
          "2026-09-29 08:51:12 INFO  FileSync full scan started (target: 214,881 files)",
          "2026-09-29 08:58:41 WARN  Resource-Exhaustion-Detector: FileSync.exe (PID 4188) has taken 1,931,264 K of committed memory",
          "2026-09-29 08:58:42 WARN  Available physical memory dropped below 4% while FileSync.exe continued allocating",
          "2026-09-29 09:31:55 WARN  FileSync full scan still running; commit charge 92%",
          "2026-09-29 09:44:10 INFO  No completion event recorded for scan started at 08:51",
        ],
        mem: {
          taskManagerSeen: false,
          eventsRead: false,
          stallCleared: false,
          syncRestarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-hog", label: "One process is consuming memory far beyond its peers", initiallyPlausible: true },
      { id: "h-ram", label: "The machine simply needs more RAM", initiallyPlausible: true },
      { id: "h-malware", label: "Malware is running in the background", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Attribute the slowdown to a named consumer first, timestamp what started it, then stop that consumer and bring it back under control.",
      steps: [
        {
          id: "guide-task-manager",
          title: "Attribute the slowdown",
          explanation: "Open the Task Manager tab and read the process list.",
          why: "A slow machine needs a named consumer before anyone guesses - memory in one row against normal peers is a fact, not an opinion.",
          expectedObservation:
            "FileSync.exe stands at 1,931,264 K while every other process sits under 900,000 K.",
          target: { componentId: "task-manager", label: "Task Manager tab" },
          actionId: "open-task-manager",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-resource-events",
          title: "Timestamp the pressure",
          explanation: "Open the Event Viewer tab and read the resource-exhaustion events.",
          why: "The detector timestamps when memory pressure began and which process it blamed - sequence turns 'slow since nine' into evidence.",
          expectedObservation:
            "The scan starts 08:51, exhaustion is recorded 08:58 naming FileSync.exe, and no completion event exists by 09:44.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-resource-events",
          conceptId: "windows-event-logs",
        },
        {
          id: "guide-end-scan",
          title: "Stop the stalled consumer",
          explanation: "From Task Manager or Actions, end the stalled FileSync scan.",
          why: "Stop the consumer the evidence named - one process, not the whole desktop, and not the user's open work.",
          expectedObservation: "FileSync.exe disappears from the list and committed memory drops.",
          target: { componentId: "task-manager", label: "Task Manager (FileSync.exe row)" },
          actionId: "end-stalled-scan",
        },
        {
          id: "guide-restart-sync",
          title: "Bring the sync client back cleanly",
          explanation: "From Actions, restart the sync client.",
          why: "Ending the scan fixes today; restarting restores scheduled sync with a sane footprint so tomorrow starts healthy.",
          expectedObservation: "FileSync.exe returns at roughly 96,000 K.",
          target: { componentId: "task-manager", label: "Task Manager (FileSync.exe row)" },
          actionId: "restart-sync-client",
        },
        {
          id: "guide-verify-workstation",
          title: "Repeat his workload",
          explanation: "From Actions, confirm normal responsiveness under the same workload.",
          why: "The ticket is about feel under his daily workload - verification must repeat those conditions, not an idle desktop.",
          expectedObservation: "Typing and window switching stay responsive with the same apps open.",
          target: { componentId: "task-manager", label: "Task Manager tab" },
          actionId: "verify-workstation",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "open-task-manager",
        label: "Read the process list in Task Manager",
        kind: "inspect",
        tool: "task-manager",
        patch: { mem: { taskManagerSeen: true } },
        feedback:
          "FileSync.exe (PID 4188) holds 1,931,264 K - about 1.9 GB - while everything else sits under 900 MB.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Task Manager attributes memory to a named process - one process at 1.9 GB against normal peers turns 'the PC is slow' into a specific consumer.",
          evidenceGain: "FileSync.exe holds 1.9 GB - consumer identified.",
        },
        isDiagnostic: true,
        matchHints: ["task manager", "processes"],
      },
      {
        id: "read-resource-events",
        label: "Read resource exhaustion events",
        kind: "inspect",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "mem.taskManagerSeen", value: true },
        patch: { mem: { eventsRead: true } },
        feedback:
          "08:51 FileSync full scan started; 08:58 Resource-Exhaustion-Detector names FileSync.exe at 1.9 GB with physical memory under 4%; no completion event by 09:44.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The exhaustion event timestamps the pressure and the unfinished scan explains why it persists - coincidence becomes sequence.",
          evidenceGain: "Memory pressure begins with FileSync's scan and never clears - runaway confirmed.",
        },
        isDiagnostic: true,
        matchHints: ["resource exhaustion", "event log"],
      },
      {
        id: "end-stalled-scan",
        label: "End the stalled FileSync scan",
        kind: "ui",
        tool: "task-manager",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "mem.taskManagerSeen", value: true },
            { type: "stateEquals", path: "mem.eventsRead", value: true },
          ],
        },
        patch: {
          mem: { stallCleared: true },
          processes: [
            "Name                     PID       CPU      Memory",
            "outlook.exe              2214      3%       412,008 K",
            "chrome.exe               6902      7%       845,512 K",
            "explorer.exe             1502      1%       188,440 K",
            "System Idle Process      0         96%      8 K",
          ],
        },
        feedback: "FileSync.exe (PID 4188) ended - 1.9 GB returned to the commit pool.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The event and the process row agree on one consumer that never finished its work; stopping the stalled scan frees memory without touching healthy apps.",
          evidenceGain: "Stalled consumer removed - 1.9 GB reclaimed.",
        },
        isFix: true,
      },
      {
        id: "restart-sync-client",
        label: "Restart the sync client cleanly",
        kind: "ui",
        tool: "task-manager",
        appliesWhen: { type: "stateEquals", path: "mem.stallCleared", value: true },
        patch: {
          mem: { syncRestarted: true },
          processes: [
            "Name                     PID       CPU      Memory",
            "FileSync.exe             4188      2%       96,212 K",
            "outlook.exe              2214      3%       412,008 K",
            "chrome.exe               6902      7%       845,512 K",
            "explorer.exe             1502      1%       188,440 K",
            "System Idle Process      0         96%      8 K",
          ],
        },
        feedback:
          "FileSync restarted and settled at 96,212 K with its scheduled tasks re-armed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Ending the scan fixes this session; restarting the client restores its protection with a sane memory footprint so the symptom does not return tomorrow.",
          evidenceGain: "Sync client healthy at 96 MB with scheduled tasks re-armed.",
        },
        isFix: true,
      },
      {
        id: "verify-workstation",
        label: "Confirm normal responsiveness under the same workload",
        kind: "ui",
        tool: "task-manager",
        appliesWhen: { type: "stateEquals", path: "mem.syncRestarted", value: true },
        patch: { mem: { verified: true } },
        feedback: "Typing and window switching stay responsive with the same apps open - original symptom gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is about feel under his daily workload - verification must repeat the conditions he reported, not an idle desktop.",
          evidenceGain: "Responsive under original workload - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "add-ram-wrong",
        label: "Order more RAM for this workstation",
        kind: "ui",
        feedback:
          "Adding RAM treats the gauge, not the consumer - the event log already names what is eating memory.",
        evaluation: {
          grade: "premature",
          rationale:
            "One process holding 1.9 GB with a scan that never finished is a runaway-consumer problem; more RAM only delays the same exhaustion while the consumer keeps allocating.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "mem.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "mem.verified", value: true },
      { type: "stateEquals", path: "mem.syncRestarted", value: true },
      { type: "stateEquals", path: "mem.stallCleared", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["add-ram-wrong"],
        },
        feedback:
          "Hardware cannot fix a consumer that never stops allocating - the same exhaustion returns the moment the scan runs again.",
      },
    ],
    hints: [
      { level: 1, text: "Attribute first: one process is carrying far more than its peers - name it." },
      {
        level: 2,
        text: "Timestamp when the pressure started and what was allocating - the log already did the math.",
      },
      {
        level: 3,
        text: "Stop the consumer the events named, bring it back under control, then repeat his daily workload.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "FileSync's full scan started at 08:51, never completed, and kept allocating until it held 1.9 GB - leaving under 4% physical memory free and the workstation crawling.",
      whyItWorked:
        "Task Manager named the consumer, the exhaustion event timestamped it against the unfinished scan, ending the stall reclaimed the memory, and a clean restart kept it from recurring. Transferable principle: slowness with one named outlier is a consumption question - stop the consumer before buying hardware.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Task Manager shows FileSync.exe at 1.9 GB against normal peers.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "RAM purchase and malware hypotheses dropped - one legitimate process with an unfinished scan explains the pressure.",
        },
        { step: "Apply fix", whatLearnerDid: "Ended the stalled scan and restarted the sync client." },
        { step: "Verify", whatLearnerDid: "Workstation stays responsive under his daily workload." },
      ],
      followUps: [
        "Cap FileSync scan windows and alert when a scan runs past its completion budget.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [],
  },
  {
    id: "windows-spooler-stopped",
    version: 1,
    title: "Print jobs sit in the queue and never print",
    category: "windows",
    difficulty: "foundational",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Distinguish jobs failing at the printer from jobs never being processed",
      "Read spooler termination events alongside queue state",
      "Clear the poison job before restarting so the fix sticks",
    ],
    prerequisites: ["windows-app-crash"],
    skills: ["services", "print-spooler", "troubleshooting-method"],
    ticket: {
      id: "HD-1064",
      user: "Greg Mullins",
      role: "Warehouse supervisor",
      symptomPlainLanguage:
        "Nothing prints. The jobs show up in the list and just sit there. Shipping labels are piling up on my desk.",
      priority: "medium",
      channel: "phone",
      additionalContext: "Yesterday it printed fine from the same app on the same laptop.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "services"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer", "services"],
      showInspector: true,
      initialWorld: {
        currentUser: "gmullins",
        services: [
          {
            id: "spooler",
            name: "Print Spooler",
            status: "stopped",
            description: "Loads files to memory for later printing",
            lastError: ["The Print Spooler service terminated unexpectedly with service-specific error 1067."],
          },
          {
            id: "bits",
            name: "BITS",
            status: "running",
            description: "Background Intelligent Transfer Service",
          },
        ],
        logs: [
          "2026-09-29 08:47:21 INFO  Job 88431 queued for printer Warehouse-Label-02 (user gmullins)",
          "2026-09-29 08:47:44 WARN  The Print Spooler service terminated unexpectedly. This is the second restart today. (Event 7031)",
          "2026-09-29 08:47:45 INFO  Print queue paused for Warehouse-Label-02 after repeated spooler exit",
          "2026-09-29 09:05:02 INFO  Job 88432 queued (pending spooler restart)",
          "2026-09-29 09:31:18 WARN  Spooler stopped for 44 minutes; 3 jobs pending",
        ],
        printq: {
          eventsRead: false,
          queueInspected: false,
          queueCleared: false,
          spoolerStarted: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-stopped", label: "The spooler service itself is down", initiallyPlausible: true },
      { id: "h-driver", label: "Printer driver stopped working", initiallyPlausible: true },
      { id: "h-paper", label: "Printer offline or out of media", initiallyPlausible: false },
    ],
    conversation: {
      persona: "Greg Mullins",
      opening:
        "Nothing is printing - jobs go to the queue and just sit there. Shipping labels are stacking up here.",
      followUpQuestions: [
        "When did the last successful print happen?",
        "Did anything change with the printer or its driver?",
        "Are other people printing right now?",
      ],
      replies: [
        {
          match: ["driver", "drivers"],
          response: "We didn't touch any driver - same laptop, same app as yesterday.",
          once: false,
          revealsConcepts: [
            "No driver change removes one hypothesis and pushes you toward the state of the service.",
          ],
        },
        {
          match: ["stuck", "sit", "queue", "pending", "list"],
          response: "They just sit as pending. Three jobs now, none of them moving.",
          once: false,
          revealsConcepts: [
            "A queue that never drains points at the process that drains it, not at the individual jobs.",
          ],
        },
        {
          match: ["yesterday", "worked", "fine", "last"],
          response: "Last print went through fine yesterday afternoon.",
          once: false,
          revealsConcepts: [],
        },
      ],
      defaultReply: "I just need labels printing again - what should I check first?",
      mentorPrompts: [
        "Ask when it last worked - a service that dies overnight is a state change, not a setup problem.",
        "Confirm whether the queue holds jobs or rejects them - pending jobs mean the drainer is down.",
      ],
    },
    guidedWalkthrough: {
      intro:
        "Read the service's own record first, confirm the queue is waiting rather than failing, clear what is blocking the restart, then bring the mover up and put paper through it.",
      steps: [
        {
          id: "guide-print-events",
          title: "Read the print service events",
          explanation: "Open the Event Viewer tab and read this morning's print events.",
          why: "The spooler logs its own death - timing tells you whether jobs failed or simply stopped moving.",
          expectedObservation:
            "Event 7031 shows the Print Spooler terminated at 08:47 and the queue paused right after.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-print-events",
          conceptId: "windows-event-logs",
        },
        {
          id: "guide-queue",
          title: "Read the queue and the service state together",
          explanation: "Select Print Spooler in the Services tab (or run its check) and read both rows.",
          why: "Pending jobs plus a stopped service is a different diagnosis from jobs erroring at the printer.",
          expectedObservation:
            "Three jobs pending, the head job flagged corrupt, and the spooler stopped with error 1067.",
          target: { componentId: "services", label: "Services tab (Print Spooler)" },
          actionId: "inspect-print-queue",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-clear-job",
          title: "Clear the stalled corrupt job",
          explanation: "From Actions, clear the stalled job from the queue.",
          why: "A poison job at the head of the queue takes the spooler down on every start - clear it before restarting.",
          expectedObservation: "The corrupt job is gone; the two healthy jobs remain queued.",
          target: { componentId: "services", label: "Services tab (clear stalled job)" },
          actionId: "clear-stuck-job",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-start-spooler",
          title: "Start the Print Spooler",
          explanation: "Select Print Spooler in the Services tab and start the service.",
          why: "The queue only moves when its service runs - with the poison job gone, this start will stick.",
          expectedObservation: "Print Spooler shows running and the queue begins draining.",
          target: { componentId: "services", label: "Services tab (Print Spooler row)" },
          actionId: "start-spooler",
        },
        {
          id: "guide-test-print",
          title: "Put a test label through",
          explanation: "From Actions, print a test label to confirm.",
          why: "The ticket is physical output - only paper proves the queue drained end-to-end.",
          expectedObservation: "The test label prints and pending jobs show completed.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (print completion)" },
          actionId: "verify-print",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-print-events",
        label: "Read print service events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        patch: { printq: { eventsRead: true } },
        feedback:
          "Event 7031 at 08:47: Print Spooler terminated unexpectedly (second time today); the queue paused one minute later with jobs still pending.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Spooler crashes write a service-control event; pairing it with the queue pause shows jobs are waiting on a dead drainer rather than failing at the printer.",
          evidenceGain: "Spooler died twice today while jobs stayed queued - printer and driver faults ruled out.",
        },
        isDiagnostic: true,
      },
      {
        id: "inspect-print-queue",
        label: "Inspect the print queue and spooler state",
        kind: "inspect",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "printq.eventsRead", value: true },
        patch: { printq: { queueInspected: true } },
        feedback:
          "3 jobs pending for Warehouse-Label-02; job 88431 flagged with a corrupt spool blob; Print Spooler status: stopped (1067). Jobs are intact, not failed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A stopped spooler with intact pending jobs separates 'cannot print' from 'cannot spool' - the work is preserved and the mover is down.",
          evidenceGain: "Jobs pending with the spooler stopped - queue and printer hardware healthy.",
        },
        isDiagnostic: true,
        matchHints: ["spooler", "print queue"],
      },
      {
        id: "clear-stuck-job",
        label: "Clear the stalled job from the queue",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "printq.eventsRead", value: true },
            { type: "stateEquals", path: "printq.queueInspected", value: true },
          ],
        },
        patch: {
          printq: { queueCleared: true },
          logs: [
            "2026-09-29 08:47:21 INFO  Job 88431 queued for printer Warehouse-Label-02 (user gmullins)",
            "2026-09-29 08:47:44 WARN  The Print Spooler service terminated unexpectedly. This is the second restart today. (Event 7031)",
            "2026-09-29 08:47:45 INFO  Print queue paused for Warehouse-Label-02 after repeated spooler exit",
            "2026-09-29 09:05:02 INFO  Job 88432 queued (pending spooler restart)",
            "2026-09-29 09:31:18 WARN  Spooler stopped for 44 minutes; 3 jobs pending",
            "2026-09-29 09:36:40 INFO  Job 88431 removed (corrupt spool blob); queue re-armed for Warehouse-Label-02",
          ],
        },
        feedback:
          "Job 88431 removed with its corrupt spool blob; two healthy jobs remain and the queue will accept work again.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A spooler that dies twice with 1067 while a corrupt job sits at the head of the queue crashes on every restart - removing the poison job first is what makes the restart stick.",
          evidenceGain: "Poison job removed - restart precondition met.",
        },
        isFix: true,
      },
      {
        id: "start-spooler",
        label: "Start the Print Spooler service",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "printq.eventsRead", value: true },
            { type: "stateEquals", path: "printq.queueCleared", value: true },
          ],
        },
        patch: {
          services: [
            {
              id: "spooler",
              name: "Print Spooler",
              status: "running",
              description: "Loads files to memory for later printing",
              lastError: ["Started successfully; draining queue for Warehouse-Label-02"],
            },
            {
              id: "bits",
              name: "BITS",
              status: "running",
              description: "Background Intelligent Transfer Service",
            },
          ],
          printq: { spoolerStarted: true },
          logs: [
            "2026-09-29 08:47:21 INFO  Job 88431 queued for printer Warehouse-Label-02 (user gmullins)",
            "2026-09-29 08:47:44 WARN  The Print Spooler service terminated unexpectedly. This is the second restart today. (Event 7031)",
            "2026-09-29 08:47:45 INFO  Print queue paused for Warehouse-Label-02 after repeated spooler exit",
            "2026-09-29 09:05:02 INFO  Job 88432 queued (pending spooler restart)",
            "2026-09-29 09:31:18 WARN  Spooler stopped for 44 minutes; 3 jobs pending",
            "2026-09-29 09:36:40 INFO  Job 88431 removed (corrupt spool blob); queue re-armed for Warehouse-Label-02",
            "2026-09-29 09:37:55 INFO  Print Spooler started; draining queue for Warehouse-Label-02",
          ],
        },
        feedback: "Print Spooler running; the queue is draining to Warehouse-Label-02.",
        evaluation: {
          grade: "optimal",
          rationale:
            "With the corrupt job gone, starting the service restores the component that drains the queue - the stoppage ends at its cause instead of beside it.",
          evidenceGain: "Spooler running and draining - queue mover restored.",
        },
        isFix: true,
        matchHints: ["start spooler", "print spooler service"],
      },
      {
        id: "verify-print",
        label: "Print a test label to confirm",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "printq.spoolerStarted", value: true },
        patch: {
          printq: { verified: true },
          logs: [
            "2026-09-29 08:47:21 INFO  Job 88431 queued for printer Warehouse-Label-02 (user gmullins)",
            "2026-09-29 08:47:44 WARN  The Print Spooler service terminated unexpectedly. This is the second restart today. (Event 7031)",
            "2026-09-29 08:47:45 INFO  Print queue paused for Warehouse-Label-02 after repeated spooler exit",
            "2026-09-29 09:05:02 INFO  Job 88432 queued (pending spooler restart)",
            "2026-09-29 09:31:18 WARN  Spooler stopped for 44 minutes; 3 jobs pending",
            "2026-09-29 09:36:40 INFO  Job 88431 removed (corrupt spool blob); queue re-armed for Warehouse-Label-02",
            "2026-09-29 09:37:55 INFO  Print Spooler started; draining queue for Warehouse-Label-02",
            "2026-09-29 09:39:03 INFO  Test label completed on Warehouse-Label-02; all pending jobs drained",
          ],
        },
        feedback: "Test label printed and all pending jobs completed - the original symptom is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is physical output - only paper proves the queue drained end-to-end instead of merely showing a green service row.",
          evidenceGain: "Labels printing and queue drained - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "reinstall-printer-wrong",
        label: "Reinstall the printer driver",
        kind: "ui",
        feedback:
          "Driver reinstall skips the stopped service the events named - pending jobs never error at the driver.",
        evaluation: {
          grade: "premature",
          rationale:
            "The log shows the spooler service dying rather than the driver failing; jobs sit pending instead of erroring, so reinstalling changes nothing the evidence points at.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "printq.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "printq.verified", value: true },
      { type: "stateEquals", path: "printq.spoolerStarted", value: true },
      { type: "stateEquals", path: "printq.queueCleared", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reinstall-printer-wrong"],
        },
        feedback:
          "The driver never failed - jobs are pending behind a stopped spooler, so the reinstall would finish and the queue would still sit still.",
      },
    ],
    hints: [
      { level: 1, text: "The service that moves the queue records its own failures - read this morning's events." },
      {
        level: 2,
        text: "Pending jobs that never error at the printer mean the mover is down - look at what sits at the head of the queue.",
      },
      {
        level: 3,
        text: "Remove what is poisoning the restart, bring the service up, then put paper through it.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "Job 88431 wrote a corrupt spool blob; every spooler restart crashed on it (Event 7031, error 1067), leaving the queue paused and jobs pending forever.",
      whyItWorked:
        "The events proved the service died rather than the printer failing, the queue inspection exposed the poison job at the head, clearing it let the restart stick, and the test label proved paper moved. Transferable principle: a service that dies repeatedly on start is usually carrying bad state - clear the state before restarting.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Event 7031 plus a paused queue with three pending jobs.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Jobs intact and never erroring drop the driver, paper, and printer hypotheses.",
        },
        { step: "Apply fix", whatLearnerDid: "Removed the corrupt job, then started the spooler." },
        { step: "Verify", whatLearnerDid: "Test label printed and the queue drained." },
      ],
      followUps: [
        "Enable spooler crash monitoring so a repeated 7031 raises a ticket before labels pile up.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [],
  },
  {
    id: "windows-nic-disabled",
    version: 1,
    title: "Finance laptop shows 'No network access'",
    category: "windows",
    difficulty: "foundational",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read device status codes as a statement of device state",
      "Separate an absent address from a wrong one with ipconfig",
      "Restore device state before touching cables or shared infrastructure",
    ],
    prerequisites: ["windows-device-error"],
    skills: ["network-adapter", "device-manager", "troubleshooting-method"],
    ticket: {
      id: "HD-1065",
      user: "Rosa Delgado",
      role: "Financial analyst",
      symptomPlainLanguage:
        "My laptop says No network access with the yellow triangle. VPN and mail stopped. My phone still connects fine.",
      priority: "medium",
      channel: "portal",
      additionalContext: "She docked at her desk this morning; the dock cable was replaced last week.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["device-manager"],
      enabledCommands: ["ipconfig", "systeminfo", "help"],
      components: ["device-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "rdelgado",
        hosts: [
          {
            id: "ws-77",
            name: "FIN-LAPTOP-77",
            os: "windows",
            ips: [],
            mac: "3C:22:FB:8D:10:A4",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        devices: [
          "Display adapter: Intel Iris Xe - working",
          "Network adapter: Contoso GbE - disabled (Code 22)",
          "Bluetooth radio: Contoso BT - working",
          "Docking station: Contoso Dock - working",
        ],
        net: {
          devicesRead: false,
          ipChecked: false,
          adapterEnabled: false,
          ipConfirmed: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-disabled", label: "The adapter was disabled in Windows", initiallyPlausible: true },
      { id: "h-cable", label: "Dock cable came loose", initiallyPlausible: true },
      { id: "h-office", label: "The office network is down", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Windows states device state plainly - read it, confirm what the OS holds for an address, restore the state, then prove the address came back.",
      steps: [
        {
          id: "guide-device-manager",
          title: "Read the device state",
          explanation: "Open the Device Manager tab and find the network adapter in the list.",
          why: "Windows records every device's state explicitly - one device disabled while others work localizes the fault instantly.",
          expectedObservation:
            "Contoso GbE shows 'disabled (Code 22)' while every other device reports working.",
          target: { componentId: "device-manager", label: "Device Manager tab" },
          actionId: "open-device-manager",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-ipconfig",
          title: "Read the adapter's address state",
          explanation: "Run ipconfig in the terminal and read the adapter block.",
          why: "An address-less adapter cannot reach anything - this shows exactly what the OS holds right now, before any change.",
          expectedObservation: "Physical address present, no IPv4 address, Default Gateway (none).",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "check-ipconfig",
          commandId: "ipconfig",
          conceptId: "ip-addressing-basics",
        },
        {
          id: "guide-enable-adapter",
          title: "Restore the device state",
          explanation: "From Device Manager or Actions, enable the network adapter.",
          why: "Code 22 is Windows saying the device is turned off - restoring the state named by the evidence is the smallest fix that matches it.",
          expectedObservation:
            "The adapter reports working and DHCP hands back 192.168.1.77.",
          target: { componentId: "device-manager", label: "Device Manager (Contoso GbE)" },
          actionId: "enable-adapter",
        },
        {
          id: "guide-confirm-ip",
          title: "Confirm the address came back",
          explanation: "Run the adapter confirmation check from the Checks list.",
          why: "Verify the state, not the click - the address must actually be present before claiming reachability.",
          expectedObservation: "IPv4 192.168.1.77 with gateway 192.168.1.1 now listed.",
          target: {
            componentId: "device-manager",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "confirm-ipconfig",
          commandId: "ipconfig",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-verify-network",
          title: "Confirm her services work",
          explanation: "From Actions, confirm the file share and mail load.",
          why: "The ticket is lost connectivity at her desk - only her actual services prove it end-to-end.",
          expectedObservation: "Shared drive and mail open without the yellow triangle.",
          target: { componentId: "device-manager", label: "Device Manager (network status)" },
          actionId: "verify-network",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "open-device-manager",
        label: "Open Device Manager",
        kind: "inspect",
        tool: "device-manager",
        patch: { net: { devicesRead: true } },
        feedback:
          "Contoso GbE reports 'disabled (Code 22)' while every other device reports working - one device, explicitly switched off.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Code 22 means Windows itself disabled the device - a single adapter in a disabled state frames this as configuration rather than failed hardware.",
          evidenceGain: "Adapter disabled by device state (Code 22) - hardware failure ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["device manager", "code 22"],
      },
      {
        id: "check-ipconfig",
        label: "ipconfig",
        kind: "terminal",
        tool: "terminal",
        patch: { net: { ipChecked: true } },
        feedback:
          "Ethernet adapter: Physical Address 3C:22:FB:8D:10:A4, Default Gateway (none) - no IPv4 address is listed for the adapter.",
        evaluation: {
          grade: "optimal",
          rationale:
            "ipconfig separates 'no address' from 'wrong address' - an adapter with a MAC but no IPv4 and no gateway cannot reach anything regardless of DHCP state.",
          evidenceGain: "No IPv4 and no gateway on the only adapter - wrong-address and DHCP-timing explanations still open until device state is read.",
        },
        isDiagnostic: true,
        matchHints: ["ipconfig", "adapter address"],
      },
      {
        id: "enable-adapter",
        label: "Enable the network adapter",
        kind: "ui",
        tool: "device-manager",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "net.devicesRead", value: true },
            { type: "stateEquals", path: "net.ipChecked", value: true },
          ],
        },
        patch: {
          net: { adapterEnabled: true },
          devices: [
            "Display adapter: Intel Iris Xe - working",
            "Network adapter: Contoso GbE - working",
            "Bluetooth radio: Contoso BT - working",
            "Docking station: Contoso Dock - working",
          ],
          hosts: [
            {
              id: "ws-77",
              name: "FIN-LAPTOP-77",
              os: "windows",
              ips: ["192.168.1.77"],
              mac: "3C:22:FB:8D:10:A4",
              gateway: "192.168.1.1",
              dns: ["192.168.1.1"],
            },
          ],
        },
        feedback:
          "Contoso GbE enabled (Code 22 cleared) and DHCP assigned 192.168.1.77.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Code 22 states the device is disabled - re-enabling the exact device the state named restores the path before any cable or infrastructure is touched.",
          evidenceGain: "Adapter working with a fresh DHCP address - device layer restored.",
        },
        isFix: true,
      },
      {
        id: "confirm-ipconfig",
        label: "Re-read the adapter address in the terminal",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "net.adapterEnabled", value: true },
        patch: { net: { ipConfirmed: true } },
        feedback:
          "IPv4 Address 192.168.1.77, Default Gateway 192.168.1.1, DNS Servers 192.168.1.1 - full configuration restored.",
        matchHints: ["ipconfig"],
        evaluation: {
          grade: "optimal",
          rationale:
            "Re-reading after the change verifies the state rather than the click - the address must be present before claiming reachability.",
          evidenceGain: "Full IPv4 configuration present - connectivity precondition met.",
        },
        isDiagnostic: true,
      },
      {
        id: "verify-network",
        label: "Confirm file share and mail load",
        kind: "ui",
        tool: "device-manager",
        appliesWhen: { type: "stateEquals", path: "net.ipConfirmed", value: true },
        patch: { net: { verified: true } },
        feedback: "Shared drive and mail both load - the original symptom is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is lost connectivity at her desk - only her actual services prove the repair end-to-end.",
          evidenceGain: "Services reachable - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "reboot-router-wrong",
        label: "Reboot the office router",
        kind: "ui",
        feedback:
          "The yellow triangle sits on one disabled adapter - rebooting the router risks everyone else's session to fix her device state.",
        evaluation: {
          grade: "risky",
          rationale:
            "Her phone works and only this laptop shows Code 22; rebooting shared infrastructure would disturb every user to chase a fault the device list already located on her machine.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "net.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "net.verified", value: true },
      { type: "stateEquals", path: "net.ipConfirmed", value: true },
      { type: "stateEquals", path: "net.adapterEnabled", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["reboot-router-wrong"],
        },
        feedback:
          "One laptop with a device-level Code 22 while her phone connects fine - shared infrastructure is not the fault domain.",
      },
    ],
    hints: [
      { level: 1, text: "Windows tells you the state of every device - start where it speaks plainly." },
      { level: 2, text: "Read what the OS holds for an address before blaming anything upstream." },
      {
        level: 3,
        text: "A device Windows has turned off takes one state change - then prove the address came back and her services load.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "Windows had disabled the Contoso GbE adapter (Code 22), so the laptop held a MAC address but no IPv4 and no gateway - no path to the LAN at all.",
      whyItWorked:
        "The device list named the disabled state, ipconfig proved the address was absent rather than wrong, re-enabling restored DHCP, and the re-read plus service check proved reachability. Transferable principle: a 'no access' triangle beside a disabled device row is a state fault - restore state before touching cables or infrastructure.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Device Manager shows Code 22 on the only network adapter.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Her phone works and other devices report healthy - office network and cable hypotheses dropped; no IPv4 rules out address conflicts.",
        },
        { step: "Apply fix", whatLearnerDid: "Re-enabled the adapter; DHCP assigned 192.168.1.77." },
        {
          step: "Verify",
          whatLearnerDid: "ipconfig confirms the address and her share and mail load.",
        },
      ],
      followUps: [
        "Check whether a device policy or script disabled adapters on other finance laptops.",
      ],
    },
    knowledgeLinks: ["ip-addressing-basics", "troubleshooting-method"],
    references: [],
  },
];
