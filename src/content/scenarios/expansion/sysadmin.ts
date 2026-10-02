import type { ScenarioInput } from "@/content/schema";

export const sysadminScenarios: ScenarioInput[] = [
  {
    id: "sysadmin-backup-verify",
    version: 1,
    title: "Restore test is missing files from last week",
    category: "sysadmin",
    difficulty: "intermediate",
    scenarioType: "RECOVERY",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Separate a job that reports success from a backup that holds the right data",
      "Use a test restore as the only proof a backup is complete",
      "Match a silent selection change to the moment the content stopped matching",
    ],
    prerequisites: ["backup-failed"],
    skills: ["backup", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1073",
      user: "Marisol Vega",
      role: "Records supervisor",
      symptomPlainLanguage:
        "The nightly backup says it succeeded every single night, but when I restored this morning none of last week's department files came back.",
      priority: "high",
      channel: "email",
      additionalContext:
        "She restored from the newest set on the NAS and got 41,208 files, all dated Sep 18 or earlier.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["backup-console", "terminal", "event-viewer", "storage"],
      enabledCommands: ["tasklist", "systeminfo", "help"],
      components: ["event-viewer", "storage"],
      showInspector: true,
      initialWorld: {
        currentUser: "mvega",
        backup: {
          targetPath: "\\\\nas01\\backups",
          account: "ops-backup",
          sourcePath: "C:\\Users\\Public\\Departments",
          movedOn: "Sep 19",
          logReviewed: false,
          restoreTested: false,
          capacityChecked: false,
          filterUpdated: false,
          runVerified: false,
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
          "Sep 20 02:00 Backup completed successfully - 42.1 GB written to \\\\nas01\\backups",
          "Sep 21 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
          "Sep 22 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
          "Sep 23 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
          "Sep 29 11:20 Restore completed - 41,208 files restored from \\\\nas01\\backups, newest file dated Sep 18",
        ],
      },
    },
    hypotheses: [
      { id: "h-space", label: "Not enough space on the NAS target", initiallyPlausible: true },
      { id: "h-selection", label: "Backup selection no longer covers the source", initiallyPlausible: true },
      { id: "h-engine", label: "Backup engine copying nothing while reporting success", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "The job already says success, so stop reading the status and start reading what the job actually selected - then prove the answer with a restore.",
      steps: [
        {
          id: "guide-history",
          title: "Read the job history around the move",
          explanation:
            "Open the Event Viewer tab and read the nightly backup entries from Sep 20 through today.",
          why:
            "A success status only says the job finished - the history also records how much it selected, which is where a complete-looking backup starts to disagree with reality.",
          expectedObservation:
            "Sep 20 copies 42.1 GB, and every night since reports success with 0 files included; the restore line shows nothing newer than Sep 18.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-backup-log",
          conceptId: "windows-event-logs",
          fallback: "the Event Viewer tab in the Windows workstation panel",
        },
        {
          id: "guide-restore-test",
          title: "Run a test restore of last week's folders",
          explanation:
            "From the Checks list, run the test restore and read which files come back.",
          why:
            "A restore is the only measurement that answers the ticket - it tests the backup's content instead of the job's opinion of itself.",
          expectedObservation:
            "41,208 files restore, every one dated Sep 18 or earlier, with nothing from after the Sep 19 folder move.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "run-restore-test",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-capacity",
          title: "Rule out capacity and the engine",
          explanation:
            "From the Checks list, run the engine and capacity check, then compare the result with the Services and Storage tabs.",
          why:
            "A stopped engine or a full volume would fail the job loudly - both are visible and healthy here, which keeps the question on what the job selects.",
          expectedObservation:
            "Windows Backup shows running and C: shows 294 GB free while the job still reports success.",
          target: { componentId: "storage", label: "Storage tab" },
          actionId: "check-target-capacity",
          conceptId: "disk-space-slow-pc",
          fallback: "the Storage tab in the Windows workstation panel",
        },
        {
          id: "guide-filter",
          title: "Point the selection at the new source",
          explanation:
            "From Actions, run Update the include filter to the new source path.",
          why:
            "The folder moved on Sep 19 and the job kept selecting the old location - the selection, not the schedule or the target, is the thing that changed silently.",
          expectedObservation:
            "The include list now names C:\\Departments and the old path is no longer selected.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (include list)" },
          actionId: "update-include-filter",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-restore",
          title: "Prove the next run carries the new files",
          explanation:
            "From Actions, run the job and verify the restored files, then compare the newest dates.",
          why:
            "The ticket is about content that is missing, so only a fresh run followed by a restore proves the selection now reaches the moved folders.",
          expectedObservation:
            "The run copies 18.4 GB and a restore returns files dated Sep 19 through today.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (verified run)" },
          actionId: "run-backup-verify",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-backup-log",
        label: "Read backup job history",
        kind: "inspect",
        tool: "backup-console",
        patch: { backup: { logReviewed: true } },
        feedback:
          "Success every night since Sep 20, but every run since then selected 0 files - the Sep 20 run copied 42.1 GB from C:\\Users\\Public\\Departments.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The status column says success while the selection count says nothing was copied - reading the history exposes the disagreement the summary hides.",
          evidenceGain:
            "Job succeeds while selecting 0 files since Sep 21 - content gap isolated to selection.",
        },
        matchHints: ["history", "backup log", "job history"],
        isDiagnostic: true,
      },
      {
        id: "run-restore-test",
        label: "Run a test restore of last week's folders",
        kind: "inspect",
        tool: "backup-console",
        appliesWhen: { type: "stateEquals", path: "backup.logReviewed", value: true },
        patch: { backup: { restoreTested: true } },
        feedback:
          "Restore returns 41,208 files, all dated Sep 18 or earlier - nothing from the department folders after the Sep 19 move.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A restore measures the backup's actual contents, converting 'files are missing' from a report into a dated, countable fact.",
          evidenceGain: "Backup holds no data newer than Sep 18 - content gap confirmed.",
        },
        matchHints: ["restore test", "test restore", "restore"],
        isDiagnostic: true,
      },
      {
        id: "check-target-capacity",
        label: "Check the engine and both disk capacities",
        kind: "inspect",
        tool: "storage",
        appliesWhen: { type: "stateEquals", path: "backup.restoreTested", value: true },
        patch: { backup: { capacityChecked: true } },
        feedback:
          "Windows Backup reports running, C: holds 294 GB free, and the NAS target accepted the Sep 20 set - engine and space are healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A stopped engine or a full volume would fail the job loudly - measuring both closes the loud-failure class so the silent gap stays the only open question.",
          evidenceGain: "Engine running and both volumes have room - capacity ruled out.",
        },
        matchHints: ["check capacity", "engine and space", "target capacity"],
        isDiagnostic: true,
      },
      {
        id: "update-include-filter",
        label: "Update the include filter to the new source path",
        kind: "ui",
        tool: "backup-console",
        appliesWhen: { type: "stateEquals", path: "backup.capacityChecked", value: true },
        patch: {
          backup: { filterUpdated: true, sourcePath: "C:\\Departments" },
          logs: [
            "Sep 20 02:00 Backup completed successfully - 42.1 GB written to \\\\nas01\\backups",
            "Sep 21 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 22 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 23 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 29 11:20 Restore completed - 41,208 files restored from \\\\nas01\\backups, newest file dated Sep 18",
            "Sep 29 11:44:06 INFO  Include list updated: C:\\Departments selected; C:\\Users\\Public\\Departments removed",
          ],
        },
        feedback:
          "Include list updated - C:\\Departments is selected and the retired path is no longer part of the job.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence named one selection that stopped matching reality on a known date - repointing that selection is the smallest change that matches the gap.",
          evidenceGain: "Selection now covers the moved source folders.",
        },
        matchHints: ["include filter", "update selection", "new source path"],
        isFix: true,
      },
      {
        id: "run-backup-verify",
        label: "Run the job and verify the restored files",
        kind: "ui",
        tool: "backup-console",
        appliesWhen: { type: "stateEquals", path: "backup.filterUpdated", value: true },
        patch: {
          backup: { runVerified: true, verified: true },
          logs: [
            "Sep 20 02:00 Backup completed successfully - 42.1 GB written to \\\\nas01\\backups",
            "Sep 21 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 22 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 23 02:00 Backup completed successfully - 0 files included since C:\\Users\\Public\\Departments is not in the selection",
            "Sep 29 11:20 Restore completed - 41,208 files restored from \\\\nas01\\backups, newest file dated Sep 18",
            "Sep 29 11:44:06 INFO  Include list updated: C:\\Departments selected; C:\\Users\\Public\\Departments removed",
            "Sep 29 11:52:30 Backup completed successfully - 18.4 GB written to \\\\nas01\\backups",
            "Sep 29 11:58:12 Restore test - files dated Sep 19 through Sep 29 restored from the newest set",
          ],
        },
        feedback:
          "The job copied 18.4 GB and a restore returns files dated Sep 19 through today - the newest set now matches the source.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was about content that is missing, so a fresh run plus a restore is the honest end state rather than a green status column.",
          evidenceGain: "Newest set carries post-move files - backup content verified.",
        },
        matchHints: ["run the job", "verify restore", "backup now"],
        isFix: true,
      },
      {
        id: "extend-backup-window-wrong",
        label: "Extend the backup window by two hours",
        kind: "ui",
        tool: "backup-console",
        feedback:
          "The job already finishes inside its window with a success status - more time cannot copy files the selection no longer points at.",
        evaluation: {
          grade: "wrong",
          rationale:
            "The job runs to completion every night, so duration is not the constraint; extra time cannot include a folder the selection excludes.",
        },
        matchHints: ["extend window", "longer backup window"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "backup.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "backup.verified", value: true },
      { type: "stateEquals", path: "backup.filterUpdated", value: true },
      { type: "stateEquals", path: "backup.restoreTested", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["extend-backup-window-wrong"],
        },
        feedback: "The job was never slow - it was selecting nothing after Sep 19.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The job reports success every night - so read what it selected, not whether it ran.",
      },
      {
        level: 2,
        text: "One restore answers the only question the ticket asks: are last week's files actually in the newest set?",
      },
      {
        level: 3,
        text: "The source folder moved on Sep 19 and the job's selection never followed - repoint that selection, then prove it with a real run and a restore.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The department folders were moved on Sep 19, but the backup job's include list still pointed at the retired path, so every nightly run succeeded while selecting zero files.",
      whyItWorked:
        "The job history exposed the success-with-empty-selection contradiction, a test restore dated the gap, and the healthy engine plus 38% free space closed the capacity and service hypotheses; repointing the selection and re-running restored post-move files. Transferable principle: a backup that reports success is only a claim - the restore test is the measurement, and content dated after the last known change is the only proof it holds.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Job history shows 0 files selected nightly; test restore returns only files dated Sep 18 or earlier.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "NAS space and engine hypotheses dropped - C: has 294 GB free, the engine runs, and the job completes every night.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Repointed the include list at the moved department folders.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Fresh run copied 18.4 GB and the restore returned files dated Sep 19 through today.",
        },
      ],
      followUps: [
        "Add a monthly restore test with a newest-file-age alert so silent selection drift is caught within days, not weeks.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft - Back up and restore with Windows Server Backup",
        url: "https://learn.microsoft.com/windows-server/backup-restore/backup-and-restore",
        note: "Public vendor documentation.",
      },
    ],
  },
  {
    id: "sysadmin-task-condition",
    version: 1,
    title: "Patch task never runs on schedule",
    category: "sysadmin",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Read a scheduler skip entry as a condition, not a failure",
      "Separate a healthy task body from the context its trigger requires",
      "Prove a scheduled run with its own logged start, not a manual one",
    ],
    prerequisites: [],
    skills: ["task-scheduler", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1074",
      user: "Dev Okonkwo",
      role: "IT coordinator",
      symptomPlainLanguage:
        "The patching task runs fine when I start it by hand, but it has never once run overnight on its own.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "He has already re-created the schedule twice and the task still never fires at 02:00.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "task-scheduler", "services"],
      enabledCommands: ["tasklist", "systeminfo", "help"],
      components: ["event-viewer", "services"],
      showInspector: true,
      initialWorld: {
        currentUser: "dokonkwo",
        task: {
          name: "patch-qa-startup",
          historyRead: false,
          settingsRead: false,
          manualRun: false,
          conditionChanged: false,
          verified: false,
        },
        services: [
          {
            id: "sched",
            name: "Task Scheduler",
            status: "running",
            description: "Task Scheduler service",
          },
        ],
        logs: [
          "2026-09-27 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
          "2026-09-28 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
          "2026-09-29 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
          "2026-09-29 08:12:44 INFO  Task Scheduler: patch-qa-startup run interactively by dokonkwo - completed (0x0)",
        ],
      },
    },
    hypotheses: [
      { id: "h-action", label: "Task action broken after a patch", initiallyPlausible: true },
      { id: "h-session", label: "Task waiting for a logon session that never appears", initiallyPlausible: true },
      { id: "h-service", label: "Task Scheduler service stopped overnight", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Read what the scheduler records when it declines to run, compare that with the task's own settings, and separate the schedule from the context it waits for.",
      steps: [
        {
          id: "guide-history",
          title: "Read the 02:00 attempts in the history",
          explanation:
            "Open the Event Viewer tab and read the Task Scheduler entries for the last three nights and yesterday's manual run.",
          why:
            "The scheduler's own skip entry names the reason it declined - it separates 'the task never ran' from 'the task ran and failed'.",
          expectedObservation:
            "Three Event 101 entries saying no interactive session at the scheduled time, beside yesterday's manual run completing 0x0.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-task-history",
          conceptId: "windows-event-logs",
          fallback: "the Event Viewer tab in the Windows workstation panel",
        },
        {
          id: "guide-settings",
          title: "Read the task's logon condition",
          explanation:
            "From the Checks list, run the logon-condition check and read the security options of the task.",
          why:
            "A trigger that fires on time still needs its condition satisfied - the setting shows what the task demands before it starts.",
          expectedObservation:
            "Trigger daily at 02:00 with 'Run only when user is logged on' and no account signed in overnight on this workstation.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "inspect-task-settings",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-manual",
          title: "Run the task by hand once",
          explanation:
            "From the Checks list, run the task manually and read its completion result.",
          why:
            "A manual run isolates the task body from its trigger - if the work completes interactively, the action and its schedule are not what is broken.",
          expectedObservation:
            "The task starts immediately and finishes 0x0 in about four minutes with no errors.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "run-task-now",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-condition",
          title: "Remove the interactive-logon condition",
          explanation:
            "From Actions, run Set the task to run without a logon session.",
          why:
            "The skip entries, the setting and the healthy manual run all point at one condition - changing exactly that leaves the proven trigger and action untouched.",
          expectedObservation:
            "The task's security options now read 'Run whether user is logged on or not'.",
          target: { componentId: "services", label: "Services tab (task condition)" },
          actionId: "change-logon-condition",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-nightly",
          title: "Confirm tonight's scheduled run",
          explanation:
            "From Actions, run Confirm tonight's scheduled run and read tomorrow's history entry.",
          why:
            "A manual run never proves the 02:00 trigger - only the scheduler starting the task on its own schedule closes the ticket.",
          expectedObservation:
            "A 02:00:04 entry shows the task starting without a session and completing 0x0.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (scheduled run)" },
          actionId: "verify-nightly-run",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-task-history",
        label: "Read the task's run history",
        kind: "inspect",
        tool: "event-viewer",
        patch: { task: { historyRead: true } },
        feedback:
          "Each 02:00 attempt logs Event 101 'not started - no interactive user session', while yesterday's manual run completed (0x0).",
        evaluation: {
          grade: "optimal",
          rationale:
            "The scheduler records why it declined - a skip entry with a reason is a different failure class from a run that started and errored.",
          evidenceGain: "Nightly attempts skipped for a missing session, not a task failure.",
        },
        matchHints: ["history", "task history", "event 101"],
        isDiagnostic: true,
      },
      {
        id: "inspect-task-settings",
        label: "Check the task's logon condition",
        kind: "inspect",
        tool: "task-scheduler",
        appliesWhen: { type: "stateEquals", path: "task.historyRead", value: true },
        patch: { task: { settingsRead: true } },
        feedback:
          "Trigger: daily 02:00. Security options: 'Run only when user is logged on' - no account stays signed in on this workstation overnight.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The condition is the gate the trigger must pass - reading it turns the scheduler's skip reason into a named setting that can be changed.",
          evidenceGain: "Interactive-logon condition identified as the nightly blocker.",
        },
        matchHints: ["task settings", "logon condition", "security options"],
        isDiagnostic: true,
      },
      {
        id: "run-task-now",
        label: "Run the task manually once",
        kind: "inspect",
        tool: "task-scheduler",
        appliesWhen: { type: "stateEquals", path: "task.settingsRead", value: true },
        patch: { task: { manualRun: true } },
        feedback:
          "Started interactively at 08:12 and completed (0x0) in 4m - the action, its arguments and the schedule all work.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Running the body by hand separates a healthy task from the context its trigger requires, which is exactly the split the ticket describes.",
          evidenceGain: "Task body proven healthy - action and schedule ruled out.",
        },
        matchHints: ["run now", "run manually", "start the task"],
        isDiagnostic: true,
      },
      {
        id: "change-logon-condition",
        label: "Set the task to run without a logon session",
        kind: "ui",
        tool: "task-scheduler",
        appliesWhen: { type: "stateEquals", path: "task.manualRun", value: true },
        patch: {
          task: { conditionChanged: true },
          logs: [
            "2026-09-27 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-28 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-29 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-29 08:12:44 INFO  Task Scheduler: patch-qa-startup run interactively by dokonkwo - completed (0x0)",
            "2026-09-29 12:05:31 INFO  Task Scheduler: patch-qa-startup condition updated - run whether user is logged on or not",
          ],
        },
        feedback:
          "The task now runs whether or not a user is signed in - the trigger and action stay exactly as proven.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Every path of evidence converged on one condition, so changing only that condition preserves the proven schedule, action and account.",
          evidenceGain: "Interactive-logon condition removed from the nightly task.",
        },
        matchHints: ["logon condition", "run whether logged on", "session condition"],
        isFix: true,
      },
      {
        id: "verify-nightly-run",
        label: "Confirm tonight's scheduled run",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "task.conditionChanged", value: true },
        patch: {
          task: { verified: true },
          logs: [
            "2026-09-27 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-28 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-29 02:00:01 INFO  Task Scheduler: patch-qa-startup not started - no interactive user session at scheduled time (Event 101)",
            "2026-09-29 08:12:44 INFO  Task Scheduler: patch-qa-startup run interactively by dokonkwo - completed (0x0)",
            "2026-09-29 12:05:31 INFO  Task Scheduler: patch-qa-startup condition updated - run whether user is logged on or not",
            "2026-09-30 02:00:04 INFO  Task Scheduler: patch-qa-startup started by schedule with no interactive session - completed (0x0)",
          ],
        },
        feedback:
          "Tonight's 02:00 entry shows the task starting on its own and completing 0x0 - the scheduled run finally happened.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a schedule that never fires, so only the scheduler starting the task at 02:00 proves the condition change fixed the reported symptom.",
          evidenceGain: "Scheduled run observed at 02:00 - end-to-end verification.",
        },
        matchHints: ["confirm scheduled", "check tonight", "verify nightly"],
        isFix: true,
      },
      {
        id: "rebuild-task-wrong",
        label: "Rebuild the task from scratch",
        kind: "ui",
        tool: "task-scheduler",
        feedback:
          "A new task carries the same condition - it will wait for a user who is never signed in at 02:00.",
        evaluation: {
          grade: "wrong",
          rationale:
            "The action, trigger and completion are proven healthy, so rebuilding recreates the one setting that actually blocks the nightly run.",
        },
        matchHints: ["rebuild task", "recreate task", "new task"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "task.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "task.verified", value: true },
      { type: "stateEquals", path: "task.conditionChanged", value: true },
      { type: "stateEquals", path: "task.manualRun", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["rebuild-task-wrong"],
        },
        feedback:
          "Rebuilding keeps the interactive-logon condition, so 02:00 still finds no session and skips again.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The scheduler logs a reason every night it declines - start there instead of the task's action.",
      },
      {
        level: 2,
        text: "A manual run works, so what does the task still require before the 02:00 trigger may start it?",
      },
      {
        level: 3,
        text: "One condition gates the trigger on a session nobody opens at night - change that condition, then wait for the scheduler itself to start the task.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The task was configured to run only when a user is logged on, and nobody signs in to the workstation overnight, so the scheduler logged Event 101 and skipped every 02:00 trigger.",
      whyItWorked:
        "The skip entries named the reason, the settings check named the condition, and the manual run proved the action healthy; changing only the condition let the untouched trigger start the task on schedule. Transferable principle: a scheduled job that works by hand but never fires on time is a context question - prove the body first, then read what the trigger still requires.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Event 101 skip entries, task security options, and a successful manual run.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Broken action, broken trigger and stopped service hypotheses dropped - the manual run completed 0x0 and Task Scheduler runs continuously.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Set the task to run whether or not a user is logged on.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The scheduler started the task at 02:00:04 with no session and it completed 0x0.",
        },
      ],
      followUps: [
        "Audit other maintenance tasks for the same interactive-logon condition before the next patch cycle.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [
      {
        title: "Microsoft Learn - schtasks create",
        url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks-create",
        note: "Public vendor documentation.",
      },
    ],
  },
  {
    id: "sysadmin-dns-record-stale",
    version: 1,
    title: "Invoice portal still opens the retired server",
    category: "sysadmin",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 13,
    learningObjectives: [
      "Compare what a change record promised with what the resolver serves today",
      "Place a stale answer in the authoritative record instead of the client",
      "Verify a name-mapping fix with a brand-new lookup and a real request",
    ],
    prerequisites: [],
    skills: ["dns", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1075",
      user: "Aaron Blake",
      role: "Finance systems owner",
      symptomPlainLanguage:
        "Since the portal moved on Thursday, our invoice page keeps opening the old server - it loads, but it shows the retired banner and old data.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "Colleagues on other machines see the same thing, and a direct request to the new address works.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "terminal"],
      enabledCommands: ["nslookup", "ping", "ipconfig", "help"],
      components: ["event-viewer"],
      showInspector: true,
      initialWorld: {
        currentUser: "ablake",
        hosts: [
          {
            id: "ws-fin-04",
            name: "FIN-WKS-04",
            os: "windows",
            ips: ["192.168.1.77"],
            mac: "B4:2E:99:1C:07:31",
            gateway: "192.168.1.1",
            dns: ["192.168.1.1"],
          },
        ],
        dnsZones: { "portal.corp.local": "10.20.30.19" },
        logs: [
          "2026-09-24 21:40:11 INFO  Migration CHG-2288: portal01 retired; portal.corp.local moves to 10.20.30.60 (portal02)",
          "2026-09-24 21:40:12 WARN  Internal DNS: A record update for portal.corp.local marked pending on dns01",
          "2026-09-25 09:15:03 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
          "2026-09-29 10:02:44 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
        ],
        net: {
          changeRead: false,
          lookupDone: false,
          endpointsTested: false,
          recordUpdated: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-cache", label: "Local DNS cache holding yesterday's answer", initiallyPlausible: true },
      { id: "h-record", label: "Internal A record never updated after the move", initiallyPlausible: true },
      { id: "h-oldhost", label: "Old server still running and answering", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Compare the promise in the change record with what the resolver answers right now, then fix whichever layer never received the move.",
      steps: [
        {
          id: "guide-change",
          title: "Read the migration record",
          explanation:
            "Open the Event Viewer tab and read the Sep 24 migration entries for this portal.",
          why:
            "The change record states what the name was supposed to point at after the move - it is the yardstick every later answer is measured against.",
          expectedObservation:
            "CHG-2288 retired portal01 and moved the name to 10.20.30.60, with the internal A record update still marked pending.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-change-log",
          conceptId: "what-is-dns",
          fallback: "the Event Viewer tab in the Windows workstation panel",
        },
        {
          id: "guide-resolve",
          title: "Ask the resolver what it serves today",
          explanation:
            "In the terminal, run nslookup portal.corp.local and read the answer.",
          why:
            "A fresh query shows what every machine receives right now, independent of what this machine remembers in a cache.",
          expectedObservation:
            "The resolver answers portal.corp.local with 10.20.30.19, the retired server's address.",
          target: { componentId: "terminal", label: "Terminal - run nslookup portal.corp.local" },
          actionId: "resolve-portal",
          commandId: "nslookup-wrong",
          conceptId: "what-is-dns",
        },
        {
          id: "guide-endpoints",
          title: "Test both portal addresses",
          explanation:
            "From the Checks list, run the endpoint test and compare the two addresses.",
          why:
            "A name resolving to a dead address and a working address nobody uses is the shape of a mapping problem - it rules out an old server that is still serving.",
          expectedObservation:
            "10.20.30.19 answers nothing while 10.20.30.60 replies and serves the current build.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "check-endpoints",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-record",
          title: "Publish the record the migration promised",
          explanation:
            "From Actions, run Update the internal A record to the new address.",
          why:
            "The resolver, this machine's cache and every colleague's browser are all repeating one authoritative answer - updating that answer fixes all of them at once.",
          expectedObservation:
            "dns01 publishes portal.corp.local as 10.20.30.60 and the pending update clears.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (A record published)" },
          actionId: "update-a-record",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify",
          title: "Prove the portal now opens the new server",
          explanation:
            "From Actions, run Open the portal and confirm the new server.",
          why:
            "The ticket is a page that opens the wrong server, so only a fresh request that lands on the new address closes it.",
          expectedObservation:
            "A fresh lookup returns 10.20.30.60 and the portal loads build 4.1 with no retired banner.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (portal opens)" },
          actionId: "verify-portal",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-change-log",
        label: "Read the migration record",
        kind: "inspect",
        tool: "event-viewer",
        patch: { net: { changeRead: true } },
        feedback:
          "CHG-2288 retired portal01 on Sep 24 and moved portal.corp.local to 10.20.30.60 - the internal A record update on dns01 is still marked pending.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The change record is the intended state - without it there is no yardstick to measure today's answer against.",
          evidenceGain: "Intended address known: 10.20.30.60, record update pending.",
        },
        matchHints: ["migration record", "change record", "read the change log"],
        isDiagnostic: true,
      },
      {
        id: "resolve-portal",
        label: "nslookup portal.corp.local",
        kind: "terminal",
        tool: "terminal",
        patch: { net: { lookupDone: true } },
        feedback:
          "Server 192.168.1.1 answers portal.corp.local -> 10.20.30.19 - the resolver is serving the retired address right now.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A fresh lookup shows what every client receives today, independent of any local cache - it compares the live answer with the change record.",
          evidenceGain: "Resolver serves 10.20.30.19 - contradicts the change record.",
        },
        matchHints: ["nslookup", "nslookup portal.corp.local", "resolve the name"],
        isDiagnostic: true,
      },
      {
        id: "check-endpoints",
        label: "Test both portal addresses",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "net.changeRead", value: true },
            { type: "stateEquals", path: "net.lookupDone", value: true },
          ],
        },
        patch: { net: { endpointsTested: true } },
        feedback:
          "10.20.30.19 (retired Sep 24): 100% packet loss, nothing answers. 10.20.30.60 (portal02): replies and serves the current build.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Testing both addresses separates 'the old server still answers' from 'the name points at a dead address' - the two map to completely different fixes.",
          evidenceGain: "Old address dead, new address healthy - mapping is the fault.",
        },
        matchHints: ["test both addresses", "endpoint test", "reachability"],
        isDiagnostic: true,
      },
      {
        id: "update-a-record",
        label: "Update the internal A record to the new address",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "net.endpointsTested", value: true },
        patch: {
          dnsZones: { "portal.corp.local": "10.20.30.60" },
          net: { recordUpdated: true },
          logs: [
            "2026-09-24 21:40:11 INFO  Migration CHG-2288: portal01 retired; portal.corp.local moves to 10.20.30.60 (portal02)",
            "2026-09-24 21:40:12 WARN  Internal DNS: A record update for portal.corp.local marked pending on dns01",
            "2026-09-25 09:15:03 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
            "2026-09-29 10:02:44 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
            "2026-09-29 10:31:07 INFO  Internal DNS: A record for portal.corp.local published as 10.20.30.60 (dns01)",
          ],
        },
        feedback:
          "dns01 now answers portal.corp.local -> 10.20.30.60 and the pending update clears.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The authoritative answer is the one layer every client repeats, so publishing the promised address fixes all machines at once instead of one cache at a time.",
          evidenceGain: "Authoritative record now serves the post-migration address.",
        },
        matchHints: ["update a record", "publish the record", "change the dns record"],
        isFix: true,
      },
      {
        id: "verify-portal",
        label: "Open the portal and confirm the new server",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "net.recordUpdated", value: true },
        patch: {
          net: { verified: true },
          logs: [
            "2026-09-24 21:40:11 INFO  Migration CHG-2288: portal01 retired; portal.corp.local moves to 10.20.30.60 (portal02)",
            "2026-09-24 21:40:12 WARN  Internal DNS: A record update for portal.corp.local marked pending on dns01",
            "2026-09-25 09:15:03 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
            "2026-09-29 10:02:44 INFO  finance-app: portal requests served by 10.20.30.19 - build 3.4 (retired banner shown)",
            "2026-09-29 10:31:07 INFO  Internal DNS: A record for portal.corp.local published as 10.20.30.60 (dns01)",
            "2026-09-29 10:31:52 INFO  finance-app: portal requests served by 10.20.30.60 - build 4.1 (current)",
          ],
        },
        feedback:
          "A fresh lookup returns 10.20.30.60 and the portal loads build 4.1 with no retired banner.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a page opening the wrong server, so a fresh request landing on the new address is the only honest end state.",
          evidenceGain: "Portal served by the new address - reported symptom cleared.",
        },
        matchHints: ["open the portal", "verify the portal", "check the portal"],
        isFix: true,
      },
      {
        id: "flush-client-cache-wrong",
        label: "Flush this machine's DNS cache",
        kind: "ui",
        feedback:
          "Flushing re-asks the same resolver, which still answers 10.20.30.19 - every colleague gets the retired address right back.",
        evaluation: {
          grade: "wrong",
          rationale:
            "The authoritative answer itself is stale, so clearing a local cache only repeats the same wrong mapping on the next lookup.",
        },
        matchHints: ["flush dns", "clear dns cache", "flush cache"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "net.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "net.verified", value: true },
      { type: "stateEquals", path: "net.recordUpdated", value: true },
      { type: "stateEquals", path: "net.endpointsTested", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["flush-client-cache-wrong"],
        },
        feedback:
          "The resolver itself serves the retired address - a local flush cannot change what dns01 publishes.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Start with what the migration record says the name should point at after the move.",
      },
      {
        level: 2,
        text: "Then ask the resolver directly - a fresh lookup shows what every machine receives today.",
      },
      {
        level: 3,
        text: "One answer is repeated by the resolver, every cache and every browser - fix the layer that publishes it, then prove the name leads to the address that answers.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The internal A record for portal.corp.local still pointed at the retired portal01 (10.20.30.19) after the Sep 24 migration, because the pending update on dns01 was never published.",
      whyItWorked:
        "The change record established the intended address, a fresh lookup showed the resolver serving the old one, and the endpoint test proved the old host dead while the new one answered; publishing the promised record fixed every client at once. Transferable principle: when a name resolves without error but leads to a retired host, compare what the resolver serves today with what the change record promised - the disagreement locates the layer that was never updated.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Change record shows the intended address; nslookup shows the resolver still serving the retired one.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Old-server-still-running and local-cache hypotheses dropped - the old address answers nothing and colleagues on other machines see the same mapping.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Published the A record the migration had left pending on dns01.",
        },
        {
          step: "Verify",
          whatLearnerDid: "A fresh request lands on 10.20.30.60 and serves the current build.",
        },
      ],
      followUps: [
        "Add post-migration checks that compare a fresh lookup with the intended address before the change window closes.",
      ],
    },
    knowledgeLinks: ["what-is-dns", "troubleshooting-method"],
    references: [],
  },
  {
    id: "sysadmin-disk-smart",
    version: 1,
    title: "Data drive dropping out with media errors",
    category: "sysadmin",
    difficulty: "intermediate",
    scenarioType: "COMPONENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Separate a failing disk from a full disk by evidence, not by symptom",
      "Read retried I/O events as a device-level story with a timeline",
      "Act on predictive failure before the disk fails for you",
    ],
    prerequisites: ["disk-full-slow-pc"],
    skills: ["storage", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1076",
      user: "Kenji Sato",
      role: "Lab systems administrator",
      symptomPlainLanguage:
        "The data drive has been dropping out for three days - windows freeze for a second or two and the log keeps complaining about the disk.",
      priority: "high",
      channel: "email",
      additionalContext:
        "Plenty of free space on every volume; the drive is only about a third full.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "storage", "terminal"],
      enabledCommands: ["df", "tasklist", "systeminfo", "help"],
      components: ["event-viewer", "storage"],
      showInspector: true,
      initialWorld: {
        currentUser: "ksato",
        disk: {
          device: "\\\\.\\Harddisk1",
          eventsRead: false,
          spaceChecked: false,
          smartChecked: false,
          migrationStarted: false,
          verified: false,
        },
        services: [
          {
            id: "storsvc",
            name: "Storage Service",
            status: "running",
            description: "Storage management service",
          },
        ],
        disks: [
          { fs: "C:", size: "476G", used: "358G", avail: "118G", usePercent: "75%", mount: "C:\\" },
          { fs: "D:", size: "1.8T", used: "612G", avail: "1.2T", usePercent: "33%", mount: "D:\\" },
        ],
        logs: [
          "2026-09-27 03:14:52 WARN  disk 153 The I/O operation at logical block address 0x4a1f00 on \\Device\\Harddisk1 was retried",
          "2026-09-28 09:41:07 WARN  disk 129 Reset to device, \\Device\\RaidPort1, was issued",
          "2026-09-29 06:22:31 WARN  disk 153 The I/O operation on \\Device\\Harddisk1 was retried (118 retries logged today)",
          "2026-09-29 06:22:34 INFO  Storage Service: volume D: healthy - 1.2 TB free of 1.8 TB",
        ],
      },
    },
    hypotheses: [
      { id: "h-space", label: "Volume nearly full and thrashing", initiallyPlausible: true },
      { id: "h-media", label: "Disk reporting media errors", initiallyPlausible: true },
      { id: "h-cable", label: "Loose cable to the data drive", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Read what the events say the device is doing, confirm capacity is not involved, then let the disk report on its own health before deciding anything.",
      steps: [
        {
          id: "guide-events",
          title: "Read the disk events",
          explanation:
            "Open the Event Viewer tab and read the disk entries from the last three days.",
          why:
            "Event 153 retries and a 129 reset are the OS describing a device that answers slowly and gets reset - a different story from a volume that is merely busy.",
          expectedObservation:
            "Three days of disk 153 retries and a disk 129 reset on Harddisk1, while the storage line reports 1.2 TB free.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-disk-events",
          conceptId: "windows-event-logs",
          fallback: "the Event Viewer tab in the Windows workstation panel",
        },
        {
          id: "guide-space",
          title: "Rule out capacity on both volumes",
          explanation:
            "From the Checks list, run the free-space check and read the Storage tab beside it.",
          why:
            "A full volume also produces errors and freezes - measuring capacity first separates the two failure classes instead of assuming.",
          expectedObservation:
            "C: at 75% and D: at 33% with 1.2 TB free - capacity is healthy on both volumes.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "check-free-space",
          conceptId: "disk-space-slow-pc",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-smart",
          title: "Read the disk's own health report",
          explanation:
            "From the Checks list, run the SMART health check for the data disk.",
          why:
            "SMART data is the device's self-report - it converts retried I/O from an observation into a measured, dated condition.",
          expectedObservation:
            "Reallocated sectors far above threshold, pending sectors waiting to be remapped, and a self-test result of failing since Sep 27.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "run-smart-check",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-migrate",
          title: "Move the data to the spare disk",
          explanation:
            "From Actions, run Migrate the volume to the spare disk.",
          why:
            "Predictive failure means the disk will stop on its own schedule - copying the data off while it still reads is the only action that outruns it.",
          expectedObservation:
            "The volume begins mirroring to the spare disk with 612 GB copied in the background.",
          target: { componentId: "storage", label: "Storage tab (volume migration)" },
          actionId: "migrate-volume",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify",
          title: "Confirm the alerts stop",
          explanation:
            "From Actions, run Verify the migrated volume and clear the alerts.",
          why:
            "The ticket is three days of freezes and retries, so a quiet event log over a full day is the honest proof the device story ended.",
          expectedObservation:
            "The volume runs on the spare disk with no disk 153 or 129 entries for 24 hours.",
          target: { componentId: "storage", label: "Storage tab (alerts cleared)" },
          actionId: "verify-volume",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-disk-events",
        label: "Read disk events in Event Viewer",
        kind: "inspect",
        tool: "event-viewer",
        patch: { disk: { eventsRead: true } },
        feedback:
          "Three days of disk 153 retries and a disk 129 reset on Harddisk1 (D:) - the volume itself reports 1.2 TB free.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Retries and resets name a device-level fault with a timeline, and the same view shows capacity healthy - the failure class is fixed before any guesswork.",
          evidenceGain: "Device-level retries on Harddisk1 since Sep 27 - capacity line healthy.",
        },
        matchHints: ["disk events", "read events", "event 153"],
        isDiagnostic: true,
      },
      {
        id: "check-free-space",
        label: "Check free space on both volumes",
        kind: "inspect",
        tool: "storage",
        appliesWhen: { type: "stateEquals", path: "disk.eventsRead", value: true },
        patch: { disk: { spaceChecked: true } },
        feedback:
          "C: at 75% (118 GB free), D: at 33% (1.2 TB free) - neither volume is under capacity pressure.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Fullness produces errors and freezes too - measuring it closes the capacity class so the retries must come from somewhere else.",
          evidenceGain: "Both volumes have room - disk-full hypothesis ruled out.",
        },
        matchHints: ["free space", "check capacity", "disk usage"],
        isDiagnostic: true,
      },
      {
        id: "run-smart-check",
        label: "Check the disk's SMART health data",
        kind: "inspect",
        tool: "storage",
        appliesWhen: { type: "stateEquals", path: "disk.spaceChecked", value: true },
        patch: { disk: { smartChecked: true } },
        feedback:
          "Harddisk1: Reallocated_Sector_Ct 412 (threshold 36), Current_Pending_Sector 12, self-test result: failing since Sep 27 - predictive failure.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The disk's own counters turn retried I/O into a measured condition - reallocating sectors past threshold is the device saying it is running out of good surface.",
          evidenceGain: "SMART reports predictive failure on Harddisk1 - device fault confirmed.",
        },
        matchHints: ["smart", "health data", "disk health"],
        isDiagnostic: true,
      },
      {
        id: "migrate-volume",
        label: "Migrate the volume to the spare disk",
        kind: "ui",
        tool: "storage",
        appliesWhen: { type: "stateEquals", path: "disk.smartChecked", value: true },
        patch: { disk: { migrationStarted: true } },
        feedback: "Volume D: is mirroring to the spare disk - 612 GB copied with reads still succeeding.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Predictive failure has no configuration fix - moving the data while the disk still reads is the only change that acts before the device stops on its own.",
          evidenceGain: "Data path moved off the failing device.",
        },
        matchHints: ["migrate volume", "move to spare", "copy to spare disk"],
        isFix: true,
      },
      {
        id: "verify-volume",
        label: "Verify the migrated volume and clear the alerts",
        kind: "ui",
        tool: "storage",
        appliesWhen: { type: "stateEquals", path: "disk.migrationStarted", value: true },
        patch: {
          disk: { verified: true },
          logs: [
            "2026-09-27 03:14:52 WARN  disk 153 The I/O operation at logical block address 0x4a1f00 on \\Device\\Harddisk1 was retried",
            "2026-09-28 09:41:07 WARN  disk 129 Reset to device, \\Device\\RaidPort1, was issued",
            "2026-09-29 06:22:31 WARN  disk 153 The I/O operation on \\Device\\Harddisk1 was retried (118 retries logged today)",
            "2026-09-29 06:22:34 INFO  Storage Service: volume D: healthy - 1.2 TB free of 1.8 TB",
            "2026-09-30 06:40:12 INFO  Storage Service: volume D: running on spare disk; no disk 153 or 129 entries for 24 hours",
          ],
        },
        feedback:
          "D: runs on the spare disk and the event log shows no disk 153 or 129 entries for 24 hours.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is three days of retries, so a full quiet day on the same log that recorded them proves the device story actually ended.",
          evidenceGain: "No retried I/O for 24 hours - symptom cleared.",
        },
        matchHints: ["verify volume", "confirm migration", "clear alerts"],
        isFix: true,
      },
      {
        id: "run-disk-cleanup-wrong",
        label: "Run disk cleanup on the data disk",
        kind: "ui",
        tool: "storage",
        feedback:
          "D: has 1.2 TB free - cleanup would delete files that are not the problem while the disk keeps retrying I/O.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Capacity is measured healthy, and no amount of free space repairs sectors the device is physically failing to read.",
        },
        matchHints: ["disk cleanup", "free up space", "clean the disk"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "disk.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "disk.verified", value: true },
      { type: "stateEquals", path: "disk.migrationStarted", value: true },
      { type: "stateEquals", path: "disk.smartChecked", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["run-disk-cleanup-wrong"],
        },
        feedback: "The disk has plenty of space - the retries come from failing media, not fullness.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Three days of retried I/O on one device - start with what the event log says the disk is doing.",
      },
      {
        level: 2,
        text: "Both volumes have plenty of room, so the failure class is not capacity - ask the device itself how it feels.",
      },
      {
        level: 3,
        text: "Predictive failure means the data has to move while the disk still reads, then the same log has to go quiet before you call it solved.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Harddisk1 was reporting predictive failure - hundreds of reallocated sectors past threshold and twelve pending - so the OS retried and reset I/O for three days while capacity stayed healthy.",
      whyItWorked:
        "The event log fixed the timeline on one device, the capacity check closed the disk-full class, and the SMART counters converted retries into a measured condition; migrating the volume acted before the device stopped on its own. Transferable principle: 'disk errors' beside healthy free space is a device-health question, not a capacity one - read the disk's own counters and move the data before it decides for you.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Disk 153/129 events with timeline, free space on both volumes, SMART counters.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Full-volume and loose-cable hypotheses dropped - 1.2 TB free, one device consistently retried, self-test failing.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Migrated the volume to the spare disk while reads still succeeded.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The same event log stayed quiet for 24 hours after migration.",
        },
      ],
      followUps: [
        "Schedule a weekly SMART export for every volume so predictive counters alert before users notice freezes.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "disk-space-slow-pc", "troubleshooting-method"],
    references: [],
  },
  {
    id: "sysadmin-clock-drift",
    version: 1,
    title: "Logins rejected with a time difference error",
    category: "sysadmin",
    difficulty: "foundational",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read Windows Time service events alongside the failures they explain",
      "Measure a clock against a trusted source instead of another suspect machine",
      "Repair sync configuration and verify with a logon and a scheduled job",
    ],
    prerequisites: [],
    skills: ["event-logs", "windows", "troubleshooting-method"],
    ticket: {
      id: "HD-1077",
      user: "Hannah Martin",
      role: "Accounts payable clerk",
      symptomPlainLanguage:
        "Domain logins fail this morning with a message about the time difference between the client and the server, and last night's jobs logged at the wrong hours.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "Yesterday's scheduled job entries show timestamps about two hours off from the wall clock.",
    },
    environment: {
      kind: "windows-panel",
      shell: "windows",
      availableTools: ["event-viewer", "terminal"],
      enabledCommands: ["systeminfo", "help"],
      components: ["event-viewer"],
      showInspector: true,
      initialWorld: {
        currentUser: "hmartin",
        time: {
          localClock: "2026-09-29 06:00:15",
          sourceClock: "2026-09-29 04:00:15",
          eventsRead: false,
          clockCompared: false,
          configRead: false,
          synced: false,
          verified: false,
        },
        logs: [
          "2026-09-28 22:05:31 WARN  Microsoft-Windows-Time-Service 36 The time service has not synchronized since the last restart and is using the local hardware clock",
          "2026-09-29 06:00:12 ERROR Kerberos KRB_AP_ERR_SKEW client clock ahead of KDC by 7200 seconds",
          "2026-09-29 06:00:13 WARN  NETLOGON Domain logon rejected for hmartin: clock skew too great",
          "2026-09-29 06:00:15 INFO  TaskScheduler hourly job HJ-12 logged at 06:00 although scheduled for 04:00",
        ],
      },
    },
    hypotheses: [
      { id: "h-kdc", label: "Domain controller rejecting logons", initiallyPlausible: true },
      { id: "h-clock", label: "This machine's clock drifted", initiallyPlausible: true },
      { id: "h-lockout", label: "Account lockout after repeated failures", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Treat a time complaint as a measurement problem: read what the log records, compare against a trusted source, then repair the sync itself.",
      steps: [
        {
          id: "guide-events",
          title: "Read the time service events",
          explanation:
            "Open the Event Viewer tab and read the time, Kerberos and scheduler entries from the last day.",
          why:
            "One machine's clock is measured twice here - by Kerberos and by the scheduler - so the same number appears in both failures.",
          expectedObservation:
            "Event 36 shows the time service never synced, Kerberos reports a 7200-second skew, and job HJ-12 logged two hours late.",
          target: { componentId: "event-viewer", label: "Event Viewer tab" },
          actionId: "read-time-events",
          conceptId: "windows-event-logs",
          fallback: "the Event Viewer tab in the Windows workstation panel",
        },
        {
          id: "guide-compare",
          title: "Compare this clock with the time source",
          explanation:
            "From the Checks list, run the clock comparison against the internal time source.",
          why:
            "Comparing against a second suspect machine proves nothing - a trusted source turns a complaint into a measured offset.",
          expectedObservation:
            "Local clock reads 2026-09-29 06:00:15 while the time source reads 2026-09-29 04:00:15 - this machine is 2 hours ahead.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "compare-clock",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-config",
          title: "Read the Windows Time service configuration",
          explanation:
            "From the Checks list, run the time service configuration check.",
          why:
            "The offset explains the symptoms; the configuration explains the offset - a service that never runs cannot correct drift on its own.",
          expectedObservation:
            "Startup type is Manual with no NTP peer configured, so the machine has lived on its hardware clock since boot.",
          target: {
            componentId: "event-viewer",
            label: "Checks list in the Windows workstation panel",
          },
          actionId: "read-time-service",
          conceptId: "troubleshooting-method",
          fallback: "the Checks list at the bottom of the Windows workstation panel",
        },
        {
          id: "guide-resync",
          title: "Resync against the internal time source",
          explanation:
            "From Actions, run Resync the clock against the internal time source.",
          why:
            "Correcting the clock is the change both symptoms share - logon validation and job timestamps are judged against the same local time.",
          expectedObservation:
            "Windows Time reports a successful sync with time.corp.local and a skew of 0.4 seconds.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (clock resynced)" },
          actionId: "resync-clock",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify",
          title: "Prove logins and jobs land on time",
          explanation:
            "From Actions, run Verify logins after the sync.",
          why:
            "The ticket is rejected logons and late job entries, so one successful logon plus one on-time job entry is the honest proof.",
          expectedObservation:
            "A fresh domain logon for hmartin succeeds and hourly job HJ-12 logs on schedule.",
          target: { componentId: "event-viewer", label: "Event Viewer tab (logins succeed)" },
          actionId: "verify-logins",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-time-events",
        label: "Read the time service events",
        kind: "inspect",
        tool: "event-viewer",
        patch: { time: { eventsRead: true } },
        feedback:
          "Event 36: the time service never synchronized; Kerberos reports a 7200-second skew; job HJ-12 logged at 06:00 instead of 04:00.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The same 7200-second offset appears in three independent logs - one clock explains rejected logons and late jobs together.",
          evidenceGain: "Skew of 7200 seconds confirmed since Sep 28 across Kerberos and the scheduler.",
        },
        matchHints: ["time service events", "read the events", "event 36"],
        isDiagnostic: true,
      },
      {
        id: "compare-clock",
        label: "Compare this clock with the time source",
        kind: "inspect",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "time.eventsRead", value: true },
        patch: { time: { clockCompared: true } },
        feedback:
          "Local clock 2026-09-29 06:00:15 vs internal time source 2026-09-29 04:00:15 - this machine is 2h 0m ahead.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A trusted source converts the complaint into a measured offset and shows which side is wrong - this machine, not the domain controller.",
          evidenceGain: "This workstation is 2 hours ahead of the trusted time source.",
        },
        matchHints: ["compare clock", "check the time", "time difference"],
        isDiagnostic: true,
      },
      {
        id: "read-time-service",
        label: "Read the Windows Time service configuration",
        kind: "inspect",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "time.clockCompared", value: true },
        patch: { time: { configRead: true } },
        feedback:
          "Windows Time startup type: Manual; no NTP peer configured - the machine has been on its hardware clock since the last boot.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The offset is the symptom; a service that never starts and has no peer to ask is why the drift accumulated unchecked.",
          evidenceGain: "Sync service disabled and unconfigured - drift has no correction path.",
        },
        matchHints: ["time service configuration", "w32time config", "read the service config"],
        isDiagnostic: true,
      },
      {
        id: "resync-clock",
        label: "Resync the clock against the internal time source",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "time.configRead", value: true },
        patch: {
          time: { synced: true, localClock: "2026-09-29 06:05:40" },
          logs: [
            "2026-09-28 22:05:31 WARN  Microsoft-Windows-Time-Service 36 The time service has not synchronized since the last restart and is using the local hardware clock",
            "2026-09-29 06:00:12 ERROR Kerberos KRB_AP_ERR_SKEW client clock ahead of KDC by 7200 seconds",
            "2026-09-29 06:00:13 WARN  NETLOGON Domain logon rejected for hmartin: clock skew too great",
            "2026-09-29 06:00:15 INFO  TaskScheduler hourly job HJ-12 logged at 06:00 although scheduled for 04:00",
            "2026-09-29 06:05:40 INFO  Microsoft-Windows-Time-Service 37 The time service has synchronized with time.corp.local (skew 0.4s)",
          ],
        },
        feedback:
          "Windows Time synced with time.corp.local - local clock now 2026-09-29 06:05:40 with a 0.4 second skew.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Both failures judge against this machine's local time, so correcting the clock is the single change that fixes logons and timestamps at once.",
          evidenceGain: "Clock aligned to the trusted source - skew under one second.",
        },
        matchHints: ["resync the clock", "sync with time source", "resync"],
        isFix: true,
      },
      {
        id: "verify-logins",
        label: "Verify logins after the sync",
        kind: "ui",
        tool: "event-viewer",
        appliesWhen: { type: "stateEquals", path: "time.synced", value: true },
        patch: {
          time: { verified: true },
          logs: [
            "2026-09-28 22:05:31 WARN  Microsoft-Windows-Time-Service 36 The time service has not synchronized since the last restart and is using the local hardware clock",
            "2026-09-29 06:00:12 ERROR Kerberos KRB_AP_ERR_SKEW client clock ahead of KDC by 7200 seconds",
            "2026-09-29 06:00:13 WARN  NETLOGON Domain logon rejected for hmartin: clock skew too great",
            "2026-09-29 06:00:15 INFO  TaskScheduler hourly job HJ-12 logged at 06:00 although scheduled for 04:00",
            "2026-09-29 06:05:40 INFO  Microsoft-Windows-Time-Service 37 The time service has synchronized with time.corp.local (skew 0.4s)",
            "2026-09-29 06:06:02 INFO  NETLOGON Domain logon accepted for hmartin (clock skew 0.4s)",
            "2026-09-29 07:00:01 INFO  TaskScheduler hourly job HJ-12 logged on time",
          ],
        },
        feedback:
          "A fresh domain logon for hmartin succeeds and hourly job HJ-12 logs on schedule.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is rejected logons and late jobs - proving both on the same log is the only honest end state.",
          evidenceGain: "Logon accepted and job entry on time - reported symptoms cleared.",
        },
        matchHints: ["verify logins", "test a logon", "confirm logins"],
        isFix: true,
      },
      {
        id: "restart-workstations-wrong",
        label: "Restart the workstations",
        kind: "ui",
        feedback:
          "A reboot re-reads the same hardware clock - the machine comes back two hours ahead and logons fail again.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Restarting changes no configuration; the service still never syncs, so the drift returns on the next boot.",
        },
        matchHints: ["restart workstations", "reboot the pc", "restart the machines"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "time.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "time.verified", value: true },
      { type: "stateEquals", path: "time.synced", value: true },
      { type: "stateEquals", path: "time.clockCompared", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["restart-workstations-wrong"] },
        feedback: "The machine boots with the same drifted clock - nothing in the restart corrects it.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Logins fail and jobs log late with the same offset - start with what the event log records about time.",
      },
      {
        level: 2,
        text: "Measure this machine against a trusted source rather than against another machine that might be wrong too.",
      },
      {
        level: 3,
        text: "One wrong clock explains both symptoms: repair the path that keeps it corrected, then prove a logon and a job both land on time.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The workstation's hardware clock had drifted two hours ahead while the Windows Time service sat in Manual start with no NTP peer, so Kerberos rejected logons with KRB_AP_ERR_SKEW and the scheduler stamped jobs late.",
      whyItWorked:
        "The event log showed the same 7200-second offset in three independent places, the comparison against a trusted source named this machine as the wrong side, and the configuration check explained why nothing corrected it; resyncing fixed both symptoms with one change. Transferable principle: a 'time difference' error between two machines is a measurement problem - compare against a trusted source before blaming either service, because one wrong clock explains every downstream timestamp.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Time service, Kerberos and scheduler entries plus a measured 2-hour offset against the time source.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Domain controller and lockout hypotheses dropped - the trusted source agrees with the KDC, and this machine is the outlier.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Resynced the clock against the internal time source.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Domain logon accepted and the hourly job logged on schedule.",
        },
      ],
      followUps: [
        "Set the Windows Time service to Automatic with the internal NTP peer on every domain workstation so drift corrects itself.",
      ],
    },
    knowledgeLinks: ["windows-event-logs", "troubleshooting-method"],
    references: [],
  },
  {
    id: "sysadmin-cert-expired",
    version: 1,
    title: "Browser blocks intranet page with a privacy error",
    category: "sysadmin",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Follow a browser privacy warning back to the server's own log",
      "Read validity dates off the served certificate instead of guessing",
      "Renew the certificate and reload the service that serves it",
    ],
    prerequisites: [],
    skills: ["systemd", "linux", "troubleshooting-method"],
    ticket: {
      id: "HD-1078",
      user: "Priya Raman",
      role: "HR communications",
      symptomPlainLanguage:
        "The intranet careers page shows a privacy error in the browser - people click through it and we would rather fix it properly.",
      priority: "medium",
      channel: "email",
      additionalContext:
        "Only this site warns; the main company site and the email portal are fine.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["journalctl", "cat", "grep", "ls", "systemctl", "help", "ps"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "nginx",
            name: "nginx",
            status: "active (running)",
            description: "The nginx web server",
          },
        ],
        logs: [
          "Sep 29 07:41:19 web01 systemd[1]: Started The nginx web server.",
          "Sep 29 07:41:22 web01 nginx[1204]: [error] SSL certificate problem: certificate has expired (/etc/letsencrypt/live/intranet.corp.local/fullchain.pem), client: 192.168.1.50",
          "Sep 29 07:41:24 web01 nginx[1204]: 192.168.1.50 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
          "Sep 29 07:41:31 web01 nginx[1204]: 192.168.1.51 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
        ],
        cert: {
          path: "/etc/letsencrypt/live/intranet.corp.local/fullchain.pem",
          subject: "CN=intranet.corp.local",
          issuer: "CN=R3, O=Let's Encrypt",
          notBefore: "Jun 30 00:00:00 2026 GMT",
          notAfter: "Sep 28 23:59:59 2026 GMT",
          logRead: false,
          inspected: false,
          datesChecked: false,
          renewed: false,
          verified: false,
        },
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
                    "conf.d": {
                      type: "dir",
                      name: "conf.d",
                      children: {
                        "intranet.conf": {
                          type: "file",
                          name: "intranet.conf",
                          mode: "0644",
                          content:
                            "server {\n  listen 443 ssl;\n  server_name intranet.corp.local;\n  ssl_certificate /etc/letsencrypt/live/intranet.corp.local/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/intranet.corp.local/privkey.pem;\n  root /var/www/intranet;\n}\n",
                        },
                      },
                    },
                  },
                },
                letsencrypt: {
                  type: "dir",
                  name: "letsencrypt",
                  children: {
                    live: {
                      type: "dir",
                      name: "live",
                      children: {
                        "intranet.corp.local": {
                          type: "dir",
                          name: "intranet.corp.local",
                          children: {
                            "fullchain.pem": {
                              type: "file",
                              name: "fullchain.pem",
                              mode: "0644",
                              content:
                                "-----BEGIN CERTIFICATE-----\nsubject=CN=intranet.corp.local\nissuer=CN=R3, O=Let's Encrypt\nnotBefore=Jun 30 00:00:00 2026 GMT\nnotAfter=Sep 28 23:59:59 2026 GMT\n-----END CERTIFICATE-----\n",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    hypotheses: [
      { id: "h-config", label: "nginx serving the wrong certificate", initiallyPlausible: true },
      { id: "h-chain", label: "Incomplete certificate chain", initiallyPlausible: true },
      { id: "h-expired", label: "Certificate expired", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Work outward from the browser's complaint to the server's own words: what the log says, what the certificate says, then renew what the certificate says.",
      steps: [
        {
          id: "guide-log",
          title: "Read what the web server reports",
          explanation:
            "Open the Checks list and run the web server log check for the intranet vhost.",
          why:
            "The browser only reports that validation failed; the server log names the file and the exact reason the handshake was refused.",
          expectedObservation:
            "nginx logs SSL certificate problem: certificate has expired for /etc/letsencrypt/live/intranet.corp.local/fullchain.pem, and answers the clients with HTTP 495.",
          target: {
            componentId: "filesystem",
            label: "Checks list in the Linux workstation panel",
          },
          actionId: "read-web-log",
          conceptId: "systemd-service-basics",
          fallback: "the Checks list at the bottom of the Linux workstation panel",
        },
        {
          id: "guide-cert",
          title: "Inspect the certificate file itself",
          explanation:
            "Select /etc/letsencrypt/live/intranet.corp.local/fullchain.pem in the Filesystem tab and run the certificate inspection.",
          why:
            "Subject, issuer and validity dates come from the served file - reading them separates an expired certificate from a misconfigured or incomplete one.",
          expectedObservation:
            "Subject matches intranet.corp.local and issuer is R3, but the validity window ends Sep 28 23:59:59 2026 GMT.",
          target: { componentId: "filesystem", label: "Filesystem tab (fullchain.pem)" },
          actionId: "inspect-certificate",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-dates",
          title: "Validate the dates against now",
          explanation: "From the Checks list, run the certificate date validation.",
          why:
            "Hostname and chain were never in question - measuring the validity window against the current time turns a suspicion into a fact.",
          expectedObservation:
            "notAfter Sep 28 23:59 UTC versus now Sep 29 07:41 UTC - expired 7 hours 42 minutes ago, chain and hostname fine.",
          target: {
            componentId: "filesystem",
            label: "Checks list in the Linux workstation panel",
          },
          actionId: "check-validity",
          conceptId: "troubleshooting-method",
          fallback: "the Checks list at the bottom of the Linux workstation panel",
        },
        {
          id: "guide-renew",
          title: "Renew the certificate",
          explanation: "From Actions, run Renew the certificate for the intranet host.",
          why:
            "An expired validity window is repaired by issuing a new certificate - no service setting, port or file mode changes with it.",
          expectedObservation:
            "A fresh certificate for intranet.corp.local is issued and valid to Sep 27 2027.",
          target: { componentId: "terminal", label: "Terminal - renew the certificate" },
          actionId: "renew-certificate",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-reload",
          title: "Reload nginx and prove the page loads",
          explanation:
            "From Actions, run Reload nginx with the new chain and open the page.",
          why:
            "nginx keeps the old certificate in memory until it reloads, so the renewal is not finished until a fresh handshake succeeds.",
          expectedObservation:
            "nginx reloads and the intranet page answers HTTP 200 with no privacy warning.",
          target: { componentId: "service-manager", label: "Services tab (nginx reloaded)" },
          actionId: "reload-nginx-verify",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-web-log",
        label: "Read the web server log entries",
        kind: "inspect",
        tool: "terminal",
        patch: { cert: { logRead: true } },
        feedback:
          "nginx reports SSL certificate problem: certificate has expired on /etc/letsencrypt/live/intranet.corp.local/fullchain.pem and answers clients with HTTP 495.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The server names the failing file and the exact refusal reason - it converts a vague browser warning into a specific object to inspect.",
          evidenceGain: "Server names the certificate file and the expired-certificate refusal.",
        },
        matchHints: ["web server logs", "journalctl", "read the logs", "nginx log"],
        isDiagnostic: true,
      },
      {
        id: "inspect-certificate",
        label: "Inspect the served certificate",
        kind: "inspect",
        tool: "filesystem",
        inspectTarget: "/etc/letsencrypt/live/intranet.corp.local/fullchain.pem",
        appliesWhen: { type: "stateEquals", path: "cert.logRead", value: true },
        patch: { cert: { inspected: true } },
        feedback:
          "Subject CN=intranet.corp.local matches this host, issuer is R3 - only the validity window (notAfter Sep 28 23:59:59 2026 GMT) is over.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Subject and issuer rule out the wrong-certificate and chain hypotheses, leaving the validity window as the only open question.",
          evidenceGain: "Correct subject and issuer, validity window ended Sep 28.",
        },
        matchHints: ["inspect certificate", "certificate details", "read the certificate"],
        isDiagnostic: true,
      },
      {
        id: "check-validity",
        label: "Validate the certificate dates",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "cert.inspected", value: true },
        patch: { cert: { datesChecked: true } },
        feedback:
          "now: Sep 29 07:41 UTC vs notAfter: Sep 28 23:59 UTC - expired 7h 42m ago; chain and hostname validate fine.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Measuring the window against the current time is the difference between 'the certificate looks old' and 'the certificate has expired'.",
          evidenceGain: "Certificate expired 7h 42m ago - suspicion confirmed by measurement.",
        },
        matchHints: ["check validity", "certificate dates", "expiry check"],
        isDiagnostic: true,
      },
      {
        id: "renew-certificate",
        label: "Renew the certificate for the intranet host",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "cert.datesChecked", value: true },
        patch: {
          cert: { renewed: true, notBefore: "Sep 29 07:44:51 2026 GMT", notAfter: "Sep 27 07:44:51 2027 GMT" },
          logs: [
            "Sep 29 07:41:19 web01 systemd[1]: Started The nginx web server.",
            "Sep 29 07:41:22 web01 nginx[1204]: [error] SSL certificate problem: certificate has expired (/etc/letsencrypt/live/intranet.corp.local/fullchain.pem), client: 192.168.1.50",
            "Sep 29 07:41:24 web01 nginx[1204]: 192.168.1.50 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
            "Sep 29 07:41:31 web01 nginx[1204]: 192.168.1.51 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
            "Sep 29 07:44:51 web01 certbot[1450]: Successfully renewed certificate for intranet.corp.local (valid to Sep 27 2027)",
          ],
        },
        feedback:
          "A fresh certificate for intranet.corp.local was issued and is valid to Sep 27 2027.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An expired validity window can only be repaired by issuing a new certificate for the same name - the renewal targets exactly the object that failed.",
          evidenceGain: "New certificate issued for the affected name.",
        },
        matchHints: ["renew the certificate", "renew cert", "issue a new certificate"],
        isFix: true,
      },
      {
        id: "reload-nginx-verify",
        label: "Reload nginx with the new chain",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "cert.renewed", value: true },
        patch: {
          cert: { verified: true },
          logs: [
            "Sep 29 07:41:19 web01 systemd[1]: Started The nginx web server.",
            "Sep 29 07:41:22 web01 nginx[1204]: [error] SSL certificate problem: certificate has expired (/etc/letsencrypt/live/intranet.corp.local/fullchain.pem), client: 192.168.1.50",
            "Sep 29 07:41:24 web01 nginx[1204]: 192.168.1.50 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
            "Sep 29 07:41:31 web01 nginx[1204]: 192.168.1.51 - - \"GET /intranet/ HTTP/1.1\" 495 166 \"-\" \"Mozilla/5.0\"",
            "Sep 29 07:44:51 web01 certbot[1450]: Successfully renewed certificate for intranet.corp.local (valid to Sep 27 2027)",
            "Sep 29 07:45:10 web01 systemd[1]: Reloading The nginx web server.",
            "Sep 29 07:45:20 web01 nginx[1204]: 192.168.1.50 - - \"GET /intranet/ HTTP/1.1\" 200 4821 \"-\" \"Mozilla/5.0\"",
          ],
        },
        feedback:
          "nginx is serving the renewed chain - the intranet page answers HTTP 200 with no privacy warning.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The running worker still holds the old certificate in memory, so a reload plus a clean request is what proves the fix reached clients.",
          evidenceGain: "Fresh handshake succeeds - reported symptom cleared.",
        },
        matchHints: ["reload nginx", "reload the service", "restart nginx with the new chain"],
        isFix: true,
      },
      {
        id: "open-port-443-wrong",
        label: "Open port 443 for the intranet",
        kind: "ui",
        feedback:
          "Port 443 already accepts connections - the handshake completes and the client rejects the dates; opening ports changes nothing inside the certificate.",
        evaluation: {
          grade: "wrong",
          rationale:
            "The connection succeeds and validation fails afterward, so reachability was never the broken part of this exchange.",
        },
        matchHints: ["open port 443", "firewall rule", "allow 443"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "cert.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "cert.verified", value: true },
      { type: "stateEquals", path: "cert.renewed", value: true },
      { type: "stateEquals", path: "cert.datesChecked", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["open-port-443-wrong"] },
        feedback: "Clients already reach the server - the certificate they receive is what they reject.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The browser only knows validation failed - ask the server what it was serving when clients were turned away.",
      },
      {
        level: 2,
        text: "Subject, issuer and validity dates all live in the served file itself; read them before deciding what broke.",
      },
      {
        level: 3,
        text: "When the validity window is the only thing wrong, issue a new certificate for that name and make the running service load it - then confirm a clean request.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The certificate for intranet.corp.local expired on Sep 28 23:59:59 UTC; nginx kept serving it, so every browser refused the handshake with a privacy error.",
      whyItWorked:
        "The server log named the exact file and refusal reason, the certificate inspection ruled out wrong subject and issuer, and the date check measured the window against the current time; renewing and reloading fixed the one layer that was actually broken. Transferable principle: a browser privacy warning is a verdict, not a diagnosis - go to the server's log, read the served certificate's own dates, and fix only the layer the evidence indicts.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "nginx log refusal with the certificate path, served certificate subject/issuer/dates, measured expiry.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Wrong-certificate, chain and reachability hypotheses dropped - subject and issuer match and port 443 answers.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Renewed the certificate and reloaded nginx so it serves the new chain.",
        },
        {
          step: "Verify",
          whatLearnerDid: "A fresh request returns HTTP 200 with no privacy warning.",
        },
      ],
      followUps: [
        "Re-enable the renewal timer and alert on certificates approaching expiry so clients never see the warning again.",
      ],
    },
    knowledgeLinks: ["systemd-service-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "sysadmin-change-regression",
    version: 1,
    title: "Large print jobs stuck in the queue",
    category: "sysadmin",
    difficulty: "advanced",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: [
      "Tie a partial failure back to the change that introduced it",
      "Diff live configuration against the backup the change record names",
      "Restore values and reload the service that reads them",
    ],
    prerequisites: ["service-dependency"],
    skills: ["printing", "systemd", "troubleshooting-method"],
    ticket: {
      id: "HD-1079",
      user: "Dana Whitfield",
      role: "Sales operations",
      symptomPlainLanguage:
        "Since Tuesday's maintenance, big files sit in the print queue forever while small documents print normally.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "Nothing was changed on the printer itself; the maintenance rolled out a queue policy to the print server.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "services"],
      enabledCommands: ["journalctl", "cat", "grep", "ls", "systemctl", "help"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "cups",
            name: "cups",
            status: "active (running)",
            description: "Common UNIX Printing System",
          },
        ],
        logs: [
          "Sep 24 18:40:33 prn01 config[702]: CHG-2291 applied - default queue policy rolled out to print01 (backout: restore /etc/cups/print01-policy.conf.bak)",
          "Sep 25 09:02:11 prn01 cupsd[812]: [Job 4471] rejected: document is 9.8 MB, exceeds MaxJobSize 10 MB",
          "Sep 26 14:20:47 prn01 cupsd[812]: [Job 4513] rejected: document is 42 MB, exceeds MaxJobSize 10 MB",
          "Sep 29 08:12:03 prn01 cupsd[812]: [Job 4588] completed: 1.4 MB printed normally",
        ],
        print: {
          changeRead: false,
          queueChecked: false,
          diffRead: false,
          restored: false,
          verified: false,
        },
        fs: {
          type: "dir",
          name: "/",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              children: {
                cups: {
                  type: "dir",
                  name: "cups",
                  children: {
                    "print01-policy.conf": {
                      type: "file",
                      name: "print01-policy.conf",
                      mode: "0644",
                      content: "DefaultQueue sales-printer\nMaxJobSize 10M\nMaxJobQueue 100\n",
                    },
                    "print01-policy.conf.bak": {
                      type: "file",
                      name: "print01-policy.conf.bak",
                      mode: "0644",
                      content: "DefaultQueue sales-printer\nMaxJobSize 100M\nMaxJobQueue 500\n",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    hypotheses: [
      { id: "h-jam", label: "Physical jam or out of toner", initiallyPlausible: true },
      { id: "h-driver", label: "Broken client print driver", initiallyPlausible: true },
      { id: "h-policy", label: "Queue policy regression from the change", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "A partial failure that begins with a maintenance window is a comparison problem: what changed, what the queue is doing now, and what the backup says the values used to be.",
      steps: [
        {
          id: "guide-change",
          title: "Read the maintenance change record",
          explanation:
            "Open the Checks list and run the change record check for CHG-2291.",
          why:
            "The change record is the only witness that knows what was altered and how to put it back - it names both the rollout and its backout.",
          expectedObservation:
            "CHG-2291 rolled out the default queue policy on Sep 24 with backout listed as restoring /etc/cups/print01-policy.conf.bak.",
          target: {
            componentId: "filesystem",
            label: "Checks list in the Linux workstation panel",
          },
          actionId: "read-change-record",
          conceptId: "troubleshooting-method",
          fallback: "the Checks list at the bottom of the Linux workstation panel",
        },
        {
          id: "guide-queue",
          title: "Check what the queue is actually rejecting",
          explanation: "From the Checks list, run the queue state check.",
          why:
            "Size correlates with failure while small jobs pass - describing the pattern precisely separates policy from hardware and driver faults.",
          expectedObservation:
            "The cups queue is healthy; every rejected job since Sep 25 exceeds 10 MB while smaller jobs complete normally.",
          target: {
            componentId: "filesystem",
            label: "Checks list in the Linux workstation panel",
          },
          actionId: "check-queue",
          fallback: "the Checks list at the bottom of the Linux workstation panel",
        },
        {
          id: "guide-diff",
          title: "Diff the live policy against the backup",
          explanation:
            "From the Checks list, run the policy diff against the backup copy the change record named.",
          why:
            "The change record says what was deployed; the backup says what the values were - only the diff between them shows exactly what regressed.",
          expectedObservation:
            "-MaxJobSize 100M / +MaxJobSize 10M and -MaxJobQueue 500 / +MaxJobQueue 100 are the only differing lines.",
          target: { componentId: "filesystem", label: "Filesystem tab (policy diff)" },
          actionId: "diff-config",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-restore",
          title: "Restore the pre-change values",
          explanation:
            "From Actions, run Restore the previous policy values.",
          why:
            "The evidence indicts two lowered values, so the corrective change restores exactly those values - not a re-rollout of the same policy.",
          expectedObservation:
            "print01-policy.conf carries MaxJobSize 100M and MaxJobQueue 500 again.",
          target: { componentId: "filesystem", label: "Filesystem tab (policy restored)" },
          actionId: "restore-policy",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-reload",
          title: "Reload and reprint the failing document",
          explanation:
            "From Actions, run Reload the printing service and reprint a failed document.",
          why:
            "cups reads the policy at load time, and the ticket is about jobs that fail - so a reloaded service printing a previously rejected document is the honest proof.",
          expectedObservation:
            "cups reloads the restored policy and a 42 MB job prints successfully.",
          target: { componentId: "service-manager", label: "Services tab (cups reloaded)" },
          actionId: "reload-and-reprint",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "read-change-record",
        label: "Read the CHG-2291 change record",
        kind: "inspect",
        tool: "terminal",
        patch: { print: { changeRead: true } },
        feedback:
          "CHG-2291 (Sep 24 18:40) rolled out the default queue policy to print01; backout is listed as restoring /etc/cups/print01-policy.conf.bak.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The change record is the only artifact that states what was altered and where the pre-change values were kept - it frames every later comparison.",
          evidenceGain: "Change window and backup location identified for the rolled-out policy.",
        },
        matchHints: ["change record", "chg-2291", "read the change"],
        isDiagnostic: true,
      },
      {
        id: "check-queue",
        label: "Check the queue state and rejections",
        kind: "inspect",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "print.changeRead", value: true },
        patch: { print: { queueChecked: true } },
        feedback:
          "cups queue is running; four jobs rejected since Sep 25, every one over 10 MB, while jobs under the limit complete normally.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Failure tracks document size, not the printer - a clean size threshold points at policy rather than jam, toner or driver faults.",
          evidenceGain: "Rejections correlate exactly with document size - hardware and driver hypotheses weakened.",
        },
        matchHints: ["check the queue", "queue state", "rejected jobs"],
        isDiagnostic: true,
      },
      {
        id: "diff-config",
        label: "Diff the live policy against the backup",
        kind: "inspect",
        tool: "filesystem",
        inspectTarget: "/etc/cups/print01-policy.conf",
        appliesWhen: { type: "stateEquals", path: "print.queueChecked", value: true },
        patch: { print: { diffRead: true } },
        feedback:
          "-MaxJobSize 100M / +MaxJobSize 10M and -MaxJobQueue 500 / +MaxJobQueue 100 - the only lines the rollout changed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The diff converts 'something changed Tuesday' into two named values lowered by CHG-2291 - the exact regression and its previous state.",
          evidenceGain: "MaxJobSize lowered 100M to 10M by the rollout - regression located.",
        },
        matchHints: ["diff the policy", "compare with backup", "diff the config"],
        isDiagnostic: true,
      },
      {
        id: "restore-policy",
        label: "Restore the previous policy values",
        kind: "ui",
        tool: "filesystem",
        appliesWhen: { type: "stateEquals", path: "print.diffRead", value: true },
        patch: {
          print: { restored: true },
          fs: {
            type: "dir",
            name: "/",
            children: {
              etc: {
                type: "dir",
                name: "etc",
                children: {
                  cups: {
                    type: "dir",
                    name: "cups",
                    children: {
                      "print01-policy.conf": {
                        type: "file",
                        name: "print01-policy.conf",
                        mode: "0644",
                        content: "DefaultQueue sales-printer\nMaxJobSize 100M\nMaxJobQueue 500\n",
                      },
                      "print01-policy.conf.bak": {
                        type: "file",
                        name: "print01-policy.conf.bak",
                        mode: "0644",
                        content: "DefaultQueue sales-printer\nMaxJobSize 100M\nMaxJobQueue 500\n",
                      },
                    },
                  },
                },
              },
            },
          },
          logs: [
            "Sep 24 18:40:33 prn01 config[702]: CHG-2291 applied - default queue policy rolled out to print01 (backout: restore /etc/cups/print01-policy.conf.bak)",
            "Sep 25 09:02:11 prn01 cupsd[812]: [Job 4471] rejected: document is 9.8 MB, exceeds MaxJobSize 10 MB",
            "Sep 26 14:20:47 prn01 cupsd[812]: [Job 4513] rejected: document is 42 MB, exceeds MaxJobSize 10 MB",
            "Sep 29 08:12:03 prn01 cupsd[812]: [Job 4588] completed: 1.4 MB printed normally",
            "Sep 29 09:03:14 prn01 config[702]: print01-policy.conf restored from backup - MaxJobSize 100M, MaxJobQueue 500",
          ],
        },
        feedback:
          "print01-policy.conf carries MaxJobSize 100M and MaxJobQueue 500 - the pre-change values - with the queue policy otherwise unchanged.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The diff named two lowered values; restoring exactly those values reverses the regression without re-rolling a policy nobody validated.",
          evidenceGain: "Pre-change limits restored in the live policy file.",
        },
        matchHints: ["restore the policy", "apply the backout", "restore previous values"],
        isFix: true,
      },
      {
        id: "reload-and-reprint",
        label: "Reload the printing service and reprint",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "print.restored", value: true },
        patch: {
          print: { verified: true },
          logs: [
            "Sep 24 18:40:33 prn01 config[702]: CHG-2291 applied - default queue policy rolled out to print01 (backout: restore /etc/cups/print01-policy.conf.bak)",
            "Sep 25 09:02:11 prn01 cupsd[812]: [Job 4471] rejected: document is 9.8 MB, exceeds MaxJobSize 10 MB",
            "Sep 26 14:20:47 prn01 cupsd[812]: [Job 4513] rejected: document is 42 MB, exceeds MaxJobSize 10 MB",
            "Sep 29 08:12:03 prn01 cupsd[812]: [Job 4588] completed: 1.4 MB printed normally",
            "Sep 29 09:03:14 prn01 config[702]: print01-policy.conf restored from backup - MaxJobSize 100M, MaxJobQueue 500",
            "Sep 29 09:03:48 prn01 systemd[1]: Reloading Common UNIX Printing System.",
            "Sep 29 09:04:02 prn01 cupsd[812]: [Job 4602] completed: 42 MB printed under restored MaxJobSize 100M",
          ],
        },
        feedback:
          "cups reloaded the restored policy and a previously rejected 42 MB document printed successfully.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The service only picks up policy at load time, and the ticket is jobs that fail - reloaded service plus a big job printing is the proof that closes it.",
          evidenceGain: "Large job prints after reload - reported symptom cleared.",
        },
        matchHints: ["reload the printing service", "reprint the document", "restart cups"],
        isFix: true,
      },
      {
        id: "restart-print-service-wrong",
        label: "Restart the printing service",
        kind: "ui",
        feedback:
          "A restart re-reads the same 10 MB limit from the live file - jobs over 10 MB are rejected again immediately.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Restarting reloads configuration unchanged; the lowered MaxJobSize is still what the service reads, so the queue behaves exactly as before.",
        },
        matchHints: ["restart the printing service", "restart cups", "restart print spooler"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "print.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "print.verified", value: true },
      { type: "stateEquals", path: "print.restored", value: true },
      { type: "stateEquals", path: "print.diffRead", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["restart-print-service-wrong"] },
        feedback: "The service restarts and enforces the same lowered limit - the large job still fails.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The failures start with Tuesday's maintenance - the change record knows what was rolled out and where the old values were kept.",
      },
      {
        level: 2,
        text: "The queue rejects only documents above one size while small jobs pass - compare the live policy with the copy the backout names.",
      },
      {
        level: 3,
        text: "A backout restores the values the rollout lowered; the service has to read them again before a previously failing document proves it.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "CHG-2291 lowered MaxJobSize from 100M to 10M (and MaxJobQueue from 500 to 100) when the queue policy rolled out, so every document over 10 MB was rejected while smaller jobs printed normally.",
      whyItWorked:
        "The change record framed the window and named the backup, the queue pattern pinned failure to document size instead of hardware, and the diff showed the two lowered values as the only regression; restoring them and reloading the service returned the queue to normal. Transferable principle: a partial failure that starts with a maintenance window is a diff problem - compare live configuration against the artifact the change record names, restore exactly what changed, then make the service read it again.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Change record with backout path, rejection pattern by size, diff against the pre-change backup.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Jam, toner and client-driver hypotheses dropped - the queue is healthy, size alone predicts rejection, and the diff names the change.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Restored the pre-change policy values from the backout copy.",
        },
        {
          step: "Verify",
          whatLearnerDid: "cups reloaded and a 42 MB document printed successfully.",
        },
      ],
      followUps: [
        "Add post-change verification to the rollout checklist: reject a canary job above the old limit before closing the window.",
      ],
    },
    knowledgeLinks: ["systemd-service-basics", "troubleshooting-method"],
    references: [],
  },
];
