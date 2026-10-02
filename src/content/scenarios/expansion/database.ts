import type { ScenarioInput } from "@/content/schema";

export const databaseScenarios: ScenarioInput[] = [
  {
    id: "db-grant-missing",
    version: 1,
    title: "Invoice export fails with permission denied for table",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Place a statement-level error above auth on the connection ladder",
      "Read role and object grants instead of blaming the server",
      "Restore exactly the missing privilege and replay the job's own query",
    ],
    prerequisites: ["db-auth-failure"],
    skills: ["databases", "least-privilege", "troubleshooting-method"],
    ticket: {
      id: "HD-1080",
      user: "Billing API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Nightly invoice export fails with permission denied for table invoices for svc_export, while every other query path still works.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "The same export succeeded before the reporting migration ran on Monday night.",
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
          grantChecked: false,
          grantRestored: false,
        },
        logs: [
          "postgres: ERROR:  permission denied for table invoices for user \"svc_export\"",
          "app: ERROR  invoice export aborted: permission denied for table invoices",
          "postgres: LOG:  connection authorized: user=svc_export database=appdb",
          "migration: INFO  migration 118 applied (grants rebuilt for reporting schema)",
        ],
      },
    },
    hypotheses: [
      { id: "h-grant", label: "Export role lost its table grant", initiallyPlausible: true },
      { id: "h-rename", label: "Table renamed by the migration", initiallyPlausible: true },
      { id: "h-down", label: "Database unavailable", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "The error sits above the connection - prove the session and instance healthy first, then read what the export role is actually allowed to touch.",
      steps: [
        {
          id: "guide-journal",
          title: "Read the export failure in the logs",
          explanation: "In the terminal, read the journal entries for the failed export.",
          why:
            "A 500 hides the layer - the database's own error line shows whether the session was refused, rejected at auth, or refused while executing.",
          expectedObservation:
            "A permission denied line for table invoices beside a connection authorized line for svc_export.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row for 5432.",
          why:
            "The error only appears after a session exists - an open listener proves the transport class is closed before privileges are examined.",
          expectedObservation: "5432 LISTEN 0.0.0.0 - the listener is healthy.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read the unit state.",
          why:
            "A restarting unit looks like random failures to an application - stating it keeps the remaining hypotheses at the access layer.",
          expectedObservation: "The unit reporting active (running) with no recent restarts.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-grants",
          title: "Inspect the role and table grants",
          explanation: "From the Checks list, run the role and table grant inspection.",
          why:
            "With session and instance proven healthy, the grant table is the remaining authority on who may read which object.",
          expectedObservation:
            "invoices exists with its columns intact and grants only to billing_rw - no SELECT for reporting_ro since migration 118.",
          target: { componentId: "terminal", label: "Terminal - inspect the grants" },
          actionId: "inspect-grants",
          conceptId: "least-privilege-basics",
        },
        {
          id: "guide-grant",
          title: "Restore the missing privilege",
          explanation: "From Actions, grant SELECT on invoices to the reporting role.",
          why:
            "The evidence names one role and one object missing one privilege - restoring exactly that relationship fixes the export without widening access further.",
          expectedObservation:
            "reporting_ro now holds SELECT on invoices, which svc_export inherits.",
          target: { componentId: "terminal", label: "Terminal - restore the grant" },
          actionId: "grant-select",
        },
        {
          id: "guide-verify",
          title: "Replay the export's own query",
          explanation: "From Actions, run the invoice export check.",
          why:
            "The ticket is a failing job - rerunning that job's query as that role is the only honest proof the privilege now exists.",
          expectedObservation: "The export query returns its rows and the nightly job clears.",
          target: { componentId: "terminal", label: "Terminal - run the export check" },
          actionId: "verify-query",
          conceptId: "troubleshooting-method",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "Postgres answers svc_export with permission denied for table invoices while the connection is authorized - the session opened and the statement was refused.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Transport and auth failures never reach statement execution - an authorization error after 'connection authorized' pins the failure above authentication, at object access.",
          evidenceGain: "Statement rejected after authorization - transport and auth ruled out.",
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
        feedback: "5432 LISTEN 0.0.0.0 - the session reached the server over an open door.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener is positive proof the TCP session completed - a privilege check cannot even run until a connection exists.",
          evidenceGain: "Port open - transport healthy; not refused or filtered.",
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
        feedback: "postgresql active (running) since 06:12 - unit healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A crashed or restarting unit would surface as connection failures, not statement-level errors - confirming stable running keeps the class at access control.",
          evidenceGain: "Service running - outage ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "inspect-grants",
        label: "Inspect role and table grants",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { grantChecked: true } },
        feedback:
          "svc_export is a member of reporting_ro; invoices exists with its columns intact but grants only to billing_rw - no SELECT for reporting_ro since migration 118.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The object exists and others read it, so the question narrows to one role-object relationship - the grant list shows exactly which privilege is absent.",
          evidenceGain: "Missing grant, not missing object - rename hypothesis dropped.",
        },
        matchHints: ["inspect grants", "role grants", "table privileges"],
        component: "database",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "grant-select",
        label: "Grant SELECT on invoices to reporting_ro",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.grantChecked", value: true },
        patch: { db: { grantRestored: true } },
        feedback:
          "SELECT granted to reporting_ro for invoices - svc_export inherits read access through that role.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence named one role, one object and one absent privilege - granting exactly that restores the intended state without widening access beyond it.",
          evidenceGain: "Required privilege restored for the export role.",
        },
        matchHints: ["grant select", "grant table access", "add the privilege"],
        component: "database",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run the invoice export check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.grantRestored", value: true },
        patch: { db: { verified: true } },
        feedback: "Export query returned 1,412 rows as svc_export - the nightly job's 500s cleared.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a failing export job - replaying that job's own query as that role is the only honest proof the privilege now exists.",
          evidenceGain: "Export query succeeds through the real application path.",
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
        feedback:
          "The server is healthy and already authorizing svc_export's session - a restart changes nothing about object access.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Restarting a healthy server neither creates nor removes table privileges - the export fails identically on the next attempt.",
        },
        component: "service",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.grantRestored", value: true },
      { type: "stateEquals", path: "db.grantChecked", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-db-wrong"],
        },
        feedback: "Restarting leaves the missing grant in place - the next export fails the same way.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The server accepted the session and then refused the statement - decide which of those two facts the error is about.",
      },
      {
        level: 2,
        text: "Port and unit checks say the instance is healthy - so ask what access the export role actually holds on that table.",
      },
      {
        level: 3,
        text: "A privilege is one role's relationship with one object - restore exactly that relationship, then rerun the job's own query.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Migration 118 rebuilt the reporting schema's grants on Sep 28 and dropped the legacy SELECT on invoices that reporting_ro (and therefore svc_export) had relied on.",
      whyItWorked:
        "The authorized-but-denied error placed the failure above auth, the listener and unit checks closed transport and outage classes, and the grant inspection showed one absent role-object privilege; restoring exactly that privilege fixed the export without touching the healthy server. Transferable principle: 'permission denied' after a successful authorization means the door opened and one object-level grant is missing - read the role's privileges on that object instead of restarting servers or recreating roles.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Journal shows the denial after authorization; checks prove port and unit healthy; grant list shows the absent privilege.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Outage, transport and auth hypotheses dropped - the session is authorized; missing-object hypothesis dropped - the table exists intact.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Granted SELECT on invoices to the export's role.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The export job's own query returned rows as svc_export.",
        },
      ],
      followUps: [
        "Add a post-migration step that diffs critical role grants against the previous release before the window closes.",
      ],
    },
    knowledgeLinks: ["least-privilege-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "db-lock-contention",
    version: 1,
    title: "Report queries hang and never finish",
    category: "database",
    difficulty: "advanced",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: [
      "Separate a wait from a failure by reading what the server says is waited on",
      "Attribute a lock to the session holding it instead of the queries behind it",
      "End exactly one blocking transaction and prove the waiters drain",
    ],
    prerequisites: ["db-pool-exhausted"],
    skills: ["databases", "performance", "troubleshooting-method"],
    ticket: {
      id: "HD-1081",
      user: "Analytics team",
      role: "Report consumers",
      symptomPlainLanguage:
        "Warehouse report queries hang indefinitely since this morning while checkout and other applications stay responsive.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "Restarting the reporting app did not help; the same reports were fast until about 09:40.",
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
          blockerFound: false,
          blockerTerminated: false,
        },
        logs: [
          "app: WARN  report query pending: still waiting for ShareLock on transaction 84122 after 300s",
          "postgres: LOG:  process 512 still waiting for ShareLock on transaction 84122 after 300.004 s",
          "postgres: LOG:  statement: UPDATE inventory SET qty = qty - 1 WHERE sku = 'X-100'",
          "postgres: LOG:  connection authorized: user=svc_batch database=appdb",
        ],
      },
    },
    hypotheses: [
      { id: "h-lock", label: "A transaction is blocking other queries", initiallyPlausible: true },
      { id: "h-slow", label: "Reports are simply slow at this hour", initiallyPlausible: true },
      { id: "h-overload", label: "Database is overloaded and failing", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "A hang is a wait, not a failure - read what the server says the queries wait for, prove the instance healthy, then end exactly the one session that owns the wait.",
      steps: [
        {
          id: "guide-journal",
          title: "Read what the queries wait for",
          explanation: "In the terminal, read the journal entries for the hanging reports.",
          why:
            "Applications report only 'still running' - the database's own wait line names the resource and the transaction holding it.",
          expectedObservation:
            "Queries waiting on ShareLock for transaction 84122 past 300 seconds while sessions stay authorized.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row.",
          why:
            "Refused or filtered connections fail fast; these queries are connected and waiting - the open listener makes that distinction concrete.",
          expectedObservation: "5432 LISTEN 0.0.0.0 - the waiters are connected, not rejected.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read the unit state.",
          why:
            "An overloaded or crash-looping unit looks similar from outside - a stable unit keeps the question on sessions.",
          expectedObservation: "The unit reporting active (running) with no recent restarts.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-blocker",
          title: "Identify the blocking transaction",
          explanation: "From the Checks list, run the blocking transaction inspection.",
          why:
            "Naming the holder turns 'reports are slow' into one concrete object - it separates contention from genuine query slowness.",
          expectedObservation:
            "Transaction 84122 opened by svc_batch at 09:41 ran an inventory update and never committed, with 14 report queries waiting on it.",
          target: { componentId: "terminal", label: "Terminal - identify the blocker" },
          actionId: "find-blocker",
        },
        {
          id: "guide-terminate",
          title: "End the blocking transaction",
          explanation: "From Actions, terminate only the blocking transaction.",
          why:
            "The evidence singles out one session holding one lock - ending that session frees every waiter without touching the healthy ones.",
          expectedObservation:
            "The waiters start running within a second of the rollback.",
          target: { componentId: "terminal", label: "Terminal - end the blocker" },
          actionId: "terminate-blocker",
        },
        {
          id: "guide-verify",
          title: "Rerun the queries that hung",
          explanation: "From Actions, run the report query check.",
          why:
            "The ticket is reports that never finish - rerunning those exact queries is the honest proof the dependency is gone.",
          expectedObservation: "The same report queries complete in under two seconds.",
          target: { componentId: "terminal", label: "Terminal - rerun the reports" },
          actionId: "verify-query",
          conceptId: "troubleshooting-method",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "Sessions are waiting, not failing: ShareLock on transaction 84122 for 300 seconds while connections stay authorized - reports queue behind one open transaction.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Authorized sessions that never finish are a dependency wait, not an outage or capacity event - the wait target is named by the server itself.",
          evidenceGain: "Wait on one transaction - not auth, not transport, not capacity.",
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
        feedback: "5432 LISTEN 0.0.0.0 - the waiters are connected and nothing is refused.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener shows the queries reach the server and queue there - refusal and filtering classes cannot produce a named lock wait.",
          evidenceGain: "Port open - transport healthy; waiters connected, not rejected.",
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
        feedback: "postgresql active (running) - stable through the wait storm.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A crash-looping or restarting unit presents as connection failures rather than named waits - confirming stability keeps the class at session dependency.",
          evidenceGain: "Service running - outage ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "find-blocker",
        label: "Identify the blocking transaction",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { blockerFound: true } },
        feedback:
          "Transaction 84122 opened by svc_batch at 09:41 ran UPDATE inventory and never committed; 14 report queries wait on it - no other lock conflicts exist.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Naming holder, age and statement converts 'reports are slow' into one object holding a lock - this is the evidence that separates contention from slowness.",
          evidenceGain: "14 waiters behind one uncommitted transaction - slowness dropped.",
        },
        matchHints: ["identify the blocker", "find blockers", "who holds the lock"],
        component: "database",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "terminate-blocker",
        label: "Terminate the blocking transaction",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.blockerFound", value: true },
        patch: { db: { blockerTerminated: true } },
        feedback: "Transaction 84122 rolled back - the 14 waiting queries start running within a second.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence identified exactly one idle transaction owning the lock - ending that transaction frees every waiter without touching healthy sessions.",
          evidenceGain: "Lock owner ended - waiters released.",
        },
        matchHints: ["terminate the transaction", "cancel the blocker", "kill transaction 84122"],
        component: "database",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Rerun the report queries",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.blockerTerminated", value: true },
        patch: { db: { verified: true } },
        feedback: "The report queries that hung now complete in under two seconds.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is reports that never finish - rerunning those exact queries proves the dependency is gone rather than merely delayed.",
          evidenceGain: "Formerly hanging queries complete normally.",
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
        feedback:
          "A restart rolls back the blocking transaction but drops every healthy session too - and nothing prevents the next open-ended update.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Restarting treats all sessions as equally broken when the evidence singles out one - it destroys live work to resolve a single holder.",
        },
        component: "service",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.blockerTerminated", value: true },
      { type: "stateEquals", path: "db.blockerFound", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["restart-db-wrong"],
        },
        feedback:
          "The restart frees the waiters briefly while the same batch pattern blocks them again - identify the holder first.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "These queries are waiting rather than failing - the log names exactly what they wait for.",
      },
      {
        level: 2,
        text: "A healthy listener and unit keep the question on sessions: find who opened transaction 84122 and why it never ended.",
      },
      {
        level: 3,
        text: "One uncommitted transaction owns the lock - end that session so the waiters drain on their own, then rerun the queries that hung.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "A batch job opened transaction 84122 with an inventory update at 09:41 and never committed or rolled back, so 14 report queries queued behind its ShareLock for the entire morning.",
      whyItWorked:
        "The wait line named the held resource, the listener and unit checks closed transport and outage classes, and the blocker inspection attributed the lock to one idle transaction; ending exactly that session released every waiter. Transferable principle: when queries hang while others work, read what the server says they are waiting for - a named lock holder is a session to end, not a server to restart.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Wait lines naming transaction 84122, healthy listener and unit, blocker inspection with holder and age.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Outage, transport and genuine-slowness hypotheses dropped - sessions connect, the unit is stable, and one transaction owns the wait.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Terminated only the blocking transaction.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The previously hanging report queries completed in seconds.",
        },
      ],
      followUps: [
        "Set idle_in_transaction_session_timeout on the batch role so abandoned transactions end themselves.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "db-stale-pool-conns",
    version: 1,
    title: "Checkout intermittently fails with dropped connections",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "INTERMITTENT_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Trace intermittent resets to the sessions already held by the pool",
      "Date sockets against the last database restart",
      "Recycle stale connections and enable validation to stop the pattern",
    ],
    prerequisites: ["db-pool-exhausted"],
    skills: ["databases", "pools", "troubleshooting-method"],
    ticket: {
      id: "HD-1082",
      user: "Checkout API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Checkout fails about one request in five with 'server closed the connection unexpectedly'; a retry usually succeeds.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "The database failover completed cleanly at 03:12 Tuesday and the primary has been stable since.",
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
          poolInspected: false,
          poolRecycled: false,
        },
        logs: [
          "app: ERROR  server closed the connection unexpectedly (ECONNRESET) during checkout tx",
          "postgres: LOG:  database system is ready to accept connections",
          "app: INFO  pool: 10/10 connections held; 7 opened before failover 2026-09-27 03:12",
          "app: WARN  connection health checks disabled in pool config (validation disabled)",
        ],
      },
    },
    hypotheses: [
      { id: "h-stale", label: "Pool still holding pre-failover connections", initiallyPlausible: true },
      { id: "h-flaky", label: "Network to the database is flaky", initiallyPlausible: true },
      { id: "h-refail", label: "Primary keeps failing over", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Intermittent drops with a healthy server are a question about which connections are failing - date them, then recycle and validate them.",
      steps: [
        {
          id: "guide-journal",
          title: "Read the drops and the pool's own report",
          explanation: "In the terminal, read the journal entries around the resets.",
          why:
            "A reset that happens on some requests but not others points at specific sessions - the pool reports when each of them was opened.",
          expectedObservation:
            "ECONNRESET during checkout beside a pool line showing 7 of 10 connections opened before the 03:12 failover.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row.",
          why:
            "Retries succeeding already suggest the path works - the open listener proves new sessions connect while old ones die.",
          expectedObservation: "5432 LISTEN 0.0.0.0 - fresh sessions connect fine.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read how long it has been up.",
          why:
            "Repeated failovers would produce ongoing resets - a unit running since Tuesday closes that class.",
          expectedObservation:
            "The unit active since 03:12 Tuesday with no restarts since.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-pool",
          title: "Inspect the connections the pool holds",
          explanation: "From the Checks list, run the pool connection inspection.",
          why:
            "With the path and instance healthy, the sockets the pool already owns are the remaining variable - their open times are the evidence.",
          expectedObservation:
            "7 of the 10 pooled connections were opened before the failover, idle 48 hours, with no successful health check recorded.",
          target: { componentId: "terminal", label: "Terminal - inspect the pool" },
          actionId: "inspect-pool",
        },
        {
          id: "guide-recycle",
          title: "Recycle and validate the pool",
          explanation: "From Actions, recycle and validate the pooled connections.",
          why:
            "The evidence shows dead sockets held without validation - recycling removes them and validation stops the pool from reusing what it cannot check.",
          expectedObservation:
            "All connections reopen against the current primary with validation enabled.",
          target: { componentId: "terminal", label: "Terminal - recycle the pool" },
          actionId: "recycle-pool",
        },
        {
          id: "guide-verify",
          title: "Prove the resets are gone",
          explanation: "From Actions, run the checkout connection check.",
          why:
            "The failure was intermittent - proving an absence of resets requires repeated attempts through the real path.",
          expectedObservation:
            "50 sequential checkout checks pass with no dropped connection.",
          target: { componentId: "terminal", label: "Terminal - run the checkout check" },
          actionId: "verify-query",
          conceptId: "troubleshooting-method",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "The primary restarted at the 03:12 failover, the pool still holds 7 sockets opened before it, and health validation is disabled - only those stale sockets drop mid-transaction.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Resets beside 'ready to accept connections' show the server is serving new work - the drops track sockets the pool owned before the restart, not the server itself.",
          evidenceGain: "Drops limited to pre-failover sockets; server accepts new connections.",
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
        feedback: "5432 LISTEN 0.0.0.0 - fresh sessions connect, which is why retries succeed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener proves the path works for new connections - the intermittency lives in existing sessions, not reachability.",
          evidenceGain: "Port open - transport healthy; failure is per-session, not per-path.",
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
        feedback: "postgresql active (running) since 03:12 Tuesday - no further failovers.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Repeated failovers would produce ongoing resets across all sessions - a stable uptime drops that class of explanation.",
          evidenceGain: "Unit stable since the failover - ongoing failover ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "inspect-pool",
        label: "Inspect the connections the pool holds",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { poolInspected: true } },
        feedback:
          "Pool: 10/10 in use; 7 sockets opened 03:10-03:11 (before the 03:12 failover), idle 48h+, no successful health check recorded for them.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Open times split the pool into pre-failover and post-failover sockets - that attribution proves staleness instead of a flaky network.",
          evidenceGain: "Drops attributed to pre-failover sockets - flaky-network hypothesis dropped.",
        },
        matchHints: ["inspect the pool", "pool connections", "list pooled connections"],
        component: "pool",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "recycle-pool",
        label: "Recycle and validate the pooled connections",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.poolInspected", value: true },
        patch: { db: { poolRecycled: true } },
        feedback:
          "Pool drained and all 10 connections reopened against the current primary; per-borrow health validation is now enabled.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence showed dead sockets held without validation - recycling removes them and validation prevents their return, the smallest change that stops the pattern.",
          evidenceGain: "Stale sockets replaced and validation enabled.",
        },
        matchHints: ["recycle the pool", "drain the pool", "rebuild pooled connections"],
        component: "pool",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run the checkout connection check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.poolRecycled", value: true },
        patch: { db: { verified: true } },
        feedback: "50 sequential checkout checks pass with no dropped connections.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The failure was intermittent - a repeated run through the real path is the only way to prove an absence of resets.",
          evidenceGain: "No resets across 50 attempts - pattern cleared.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "grow-pool-wrong",
        label: "Increase the pool size",
        kind: "ui",
        tool: "services",
        feedback:
          "A bigger pool buys a few hours - the same stale sockets are handed out again and validation is still disabled.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Growing capacity treats connections held since before the failover as demand; the reset pattern returns as soon as those sockets are reused.",
        },
        component: "pool",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.poolRecycled", value: true },
      { type: "stateEquals", path: "db.poolInspected", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["grow-pool-wrong"],
        },
        feedback:
          "The stale sockets are still in the rotation - more capacity just delays the same intermittent reset.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The failure is intermittent while the server accepts fresh work - ask which connections are actually dropping.",
      },
      {
        level: 2,
        text: "Port and unit are healthy, so the question is the sockets the pool already holds and when each was opened.",
      },
      {
        level: 3,
        text: "Replace the connections held since before the failover, make the pool check each one it borrows, then run the check repeatedly to prove the resets are gone.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The pool kept 7 connections opened before the 03:12 Tuesday failover and ran with health validation disabled, so requests routed onto those dead sockets were reset while fresh sessions worked.",
      whyItWorked:
        "The log paired resets with pre-failover sockets, the listener and unit checks proved the path and instance healthy, and the pool inspection dated the failing sockets against the restart; recycling and validation removed the cause permanently. Transferable principle: intermittent resets beside a healthy listener mean existing sessions, not the path - date the sockets against the last restart and make the pool stop trusting connections it cannot check.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Journal shows resets beside a pre-failover pool line; checks prove port and unit healthy; inspection dates the sockets.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Flaky-network and repeated-failover hypotheses dropped - fresh sessions connect and the unit has not restarted since Tuesday.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Recycled the pool and enabled per-borrow validation.",
        },
        {
          step: "Verify",
          whatLearnerDid: "50 sequential checkout checks passed with no resets.",
        },
      ],
      followUps: [
        "Cap maximum connection age below the failover interval so sockets never outlive a restart.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "db-wal-bloat-full",
    version: 1,
    title: "Inventory writes failing with no space left on device",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 14,
    learningObjectives: [
      "Explain why reads keep working while writes fail",
      "Find which directory consumed the volume instead of deleting at random",
      "Repair the archive path that should be reclaiming the space",
    ],
    prerequisites: ["db-connection-refused"],
    skills: ["databases", "capacity", "troubleshooting-method"],
    ticket: {
      id: "HD-1083",
      user: "Inventory API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Every write to appdb has failed since yesterday afternoon with no space left on device; reads still work fine.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "The database host moved to a new volume last month and no capacity alert has fired since.",
    },
    environment: {
      kind: "network+terminal",
      shell: "linux",
      availableTools: ["terminal", "services", "network"],
      enabledCommands: ["ping", "ss", "systemctl", "journalctl", "help", "ps", "df"],
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
          faults: { dbServiceDown: false, portBlocked: false, diskFull: false },
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
          dataDir: "/var/lib/postgresql/data",
          storageChecked: false,
          walPruned: false,
        },
        disks: [
          {
            fs: "/dev/sdb1",
            size: "100G",
            used: "99G",
            avail: "410M",
            usePercent: "99%",
            mount: "/var/lib/postgresql",
          },
        ],
        logs: [
          "postgres: ERROR:  could not write to file \"pg_wal/xlogtemp.11\": No space left on device",
          "postgres: LOG:  checkpoint complete: wrote 812 buffers; 1,204 WAL segments retained",
          "postgres: WARNING:  archive_command failed with exit code 1: could not rename file: No space left on device",
          "app: ERROR  inventory write aborted: no space left on device",
        ],
      },
    },
    hypotheses: [
      { id: "h-full", label: "Data volume is full", initiallyPlausible: true },
      { id: "h-quota", label: "Tablespace quota exceeded", initiallyPlausible: true },
      { id: "h-perms", label: "Data directory permissions changed", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Reads work while writes fail - find what consumed the volume and which process that should be emptying it stopped, before deleting anything.",
      steps: [
        {
          id: "guide-journal",
          title: "Read the write failures in the journal",
          explanation: "In the terminal, read the journal entries around the write errors.",
          why:
            "The write error names the syscall layer, and the same journal shows what has been failing beside it since yesterday afternoon.",
          expectedObservation:
            "No-space write errors beside an archive_command failure and 1,204 retained WAL segments.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row.",
          why:
            "Reads succeeding already show the instance serving - the listener proves the class is storage, not transport.",
          expectedObservation: "5432 LISTEN 0.0.0.0 - reads reach the server while writes fail.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read the unit state.",
          why:
            "A unit crashing on write errors would present as an outage - a stable unit keeps the failure at the storage layer.",
          expectedObservation: "The unit reporting active (running) with no crash loop.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-storage",
          title: "Measure the data volume",
          explanation: "From the Checks list, run the data volume usage check (df).",
          why:
            "'No space' is a claim - measuring the volume turns it into a number and shows which directory grew.",
          expectedObservation:
            "/dev/sdb1 at 99% used with 410M free, and the WAL directory accounting for 63G of it.",
          target: { componentId: "terminal", label: "Terminal - measure the volume" },
          actionId: "check-storage",
          conceptId: "disk-space-slow-pc",
        },
        {
          id: "guide-archive",
          title: "Repair the archive path and prune the backlog",
          explanation: "From Actions, repair the archive path and prune the WAL backlog.",
          why:
            "The backlog exists because archiving stopped - fixing the path removes the cause while pruning reclaims what already accumulated.",
          expectedObservation:
            "Segments moving to the backup volume again and the data volume dropping to 61% used.",
          target: { componentId: "terminal", label: "Terminal - restore archiving" },
          actionId: "prune-wal",
        },
        {
          id: "guide-verify",
          title: "Prove writes succeed again",
          explanation: "From Actions, run the write check against appdb.",
          why:
            "The ticket is failing writes - inserting and checkpointing through the real path is the honest proof.",
          expectedObservation: "INSERT and CHECKPOINT both succeed with room to spare.",
          target: { componentId: "terminal", label: "Terminal - run the write check" },
          actionId: "verify-query",
          conceptId: "troubleshooting-method",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "Writes fail with no space left while the archiver has been failing since Sep 28 14:02 and 1,204 WAL segments are retained instead of being moved.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The archiver failure next to retained segments explains where the space went - this is a reclamation problem, not a raw capacity plan.",
          evidenceGain: "Write failures tied to archiver failure and 1,204 retained segments.",
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
        feedback: "5432 LISTEN 0.0.0.0 - reads reach the server while only writes fail.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener with working reads proves sessions and transport are intact - a storage-side failure is the class that fits partial operation.",
          evidenceGain: "Port open - transport healthy; failure is write-path only.",
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
        feedback: "postgresql active (running) - stable, no crash loop from the write errors.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A unit that dies on write errors would present as an outage - stable running keeps the failure at the storage layer rather than the service.",
          evidenceGain: "Service running - outage and crash-loop ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "check-storage",
        label: "Check data volume usage (df)",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.logsReviewed", value: true },
        patch: {
          network: { faults: { diskFull: true } },
          db: { storageChecked: true },
        },
        feedback:
          "df: /dev/sdb1 mounted at /var/lib/postgresql is 99% used (410M free of 100G); the pg_wal directory accounts for 63G of it.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Measuring the volume converts 'no space' into a number and a location - the WAL directory's share shows what is consuming the disk.",
          evidenceGain: "Volume at 99% with the WAL backlog as dominant consumer - quota and permission hypotheses dropped.",
        },
        matchHints: ["df", "check storage", "disk usage"],
        component: "storage",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "prune-wal",
        label: "Repair the archive path and prune the WAL backlog",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.storageChecked", value: true },
        patch: {
          network: { faults: { diskFull: false } },
          db: { walPruned: true },
          logs: [
            "postgres: ERROR:  could not write to file \"pg_wal/xlogtemp.11\": No space left on device",
            "postgres: LOG:  checkpoint complete: wrote 812 buffers; 1,204 WAL segments retained",
            "postgres: WARNING:  archive_command failed with exit code 1: could not rename file: No space left on device",
            "app: ERROR  inventory write aborted: no space left on device",
            "postgres: LOG:  archive path restored; 1,204 segments moved to backup volume; /dev/sdb1 now 61% used",
          ],
        },
        feedback:
          "The archive path works again and the retained segments moved to the backup volume - /dev/sdb1 back to 61% used (39G free).",
        evaluation: {
          grade: "optimal",
          rationale:
            "The backlog exists only because archiving stopped - restoring the path removes the cause while pruning clears what it already produced.",
          evidenceGain: "Cause repaired and backlog reclaimed - writes have room again.",
        },
        matchHints: ["repair the archive", "prune the wal", "archive the backlog"],
        component: "storage",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run a write check against appdb",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.walPruned", value: true },
        patch: {
          db: { verified: true },
          logs: [
            "postgres: ERROR:  could not write to file \"pg_wal/xlogtemp.11\": No space left on device",
            "postgres: LOG:  checkpoint complete: wrote 812 buffers; 1,204 WAL segments retained",
            "postgres: WARNING:  archive_command failed with exit code 1: could not rename file: No space left on device",
            "app: ERROR  inventory write aborted: no space left on device",
            "postgres: LOG:  archive path restored; 1,204 segments moved to backup volume; /dev/sdb1 now 61% used",
            "postgres: LOG:  INSERT and CHECKPOINT succeeded; writes normal",
          ],
        },
        feedback: "INSERT and CHECKPOINT succeed - inventory writes no longer fail.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is failing writes - inserting and checkpointing through the real path with room to spare is the honest end state.",
          evidenceGain: "Writes succeed with capacity reclaimed.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "delete-wal-wrong",
        label: "Delete the oldest WAL segments by hand",
        kind: "ui",
        tool: "services",
        feedback:
          "The archiver is still failing - the next checkpoint regenerates the backlog and the volume refills within minutes.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Hand-deleting segments removes the evidence while the cause persists; space returns to zero and the archive trail develops gaps.",
        },
        component: "storage",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.walPruned", value: true },
      { type: "stateEquals", path: "db.storageChecked", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["delete-wal-wrong"],
        },
        feedback:
          "Space reappears for minutes while the failed archiver keeps generating the next backlog.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Reads work while writes fail - the journal pairs the write error with something that has been failing since yesterday afternoon.",
      },
      {
        level: 2,
        text: "Port and unit are healthy, so measure the volume itself and see which directory is consuming it.",
      },
      {
        level: 3,
        text: "A backlog exists because archiving stopped - restore the path that should be moving segments, clear what already accumulated, then prove writes succeed.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "archive_command failed from Sep 28 14:02, so 1,204 WAL segments stayed in pg_wal and filled /dev/sdb1 to 99%, making every write fail with no space left on device.",
      whyItWorked:
        "The journal tied the write error to a failed archiver, the listener and unit checks kept reads and service health visible, and the volume measurement located the WAL directory as the consumer; repairing the archive path removed the cause while pruning reclaimed the space. Transferable principle: 'no space left' beside healthy reads is a reclamation question - find which directory grew and why the process that should be emptying it stopped, before deleting anything by hand.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Journal shows write errors beside a failed archiver and retained segments; df shows the volume at 99%.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Outage, transport, quota and permission hypotheses dropped - unit and port healthy, WAL directory identified as the consumer.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Restored the archive path and pruned the retained segments.",
        },
        {
          step: "Verify",
          whatLearnerDid: "INSERT and CHECKPOINT succeeded with 39G free.",
        },
      ],
      followUps: [
        "Alert when archive_command fails or pg_wal growth exceeds its daily baseline.",
      ],
    },
    knowledgeLinks: ["disk-space-slow-pc", "database-connection-basics"],
    references: [],
  },
  {
    id: "db-replication-lag",
    version: 1,
    title: "Search still returns products deleted yesterday",
    category: "database",
    difficulty: "intermediate",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Separate a stale reader from a broken writer",
      "Read the primary's report on what its replica has applied",
      "Repair the stream and let replay prove freshness before trusting the reader",
    ],
    prerequisites: ["db-connection-refused"],
    skills: ["databases", "replication", "troubleshooting-method"],
    ticket: {
      id: "HD-1084",
      user: "Storefront search team",
      role: "Service owners",
      symptomPlainLanguage:
        "Product search still returns items deleted yesterday afternoon; the primary shows them gone. Started when search reads moved to the replica.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "The replica answered fresh data when it was put into service last week.",
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
          {
            id: "replica",
            name: "db02",
            os: "linux",
            ips: ["192.168.1.32"],
            mac: "0A:1B:2C:3D:4E:60",
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
          replicaHost: "db02",
          replicaAddress: "192.168.1.32",
          name: "appdb",
          portListening: true,
          portChecked: false,
          serviceStarted: false,
          credsChecked: false,
          verified: false,
          replChecked: false,
          replicaReachable: false,
          streamResumed: false,
        },
        logs: [
          "app: WARN  search reads served by replica db02 - results stale since 2026-09-28 11:47",
          "postgres: LOG:  standby db02 apply delayed: 1,148 WAL segments behind (last applied 2026-09-28 11:47)",
          "postgres: WARNING:  walreceiver on db01: connection to db02 lost at 2026-09-28 11:47:03 (retries pending)",
          "postgres: LOG:  connection authorized: user=svc_search database=appdb",
        ],
      },
    },
    hypotheses: [
      { id: "h-stale", label: "Replica stopped applying changes", initiallyPlausible: true },
      { id: "h-cache", label: "Search index cache is stale", initiallyPlausible: true },
      { id: "h-never", label: "Rows were never deleted on the primary", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "A healthy-looking node serving old data is a dependency question - read what the primary says about it, then repair the link and let replay prove freshness.",
      steps: [
        {
          id: "guide-journal",
          title: "Read the primary's report on its replica",
          explanation: "In the terminal, read the journal entries about the serving replica.",
          why:
            "The reader looks fine from outside - the writer knows exactly how far behind it is and when the two last spoke.",
          expectedObservation:
            "Apply stalled at Sep 28 11:47 with 1,148 segments behind and the walreceiver connection reporting retries pending.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row.",
          why:
            "Search returning data at all proves connections work - the listener makes clear that reachability was never the problem.",
          expectedObservation: "5432 LISTEN on the primary - reads and writes both reach live servers.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read the unit state.",
          why:
            "A writer that keeps restarting would explain a lagging reader as collateral - a stable unit rules that out.",
          expectedObservation: "The primary unit active (running) with no restarts in the window.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-repl",
          title: "Inspect the replication status",
          explanation: "From the Checks list, run the replication status inspection.",
          why:
            "This separates a dead replica from a live one that is not receiving - recovery state and stream state answer different questions.",
          expectedObservation:
            "db02 in recovery with replay stopped at 11:47, the replication slot intact, and retries pending on the stream.",
          target: { componentId: "terminal", label: "Terminal - inspect replication" },
          actionId: "inspect-replication",
        },
        {
          id: "guide-probe",
          title: "Probe the replica directly",
          explanation: "From the Checks list, run the replica probe.",
          why:
            "Before repairing a link, prove the node on the other end is alive - a dead node and a broken stream need completely different actions.",
          expectedObservation:
            "db02 answering in 0.4ms and accepting connections on 5432 - up, but not receiving.",
          target: { componentId: "terminal", label: "Terminal - probe the replica" },
          actionId: "check-replica",
        },
        {
          id: "guide-stream",
          title: "Re-establish the replication stream",
          explanation: "From Actions, re-establish the replication stream.",
          why:
            "The evidence shows a live node and a broken link - reconnecting the same slot lets the replica catch up without touching either database.",
          expectedObservation: "The walreceiver connects and apply resumes from the named segment.",
          target: { componentId: "terminal", label: "Terminal - resume the stream" },
          actionId: "resume-stream",
        },
        {
          id: "guide-verify",
          title: "Verify search reads on the replica",
          explanation: "From Actions, run the replica search check.",
          why:
            "The ticket is stale reads - only querying the serving replica until it reflects the deletion proves the fix reached users.",
          expectedObservation:
            "Replay lag reads 0 and the deleted products no longer appear in search.",
          target: { componentId: "terminal", label: "Terminal - verify search reads" },
          actionId: "verify-search",
          conceptId: "troubleshooting-method",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "The apply stream to db02 dropped at Sep 28 11:47 and never recovered - the replica is 1,148 segments behind while search keeps reading from it.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reads that succeed with stale data mean the serving node is healthy but behind - the primary's walreceiver line names the broken dependency.",
          evidenceGain: "Stream down since 11:47 - serving node behind, not broken.",
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
        feedback: "5432 LISTEN on the primary - both readers and writers reach live servers.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener with working reads proves reachability is intact - staleness lives in what the replica has applied, not in the path to it.",
          evidenceGain: "Port open - transport healthy; staleness is state, not path.",
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
        feedback: "postgresql active (running) on the primary - no restarts in the window.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A writer that restarts would stall replication as collateral - a stable unit keeps the failure class at the link between nodes.",
          evidenceGain: "Primary stable - writer outage ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "inspect-replication",
        label: "Inspect the replication status",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { replChecked: true } },
        feedback:
          "db02 in recovery with replay stopped at 11:47; slot repl_search intact with no conflicts; the walreceiver on db01 shows retries pending.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Recovery state plus a named stopped position separates 'replica is down' from 'stream is broken' - the node is up but not receiving.",
          evidenceGain: "Replica up in recovery with a broken stream - node failure dropped.",
        },
        matchHints: ["inspect replication", "replication status", "check the stream"],
        component: "database",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "check-replica",
        label: "Probe the replica directly",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.replChecked", value: true },
        patch: { db: { replicaReachable: true } },
        feedback:
          "db02 answers ping in 0.4ms and accepts connections on 5432 - it is up, only its apply stream is down.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Probing the far node proves the dependency is the link rather than the machine - this closes the replica-outage class before any repair.",
          evidenceGain: "Replica reachable - node-failure hypothesis dropped.",
        },
        matchHints: ["probe the replica", "ping the replica", "check db02"],
        component: "host",
        isDiagnostic: true,
      },
      {
        id: "resume-stream",
        label: "Re-establish the replication stream",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.replicaReachable", value: true },
        patch: {
          db: { streamResumed: true },
          logs: [
            "app: WARN  search reads served by replica db02 - results stale since 2026-09-28 11:47",
            "postgres: LOG:  standby db02 apply delayed: 1,148 WAL segments behind (last applied 2026-09-28 11:47)",
            "postgres: WARNING:  walreceiver on db01: connection to db02 lost at 2026-09-28 11:47:03 (retries pending)",
            "postgres: LOG:  connection authorized: user=svc_search database=appdb",
            "postgres: LOG:  walreceiver on db01: connected to db02; apply resumed from segment 0000000100000042000000CD",
          ],
        },
        feedback: "The stream to db02 re-established and apply resumed from the named segment.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The broken dependency was the link itself - reconnecting the same slot restores the intended flow without changing either database.",
          evidenceGain: "Stream restored - apply progressing.",
        },
        matchHints: ["re-establish the stream", "resume replication", "reconnect the replica"],
        component: "database",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-search",
        label: "Verify search reads on the replica",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.streamResumed", value: true },
        patch: {
          db: { verified: true },
          logs: [
            "app: WARN  search reads served by replica db02 - results stale since 2026-09-28 11:47",
            "postgres: LOG:  standby db02 apply delayed: 1,148 WAL segments behind (last applied 2026-09-28 11:47)",
            "postgres: WARNING:  walreceiver on db01: connection to db02 lost at 2026-09-28 11:47:03 (retries pending)",
            "postgres: LOG:  connection authorized: user=svc_search database=appdb",
            "postgres: LOG:  walreceiver on db01: connected to db02; apply resumed from segment 0000000100000042000000CD",
            "postgres: LOG:  replication current: 0 segments behind; replica serving fresh data",
          ],
        },
        feedback:
          "Replay lag reads 0 and search no longer returns the products deleted yesterday.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is stale reads - querying the serving replica until it reflects the deletion is the only honest proof the fix reached users.",
          evidenceGain: "Replica current - reported staleness cleared.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "point-search-at-primary-wrong",
        label: "Point search at the primary",
        kind: "ui",
        tool: "services",
        feedback:
          "Search would show fresh data while the replica stays silently behind - the next outage reads stale data again.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Swapping readers hides the symptom and removes the redundancy the design relies on; the broken stream remains unrepaired.",
        },
        component: "service",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.streamResumed", value: true },
      { type: "stateEquals", path: "db.replicaReachable", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["point-search-at-primary-wrong"],
        },
        feedback:
          "Users see fresh data today while the replica you depend on remains behind - the link is still broken.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The primary keeps its own record of how far behind its replica is - read what it says about the node serving search.",
      },
      {
        level: 2,
        text: "Port and unit are healthy on the primary, so the question is the relationship between the nodes: is the replica down, or up and not receiving?",
      },
      {
        level: 3,
        text: "Reconnect the broken link so the replica catches up on its own, then query it until it reflects the deletion before trusting it again.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "The walreceiver connection from db01 to db02 dropped at Sep 28 11:47 and its retries never succeeded, so the replica stopped applying WAL and kept serving 19-hour-old data to search.",
      whyItWorked:
        "The primary's journal named the stalled position, the listener and unit checks proved the writer healthy, and the replication inspection plus a direct probe separated a live node from a broken link; reconnecting the stream let replay close the gap. Transferable principle: stale reads from a healthy-looking node are a dependency question - ask what that node is waiting to receive, not what it is running, and prove freshness by replay before trusting the reader again.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Journal shows apply stalled since 11:47; checks prove the primary healthy; inspection and probe show a live replica with a dead link.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Writer-outage, reachability and dead-replica hypotheses dropped - the primary serves and the replica answers probes.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Re-established the replication stream on the existing slot.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Replay lag reached 0 and search stopped returning the deleted items.",
        },
      ],
      followUps: [
        "Alert on replay lag above 60 segments so a broken stream surfaces before readers do.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [],
  },
  {
    id: "db-schema-mismatch",
    version: 1,
    title: "Pricing API returns errors since the overnight migration",
    category: "database",
    difficulty: "advanced",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 16,
    learningObjectives: [
      "Read an undefined-column error as a version skew, not an outage",
      "Compare the live catalog against the build's expectations",
      "Align the lagging side instead of rebuilding the replaced definition",
    ],
    prerequisites: [],
    skills: ["databases", "configuration", "troubleshooting-method"],
    ticket: {
      id: "HD-1085",
      user: "Pricing API team",
      role: "Service owners",
      symptomPlainLanguage:
        "Pricing API returns 500s since the 02:00 migration: column \"discount_pct\" of relation \"products\" does not exist. Everything else works.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "The migration was scheduled; the API build was not changed in the same window.",
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
          schemaChecked: false,
          appAligned: false,
        },
        logs: [
          "postgres: ERROR:  column \"discount_pct\" of relation \"products\" does not exist",
          "app: ERROR  pricing query failed: column \"discount_pct\" of relation \"products\" does not exist",
          "postgres: LOG:  connection authorized: user=svc_pricing database=appdb",
          "migration: INFO  migration 119 applied at 2026-09-29 02:00 (products.discount_pct -> products.promo_price)",
        ],
      },
    },
    hypotheses: [
      { id: "h-skew", label: "Schema no longer matches the running build", initiallyPlausible: true },
      { id: "h-badquery", label: "API is sending broken queries", initiallyPlausible: true },
      { id: "h-perm", label: "API role lost access to products", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "An authorized session failing on a missing name is a contract dispute - prove the instance healthy, read what the catalog says now, then align the side that lagged.",
      steps: [
        {
          id: "guide-journal",
          title: "Read the migration and the failing statement",
          explanation: "In the terminal, read the journal entries for the pricing failures.",
          why:
            "The database's own error names the missing object, and the same journal records what the catalog looked like before and after 02:00.",
          expectedObservation:
            "Undefined-column errors for discount_pct beside migration 119 renaming it to promo_price at 02:00.",
          target: { componentId: "terminal", label: "Terminal - open the journal" },
          actionId: "read-logs",
          commandId: "journalctl",
          conceptId: "database-connection-basics",
        },
        {
          id: "guide-port",
          title: "Check the listening port",
          explanation: "Run ss -tuln and read the listener row.",
          why:
            "The API is reaching a server and being authorized - the listener proves the failure is in what it asks for, not where it asks.",
          expectedObservation: "5432 LISTEN 0.0.0.0 - the API talks to the right server.",
          target: { componentId: "terminal", label: "Terminal - check the listener" },
          actionId: "check-port",
          commandId: "ss",
        },
        {
          id: "guide-service",
          title: "Check the postgresql unit",
          explanation: "Run systemctl status postgresql and read the unit state.",
          why:
            "A migration that destabilized the instance would look like an outage - a stable unit keeps the dispute at the catalog level.",
          expectedObservation: "The unit active (running) since before the migration window.",
          target: { componentId: "terminal", label: "Terminal - check the unit status" },
          actionId: "check-service",
          commandId: "systemctl-status",
        },
        {
          id: "guide-schema",
          title: "Inspect the products table",
          explanation: "From the Checks list, run the products table inspection.",
          why:
            "Both sides read the catalog - showing what exists now next to when it changed turns suspicion into a dated mismatch.",
          expectedObservation:
            "promo_price present and populated while discount_pct is absent; migration 119 is the only catalog change since build 2026.09.21 shipped.",
          target: { componentId: "terminal", label: "Terminal - inspect the table" },
          actionId: "inspect-schema",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-deploy",
          title: "Ship the build that targets the new column",
          explanation: "From Actions, deploy the pricing build written for migration 119.",
          why:
            "The migration was intentional - the lagging side is the application, so moving it forward restores one contract instead of keeping two.",
          expectedObservation: "Build 2026.09.29 running and querying products.promo_price.",
          target: { componentId: "terminal", label: "Terminal - deploy the matching build" },
          actionId: "align-app",
        },
        {
          id: "guide-verify",
          title: "Replay the failing pricing query",
          explanation: "From Actions, run the pricing query check.",
          why:
            "The ticket is 500s from one API - replaying its query through the real path is the honest proof the contract holds again.",
          expectedObservation: "Pricing queries return rows and the API's 500s clear.",
          target: { componentId: "terminal", label: "Terminal - run the pricing check" },
          actionId: "verify-query",
        },
      ],
    },
    actions: [
      {
        id: "read-logs",
        label: "Read DB and app logs",
        kind: "terminal",
        tool: "terminal",
        patch: { db: { logsReviewed: true } },
        feedback:
          "The connection is authorized and the statement fails on a missing column; migration 119 at 02:00 renamed products.discount_pct to products.promo_price.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Undefined-column after authorization means query text and catalog disagree - the migration line names exactly what changed and when.",
          evidenceGain: "Catalog changed under a running app - auth and transport ruled out.",
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
        feedback: "5432 LISTEN 0.0.0.0 - the API reaches the server; only this statement fails.",
        evaluation: {
          grade: "optimal",
          rationale:
            "An open listener with authorized sessions shows the app is talking to the right server - the mismatch is in what it asks for.",
          evidenceGain: "Port open - transport healthy; failure is statement-level.",
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
        feedback: "postgresql active (running) since before 02:00 - the migration did not destabilize the unit.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A migration that took the instance down would present as outages, not object errors - stability keeps the class at catalog versus app expectations.",
          evidenceGain: "Service running - outage from the migration ruled out.",
        },
        matchHints: ["systemctl status postgresql", "systemctl status postgres"],
        component: "service",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "inspect-schema",
        label: "Inspect the products table",
        kind: "inspect",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.credsChecked", value: true },
        patch: { db: { schemaChecked: true } },
        feedback:
          "\\d products shows promo_price (numeric, populated) present and discount_pct absent; migration 119 is the only catalog change since build 2026.09.21 shipped.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The catalog is the contract both sides read - one column present under a new name while the app still asks for the old one turns suspicion into a dated mismatch.",
          evidenceGain: "Column exists under the new name - app build predates the migration.",
        },
        matchHints: ["inspect the table", "describe products", "check the columns"],
        component: "database",
        inspectTarget: "host",
        isDiagnostic: true,
      },
      {
        id: "align-app",
        label: "Deploy the pricing build that targets the new column",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "db.schemaChecked", value: true },
        patch: { db: { appAligned: true } },
        feedback: "Pricing API build 2026.09.29 deployed, querying products.promo_price.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Both sides must read one contract - shipping the build written for migration 119 aligns the app with the catalog the migration intentionally produced.",
          evidenceGain: "App and catalog now agree on the column name.",
        },
        matchHints: ["deploy the matching build", "roll the app forward", "deploy pricing build"],
        component: "app",
        inspectTarget: "service",
        isFix: true,
      },
      {
        id: "verify-query",
        label: "Run the pricing query check",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "db.appAligned", value: true },
        patch: { db: { verified: true } },
        feedback: "Pricing queries return rows through the new column - the API's 500s cleared.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a failing API - replaying its query through the real path proves app and catalog agree again.",
          evidenceGain: "Pricing queries succeed end to end.",
        },
        component: "app",
        inspectTarget: "pool",
        isFix: true,
      },
      {
        id: "recreate-column-wrong",
        label: "Recreate discount_pct for the old build",
        kind: "ui",
        tool: "services",
        feedback:
          "The old build works until the next migration collides with a column the schema no longer owns - two contracts again.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Recreating the replaced column papers over the version skew while pinning the app to a definition the schema intentionally retired.",
        },
        component: "database",
      },
    ],
    successConditions: [{ type: "stateEquals", path: "db.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "db.verified", value: true },
      { type: "stateEquals", path: "db.appAligned", value: true },
      { type: "stateEquals", path: "db.schemaChecked", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["recreate-column-wrong"],
        },
        feedback:
          "Two versions of the schema coexist again - the next scheduled migration collides with the rebuilt column.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "The session is authorized and the statement still fails - the server is telling you about the query text, not the connection.",
      },
      {
        level: 2,
        text: "Port and unit are healthy; ask what the table looks like now versus what the running build was written against.",
      },
      {
        level: 3,
        text: "Catalog and app must read one contract - ship the build written for the new definition instead of rebuilding the old one, then replay the failing query.",
        category: "concept",
      },
    ],
    debrief: {
      rootCause:
        "Migration 119 renamed products.discount_pct to products.promo_price at 02:00 while the pricing API kept running build 2026.09.21, whose queries still reference the old column.",
      whyItWorked:
        "The authorized-but-undefined error placed the failure above auth, the listener and unit checks closed transport and outage classes, and the table inspection showed the renamed column beside the migration timestamp; shipping the build written for the new definition restored a single contract. Transferable principle: a missing-object error on a running system is usually a version skew, not a deletion - compare the catalog against the build's expectations and move the side that lagged, never the one that was intentionally migrated.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid:
            "Journal shows the undefined-column error beside migration 119; checks prove port and unit healthy; inspection shows the renamed column.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Outage, transport, auth and lost-access hypotheses dropped - the session authorizes and the table exists under the new name.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Deployed the pricing build written for migration 119.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Pricing queries returned rows through the real application path.",
        },
      ],
      followUps: [
        "Ship schema migrations and application deploys in one change window with a shared version check.",
      ],
    },
    knowledgeLinks: ["database-connection-basics", "troubleshooting-method"],
    references: [],
  },
];
