import type { ScenarioInput } from "@/content/schema";

export const linuxScenarios: ScenarioInput[] = [
  {
    id: "linux-unit-invalid",
    version: 1,
    title: "Reporting collector will not start after the upgrade",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Read the failing step from systemd status and journal",
      "Compare a unit file's ExecStart with what is installed on disk",
      "Repair unit configuration before restarting the service",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["systemd", "unit-files", "logs"],
    ticket: {
      id: "HD-1066",
      user: "Priya Raman",
      role: "Reporting analyst",
      symptomPlainLanguage:
        "The nightly reporting collector has not started since this morning's upgrade - no reports have landed since.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "The change log shows a clean upgrade and the host reported no problems during it.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel", "services"],
      enabledCommands: ["systemctl", "journalctl", "cat", "ls", "chmod", "help"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "harvest",
            name: "harvest",
            status: "failed",
            description: "Reporting collector",
            lastError: [
              "status=203/EXEC - Failed to execute command",
              "Unit harvest.service entered failed state.",
            ],
          },
        ],
        logs: [
          "Sep 29 06:00:04 srv05 systemd[1]: Starting harvest.service - Reporting collector...",
          "Sep 29 06:00:04 srv05 systemd[1]: harvest.service: Failed at step EXEC spawning /opt/harvest/bin/run.sh: No such file or directory",
          "Sep 29 06:00:04 srv05 systemd[1]: Failed to start harvest.service - Reporting collector.",
          "Sep 29 06:00:05 srv05 systemd[1]: harvest.service: Unit entered failed state.",
          "Sep 29 06:00:05 srv05 systemd[1]: harvest.service: Failed with result exit-code.",
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              mode: "755",
              owner: "root",
              group: "root",
              children: {
                systemd: {
                  type: "dir",
                  name: "systemd",
                  mode: "755",
                  children: {
                    system: {
                      type: "dir",
                      name: "system",
                      mode: "755",
                      children: {
                        "harvest.service": {
                          type: "file",
                          name: "harvest.service",
                          mode: "644",
                          owner: "root",
                          group: "root",
                          content:
                            "[Unit]\nDescription=Reporting collector\nAfter=network.target\n\n[Service]\nType=simple\nExecStart=/opt/harvest/bin/run.sh\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
                        },
                      },
                    },
                  },
                },
              },
            },
            opt: {
              type: "dir",
              name: "opt",
              mode: "755",
              children: {
                harvest: {
                  type: "dir",
                  name: "harvest",
                  mode: "755",
                  children: {
                    bin: {
                      type: "dir",
                      name: "bin",
                      mode: "755",
                      children: {
                        harvestd: {
                          type: "file",
                          name: "harvestd",
                          mode: "755",
                          owner: "root",
                          group: "root",
                          content: "#!/bin/sh\nexec /opt/app/harvestd --collect\n",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        svc: {
          confReadable: false,
          statusSeen: false,
          journalRead: false,
          unitRead: false,
          binSeen: false,
          unitFixed: false,
          running: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-exec",
        label: "The unit file points at a program that no longer exists",
        initiallyPlausible: true,
      },
      {
        id: "h-perm",
        label: "The collector binary lost its execute permission",
        initiallyPlausible: true,
      },
      {
        id: "h-dep",
        label: "The service starts before its database dependency is ready",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      intro:
        "Work outward from what systemd itself recorded: the status names the step, the journal names the path, the unit file shows what systemd will run next time.",
      steps: [
{
            id: "guide-unit-status",
            title: "Read how systemd reports the unit",
            explanation: "Run systemctl status harvest in the terminal and read the failure line.",
            why: "systemd records the step it failed at, so the status separates an execution failure from a crash or a dependency wait before anyone guesses.",
            expectedObservation:
              "The unit is failed with status=203/EXEC - Failed to execute command.",
            target: { componentId: "terminal", label: "Terminal" },
            actionId: "unit-status",
            commandId: "systemctl-status",
            conceptId: "systemd-service-basics",
          },
          {
            id: "guide-unit-journal",
            title: "Read what systemd tried to launch",
            explanation: "Run journalctl -u harvest and find the line from this morning's start attempt.",
            why: "The journal names the exact path systemd tried to spawn, turning a generic step code into a specific object to check.",
            expectedObservation:
              "Failed at step EXEC spawning /opt/harvest/bin/run.sh: No such file or directory.",
            target: { componentId: "terminal", label: "Terminal" },
            actionId: "unit-journal",
            commandId: "journalctl",
          },
          {
            id: "guide-unit-file",
            title: "Read the unit file's ExecStart line",
            explanation:
              "Open the Filesystem tab and read /etc/systemd/system/harvest.service.",
            why: "The unit file is what systemd reads on the next start - it decides which path must exist, whatever the upgrade installed.",
            expectedObservation:
              "ExecStart still names /opt/harvest/bin/run.sh, a path that no longer exists.",
            target: { componentId: "filesystem", label: "Filesystem tab (harvest.service)" },
            actionId: "read-unit-file",
            commandId: "cat",
            fallback: "the Filesystem tab in the Linux workstation panel",
          },
          {
            id: "guide-fix-unit",
            title: "Point the unit at the installed binary",
            explanation: "From Actions, run Point ExecStart at /opt/harvest/bin/harvestd.",
            why: "A configuration change only reaches systemd through the unit file, so the stale path must be corrected there rather than around it.",
            expectedObservation: "The unit file now names harvestd as the program to run.",
            target: { componentId: "service-manager", label: "Services tab (unit fix)" },
            actionId: "fix-execstart",
            fallback: "the Actions drawer in the bottom dock",
          },
          {
            id: "guide-restart-harvest",
            title: "Restart the unit",
            explanation: "From Actions, run systemctl restart harvest.",
            why: "A restarted unit re-reads its file and starts the process again under the corrected configuration.",
            expectedObservation: "The Services tab shows harvest as active (running).",
            target: { componentId: "service-manager", label: "Services tab (harvest unit)" },
            actionId: "restart-harvest",
            commandId: "systemctl-restart",
            fallback: "the Actions drawer in the bottom dock",
          },
        {
          id: "guide-verify-collector",
          title: "Verify a collection actually lands",
          explanation: "From Actions, run the collector verification.",
          why: "The ticket is about missing reports, so only a completed collection proves the symptom is gone rather than the unit flag.",
          expectedObservation:
            "A run completes and the rows land in the reporting store.",
          target: { componentId: "service-manager", label: "Services tab (collector run)" },
          actionId: "verify-collector",
          conceptId: "troubleshooting-method",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "unit-status",
        label: "systemctl status harvest",
        kind: "terminal",
        tool: "terminal",
        patch: { svc: { statusSeen: true } },
        feedback:
          "harvest.service is failed: status=203/EXEC - Failed to execute command, unit entered failed state.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The unit's own status names the step systemd failed at, so the first reading separates an execution failure from a crash or a dependency wait.",
          evidenceGain: "Failed at EXEC - the process never started; crash and dependency hypotheses ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["systemctl status", "unit status", "harvest status"],
      },
      {
        id: "unit-journal",
        label: "journalctl -u harvest",
        kind: "terminal",
        tool: "terminal",
        patch: { svc: { journalRead: true } },
        feedback:
          "Journal: Failed at step EXEC spawning /opt/harvest/bin/run.sh: No such file or directory - the unit tried to run a path that is gone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Status says which step failed; the journal names the exact path it tried to spawn, which is the fact the fix must address.",
          evidenceGain: "Missing ExecStart path named in the journal - permission and dependency hypotheses ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "unit journal"],
      },
      {
        id: "read-unit-file",
        label: "cat /etc/systemd/system/harvest.service",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/etc/systemd/system/harvest.service",
        patch: { svc: { unitRead: true } },
        feedback:
          "ExecStart=/opt/harvest/bin/run.sh - the unit still points at the script the upgrade replaced.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The unit file is the contract systemd reads on the next start, so its ExecStart line is where a stale path lives.",
          evidenceGain: "Unit file holds the stale ExecStart - cause located in configuration.",
        },
        isDiagnostic: true,
        matchHints: ["unit file", "execstart", "harvest service file"],
      },
      {
        id: "list-bin-dir",
        label: "List the collector binary directory",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/opt/harvest/bin",
        patch: { svc: { binSeen: true } },
        feedback:
          "The directory holds harvestd only - run.sh is gone, so the unit's ExecStart has nothing to launch.",
        evaluation: {
          grade: "good",
          rationale:
            "Listing the directory confirms which program actually exists now, so the corrected ExecStart is chosen from disk rather than from memory.",
          evidenceGain: "harvestd present, run.sh absent - the replacement binary is identified.",
        },
        isDiagnostic: true,
        matchHints: ["ls /opt/harvest/bin", "collector binary directory", "installed binary"],
      },
      {
        id: "fix-execstart",
        label: "Point ExecStart at /opt/harvest/bin/harvestd",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "svc.statusSeen", value: true },
            { type: "stateEquals", path: "svc.journalRead", value: true },
            { type: "stateEquals", path: "svc.unitRead", value: true },
          ],
        },
        patch: {
          svc: { unitFixed: true, confReadable: true },
          fs: {
            children: {
              etc: {
                children: {
                  systemd: {
                    children: {
                      system: {
                        children: {
                          "harvest.service": {
                            content:
                              "[Unit]\nDescription=Reporting collector\nAfter=network.target\n\n[Service]\nType=simple\nExecStart=/opt/harvest/bin/harvestd\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
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
        feedback:
          "ExecStart now launches harvestd, the binary the upgrade installed in place of run.sh.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The evidence showed systemd running a path that no longer exists - correcting ExecStart repairs the contract instead of working around it.",
          evidenceGain: "Unit configuration now matches what is installed on disk.",
        },
        isFix: true,
      },
      {
        id: "restart-harvest",
        label: "systemctl restart harvest",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "svc.unitFixed", value: true },
        patch: {
          svc: { running: true },
          services: [
            {
              id: "harvest",
              name: "harvest",
              status: "active (running)",
              pid: 2143,
              description: "Reporting collector",
              lastError: [],
            },
          ],
        },
        feedback: "harvest.service is active (running) - the collector process is up.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A corrected unit file reaches systemd only when the unit starts again and re-reads it, so the restart is what applies the fix.",
          evidenceGain: "Unit started with the corrected ExecStart.",
        },
        isFix: true,
      },
      {
        id: "verify-collector",
        label: "Verify the collector delivers a run",
        kind: "ui",
        tool: "terminal",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "svc.unitFixed", value: true },
            { type: "stateEquals", path: "svc.running", value: true },
          ],
        },
        patch: { svc: { verified: true } },
        feedback:
          "The 07:00 collection completed and 1,204 rows landed in the reporting store.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket was about reports that never arrived, so only a completed collection proves the reported symptom is gone.",
          evidenceGain: "A full collection lands in the store - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "chmod-binary-wrong",
        label: "chmod 755 the collector startup script",
        kind: "ui",
        tool: "terminal",
        feedback:
          "run.sh does not exist, so no mode can be set on it - the unit points at a path the upgrade removed.",
        evaluation: {
          grade: "wrong",
          rationale:
            "A permission problem reports EACCES, not a missing file; the journal says the path itself is gone, so the change belongs in the unit file.",
        },
        matchHints: ["run.sh"],
      },
    ],
    successConditions: [{ type: "stateEquals", path: "svc.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "svc.verified", value: true },
      { type: "stateEquals", path: "svc.unitFixed", value: true },
      { type: "stateEquals", path: "svc.running", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["chmod-binary-wrong"] },
        feedback:
          "The journal said the file is missing, not that it is unexecutable - a mode change cannot fix a path that does not exist.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Start with what systemd itself records about the unit.",
        category: "tool",
      },
      {
        level: 2,
        text: "The status names the step that failed; the journal says what it was trying to launch.",
      },
      {
        level: 3,
        text: "Compare the ExecStart line with the directory listing - one of them no longer matches reality, and the unit file is what systemd reads.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "The upgrade replaced /opt/harvest/bin/run.sh with harvestd but left the unit file's ExecStart pointing at the old script, so systemd failed at EXEC on every start attempt.",
      whyItWorked:
        "Status showed the failing step, the journal named the missing path, the unit file revealed the stale ExecStart, and correcting it let the restart succeed with a completed collection proving the fix. Transferable principle: status=203/EXEC means the program path is wrong - repair the unit file before restarting.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Status showed 203/EXEC; the journal named the missing run.sh path.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Permission hypothesis dropped - a missing path cannot be chmod'ed; dependency hypothesis dropped - the unit never reached its After= target because EXEC failed first.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "ExecStart corrected to harvestd and the unit restarted.",
        },
        {
          step: "Verify",
          whatLearnerDid: "A collection completed and rows landed in the reporting store.",
        },
      ],
      followUps: [
        "Ship unit files inside the upgrade package so ExecStart moves with the binary.",
      ],
    },
    knowledgeLinks: ["systemd-service-basics", "troubleshooting-method"],
    references: [
      {
        title: "systemd.service - unit file directives",
        url: "https://www.freedesktop.org/software/systemd/man/systemd.service.html",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-ssh-key-perms",
    version: 1,
    title: "SSH sign-in rejected for the deploy account",
    category: "linux",
    difficulty: "beginner",
    scenarioType: "CONFIGURATION_ERROR",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read the refusal reason sshd writes to the journal",
      "Inspect the mode of the file sshd names",
      "Apply the smallest permission change that restores key sign-in",
    ],
    prerequisites: ["linux-permission-denied"],
    skills: ["linux-permissions", "ssh", "logs"],
    ticket: {
      id: "HD-1067",
      user: "Nadia Berg",
      role: "Release engineer",
      symptomPlainLanguage:
        "Our deploy bot can no longer sign in over SSH - every key attempt is refused even though the key itself is unchanged.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "Password sign-in for the same account still works, so the account itself is not locked out.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel"],
      enabledCommands: ["ls", "cat", "grep", "chmod", "journalctl", "help"],
      components: ["filesystem"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        logs: [
          "Sep 29 07:41:12 srv06 sshd[1441]: Accepted password for deploy from 10.0.0.52 port 51422",
          "Sep 29 09:02:44 srv06 sshd[1503]: Authentication refused: bad ownership or modes for authentication file /home/deploy/.ssh/authorized_keys",
          "Sep 29 09:02:44 srv06 sshd[1503]: Failed publickey for deploy from 10.0.0.52 port 51988",
          "Sep 29 09:03:01 srv06 sshd[1503]: Failed publickey for deploy from 10.0.0.52 port 51990",
        ],
        users: [
          { name: "root", uid: 0, gid: 0, group: "root", groups: ["root", "sudo"] },
          { name: "deploy", uid: 1000, gid: 1000, group: "deploy", groups: ["deploy", "users"] },
        ],
        groups: [
          { name: "root", gid: 0 },
          { name: "deploy", gid: 1000 },
          { name: "users", gid: 100 },
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              mode: "755",
              children: {
                ssh: {
                  type: "dir",
                  name: "ssh",
                  mode: "755",
                  children: {
                    sshd_config: {
                      type: "file",
                      name: "sshd_config",
                      mode: "644",
                      owner: "root",
                      group: "root",
                      content:
                        "StrictModes yes\nPubkeyAuthentication yes\nPasswordAuthentication yes\n",
                    },
                  },
                },
              },
            },
            home: {
              type: "dir",
              name: "home",
              mode: "755",
              children: {
                deploy: {
                  type: "dir",
                  name: "deploy",
                  mode: "755",
                  owner: "deploy",
                  group: "deploy",
                  children: {
                    ".ssh": {
                      type: "dir",
                      name: ".ssh",
                      mode: "700",
                      owner: "deploy",
                      group: "deploy",
                      children: {
                        "authorized_keys": {
                          type: "file",
                          name: "authorized_keys",
                          mode: "664",
                          owner: "deploy",
                          group: "deploy",
                          content:
                            "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG7r2fQ8kL9xT1mV4pS6nB3cD5eF7gH0jK2lM4oN6pQ deploy-bot@ci\n",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        perms: {
          journalRead: false,
          modeSeen: false,
          keyFixed: false,
          loginVerified: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-mode",
        label: "sshd rejects the key file's permissions",
        initiallyPlausible: true,
      },
      {
        id: "h-key-removed",
        label: "The public key was removed from authorized_keys",
        initiallyPlausible: true,
      },
      {
        id: "h-net",
        label: "Network filtering blocks the SSH port",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      intro:
        "Let sshd explain its own refusal, read the file it names, tighten only that file, then prove a key sign-in succeeds.",
      steps: [
        {
          id: "guide-sshd-journal",
          title: "Read why sshd refused the key",
          explanation: "Run journalctl -u sshd and find this morning's refusal lines.",
          why: "sshd records the exact reason it refused authentication, so the journal names the object to inspect instead of leaving a generic failure.",
          expectedObservation:
            "Authentication refused: bad ownership or modes for authentication file /home/deploy/.ssh/authorized_keys, while password sign-in was accepted.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "sshd-journal",
          commandId: "journalctl",
          conceptId: "linux-permissions-basics",
        },
        {
          id: "guide-key-mode",
          title: "Read the key file's mode and owner",
          explanation:
            "List authorized_keys with its permissions from the Filesystem tab or the terminal.",
          why: "Mode and ownership are what sshd compared against its policy - reading them turns a refusal message into a measurable fact.",
          expectedObservation: "authorized_keys is mode 664, owned by deploy:deploy.",
          target: {
            componentId: "filesystem",
            label: "Filesystem tab (authorized_keys)",
          },
          actionId: "key-mode-ls",
          commandId: "ls",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-fix-key-mode",
          title: "Tighten the key file to owner-only access",
          explanation: "From Actions, run Set authorized_keys to owner-only mode 600.",
          why: "A private-key material file must be readable by nobody but its owner - restoring that mode satisfies sshd without touching the key contents.",
          expectedObservation: "The file's mode becomes 600 with deploy as owner.",
          target: { componentId: "filesystem", label: "Filesystem tab (mode fix)" },
          actionId: "fix-key-mode",
          conceptId: "least-privilege-basics",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-ssh",
          title: "Verify a key sign-in succeeds",
          explanation: "From Actions, run the SSH sign-in verification for the deploy account.",
          why: "The ticket is about refused key sign-in, so only a fresh authentication proves the symptom is gone.",
          expectedObservation:
            "A publickey sign-in is accepted with no ownership warnings in the journal.",
          target: { componentId: "terminal", label: "Terminal (sign-in test)" },
          actionId: "verify-ssh-key",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "sshd-journal",
        label: "journalctl -u sshd",
        kind: "terminal",
        tool: "terminal",
        patch: { perms: { journalRead: true } },
        feedback:
          "Journal: Authentication refused - bad ownership or modes for /home/deploy/.ssh/authorized_keys. Publickey attempts fail while a password sign-in was accepted.",
        evaluation: {
          grade: "optimal",
          rationale:
            "sshd states why it refused authentication, and the accepted password line rules out a locked account or a blocked port.",
          evidenceGain:
            "Refusal tied to one file's modes while password sign-in succeeds - account and network hypotheses ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "sshd log"],
      },
      {
        id: "key-mode-ls",
        label: "ls -l /home/deploy/.ssh/authorized_keys",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/home/deploy/.ssh/authorized_keys",
        patch: { perms: { modeSeen: true } },
        feedback:
          "-rw-rw-r-- deploy deploy authorized_keys - the key file is writable by the group and readable by everyone.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal named the file; its mode string is the measurable fact sshd compared against policy.",
          evidenceGain: "authorized_keys is group-writable - the refused mode confirmed on disk.",
        },
        isDiagnostic: true,
        matchHints: ["ls -l", "file mode", "key permissions"],
      },
      {
        id: "fix-key-mode",
        label: "Set authorized_keys to owner-only mode 600",
        kind: "ui",
        tool: "file-panel",
        inspectTarget: "/home/deploy/.ssh/authorized_keys",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "perms.journalRead", value: true },
            { type: "stateEquals", path: "perms.modeSeen", value: true },
          ],
        },
        patch: {
          perms: { keyFixed: true },
          fs: {
            children: {
              home: {
                children: {
                  deploy: {
                    children: {
                      ".ssh": {
                        children: {
                          "authorized_keys": { mode: "600" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        feedback: "authorized_keys is now mode 600 - readable and writable by deploy only.",
        evaluation: {
          grade: "optimal",
          rationale:
            "sshd refuses key files the owner does not control exclusively; owner-only mode restores that guarantee without changing the key itself.",
          evidenceGain: "Key file restricted to its owner - sshd's ownership policy satisfied.",
        },
        isFix: true,
        matchHints: ["chmod 600", "owner-only mode"],
      },
      {
        id: "verify-ssh-key",
        label: "Verify SSH sign-in for the deploy account",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "perms.keyFixed", value: true },
        patch: { perms: { loginVerified: true } },
        feedback:
          "A fresh publickey sign-in for deploy is accepted and the journal records no ownership warnings.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The bot's key sign-in is what failed, so repeating that exact authentication is the honest end-to-end proof.",
          evidenceGain: "Key sign-in accepted - reported symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "disable-strictmodes-wrong",
        label: "Disable StrictModes checking in sshd",
        kind: "ui",
        tool: "file-panel",
        feedback:
          "sshd would then accept a key file anyone on the host can read, hiding the bad mode instead of fixing it.",
        evaluation: {
          grade: "harmful",
          rationale:
            "Turning off the ownership check removes a protection to mask a symptom; the evidence already named one file with a fixable mode.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "perms.loginVerified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "perms.loginVerified", value: true },
      { type: "stateEquals", path: "perms.keyFixed", value: true },
    ],
    wrongPaths: [
      {
        when: {
          type: "stateEquals",
          path: "appliedActions",
          value: ["disable-strictmodes-wrong"],
        },
        feedback:
          "Password sign-in still works for this account - loosening sshd policy would hide the mode problem rather than repair it.",
      },
    ],
    hints: [
      { level: 1, text: "sshd records why it refuses a key - start in the journal.", category: "tool" },
      {
        level: 2,
        text: "Read the mode of the exact file sshd named, not the key's contents.",
        category: "concept",
      },
      {
        level: 3,
        text: "A key file the group or the world can write is refused by design - tighten it to what the owner needs, then prove a sign-in.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "A maintenance job left authorized_keys at mode 664, so sshd refused publickey authentication for the deploy account while password sign-in kept working.",
      whyItWorked:
        "The journal named the refused file, the listing measured its mode, and owner-only mode restored the exclusivity sshd requires before a fresh sign-in proved the fix. Transferable principle: when one authentication method fails and another succeeds, compare what each path checks - here, only the key path checks file modes.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Journal showed the refused file; the listing showed mode 664.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Account lockout dropped - password sign-in was accepted; network filtering dropped - TCP and password auth both reach the daemon; missing key dropped - sshd read the file and refused its modes.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "authorized_keys restricted to mode 600 for deploy.",
        },
        {
          step: "Verify",
          whatLearnerDid: "A fresh publickey sign-in succeeded with no refusal logged.",
        },
      ],
      followUps: [
        "Find which maintenance job relaxed the mode so it stops undoing the fix.",
      ],
    },
    knowledgeLinks: ["linux-permissions-basics", "least-privilege-basics"],
    references: [
      {
        title: "OpenBSD sshd_config - StrictModes",
        url: "https://man.openbsd.org/sshd_config",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-inode-exhaustion",
    version: 1,
    title: "Mail delivery stops while the volume still shows free space",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "RESOURCE_EXHAUSTION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Distinguish block usage from inode usage on one volume",
      "Trace ENOSPC from the journal to the directory owning the entries",
      "Reclaim the exhausted resource instead of adding capacity",
    ],
    prerequisites: ["linux-disk-full"],
    skills: ["disk-space", "inodes", "logs"],
    ticket: {
      id: "HD-1068",
      user: "Owen Pryce",
      role: "Messaging owner",
      symptomPlainLanguage:
        "Messages have been sitting undelivered all morning - the mail service reports it is out of space, yet the volume is barely half full.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "Nothing was deployed and no config changed; the volume was cleaned out last week.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel", "services"],
      enabledCommands: ["df", "journalctl", "cat", "ls", "help"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        disks: [
          {
            fs: "/dev/sda2",
            size: "419G",
            used: "205G",
            avail: "193G",
            usePercent: "51%",
            mount: "/",
          },
        ],
        services: [
          {
            id: "maild",
            name: "maild",
            status: "failed",
            description: "Local mail delivery",
            lastError: ["deferred: No space left on device"],
          },
        ],
        logs: [
          "Sep 29 08:12:40 srv07 maild[901]: write(/var/mail/queue/deferred/5510): No space left on device",
          "Sep 29 08:12:40 srv07 maild[901]: deferred 41 messages, retry in 30 min",
          "Sep 29 08:15:02 srv07 maild[901]: queue scan complete: 41 deferred, 0 delivered",
          "Sep 29 08:47:11 srv07 maild[901]: write(/var/mail/queue/deferred/5513): No space left on device",
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            var: {
              type: "dir",
              name: "var",
              mode: "755",
              children: {
                mail: {
                  type: "dir",
                  name: "mail",
                  mode: "755",
                  children: {
                    queue: {
                      type: "dir",
                      name: "queue",
                      mode: "755",
                      children: {
                        deferred: {
                          type: "dir",
                          name: "deferred",
                          mode: "750",
                          owner: "mail",
                          group: "mail",
                          children: {
                            "5510": {
                              type: "file",
                              name: "5510",
                              mode: "640",
                              owner: "mail",
                              group: "mail",
                              content: "To: fin@contoso.test\nSubject: invoice run\n",
                            },
                            "5511": {
                              type: "file",
                              name: "5511",
                              mode: "640",
                              owner: "mail",
                              group: "mail",
                              content: "To: ops@contoso.test\nSubject: nightly digest\n",
                            },
                            "5513": {
                              type: "file",
                              name: "5513",
                              mode: "640",
                              owner: "mail",
                              group: "mail",
                              content: "To: audit@contoso.test\nSubject: access report\n",
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
        ino: {
          dfSeen: false,
          inodeSeen: false,
          journalSeen: false,
          purged: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-blocks", label: "The volume ran out of block space", initiallyPlausible: true },
      {
        id: "h-inodes",
        label: "The volume ran out of file entries (inodes)",
        initiallyPlausible: true,
      },
      { id: "h-perm", label: "The queue directory lost write access", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Two capacity counters live on one volume - read the block figure the ticket quotes, then read the counter the journal is really complaining about.",
      steps: [
        {
          id: "guide-df-blocks",
          title: "Read block usage on the volume",
          explanation: "Run df in the terminal and read the Used and Avail columns.",
          why: "df is the figure everyone quotes for 'out of space', so measuring it first establishes whether blocks are actually the constraint.",
          expectedObservation: "/dev/sda2 is 51% used with 193G available.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "df-blocks",
          commandId: "df",
          conceptId: "troubleshooting-method",
        },
        {
          id: "guide-df-inodes",
          title: "Read inode usage on the same volume",
          explanation: "Run the inode check from the Checks list and read IUse%.",
          why: "Every file consumes an entry from the inode table as well as blocks - the second counter can be exhausted while the first still looks healthy.",
          expectedObservation:
            "IUse% is 97%: 262,112 of 270,000 inodes used, with blocks still at 51%.",
          target: { componentId: "filesystem", label: "Checks list in the Linux workstation panel" },
          actionId: "check-inodes",
          commandId: "df",
          fallback: "the Checks list at the bottom of the Linux workstation panel",
        },
        {
          id: "guide-mail-journal",
          title: "Read the mail service journal",
          explanation: "Run journalctl -u maild and read this morning's delivery failures.",
          why: "The journal shows which operation returned ENOSPC, so the counter you just read can be tied to a specific write.",
          expectedObservation:
            "Writes to /var/mail/queue/deferred fail with No space left on device while 0 messages deliver.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "mail-logs",
          commandId: "journalctl",
        },
        {
          id: "guide-purge-spool",
          title: "Clear the entries that own the exhausted counter",
          explanation: "From Actions, run Purge the deferred mail spool.",
          why: "Reclaiming the entries the queue owns treats the counter that actually filled; growing the volume would only add the counter that was never short.",
          expectedObservation:
            "IUse% drops to 43% with block usage unchanged at 51%.",
          target: { componentId: "filesystem", label: "Filesystem tab (deferred spool)" },
          actionId: "purge-deferred",
          conceptId: "disk-space-slow-pc",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-delivery",
          title: "Verify queued mail delivers",
          explanation: "From Actions, run the delivery verification.",
          why: "The ticket is about undelivered messages, so only a run that clears the queue proves the symptom is gone.",
          expectedObservation:
            "The mail service is active and the 41 queued messages are delivered.",
          target: { componentId: "service-manager", label: "Services tab (maild)" },
          actionId: "verify-delivery",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "df-blocks",
        label: "df",
        kind: "terminal",
        tool: "terminal",
        patch: { ino: { dfSeen: true } },
        feedback:
          "/dev/sda2 is 51% used with 193G available - block space is not the constraint.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket reports ENOSPC, so the filesystem's own block figure is the first fact to establish before accepting any space explanation.",
          evidenceGain: "193G free - block exhaustion ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["disk usage", "df -h", "block usage"],
      },
      {
        id: "check-inodes",
        label: "df -i",
        kind: "terminal",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "ino.dfSeen", value: true },
        patch: { ino: { inodeSeen: true } },
        feedback:
          "IUse% is 97%: 262,112 of 270,000 inodes used - blocks are free, but the table that tracks files is full.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A volume tracks file entries separately from blocks; reading the second counter is what explains ENOSPC beside 193G free.",
          evidenceGain: "Inode table at 97% while blocks sit at 51% - the exhausted counter identified.",
        },
        isDiagnostic: true,
        matchHints: ["inodes", "inode table"],
      },
      {
        id: "mail-logs",
        label: "journalctl -u maild",
        kind: "terminal",
        tool: "terminal",
        patch: { ino: { journalSeen: true } },
        feedback:
          "Journal: maild writes into /var/mail/queue/deferred fail with ENOSPC and every message is deferred - and no line ever reports blocks being full.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal ties the ENOSPC to the operation that failed, linking the exhausted counter to a specific directory.",
          evidenceGain: "ENOSPC on queue writes with blocks free - the failing operation is named.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "mail logs"],
      },
      {
        id: "purge-deferred",
        label: "Purge the deferred mail spool",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "ino.dfSeen", value: true },
            { type: "stateEquals", path: "ino.inodeSeen", value: true },
            { type: "stateEquals", path: "ino.journalSeen", value: true },
          ],
        },
        patch: { ino: { purged: true } },
        feedback:
          "41 deferred messages cleared from the spool - IUse% drops to 43% while block usage stays at 51%.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The entries the queue accumulated own the exhausted counter, so clearing them reclaims exactly the resource that ran out.",
          evidenceGain: "Inode counter reclaimed with block usage untouched - the right resource freed.",
        },
        isFix: true,
      },
      {
        id: "verify-delivery",
        label: "Verify queued mail delivers",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "ino.purged", value: true },
        patch: {
          ino: { verified: true },
          services: [
            {
              id: "maild",
              name: "maild",
              status: "active (running)",
              pid: 901,
              description: "Local mail delivery",
              lastError: [],
            },
          ],
        },
        feedback:
          "The mail service is active and the 41 queued messages delivered; IUse% now reads 43%.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is about messages that never arrived, so draining the queue under real service state is the end-to-end proof.",
          evidenceGain: "Queue drained and service running - delivery restored.",
        },
        isFix: true,
      },
      {
        id: "grow-volume-wrong",
        label: "Grow the volume to add free space",
        kind: "ui",
        tool: "services",
        feedback:
          "Block space is already at 193G free - growing the volume adds blocks, and the blocks were never what ran out.",
        evaluation: {
          grade: "premature",
          rationale:
            "The evidence contradicts the premise: one counter is full and the other has half the disk spare, so capacity expansion solves nothing.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ino.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ino.verified", value: true },
      { type: "stateEquals", path: "ino.purged", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["grow-volume-wrong"] },
        feedback:
          "Blocks are already half free - adding capacity cannot create file entries.",
      },
    ],
    hints: [
      { level: 1, text: "Start with what the filesystem itself reports about capacity." },
      {
        level: 2,
        text: "The journal says ENOSPC but df disagrees - one of the two counters on that volume is exhausted.",
        category: "concept",
      },
      {
        level: 3,
        text: "Blocks hold file contents and inodes hold file entries: count the entries, then clear the queue that owns them.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "The deferred queue had accumulated enough files to exhaust the root filesystem's inode table at 97% while block usage sat at 51%, so every new queue file failed with ENOSPC.",
      whyItWorked:
        "df proved blocks were not short, the inode counter named the exhausted resource, and the journal tied it to the deferred directory that owned the entries - so clearing that queue reclaimed inodes without touching capacity. Transferable principle: ENOSPC is not always blocks; df and df -i report different ceilings on the same volume.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "df showed 193G free; the inode counter read 97%; the journal named queue writes.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Block-space hypothesis dropped - 193G available while ENOSPC continued; permission hypothesis dropped - the same service writes elsewhere fine.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Purged the 41 deferred messages holding the exhausted entries.",
        },
        {
          step: "Verify",
          whatLearnerDid: "Queue drained under an active service; IUse% back to 43%.",
        },
      ],
      followUps: [
        "Alert on inode usage as well as block usage so this counter is never invisible.",
        "Ask why the queue kept 41 failed messages instead of bouncing them.",
      ],
    },
    knowledgeLinks: ["disk-space-slow-pc", "troubleshooting-method"],
    references: [],
  },
  {
    id: "linux-fs-readonly",
    version: 1,
    title: "App keeps crashing with read-only filesystem errors",
    category: "linux",
    difficulty: "intermediate",
    scenarioType: "RECOVERY",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 15,
    learningObjectives: [
      "Find the kernel event that forced a read-only remount",
      "Confirm the mount state before blaming the application",
      "Repair the filesystem, restore read-write, then prove the write",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["filesystems", "logs", "recovery"],
    ticket: {
      id: "HD-1069",
      user: "Ivy Chan",
      role: "Application owner",
      symptomPlainLanguage:
        "The order API restarted itself three times last night and now every save fails with 'Read-only file system'.",
      priority: "high",
      channel: "portal",
      additionalContext:
        "The host never rebooted, and the same volume accepted writes cleanly two days ago.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel", "services"],
      enabledCommands: ["journalctl", "cat", "df", "ls", "help"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        disks: [
          {
            fs: "/dev/sda2",
            size: "199G",
            used: "123G",
            avail: "68G",
            usePercent: "62%",
            mount: "/",
          },
        ],
        services: [
          {
            id: "app",
            name: "app",
            status: "failed",
            description: "Order API",
            lastError: ["write /var/lib/app/state.json: Read-only file system"],
          },
        ],
        logs: [
          "Sep 29 03:11:44 srv02 kernel: Buffer I/O error on dev sda2, logical block 88213, lost sync page write",
          "Sep 29 03:11:44 srv02 kernel: Aborting journal on device sda2-8.",
          "Sep 29 03:11:45 srv02 kernel: EXT4-fs (sda2): Remounting filesystem read-only",
          "Sep 29 03:11:52 srv02 app[7712]: write /var/lib/app/state.json: Read-only file system",
          "Sep 29 03:12:03 srv02 systemd[1]: app.service: Failed with result 'exit-code'.",
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            proc: {
              type: "dir",
              name: "proc",
              mode: "555",
              children: {
                mounts: {
                  type: "file",
                  name: "mounts",
                  mode: "644",
                  owner: "root",
                  group: "root",
                  content:
                    "/dev/sda2 / ext4 ro,relatime 0 0\ntmpfs /run tmpfs ro,nosuid,nodev 0 0\n",
                },
              },
            },
            etc: {
              type: "dir",
              name: "etc",
              mode: "755",
              children: {
                app: {
                  type: "dir",
                  name: "app",
                  mode: "755",
                  children: {
                    "runtime.conf": {
                      type: "file",
                      name: "runtime.conf",
                      mode: "644",
                      owner: "app",
                      group: "app",
                      content: "state_file: /var/lib/app/state.json\ncache_dir: /var/lib/app/cache\n",
                    },
                  },
                },
              },
            },
            var: {
              type: "dir",
              name: "var",
              mode: "755",
              children: {
                lib: {
                  type: "dir",
                  name: "lib",
                  mode: "755",
                  children: {
                    app: {
                      type: "dir",
                      name: "app",
                      mode: "755",
                      owner: "app",
                      group: "app",
                      children: {
                        "state.json": {
                          type: "file",
                          name: "state.json",
                          mode: "640",
                          owner: "app",
                          group: "app",
                          content: "{\"orders\": 11822}\n",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ro: {
          journalSeen: false,
          mountsSeen: false,
          dfSeen: false,
          fsckDone: false,
          rwRestored: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-ro",
        label: "The kernel remounted the volume read-only",
        initiallyPlausible: true,
      },
      {
        id: "h-app",
        label: "The application runs as a user that cannot write",
        initiallyPlausible: true,
      },
      { id: "h-full", label: "The volume filled up overnight", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Find what the kernel did to the volume, confirm the mount state it reports, rule out capacity, then repair and restore writes.",
      steps: [
        {
          id: "guide-kernel-journal",
          title: "Read the kernel log from the incident window",
          explanation: "Run journalctl -k and read the entries from 03:11 last night.",
          why: "Only the kernel can remount a volume read-only, and it always says why - the system log is where that decision is recorded.",
          expectedObservation:
            "A buffer I/O error is followed by an aborted journal and EXT4-fs remounting the filesystem read-only.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "kernel-journal",
          commandId: "journalctl",
        },
        {
          id: "guide-read-mounts",
          title: "Read the current mount state",
          explanation: "Read /proc/mounts from the Filesystem tab.",
          why: "The kernel log explains the decision; the mount table shows the state the system is actually in right now.",
          expectedObservation: "The root entry reads ro,relatime - the volume is mounted read-only.",
          target: { componentId: "filesystem", label: "Filesystem tab (/proc/mounts)" },
          actionId: "read-mounts",
          commandId: "cat",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-df-readonly",
          title: "Rule out capacity",
          explanation: "Run df in the terminal and read the root volume's usage.",
          why: "A full volume also produces write failures, so measuring it keeps a capacity problem from masquerading as this one.",
          expectedObservation: "/dev/sda2 is 62% used with 68G free - capacity is not the blocker.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "df-check",
          commandId: "df",
        },
        {
          id: "guide-run-fsck",
          title: "Repair the filesystem",
          explanation: "From Actions, run the filesystem check on the root filesystem.",
          why: "The journal was aborted mid-write, so the filesystem must be checked and its journal replayed before it can safely accept writes again.",
          expectedObservation:
            "The check completes and reports the journal replayed cleanly.",
          target: {
            componentId: "filesystem",
            label: "Linux workstation panel (filesystem check)",
          },
          actionId: "run-fsck",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-remount-rw",
          title: "Put the volume back read-write",
          explanation: "From Actions, run Remount the root filesystem read-write.",
          why: "A repaired filesystem still stays read-only until it is explicitly remounted - the mount state only changes when someone asks.",
          expectedObservation: "/proc/mounts now reads rw,relatime for the root volume.",
          target: {
            componentId: "filesystem",
            label: "Filesystem tab (/proc/mounts after remount)",
          },
          actionId: "remount-rw",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-write",
          title: "Verify the application writes again",
          explanation: "From Actions, run the write verification for the order API.",
          why: "The ticket is about saves that fail, so only a successful write under the running service proves the symptom is gone.",
          expectedObservation:
            "The order API is active and a fresh write to state.json succeeds.",
          target: { componentId: "service-manager", label: "Services tab (order API)" },
          actionId: "verify-write",
          conceptId: "troubleshooting-method",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "kernel-journal",
        label: "journalctl -k",
        kind: "terminal",
        tool: "terminal",
        patch: { ro: { journalSeen: true } },
        feedback:
          "Kernel log: buffer I/O error on sda2, then the journal aborted and EXT4 remounted the filesystem read-only.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A read-only remount is a kernel decision that always leaves a reason in the system log, so the log is where the incident starts.",
          evidenceGain: "Kernel aborted the journal and remounted ro - the cause is below the application.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "kernel log"],
      },
      {
        id: "read-mounts",
        label: "cat /proc/mounts",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/proc/mounts",
        patch: { ro: { mountsSeen: true } },
        feedback:
          "The root volume is mounted ro,relatime - the kernel made it read-only; no application chose this.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The mount table is the current truth about the volume's state, confirming the remount is still in effect now.",
          evidenceGain: "Root mounted read-only at present - symptom confirmed as a mount state.",
        },
        isDiagnostic: true,
        matchHints: ["mounts", "mount options"],
      },
      {
        id: "df-check",
        label: "df",
        kind: "terminal",
        tool: "terminal",
        patch: { ro: { dfSeen: true } },
        feedback:
          "/dev/sda2 is 62% used with 68G free - capacity is not why writes fail.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Write failures have two common causes; measuring capacity eliminates the cheap one before any repair work begins.",
          evidenceGain: "68G free - capacity hypothesis ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["disk usage", "df -h"],
      },
      {
        id: "run-fsck",
        label: "Run fsck on the root filesystem",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "ro.journalSeen", value: true },
            { type: "stateEquals", path: "ro.mountsSeen", value: true },
            { type: "stateEquals", path: "ro.dfSeen", value: true },
          ],
        },
        patch: { ro: { fsckDone: true } },
        feedback:
          "Filesystem check completed: the aborted journal replayed cleanly and the volume is consistent again.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal was aborted mid-write, so consistency must be restored before the volume is trusted with writes again.",
          evidenceGain: "Journal replayed and filesystem consistent - safe to write again.",
        },
        isFix: true,
      },
      {
        id: "remount-rw",
        label: "Remount the root filesystem read-write",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "ro.fsckDone", value: true },
        patch: {
          ro: { rwRestored: true },
          fs: {
            children: {
              proc: {
                children: {
                  mounts: {
                    content:
                      "/dev/sda2 / ext4 rw,relatime 0 0\ntmpfs /run tmpfs rw,nosuid,nodev 0 0\n",
                  },
                },
              },
            },
          },
        },
        feedback:
          "The root volume is remounted read-write and /proc/mounts now reads rw,relatime.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A repaired filesystem keeps the read-only flag until it is explicitly remounted, so this is the step that actually returns writes.",
          evidenceGain: "Mount state restored to read-write.",
        },
        isFix: true,
      },
      {
        id: "verify-write",
        label: "Verify the app can write its state file",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "ro.rwRestored", value: true },
        patch: {
          ro: { verified: true },
          services: [
            {
              id: "app",
              name: "app",
              status: "active (running)",
              pid: 7755,
              description: "Order API",
              lastError: [],
            },
          ],
        },
        feedback:
          "The order API is active and a fresh write to state.json succeeded.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The reported symptom was failed saves under the running service, so only that service writing again closes the loop.",
          evidenceGain: "Service running and writing - end-to-end verification.",
        },
        isFix: true,
      },
      {
        id: "rebuild-server-wrong",
        label: "Rebuild the server from backup",
        kind: "ui",
        tool: "services",
        feedback:
          "The volume still holds consistent data after the journal replay - rebuilding would discard it to avoid reading one kernel log.",
        evaluation: {
          grade: "wrong",
          rationale:
            "Evidence already named the failing device and the recovery path; a rebuild is a destructive answer to a repairable state.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "ro.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "ro.verified", value: true },
      { type: "stateEquals", path: "ro.rwRestored", value: true },
      { type: "stateEquals", path: "ro.fsckDone", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["rebuild-server-wrong"] },
        feedback:
          "The disk still holds the data - a journal replay and a remount beat a rebuild every time.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Only the kernel can make a volume read-only, and it always writes down why.",
        category: "tool",
      },
      {
        level: 2,
        text: "Check what the volume is mounted as before you blame the application.",
        category: "concept",
      },
      {
        level: 3,
        text: "An aborted journal forces a read-only remount: repair the filesystem, put it back read-write, then prove the write works.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "A buffer I/O error made the kernel abort the ext4 journal and remount the root filesystem read-only, so every application save failed with EROFS even though the data was intact.",
      whyItWorked:
        "The system log named the kernel decision, the mount table confirmed the state, capacity was ruled out, and a journal replay plus an explicit remount returned writes before the service was verified. Transferable principle: EROFS is a mount state, not an application bug - find who set it and repair the filesystem before restarting anything.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Kernel log showed the aborted journal and remount; /proc/mounts read ro.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Capacity hypothesis dropped - 68G free; application-permission hypothesis dropped - the kernel, not the process, set the state.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Ran the filesystem check, then remounted the root volume read-write.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The order API ran and wrote state.json successfully.",
        },
      ],
      followUps: [
        "Check SMART data on sda2 - a buffer I/O error is worth treating as a hardware warning.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [
      {
        title: "Linux fsck manual page",
        url: "https://man7.org/linux/man-pages/man8/fsck.8.html",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-package-conflict",
    version: 1,
    title: "Security update will not install on the app server",
    category: "linux",
    difficulty: "beginner",
    scenarioType: "DEPENDENCY_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Read a failed upgrade from the package manager's journal",
      "Find the policy entry that holds a package version back",
      "Release the policy rather than forcing the dependency",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["packages", "dependencies", "logs"],
    ticket: {
      id: "HD-1070",
      user: "Tomas Lind",
      role: "Platform engineer",
      symptomPlainLanguage:
        "The monthly security update stalls every night - apt reports unmet dependencies and the job ends failed.",
      priority: "medium",
      channel: "email",
      additionalContext:
        "Nothing else fails on the host, and the same update installed cleanly on the staging machine last week.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel"],
      enabledCommands: ["journalctl", "cat", "ls", "grep", "help"],
      components: ["package-manager", "filesystem"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        packages: {
          "libpq5": "16.2 (held back by pin)",
          "postgresql-16": "16.4 (waiting on libpq5 16.4)",
          openssl: "3.0.13-1ubuntu2 (up to date)",
          nginx: "1.24.0-2ubuntu2 (up to date)",
        },
        services: [
          {
            id: "apt-daily",
            name: "apt-daily",
            status: "failed",
            description: "Package upgrade job",
            lastError: ["Dependency resolution failed: libpq5 held at 16.2"],
          },
        ],
        logs: [
          "Sep 29 02:15:01 srv03 apt_daily.py: Upgrade run started",
          "Sep 29 02:15:03 srv03 apt: postgresql-16 depends on libpq5 (>= 16.4); however: version 16.2 is to be installed",
          "Sep 29 02:15:03 srv03 apt: E: Unable to correct problems, you have held broken packages",
          "Sep 29 02:15:04 srv03 systemd[1]: apt-daily.service: Failed with result 'exit-code'.",
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              mode: "755",
              children: {
                apt: {
                  type: "dir",
                  name: "apt",
                  mode: "755",
                  children: {
                    "preferences.d": {
                      type: "dir",
                      name: "preferences.d",
                      mode: "755",
                      children: {
                        pinning: {
                          type: "file",
                          name: "pinning",
                          mode: "644",
                          owner: "root",
                          group: "root",
                          content:
                            "Package: libpq5\nPin: version 16.2\nPin-Priority: 1001\n",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        pkg: {
          journalSeen: false,
          pinSeen: false,
          heldSeen: false,
          upgraded: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      {
        id: "h-missing",
        label: "A required package is missing from the repositories",
        initiallyPlausible: true,
      },
      {
        id: "h-held",
        label: "One package is deliberately pinned to an older version",
        initiallyPlausible: true,
      },
      { id: "h-corrupt", label: "The package database is corrupt", initiallyPlausible: false },
    ],
    guidedWalkthrough: {
      intro:
        "Read why the job failed, find what is holding the package in place, release the policy, then rerun the upgrade.",
      steps: [
        {
          id: "guide-apt-journal",
          title: "Read the upgrade job's journal",
          explanation: "Run journalctl -u apt-daily and read last night's failure lines.",
          why: "The package manager writes the exact dependency it could not satisfy, which turns a generic job failure into a named package.",
          expectedObservation:
            "postgresql-16 depends on libpq5 (>= 16.4) but version 16.2 is the one that will be installed, then apt reports held broken packages.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "apt-journal",
          commandId: "journalctl",
          conceptId: "systemd-service-basics",
        },
        {
          id: "guide-pin-file",
          title: "Read the pin policy for that package",
          explanation:
            "Open the Filesystem tab and read /etc/apt/preferences.d/pinning.",
          why: "A version that will not move is usually held by policy rather than by the repository - the pin file is where that decision is written down.",
          expectedObservation:
            "The file pins libpq5 at version 16.2 with Pin-Priority 1001.",
          target: { componentId: "filesystem", label: "Filesystem tab (pinning file)" },
          actionId: "read-pin-file",
          commandId: "cat",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-held-packages",
          title: "Read the held package versions",
          explanation: "Run the package inspection from the Checks list.",
          why: "The Packages view shows which package is stuck and which one waits on it, separating the cause from the casualty.",
          expectedObservation:
            "libpq5 sits at 16.2 held back by pin while postgresql-16 waits for libpq5 16.4.",
          target: { componentId: "package-manager", label: "Packages tab" },
          actionId: "inspect-packages",
          fallback: "the Packages tab in the Linux workstation panel",
        },
        {
          id: "guide-release-pin",
          title: "Release the pin and rerun the upgrade",
          explanation: "From Actions, run Release the version pin and rerun the upgrade.",
          why: "The pin outranks every automatic upgrade, so changing it is the smallest change that lets the dependency resolve on its own.",
          expectedObservation:
            "libpq5 16.4 installs, postgresql-16 upgrades, and apt-daily completes without dependency errors.",
          target: { componentId: "package-manager", label: "Packages tab (upgrade)" },
          actionId: "release-pin-upgrade",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-upgrade",
          title: "Verify the upgrade services are clean",
          explanation: "From Actions, run the upgrade verification.",
          why: "The ticket is a failing nightly job, so only that job completing cleanly proves the symptom is gone.",
          expectedObservation:
            "apt-daily reports success and no dependency warnings remain.",
          target: { componentId: "package-manager", label: "Packages tab (verification)" },
          actionId: "verify-services",
          conceptId: "troubleshooting-method",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "apt-journal",
        label: "journalctl -u apt-daily",
        kind: "terminal",
        tool: "terminal",
        patch: { pkg: { journalSeen: true } },
        feedback:
          "Journal: postgresql-16 depends on libpq5 (>= 16.4) but 16.2 is the version that would be installed - apt refuses and the job exits failed.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The job's journal names the dependency conflict precisely, so the failure becomes a specific package to investigate rather than a generic update problem.",
          evidenceGain: "Conflict isolated to libpq5 - database and repository hypotheses ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "upgrade log"],
      },
      {
        id: "read-pin-file",
        label: "cat /etc/apt/preferences.d/pinning",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/etc/apt/preferences.d/pinning",
        patch: { pkg: { pinSeen: true } },
        feedback:
          "The pin holds libpq5 at version 16.2 with priority 1001 - above any automatic upgrade, so 16.4 can never be selected.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A version that refuses to move is held by policy; the pin file is the record of that policy and where it must be changed.",
          evidenceGain: "Pin policy identified as the hold - repository corruption ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["pin file", "preferences", "pinning"],
      },
      {
        id: "inspect-packages",
        label: "Inspect held package versions",
        kind: "inspect",
        tool: "packages",
        patch: { pkg: { heldSeen: true } },
        feedback:
          "libpq5 sits at 16.2 held back by pin while postgresql-16 waits for libpq5 16.4 - one held package blocks the whole upgrade.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The package view separates the package causing the hold from the one waiting on it, so the fix targets the cause.",
          evidenceGain: "Holding package and waiting package identified - conflict mapped.",
        },
        isDiagnostic: true,
        matchHints: ["held back", "package versions", "libpq5"],
      },
      {
        id: "release-pin-upgrade",
        label: "Release the version pin and rerun the upgrade",
        kind: "ui",
        tool: "packages",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "pkg.journalSeen", value: true },
            { type: "stateEquals", path: "pkg.pinSeen", value: true },
            { type: "stateEquals", path: "pkg.heldSeen", value: true },
          ],
        },
        patch: {
          pkg: { upgraded: true },
          packages: {
            "libpq5": "16.4 (up to date)",
            "postgresql-16": "16.4-1.pgdg24.04 (up to date)",
          },
          services: [
            {
              id: "apt-daily",
              name: "apt-daily",
              status: "active (running)",
              description: "Package upgrade job",
              lastError: [],
            },
          ],
        },
        feedback:
          "Pin released: libpq5 16.4 installed, postgresql-16 upgraded, and apt-daily completed with no dependency errors.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The policy entry, not the dependency, was the obstruction - releasing it lets the resolver satisfy the requirement instead of forcing it.",
          evidenceGain: "Policy released and dependency resolved naturally.",
        },
        isFix: true,
      },
      {
        id: "verify-services",
        label: "Verify the upgrade services are clean",
        kind: "ui",
        tool: "services",
        appliesWhen: { type: "stateEquals", path: "pkg.upgraded", value: true },
        patch: { pkg: { verified: true } },
        feedback:
          "apt-daily completed successfully and the next nightly run will start from a consistent package set.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a nightly job that fails, so watching that job finish cleanly is the end-to-end proof rather than a package list.",
          evidenceGain: "Nightly upgrade job completes - reported symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "force-depends-wrong",
        label: "Force the install with --force-depends",
        kind: "ui",
        tool: "packages",
        feedback:
          "Forcing past the dependency leaves the client running against a library it was not built for - the hold, not the dependency, had to change.",
        evaluation: {
          grade: "harmful",
          rationale:
            "Forcing a dependency installs a combination the packages never declared as supported; the evidence already showed a policy file holding the version back.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "pkg.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "pkg.verified", value: true },
      { type: "stateEquals", path: "pkg.upgraded", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["force-depends-wrong"] },
        feedback:
          "Staging installed this update cleanly - the difference is a policy entry on this box, not a missing dependency.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "Start with what the upgrade job recorded when it failed.",
        category: "tool",
      },
      {
        level: 2,
        text: "The error names a package that will not move - find what is holding it in place.",
        category: "concept",
      },
      {
        level: 3,
        text: "A pin with priority above 1000 outranks automatic upgrades; release it to the version the package needs, then rerun the job.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "A pin entry held libpq5 at 16.2 with priority 1001, so postgresql-16 could never resolve its requirement for 16.4 and the nightly upgrade always aborted.",
      whyItWorked:
        "The journal named the conflicting dependency, the pin file showed the policy doing the holding, and the package view separated the cause from the casualty - so releasing the policy let the upgrade resolve without force. Transferable principle: when a package will not move, look for the policy that is moving it in the other direction.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Journal named libpq5; the pin file showed version 16.2 at priority 1001.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Missing-package hypothesis dropped - 16.4 resolves once the pin is gone; database corruption dropped - apt reads and reports policy normally.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Released the pin and reran the upgrade.",
        },
        {
          step: "Verify",
          whatLearnerDid: "apt-daily completed with no dependency errors.",
        },
      ],
      followUps: [
        "Comment the pin file so the reason for 16.2 is written down where the next engineer will look.",
      ],
    },
    knowledgeLinks: ["troubleshooting-method", "systemd-service-basics"],
    references: [
      {
        title: "Debian wiki - AptPreferences",
        url: "https://wiki.debian.org/AptPreferences",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-cron-not-running",
    version: 1,
    title: "Nightly backup job has not run in three days",
    category: "linux",
    difficulty: "beginner",
    scenarioType: "SERVICE_FAILURE",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 12,
    learningObjectives: [
      "Confirm the scheduler is healthy before blaming the job",
      "Compare the cron environment with an interactive shell",
      "Give the entry the environment it needs instead of editing the script",
    ],
    prerequisites: ["linux-service-failing"],
    skills: ["cron", "logs", "shell"],
    ticket: {
      id: "HD-1071",
      user: "Sara Delgado",
      role: "Database administrator",
      symptomPlainLanguage:
        "The nightly catalog backup stopped three nights ago - /var/backups has no new files and nobody touched the job.",
      priority: "medium",
      channel: "portal",
      additionalContext:
        "The cron service is running, and the same script produces a backup when we run it by hand.",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel", "services"],
      enabledCommands: ["systemctl", "journalctl", "cat", "ls", "grep", "help"],
      components: ["filesystem", "service-manager"],
      showInspector: true,
      initialWorld: {
        currentUser: "root",
        cwd: "/",
        services: [
          {
            id: "cron",
            name: "cron",
            status: "active (running)",
            description: "Background command scheduler",
          },
          {
            id: "catalog",
            name: "catalog",
            status: "active (running)",
            description: "Catalog application",
          },
        ],
        logs: [
          "Sep 26 02:00:01 srv04 CRON[2101]: (root) CMD (/usr/local/bin/backup-catalog.sh)",
          "Sep 26 02:00:01 srv04 CRON[2101]: sh: 1: appctl: not found",
          "Sep 27 02:00:01 srv04 CRON[2288]: (root) CMD (/usr/local/bin/backup-catalog.sh)",
          "Sep 27 02:00:01 srv04 CRON[2288]: sh: 1: appctl: not found",
          "Sep 28 02:00:01 srv04 CRON[2455]: (root) CMD (/usr/local/bin/backup-catalog.sh)",
          "Sep 28 02:00:01 srv04 CRON[2455]: sh: 1: appctl: not found",
        ],
        fs: {
          type: "dir",
          name: "/",
          mode: "755",
          owner: "root",
          group: "root",
          children: {
            etc: {
              type: "dir",
              name: "etc",
              mode: "755",
              children: {
                "cron.d": {
                  type: "dir",
                  name: "cron.d",
                  mode: "755",
                  children: {
                    "backup-catalog": {
                      type: "file",
                      name: "backup-catalog",
                      mode: "644",
                      owner: "root",
                      group: "root",
                      content:
                        "# Nightly catalog backup\n0 2 * * * root /usr/local/bin/backup-catalog.sh\n",
                    },
                  },
                },
              },
            },
            usr: {
              type: "dir",
              name: "usr",
              mode: "755",
              children: {
                local: {
                  type: "dir",
                  name: "local",
                  mode: "755",
                  children: {
                    bin: {
                      type: "dir",
                      name: "bin",
                      mode: "755",
                      children: {
                        "backup-catalog.sh": {
                          type: "file",
                          name: "backup-catalog.sh",
                          mode: "755",
                          owner: "root",
                          group: "root",
                          content:
                            "#!/bin/sh\nset -e\nappctl catalog dump > /var/backups/catalog-latest.sql\n",
                        },
                      },
                    },
                  },
                },
              },
            },
            opt: {
              type: "dir",
              name: "opt",
              mode: "755",
              children: {
                app: {
                  type: "dir",
                  name: "app",
                  mode: "755",
                  children: {
                    bin: {
                      type: "dir",
                      name: "bin",
                      mode: "755",
                      children: {
                        appctl: {
                          type: "file",
                          name: "appctl",
                          mode: "755",
                          owner: "root",
                          group: "root",
                          content: "#!/bin/sh\nexec /opt/app/bin/catalog \"$@\"\n",
                        },
                      },
                    },
                  },
                },
              },
            },
            var: {
              type: "dir",
              name: "var",
              mode: "755",
              children: {
                backups: {
                  type: "dir",
                  name: "backups",
                  mode: "755",
                  children: {},
                },
              },
            },
          },
        },
        cronf: {
          cronChecked: false,
          journalSeen: false,
          jobRead: false,
          scriptSeen: false,
          pathFixed: false,
          verified: false,
        },
      },
    },
    hypotheses: [
      { id: "h-sched", label: "The scheduler itself is not running", initiallyPlausible: true },
      {
        id: "h-env",
        label: "The script fails only in cron's environment",
        initiallyPlausible: true,
      },
      {
        id: "h-perm",
        label: "The backup directory lost write access",
        initiallyPlausible: false,
      },
    ],
    guidedWalkthrough: {
      intro:
        "Confirm the scheduler is alive, read what it logged, compare the entry with the script, then give the job the environment it is missing.",
      steps: [
        {
          id: "guide-cron-status",
          title: "Confirm the scheduler is running",
          explanation: "Run systemctl status cron in the terminal.",
          why: "If the scheduler itself is down, every other reading is noise - proving it is alive narrows the fault to the job or its environment.",
          expectedObservation: "cron is active (running) and healthy.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "cron-status",
          commandId: "systemctl-status",
          conceptId: "systemd-service-basics",
        },
        {
          id: "guide-cron-journal",
          title: "Read what the scheduler logged",
          explanation: "Run journalctl -u cron and read the three nightly attempts.",
          why: "The journal shows the job running and then failing, which is very different from never running at all.",
          expectedObservation:
            "Each night the script runs, then 'sh: 1: appctl: not found' appears and the session ends.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "cron-journal",
          commandId: "journalctl",
        },
        {
          id: "guide-cron-entry",
          title: "Read the cron entry",
          explanation: "Open the Filesystem tab and read /etc/cron.d/backup-catalog.",
          why: "The entry defines when the job runs and what environment it starts with - cron supplies almost nothing by default.",
          expectedObservation:
            "The entry runs the script as root at 02:00 and sets no PATH line.",
          target: { componentId: "filesystem", label: "Filesystem tab (cron entry)" },
          actionId: "read-cron-entry",
          commandId: "cat",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-job-script",
          title: "Read the job script",
          explanation: "Read /usr/local/bin/backup-catalog.sh in the Filesystem tab.",
          why: "The script shows which command it expects to find, so the gap between the two files becomes visible.",
          expectedObservation:
            "The script calls appctl with no path, relying entirely on whatever PATH the caller provides.",
          target: { componentId: "filesystem", label: "Filesystem tab (job script)" },
          actionId: "read-job-script",
          commandId: "cat",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-fix-path",
          title: "Give the entry an environment",
          explanation: "From Actions, run Add the app bin directory to the cron entry.",
          why: "Since the script works by hand, the difference is the environment cron provides - fixing the entry keeps the script identical in both places.",
          expectedObservation:
            "The entry now exports PATH including /opt/app/bin before the schedule line.",
          target: { componentId: "filesystem", label: "Filesystem tab (cron entry fix)" },
          actionId: "fix-cron-path",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-trial-run",
          title: "Run the job once now",
          explanation: "From Actions, run Run the backup job once now.",
          why: "Waiting until 02:00 would prove nothing until tomorrow - one immediate run reproduces the schedule under real conditions.",
          expectedObservation: "A new backup file appears in /var/backups.",
          target: { componentId: "filesystem", label: "Filesystem tab (new backup file)" },
          actionId: "trial-run",
          conceptId: "troubleshooting-method",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "cron-status",
        label: "systemctl status cron",
        kind: "terminal",
        tool: "terminal",
        patch: { cronf: { cronChecked: true } },
        feedback:
          "cron is active (running) - the scheduler is healthy, so the failure lives in the job or what it inherits.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Establishing that the scheduler is alive separates a stopped service from a job-level failure before any file is opened.",
          evidenceGain: "Scheduler running - stopped-service hypothesis ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["systemctl status", "cron service", "scheduler status"],
      },
      {
        id: "cron-journal",
        label: "journalctl -u cron",
        kind: "terminal",
        tool: "terminal",
        patch: { cronf: { journalSeen: true } },
        feedback:
          "Three nights of the same lines: the script runs, then 'sh: 1: appctl: not found' and exit 127 - no backup file is ever written.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The journal proves the job fires on schedule and fails inside the shell, narrowing a 'never ran' report to a command-resolution failure.",
          evidenceGain: "Job runs nightly and fails with command not found - schedule ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["journalctl", "cron log"],
      },
      {
        id: "read-cron-entry",
        label: "cat /etc/cron.d/backup-catalog",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/etc/cron.d/backup-catalog",
        patch: { cronf: { jobRead: true } },
        feedback:
          "The entry runs the script as root at 02:00 and sets no PATH - cron starts jobs with a minimal environment.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The entry carries the environment the job inherits, which is the half of the configuration an interactive shell hides from you.",
          evidenceGain: "Entry defines no PATH - environment difference identified.",
        },
        isDiagnostic: true,
        matchHints: ["crontab", "cron entry", "schedule"],
      },
      {
        id: "read-job-script",
        label: "cat /usr/local/bin/backup-catalog.sh",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/usr/local/bin/backup-catalog.sh",
        patch: { cronf: { scriptSeen: true } },
        feedback:
          "The script calls appctl bare - it uses whatever PATH it inherits, and cron's PATH does not include /opt/app/bin.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The script is unchanged and works by hand, so reading it proves the fault is what surrounds it rather than what is inside it.",
          evidenceGain: "Script relies on inherited PATH - script correctness confirmed.",
        },
        isDiagnostic: true,
        matchHints: ["job script", "backup script"],
      },
      {
        id: "fix-cron-path",
        label: "Add the app bin directory to the cron entry",
        kind: "ui",
        tool: "services",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "cronf.journalSeen", value: true },
            { type: "stateEquals", path: "cronf.jobRead", value: true },
            { type: "stateEquals", path: "cronf.scriptSeen", value: true },
          ],
        },
        patch: {
          cronf: { pathFixed: true },
          fs: {
            children: {
              etc: {
                children: {
                  "cron.d": {
                    children: {
                      "backup-catalog": {
                        content:
                          "# Nightly catalog backup\nPATH=/opt/app/bin:/usr/local/bin:/usr/bin:/bin\n0 2 * * * root /usr/local/bin/backup-catalog.sh\n",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        feedback:
          "The entry exports PATH=/opt/app/bin:/usr/local/bin:/usr/bin:/bin, so appctl resolves at 02:00 just as it does in a shell.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The script is fine in both cases; supplying the missing environment at the entry fixes the difference without duplicating logic in a second place.",
          evidenceGain: "Cron entry now supplies the environment the script needs.",
        },
        isFix: true,
      },
      {
        id: "trial-run",
        label: "Run the backup job once now",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "cronf.pathFixed", value: true },
        patch: {
          cronf: { verified: true },
          fs: {
            children: {
              var: {
                children: {
                  backups: {
                    children: {
                      "catalog-latest.sql": {
                        type: "file",
                        name: "catalog-latest.sql",
                        mode: "640",
                        owner: "root",
                        group: "root",
                        size: "184M",
                        content: "-- catalog dump 2026-09-29 412 tables\n",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        feedback:
          "The run completed and /var/backups/catalog-latest.sql was written with 412 tables.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a missing nightly file, so producing that exact file under the fixed entry is the end-to-end proof.",
          evidenceGain: "Backup file produced on demand - reported symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "disable-job-wrong",
        label: "Disable the backup cron entry",
        kind: "ui",
        tool: "services",
        feedback:
          "Removing the entry leaves the catalog with no nightly backup while the job stays broken - the log already shows why it fails.",
        evaluation: {
          grade: "harmful",
          rationale:
            "Silencing a failing job trades a visible error for an invisible data-protection gap, and the journal already named the real cause.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "cronf.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "cronf.verified", value: true },
      { type: "stateEquals", path: "cronf.pathFixed", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["disable-job-wrong"] },
        feedback:
          "The schedule was never the problem - the job runs every night and fails inside the shell.",
      },
    ],
    hints: [
      {
        level: 1,
        text: "cron records every run it makes - start with the scheduler's own log.",
        category: "tool",
      },
      {
        level: 2,
        text: "The script fails only when cron runs it, so compare the two environments.",
        category: "concept",
      },
      {
        level: 3,
        text: "cron starts jobs with a minimal PATH; the entry has to say where appctl lives before the script can find it.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "cron starts jobs with a minimal environment and the entry never set PATH, so appctl in /opt/app/bin was never found; every run exited 127 without writing a backup.",
      whyItWorked:
        "Status ruled out a stopped scheduler, the journal showed the job firing and failing, and reading both files exposed the environment gap - so exporting PATH at the entry fixed the run while leaving the script identical. Transferable principle: a command that works by hand but fails under cron is an environment difference - read the entry before editing the script.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "cron was active; the journal showed three nightly runs failing with appctl not found.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Scheduler hypothesis dropped - the service runs and logs every attempt; script hypothesis dropped - the same script succeeds interactively; permission hypothesis dropped - the failure is command resolution, not the write.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Exported PATH in the cron entry so appctl resolves.",
        },
        {
          step: "Verify",
          whatLearnerDid: "An immediate run produced the backup file.",
        },
      ],
      followUps: [
        "Use absolute paths or an explicit PATH in every cron entry on this host.",
        "Alert when a nightly job produces no file so a silent gap never runs for three days.",
      ],
    },
    knowledgeLinks: ["systemd-service-basics", "troubleshooting-method"],
    references: [
      {
        title: "crontab(5) - environment and format",
        url: "https://man7.org/linux/man-pages/man5/crontab.5.html",
        note: "Link only.",
      },
    ],
  },
  {
    id: "linux-resolver-wrong",
    version: 1,
    title: "Cannot reach the print server by name",
    category: "linux",
    difficulty: "foundational",
    scenarioType: "FOUNDATIONAL_DIAGNOSIS",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 10,
    learningObjectives: [
      "Separate reachability from name resolution",
      "Find the file that says which server answers names",
      "Point the workstation at a resolver that actually answers",
    ],
    prerequisites: [],
    skills: ["dns", "troubleshooting", "shell"],
    ticket: {
      id: "HD-1072",
      user: "Mira Okonkwo",
      role: "Studio systems administrator",
      symptomPlainLanguage:
        "The print queue at printshop.lab.local stopped opening on my workstation this morning - every other machine in the studio prints fine.",
      priority: "medium",
      channel: "phone",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      availableTools: ["terminal", "file-panel"],
      enabledCommands: ["ping", "nslookup", "cat", "ls", "ip", "help"],
      components: ["filesystem"],
      showInspector: true,
      initialWorld: {
        currentUser: "mira",
        cwd: "/home/mira",
        hosts: [
          {
            ips: ["192.168.1.77"],
            gateway: "192.168.1.1",
            dns: ["10.0.0.53"],
            mac: "b8:27:eb:44:1f:0c",
          },
        ],
        network: { faults: { dnsServerDown: true } },
        dnsZones: { "printshop.lab.local": "192.168.1.44" },
        res: {
          linkChecked: false,
          configRead: false,
          lookupFailed: false,
          resolverFixed: false,
          verified: false,
        },
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
                hosts: {
                  type: "file",
                  name: "hosts",
                  mode: "644",
                  owner: "root",
                  group: "root",
                  content: "127.0.0.1\tlocalhost\n192.168.1.77\tstudio-ws7\n\n::1\tlocalhost\n",
                },
                "resolv.conf": {
                  type: "file",
                  name: "resolv.conf",
                  mode: "644",
                  owner: "root",
                  group: "root",
                  content: "nameserver 10.0.0.53\n",
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
                mira: {
                  type: "dir",
                  name: "mira",
                  owner: "mira",
                  group: "mira",
                  mode: "755",
                  children: {},
                },
              },
            },
          },
        },
      },
    },
    hypotheses: [
      { id: "h-nic-down", label: "Workstation lost its network link", initiallyPlausible: true },
      { id: "h-printer-down", label: "Print server is offline", initiallyPlausible: false },
      { id: "h-resolver", label: "Name lookup server is not answering", initiallyPlausible: false },
    ],
    conversation: {
      persona: "Mira Okonkwo",
      opening:
        "This box suddenly cannot reach the print server by name. The printer is online - I checked its panel - and everyone else can print.",
      followUpQuestions: [
        "Can you reach the printer by its address?",
        "Do other names resolve from this machine?",
        "What changed on this machine recently?",
      ],
      replies: [
        {
          match: ["other", "colleague", "everyone", "machines", "else"],
          response:
            "Every other machine in the studio prints to it right now - only this workstation is stuck.",
          once: false,
          revealsConcepts: [
            "One host failing while others succeed narrows the fault to this machine's own configuration.",
          ],
        },
        {
          match: ["by ip", "ip address", "by address", "address"],
          response:
            "I have always just used the name. What I do know is the gateway answers ping from this box - replies come back in under a millisecond.",
          once: false,
          revealsConcepts: [
            "A healthy gateway reply proves the LAN path and leaves name resolution as the step that never completes.",
          ],
        },
        {
          match: ["yesterday", "changed", "update", "install", "recent", "morning"],
          response:
            "Nothing that I know of - no updates, no edits. It worked at close of business yesterday.",
          once: false,
          revealsConcepts: [
            "A change with no visible cause still happened somewhere: check the configuration this machine reads.",
          ],
        },
        {
          match: ["error", "says", "message", "fail", "tells"],
          response:
            "The queue window says it could not reach the host - it never even gets as far as asking for a page.",
          once: false,
          revealsConcepts: [
            "The failure happens before any connection is attempted - the lookup itself is not completing.",
          ],
        },
      ],
      defaultReply:
        "All I know is the printer is up and this machine will not open its queue by name.",
      mentorPrompts: [
        "Ask what still works - reachability by address versus names is the split that matters.",
        "Confirm the fault is host-local before touching anything shared.",
      ],
    },
    guidedWalkthrough: {
      intro:
        "Prove the network path works, read who this machine asks about names, test a lookup, then point it at a server that answers.",
      steps: [
        {
          id: "guide-ping-gateway",
          title: "Prove the local network path works",
          explanation: "Run ping 192.168.1.1 in the terminal and read the replies.",
          why: "A name problem and a network problem look identical from the user's seat - pinging the gateway separates them in one command.",
          expectedObservation: "The gateway answers four replies with 0% loss.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "ping-gateway",
          commandId: "ping-ok",
          conceptId: "gateway-vs-dns",
        },
        {
          id: "guide-read-resolv",
          title: "Read which server answers names",
          explanation: "Open the Filesystem tab and read /etc/resolv.conf.",
          why: "This file is the machine's instruction for name lookups - it names the server that should answer every query.",
          expectedObservation: "The file says nameserver 10.0.0.53.",
          target: { componentId: "filesystem", label: "Filesystem tab (/etc/resolv.conf)" },
          actionId: "read-resolv",
          commandId: "cat",
          fallback: "the Filesystem tab in the Linux workstation panel",
        },
        {
          id: "guide-nslookup",
          title: "Test a lookup against that server",
          explanation: "Run nslookup printshop.lab.local in the terminal.",
          why: "A direct query shows whether the named server answers at all, without the browser or the print client in the way.",
          expectedObservation:
            "The query times out against 10.0.0.53 - no servers could be reached.",
          target: { componentId: "terminal", label: "Terminal" },
          actionId: "nslookup-name",
          commandId: "nslookup-fail",
          conceptId: "what-is-dns",
        },
        {
          id: "guide-fix-resolver",
          title: "Point the workstation at a resolver that answers",
          explanation: "From Actions, run Point the resolver at the working DNS server.",
          why: "The gateway forwards lab.local lookups on this network, so moving the entry restores a working answer path for every name - not just the printer.",
          expectedObservation:
            "The resolver entries now name 192.168.1.1 instead of the silent server.",
          target: { componentId: "filesystem", label: "Filesystem tab (resolver fix)" },
          actionId: "fix-resolver",
          fallback: "the Actions drawer in the bottom dock",
        },
        {
          id: "guide-verify-names",
          title: "Verify the queue opens by name",
          explanation: "From Actions, run the print queue verification.",
          why: "Her ticket is a queue that will not open, so only that exact lookup succeeding closes the case.",
          expectedObservation:
            "printshop.lab.local resolves to 192.168.1.44 and the queue opens.",
          target: {
            componentId: "filesystem",
            label: "Linux workstation panel (name lookup check)",
          },
          actionId: "verify-names",
          conceptId: "troubleshooting-method",
          fallback: "the Actions drawer in the bottom dock",
        },
      ],
    },
    actions: [
      {
        id: "ping-gateway",
        label: "ping 192.168.1.1",
        kind: "terminal",
        tool: "terminal",
        patch: { res: { linkChecked: true } },
        feedback:
          "The gateway answers four replies with 0% loss - the LAN path from this workstation is healthy.",
        evaluation: {
          grade: "optimal",
          rationale:
            "A name complaint hides two very different faults; the gateway reply proves reachability so the investigation can move to resolution.",
          evidenceGain: "Gateway reachable - network path ruled out as the fault.",
        },
        isDiagnostic: true,
        matchHints: ["ping gateway", "gateway"],
      },
      {
        id: "read-resolv",
        label: "cat /etc/resolv.conf",
        kind: "terminal",
        tool: "terminal",
        inspectTarget: "/etc/resolv.conf",
        patch: { res: { configRead: true } },
        feedback: "resolv.conf points this machine at 10.0.0.53 - the server it asks for names.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The resolver file is the machine's own instruction for lookups, so it names exactly which server is being blamed next.",
          evidenceGain: "Resolver identified as 10.0.0.53 - the target for the lookup test.",
        },
        isDiagnostic: true,
        matchHints: ["resolv.conf", "resolver config", "name server"],
      },
      {
        id: "nslookup-name",
        label: "nslookup printshop.lab.local",
        kind: "terminal",
        tool: "terminal",
        patch: { res: { lookupFailed: true } },
        feedback:
          "The query times out against 10.0.0.53: no servers could be reached - the name never gets an answer.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Directly querying the configured server separates a dead resolver from a wrong record or a blocked client.",
          evidenceGain: "Configured resolver silent - wrong-record and client-filter hypotheses ruled out.",
        },
        isDiagnostic: true,
        matchHints: ["nslookup", "name lookup"],
      },
      {
        id: "fix-resolver",
        label: "Point the resolver at the working DNS server",
        kind: "ui",
        tool: "file-panel",
        appliesWhen: {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "res.linkChecked", value: true },
            { type: "stateEquals", path: "res.configRead", value: true },
            { type: "stateEquals", path: "res.lookupFailed", value: true },
          ],
        },
        patch: {
          res: { resolverFixed: true },
          hosts: [
            {
              ips: ["192.168.1.77"],
              gateway: "192.168.1.1",
              dns: ["192.168.1.1"],
              mac: "b8:27:eb:44:1f:0c",
            },
          ],
          network: { faults: { dnsServerDown: false } },
          fs: {
            children: {
              etc: {
                children: {
                  "resolv.conf": { content: "nameserver 192.168.1.1\n" },
                },
              },
            },
          },
        },
        feedback:
          "The workstation now asks 192.168.1.1, which forwards lab.local lookups and answers them.",
        evaluation: {
          grade: "optimal",
          rationale:
            "Reachability is proven and the configured server is silent, so moving the entry to a server that answers repairs every name rather than one hard-coded address.",
          evidenceGain: "Resolver moved to a server that answers - host configuration corrected.",
        },
        isFix: true,
      },
      {
        id: "verify-names",
        label: "Verify the print queue opens by name",
        kind: "ui",
        tool: "terminal",
        appliesWhen: { type: "stateEquals", path: "res.resolverFixed", value: true },
        patch: { res: { verified: true } },
        feedback:
          "printshop.lab.local resolves to 192.168.1.44 and the print queue opens with no resolution error.",
        evaluation: {
          grade: "optimal",
          rationale:
            "The ticket is a queue that would not open, so repeating that exact name lookup is the honest end-to-end check.",
          evidenceGain: "Name resolves and the queue opens - reported symptom cleared.",
        },
        isFix: true,
      },
      {
        id: "hosts-file-wrong",
        label: "Add 192.168.1.44 to /etc/hosts",
        kind: "ui",
        tool: "file-panel",
        feedback:
          "Hard-coding one address hides the silent resolver - the next name this machine needs will fail the same way.",
        evaluation: {
          grade: "risky",
          rationale:
            "A static entry papers over one symptom, ages badly when addresses move, and leaves the broken resolver in place for every other name.",
        },
      },
    ],
    successConditions: [{ type: "stateEquals", path: "res.verified", value: true }],
    verificationSteps: [
      { type: "stateEquals", path: "res.verified", value: true },
      { type: "stateEquals", path: "res.resolverFixed", value: true },
    ],
    wrongPaths: [
      {
        when: { type: "stateEquals", path: "appliedActions", value: ["hosts-file-wrong"] },
        feedback:
          "One name works by luck now; every other name still asks the server that never answers.",
      },
    ],
    hints: [
      { level: 1, text: "Start from what this machine can still reach." },
      {
        level: 2,
        text: "Read the file that tells the workstation which server should answer name questions.",
        category: "concept",
      },
      {
        level: 3,
        text: "The entry points at a server that is not answering - move it to one that is, then prove the queue opens.",
        category: "method",
      },
    ],
    debrief: {
      rootCause:
        "The workstation's resolver pointed at 10.0.0.53, which had stopped answering, so every name lookup timed out while the LAN path to the printer stayed perfectly healthy.",
      whyItWorked:
        "The gateway reply proved the path, the resolver file named the server to blame, and a direct query showed it silent - so moving the entry restored every name instead of one address. Transferable principle: separate reachability from resolution; the file that names the resolver is where a name outage is fixed.",
      methodologyMap: [
        {
          step: "Gather evidence",
          whatLearnerDid: "Gateway ping succeeded; resolv.conf named 10.0.0.53; nslookup timed out against it.",
        },
        {
          step: "Rule out",
          whatLearnerDid:
            "Routing hypothesis dropped - the gateway answers; printer hypothesis dropped - the queue opens from other machines; wrong-record hypothesis dropped - the query never reached a server.",
        },
        {
          step: "Apply fix",
          whatLearnerDid: "Pointed the workstation at the forwarding resolver.",
        },
        {
          step: "Verify",
          whatLearnerDid: "The name resolved to 192.168.1.44 and the queue opened.",
        },
      ],
      followUps: [
        "Remove any static resolver entries left over from the decommissioned server.",
        "Alert when clients stop receiving a resolver that answers.",
      ],
    },
    knowledgeLinks: ["what-is-dns", "gateway-vs-dns"],
    references: [],
  },
];
