# Scenario Catalog

Canonical inventory of every scenario in the simulator — **100 scenarios
through Phase 13C** (Phase 12 + 13 batches 1–3 approved; final catalog audit
Phase 13G). Source of truth for coverage audits and expansion planning.

- **Current state** lives in `Final counts` + `Final inventory` (100 rows)
  directly below.
- The numbered `Inventory — Phase 10` / `Phase 11` sections afterwards are
  historical snapshots (30 and 61 scenarios) kept for provenance — they are not
  current totals.

- **Row per scenario**, one column per mandated field.
- **Scenario type** (primary reasoning pattern, one per scenario; uniqueness not
  required):
  `FOUNDATIONAL_DIAGNOSIS` · `EVIDENCE_DISCRIMINATION` · `COMPONENT_FAILURE` ·
  `CONFIGURATION_ERROR` · `SERVICE_FAILURE` · `DEPENDENCY_FAILURE` ·
  `RESOURCE_EXHAUSTION` · `MULTI_FAULT` · `INTERMITTENT_FAILURE` ·
  `COMMUNICATION_SUPPORT` · `SECURITY_TRIAGE` · `RECOVERY` · `CROSS_DOMAIN`.
- Difficulty reflects **reasoning complexity**, not step count:
  `foundational` < `beginner` < `intermediate` < `advanced`.
- Environment: `env.kind` + shell; 3D/2D column records workbench/equipment
  capability (every scenario renders a 2D environment; hardware and equipment
  scenarios also have a 3D projection — `buildBenchHotspot` for the bench,
  family stage parity via `PART_IDS` for equipment — both driven from the same
  world state).

## Final counts — Phase 13G (100 scenarios)

### By domain (asserted by `src/engine/catalogInvariants.test.ts`)

| Domain | Count |
|--------|------:|
| hardware | 36 |
| windows | 11 |
| linux | 11 |
| sysadmin | 10 |
| database | 9 |
| security | 9 |
| support | 9 |
| networking | 5 |
| **Total** | **100** |

### Difficulty (row-derived; authoritative)

- All 100: **foundational 18 · beginner 27 · intermediate 50 · advanced 5**.
- The 39 Phase 12–13 additions: **F 8 / B 12 / I 15 / A 4**.
- Note: the approved Phase 13 design matrix header originally recorded the
  additions as F8/B14/I13/A4. That header went stale during batch authoring.
  Row-derived counts above are the truth; **no scenario difficulty was changed**
  to fit the obsolete header.

### Scenario type (all 100)

CONFIGURATION_ERROR 28 · FOUNDATIONAL_DIAGNOSIS 11 · COMPONENT_FAILURE 10 ·
RESOURCE_EXHAUSTION 10 · EVIDENCE_DISCRIMINATION 8 · DEPENDENCY_FAILURE 7 ·
SERVICE_FAILURE 7 · RECOVERY 5 · SECURITY_TRIAGE 5 · INTERMITTENT_FAILURE 4 ·
COMMUNICATION_SUPPORT 4 · MULTI_FAULT 1 · CROSS_DOMAIN 0.

### Root-cause class (all 100)

Configuration 32 · Physical/connection 12 · Capacity 11 · Operational 9 ·
Hardware 7 · Software/version 7 · Service state 7 · Security 7 ·
Permissions 6 · External 2. Configuration + service-state + permissions +
physical/connection together = **57%** — a deliberate "breadth core" around the
method (evidence-first) rather than a spread of exotic causes.

### Environment

equipment-bench/shell none 31 · windows-panel/shell windows 18 ·
mixed/shell none 17 · linux-terminal/shell linux 14 ·
network+terminal/shell linux 9 · hardware-bench/shell none 5 ·
network+terminal/shell windows 5 · mixed/shell windows 1.

### Actions

4–9 per scenario (avg 5.8); every scenario has ≥1 diagnostic action, ≥1 fix
action, 3 escalating hints, success conditions, and ≥2 verification steps.

## Final inventory — 100 scenarios (Phase 13G)

| ID | Title | Domain | Difficulty | Type | Ticket | Environment | Major skill | Root cause | Prereq | Guided | KB links | Verification |
|----|-------|--------|------------|------|--------|-------------|-------------|------------|--------|--------|----------|--------------|
| ap-channel-congestion | Wi-Fi crawl speed after the neighbouring fit-out | hardware | intermediate | CONFIGURATION_ERROR | HD-1047 | equipment-bench (access-point), shell none | access-point | External | ap-poe-port-disabled | 4 steps | troubleshooting-method | `ap.pathOk` |
| ap-client-addressing | Connected to Wi-Fi but no internet on one laptop | hardware | beginner | CONFIGURATION_ERROR | HD-1049 | equipment-bench (access-point), shell none | access-point | Configuration | ap-poe-port-disabled | 3 steps | ip-addressing-basics, troubleshooting-method | `ap.pathOk` |
| ap-drop-unplugged | Wireless dropped in meeting room B after ceiling cleaning | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1045 | equipment-bench (access-point), shell none | access-point | Physical/connection | ap-poe-port-disabled | 3 steps | poe-power-basics | `ap.pathOk` |
| ap-poe-port-disabled | Ceiling access point went dark after closet work | hardware | intermediate | DEPENDENCY_FAILURE | HD-1044 | equipment-bench (access-point), shell none | access-point | Configuration | — | 4 steps | poe-power-basics, troubleshooting-method | `ap.pathOk` |
| ap-radio-disabled | The guest SSID vanished after a profile rollout | hardware | beginner | CONFIGURATION_ERROR | HD-1048 | equipment-bench (access-point), shell none | access-point | Configuration | ap-poe-port-disabled | 3 steps | troubleshooting-method | `ap.pathOk` |
| ap-wrong-passphrase | One laptop cannot join the office Wi-Fi | hardware | intermediate | CONFIGURATION_ERROR | HD-1046 | equipment-bench (access-point), shell none | access-point | Configuration | ap-poe-port-disabled | 3 steps | troubleshooting-method, ip-addressing-basics | `ap.pathOk` |
| cpu-thermal-shutdown | Workstation shuts down while rendering | hardware | intermediate | COMPONENT_FAILURE | HD-1016 | hardware-bench, shell none | hardware-diagnostics | Physical/connection | pc-no-power | 4 steps | troubleshooting-method | `bench.thermalVerified` |
| patch-crossconnect-mislabelled | Link light at the switch but the desk never gets an address | hardware | advanced | EVIDENCE_DISCRIMINATION | HD-1056 | equipment-bench (patch-panel), shell none | structured-cabling | Operational | patch-keystone-loose | 4 steps | network-cabling-basics | `patch.pathOk` |
| patch-keystone-loose | Desk 3-14 lost the network after the cleaner moved the cabinet | hardware | intermediate | FOUNDATIONAL_DIAGNOSIS | HD-1055 | equipment-bench (patch-panel), shell none | structured-cabling | Physical/connection | — | 3 steps | network-cabling-basics, troubleshooting-method | `patch.pathOk` |
| patch-lead-not-seated | Intermittent link that returns when the cable is touched | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1058 | equipment-bench (patch-panel), shell none | structured-cabling | Physical/connection | patch-keystone-loose | 3 steps | network-cabling-basics, troubleshooting-method | `patch.pathOk` |
| patch-switch-port-disabled | New desk is cabled but the switch port stays amber | hardware | intermediate | CONFIGURATION_ERROR | HD-1057 | equipment-bench (patch-panel), shell none | structured-cabling | Configuration | patch-keystone-loose | 3 steps | network-cabling-basics, ip-addressing-basics | `patch.pathOk` |
| pc-no-power | Desktop PC does not power on | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1001 | hardware-bench, shell none | hardware-diagnostics | Physical/connection | — | 4 steps | troubleshooting-method | `bench.posted` |
| pc-on-no-display | PC powers on but no display | hardware | beginner | MULTI_FAULT | HD-1002 | hardware-bench, shell none | hardware-diagnostics | Physical/connection | pc-no-power | 5 steps | troubleshooting-method | `bench.displayOk` |
| printer-ip-conflict | Printer link is green but jobs never arrive | hardware | intermediate | CONFIGURATION_ERROR | HD-1032 | equipment-bench (printer), shell none | printer | Configuration | printer-queue-paused, printer-network-unreachable | 4 steps | ip-addressing-basics, troubleshooting-method | `printer.printReady` |
| printer-low-toner | Printer reports output rejected for low toner | hardware | foundational | COMPONENT_FAILURE | HD-1031 | equipment-bench (printer), shell none | printer | Hardware | printer-queue-paused | 3 steps | troubleshooting-method | `printer.printReady` |
| printer-network-unreachable | Printer is online but unreachable from the floor | hardware | intermediate | DEPENDENCY_FAILURE | HD-1030 | equipment-bench (printer), shell none | printer | Configuration | printer-queue-paused | 4 steps | troubleshooting-method, ip-addressing-basics | `printer.printReady` |
| printer-paper-jam | Printer stops mid-job with a jam alarm | hardware | beginner | COMPONENT_FAILURE | HD-1029 | equipment-bench (printer), shell none | printer | Hardware | printer-queue-paused | 4 steps | troubleshooting-method | `printer.printReady` |
| printer-queue-paused | Printer accepts jobs but nothing prints | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1028 | equipment-bench (printer), shell none | printer | Operational | — | 4 steps | troubleshooting-method | `printer.printReady` |
| ram-instability-crashes | PC reboots itself under load | hardware | intermediate | INTERMITTENT_FAILURE | HD-1015 | hardware-bench, shell none | hardware-diagnostics | Hardware | pc-on-no-display | 5 steps | troubleshooting-method | `bench.stabilityVerified` |
| router-cable-loose-wan | Internet dropped after the cleaner visited the comms room | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1035 | equipment-bench (router), shell none | router | Physical/connection | router-wan-misconfigured | 3 steps | troubleshooting-method | `router.clientPath` |
| router-dhcp-exhausted | New hires cannot get an address on the guest floor | hardware | intermediate | RESOURCE_EXHAUSTION | HD-1034 | equipment-bench (router), shell none | router | Capacity | router-wan-misconfigured | 4 steps | ip-addressing-basics | `router.clientPath` |
| router-lan-link-down | Wired desks went dark while Wi-Fi kept working | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1038 | equipment-bench (router), shell none | router | Physical/connection | router-wan-misconfigured | 4 steps | troubleshooting-method | `router.clientPath` |
| router-nat-disabled | Router reaches the internet but clients cannot | hardware | intermediate | CONFIGURATION_ERROR | HD-1036 | equipment-bench (router), shell none | router | Configuration | router-wan-misconfigured | 4 steps | gateway-vs-dns, ip-addressing-basics | `router.clientPath` |
| router-upstream-outage | Everything looks configured but the site is offline | hardware | intermediate | EVIDENCE_DISCRIMINATION | HD-1037 | equipment-bench (router), shell none | router | External | router-wan-misconfigured | 4 steps | troubleshooting-method, ip-addressing-basics | `router.clientPath` |
| router-wan-misconfigured | Branch router has link but no internet | hardware | intermediate | CONFIGURATION_ERROR | HD-1033 | equipment-bench (router), shell none | router | Configuration | — | 4 steps | ip-addressing-basics, gateway-vs-dns | `router.clientPath` |
| storage-not-detected | No boot device found after cleaning | hardware | beginner | COMPONENT_FAILURE | HD-1017 | hardware-bench, shell none | hardware-diagnostics | Physical/connection | pc-no-power | 5 steps | troubleshooting-method | `bench.bootVerified` |
| switch-poe-overload | Two ceiling access points stopped powering up | hardware | intermediate | RESOURCE_EXHAUSTION | HD-1043 | equipment-bench (switch), shell none | switch | Capacity | switch-vlan-mismatch | 4 steps | poe-power-basics, ip-addressing-basics | `switch.poeBudgetOk` |
| switch-port-faulty | One port keeps dropping a desk phone even when reseated | hardware | intermediate | COMPONENT_FAILURE | HD-1042 | equipment-bench (switch), shell none | switch | Hardware | switch-port-shutdown | 4 steps | ip-addressing-basics | `switch.ports.3.link` |
| switch-port-shutdown | One desk lost connectivity after closet maintenance | hardware | intermediate | CONFIGURATION_ERROR | HD-1039 | equipment-bench (switch), shell none | switch | Configuration | — | 4 steps | ip-addressing-basics, vlan-basics | `switch.ports.3.link` |
| switch-uplink-down | Whole closet lost the server VLAN after a rack move | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1041 | equipment-bench (switch), shell none | switch | Physical/connection | switch-port-shutdown | 3 steps | troubleshooting-method | `switch.uplinkLink` |
| switch-vlan-mismatch | Ports show green links but the finance VLAN traffic dies at the uplink | hardware | intermediate | CONFIGURATION_ERROR | HD-1040 | equipment-bench (switch), shell none | switch | Configuration | switch-port-shutdown | 4 steps | vlan-basics, ip-addressing-basics | `switch.ports.0.path` |
| ups-battery-expired | UPS screams a self-test warning every morning | hardware | beginner | COMPONENT_FAILURE | HD-1050 | equipment-bench (ups), shell none | ups | Hardware | — | 3 steps | ups-runtime-basics, troubleshooting-method | `ups.batteryOk` |
| ups-breaker-tripped | UPS output died after the rack fans spun up | hardware | beginner | COMPONENT_FAILURE | HD-1054 | equipment-bench (ups), shell none | ups | Capacity | ups-overload | 3 steps | ups-runtime-basics | `ups.outputPresent` |
| ups-input-unplugged | UPS on battery although the room has power | hardware | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1053 | equipment-bench (ups), shell none | ups | Physical/connection | — | 3 steps | ups-runtime-basics, troubleshooting-method | `ups.onUtility` |
| ups-outlet-group-dead | Half the rack lost power while the UPS shows healthy input | hardware | intermediate | COMPONENT_FAILURE | HD-1052 | equipment-bench (ups), shell none | ups | Hardware | ups-battery-expired | 3 steps | ups-runtime-basics, troubleshooting-method | `ups.outputPresent` |
| ups-overload | UPS overload lamp lit and beeping under normal load | hardware | intermediate | RESOURCE_EXHAUSTION | HD-1051 | equipment-bench (ups), shell none | ups | Capacity | ups-battery-expired | 3 steps | ups-runtime-basics | `ups.loadOk` |
| dhcp-addressing-broken | Clients get 169.254 addresses | networking | intermediate | SERVICE_FAILURE | HD-1009 | network+terminal, shell windows | dhcp | Service state | wifi-connected-no-internet | 5 steps | ip-addressing-basics, gateway-vs-dns | `diagnostics.verified` |
| dns-some-sites-broken | Some websites work, some don't | networking | beginner | EVIDENCE_DISCRIMINATION | HD-1007 | network+terminal, shell windows | dns | Service state | — | 5 steps | what-is-dns, gateway-vs-dns, ip-addressing-basics | `diagnostics.verified` |
| duplicate-ip-conflict | IP address conflict on the network | networking | intermediate | INTERMITTENT_FAILURE | HD-1010 | network+terminal, shell windows | ip-addressing | Configuration | dhcp-addressing-broken | 5 steps | ip-addressing-basics | `diagnostics.verified` |
| firewall-blocks-port | Finance app times out on one port | networking | intermediate | CONFIGURATION_ERROR | HD-1022 | network+terminal, shell windows | firewall | Configuration | wifi-connected-no-internet | 5 steps | gateway-vs-dns, troubleshooting-method | `fw.portVerified` |
| wifi-connected-no-internet | Wi-Fi connected but no internet | networking | beginner | CONFIGURATION_ERROR | HD-1008 | network+terminal, shell windows | gateway | Configuration | dns-some-sites-broken | 5 steps | ip-addressing-basics, gateway-vs-dns | `diagnostics.verified` |
| windows-acl-local | Staff can open the shared folder but cannot save files | windows | intermediate | CONFIGURATION_ERROR | HD-1062 | windows-panel, shell windows | permissions | Permissions | — | 5 steps | least-privilege-basics, troubleshooting-method | `acl.verified` |
| windows-app-crash | Application keeps crashing | windows | intermediate | DEPENDENCY_FAILURE | HD-1004 | windows-panel, shell windows | event-logs | Software/version | windows-wont-boot | 5 steps | windows-event-logs, troubleshooting-method | `app.verified` |
| windows-device-error | Camera reports Code 43 after driver update | windows | intermediate | COMPONENT_FAILURE | HD-1019 | windows-panel, shell windows | event-logs | Software/version | windows-update-failure | 5 steps | windows-event-logs, troubleshooting-method | `camera.verified` |
| windows-dns-cache-stale | Browser keeps loading the old webmail server | windows | beginner | CONFIGURATION_ERROR | HD-1060 | windows-panel, shell windows | dns | Configuration | dns-some-sites-broken | 5 steps | what-is-dns, troubleshooting-method | `net.verified` |
| windows-memory-exhaustion | Workstation slows to a crawl since this morning | windows | beginner | RESOURCE_EXHAUSTION | HD-1063 | windows-panel, shell windows | task-manager | Capacity | windows-app-crash | 5 steps | windows-event-logs, troubleshooting-method | `mem.verified` |
| windows-nic-disabled | Finance laptop shows 'No network access' | windows | foundational | CONFIGURATION_ERROR | HD-1065 | windows-panel, shell windows | network-adapter | Configuration | windows-device-error | 5 steps | ip-addressing-basics, troubleshooting-method | `net.verified` |
| windows-profile-temp | Desktop and files missing after every login | windows | intermediate | CONFIGURATION_ERROR | HD-1059 | windows-panel, shell windows | event-logs | Configuration | windows-wont-boot | 5 steps | windows-event-logs, troubleshooting-method | `profile.verified` |
| windows-service-timeout | Monitoring agent silent after reboot | windows | intermediate | DEPENDENCY_FAILURE | HD-1061 | windows-panel, shell windows | services | Service state | windows-app-crash | 5 steps | windows-event-logs, troubleshooting-method | `agent.verified` |
| windows-spooler-stopped | Print jobs sit in the queue and never print | windows | foundational | SERVICE_FAILURE | HD-1064 | windows-panel, shell windows | services | Service state | windows-app-crash | 5 steps | windows-event-logs, troubleshooting-method | `printq.verified` |
| windows-update-failure | Windows Update fails with 0x80070002 | windows | intermediate | RECOVERY | HD-1018 | windows-panel, shell windows | event-logs | Software/version | windows-app-crash | 5 steps | windows-event-logs, windows-boot-repair, troubleshooting-method | `update.installVerified` |
| windows-wont-boot | Windows fails to start after update | windows | beginner | RECOVERY | HD-1003 | windows-panel, shell windows | windows-boot | Software/version | — | 5 steps | windows-boot-repair, windows-event-logs, troubleshooting-method | `boot.reachesLogin` |
| linux-cron-not-running | Nightly backup job has not run in three days | linux | beginner | SERVICE_FAILURE | HD-1071 | linux-terminal, shell linux | cron | Configuration | linux-service-failing | 6 steps | systemd-service-basics, troubleshooting-method | `cronf.verified` |
| linux-disk-full | App writes fail: no space left on device | linux | intermediate | RESOURCE_EXHAUSTION | HD-1020 | linux-terminal, shell linux | disk-space | Capacity | linux-service-failing | 5 steps | troubleshooting-method, disk-space-slow-pc | `disk.verified` |
| linux-fs-readonly | App keeps crashing with read-only filesystem errors | linux | intermediate | RECOVERY | HD-1069 | linux-terminal, shell linux | filesystems | Software/version | linux-service-failing | 6 steps | troubleshooting-method | `ro.verified` |
| linux-inode-exhaustion | Mail delivery stops while the volume still shows free space | linux | intermediate | RESOURCE_EXHAUSTION | HD-1068 | linux-terminal, shell linux | disk-space | Capacity | linux-disk-full | 5 steps | disk-space-slow-pc, troubleshooting-method | `ino.verified` |
| linux-package-conflict | Security update will not install on the app server | linux | beginner | DEPENDENCY_FAILURE | HD-1070 | linux-terminal, shell linux | packages | Software/version | linux-service-failing | 5 steps | troubleshooting-method, systemd-service-basics | `pkg.verified` |
| linux-permission-denied | Permission denied writing config | linux | beginner | CONFIGURATION_ERROR | HD-1005 | linux-terminal, shell linux | linux-permissions | Permissions | — | 4 steps | linux-permissions-basics, troubleshooting-method | `perms.verified` |
| linux-resolver-wrong | Cannot reach the print server by name | linux | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1072 | linux-terminal, shell linux | dns | Configuration | — | 5 steps | what-is-dns, gateway-vs-dns | `res.verified` |
| linux-runaway-process | Server crawls: one process pinned at 100% CPU | linux | intermediate | RESOURCE_EXHAUSTION | HD-1021 | linux-terminal, shell linux | processes | Capacity | linux-service-failing | 5 steps | troubleshooting-method, systemd-service-basics | `cpu.verified` |
| linux-service-failing | nginx service fails to start | linux | intermediate | SERVICE_FAILURE | HD-1006 | linux-terminal, shell linux | systemd | Permissions | linux-permission-denied | 5 steps | systemd-service-basics, linux-permissions-basics | `svc.verified` |
| linux-ssh-key-perms | SSH sign-in rejected for the deploy account | linux | beginner | CONFIGURATION_ERROR | HD-1067 | linux-terminal, shell linux | linux-permissions | Permissions | linux-permission-denied | 4 steps | linux-permissions-basics, least-privilege-basics | `perms.loginVerified` |
| linux-unit-invalid | Reporting collector will not start after the upgrade | linux | intermediate | CONFIGURATION_ERROR | HD-1066 | linux-terminal, shell linux | systemd | Configuration | linux-service-failing | 6 steps | systemd-service-basics, troubleshooting-method | `svc.verified` |
| backup-failed | Nightly backup failing for three days | sysadmin | intermediate | RECOVERY | HD-1026 | windows-panel, shell windows | backup | Configuration | — | 4 steps | windows-event-logs, troubleshooting-method | `backup.verified` |
| disk-full-slow-pc | PC extremely slow, disk almost full | sysadmin | beginner | RESOURCE_EXHAUSTION | HD-1013 | windows-panel, shell windows | storage | Capacity | — | 4 steps | disk-space-slow-pc, windows-event-logs | `storage.verified` |
| service-dependency | inventory-api will not start after reboot | sysadmin | intermediate | DEPENDENCY_FAILURE | HD-1027 | linux-terminal, shell linux | systemd | Configuration | — | 5 steps | systemd-service-basics, troubleshooting-method | `dep.verified` |
| sysadmin-backup-verify | Restore test is missing files from last week | sysadmin | intermediate | RECOVERY | HD-1073 | windows-panel, shell windows | backup | Operational | backup-failed | 5 steps | windows-event-logs, troubleshooting-method | `backup.verified` |
| sysadmin-cert-expired | Browser blocks intranet page with a privacy error | sysadmin | beginner | CONFIGURATION_ERROR | HD-1078 | linux-terminal, shell linux | systemd | Operational | — | 5 steps | systemd-service-basics, troubleshooting-method | `cert.verified` |
| sysadmin-change-regression | Large print jobs stuck in the queue | sysadmin | advanced | CONFIGURATION_ERROR | HD-1079 | linux-terminal, shell linux | printing | Configuration | service-dependency | 5 steps | systemd-service-basics, troubleshooting-method | `print.verified` |
| sysadmin-clock-drift | Logins rejected with a time difference error | sysadmin | foundational | CONFIGURATION_ERROR | HD-1077 | windows-panel, shell windows | event-logs | Configuration | — | 5 steps | windows-event-logs, troubleshooting-method | `time.verified` |
| sysadmin-disk-smart | Data drive dropping out with media errors | sysadmin | intermediate | COMPONENT_FAILURE | HD-1076 | windows-panel, shell windows | storage | Hardware | disk-full-slow-pc | 5 steps | windows-event-logs, disk-space-slow-pc, troubleshooting-method | `disk.verified` |
| sysadmin-dns-record-stale | Invoice portal still opens the retired server | sysadmin | beginner | CONFIGURATION_ERROR | HD-1075 | windows-panel, shell windows | dns | Configuration | — | 5 steps | what-is-dns, troubleshooting-method | `net.verified` |
| sysadmin-task-condition | Patch task never runs on schedule | sysadmin | intermediate | CONFIGURATION_ERROR | HD-1074 | windows-panel, shell windows | task-scheduler | Configuration | — | 5 steps | windows-event-logs, troubleshooting-method | `task.verified` |
| db-auth-failure | Password authentication failed after secret rotation | database | intermediate | CONFIGURATION_ERROR | HD-1023 | network+terminal, shell linux | databases | Configuration | db-connection-refused | 5 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-connection-refused | App cannot connect to database | database | intermediate | SERVICE_FAILURE | HD-1014 | network+terminal, shell linux | databases | Service state | — | 5 steps | database-connection-basics, systemd-service-basics, gateway-vs-dns | `db.verified` |
| db-grant-missing | Invoice export fails with permission denied for table | database | intermediate | CONFIGURATION_ERROR | HD-1080 | network+terminal, shell linux | databases | Permissions | db-auth-failure | 6 steps | least-privilege-basics, troubleshooting-method | `db.verified` |
| db-lock-contention | Report queries hang and never finish | database | advanced | EVIDENCE_DISCRIMINATION | HD-1081 | network+terminal, shell linux | databases | Operational | db-pool-exhausted | 6 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-pool-exhausted | Order API: no connections available at peak | database | intermediate | RESOURCE_EXHAUSTION | HD-1024 | network+terminal, shell linux | databases | Capacity | db-connection-refused | 5 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-replication-lag | Search still returns products deleted yesterday | database | intermediate | DEPENDENCY_FAILURE | HD-1084 | network+terminal, shell linux | databases | Service state | db-connection-refused | 7 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-schema-mismatch | Pricing API returns errors since the overnight migration | database | advanced | CONFIGURATION_ERROR | HD-1085 | network+terminal, shell linux | databases | Software/version | — | 6 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-stale-pool-conns | Checkout intermittently fails with dropped connections | database | intermediate | INTERMITTENT_FAILURE | HD-1082 | network+terminal, shell linux | databases | Configuration | db-pool-exhausted | 6 steps | database-connection-basics, troubleshooting-method | `db.verified` |
| db-wal-bloat-full | Inventory writes failing with no space left on device | database | intermediate | RESOURCE_EXHAUSTION | HD-1083 | network+terminal, shell linux | databases | Capacity | db-connection-refused | 6 steps | disk-space-slow-pc, database-connection-basics | `db.verified` |
| malware-endpoint-alert | EDR alert on the sales laptop | security | intermediate | SECURITY_TRIAGE | SEC-2003 | mixed, shell none | endpoint-security | Security | phishing-ticket-triage | 5 steps | phishing-awareness, troubleshooting-method | `endpoint.scanClean` |
| phishing-ticket-triage | Suspicious email reported | security | beginner | SECURITY_TRIAGE | SEC-2001 | mixed, shell none | phishing | Security | — | 5 steps | phishing-awareness, least-privilege-basics | `mail.verified` |
| security-browser-extension | Homepage keeps changing; logins feel off | security | beginner | EVIDENCE_DISCRIMINATION | SEC-2005 | mixed, shell none | endpoint-security | Security | — | 5 steps | phishing-awareness, troubleshooting-method | `browser.verified` |
| security-edr-agent-unhealthy | No EDR check-ins from finance laptops for two days | security | foundational | SERVICE_FAILURE | SEC-2007 | mixed, shell none | endpoint-security | Service state | — | 5 steps | troubleshooting-method | `endpoint.verified` |
| security-failed-logins-triage | Alert: 40 failed logins on the shared mailbox | security | beginner | EVIDENCE_DISCRIMINATION | SEC-2006 | mixed, shell none | identity | Configuration | — | 5 steps | least-privilege-basics, troubleshooting-method | `identity.verified` |
| security-outbound-beacon | Nightly traffic to a domain nobody recognizes | security | advanced | EVIDENCE_DISCRIMINATION | SEC-2009 | mixed, shell none | endpoint-security | Security | malware-endpoint-alert | 5 steps | least-privilege-basics, troubleshooting-method | `beacon.verified` |
| security-privilege-change | User appears in Domain Admins unexpectedly | security | intermediate | SECURITY_TRIAGE | SEC-2008 | mixed, shell none | identity | Security | suspicious-signin | 5 steps | least-privilege-basics, troubleshooting-method | `priv.caseClosed` |
| security-task-persistence | Adware keeps reopening after we remove it | security | foundational | SECURITY_TRIAGE | SEC-2004 | mixed, shell none | endpoint-security | Security | malware-endpoint-alert | 5 steps | troubleshooting-method, least-privilege-basics | `endpoint.scanClean` |
| suspicious-signin | Impossible-travel sign-in alert | security | intermediate | SECURITY_TRIAGE | SEC-2002 | mixed, shell none | identity | Security | — | 5 steps | least-privilege-basics, troubleshooting-method | `identity.alertClosed` |
| account-lockout | User locked out of account | support | beginner | COMMUNICATION_SUPPORT | HD-1012 | mixed, shell none | identity | Operational | — | 4 steps | least-privilege-basics, troubleshooting-method | `identity.loggedIn` |
| email-not-receiving | Partner emails never arrive | support | beginner | COMMUNICATION_SUPPORT | HD-1025 | mixed, shell none | helpdesk | Operational | — | 5 steps | troubleshooting-method | `mailflow.verified` |
| printer-not-printing | Printer isn't printing | support | foundational | FOUNDATIONAL_DIAGNOSIS | HD-1011 | mixed, shell windows | helpdesk | Operational | — | 4 steps | troubleshooting-method | `printer.verified` |
| support-bluetooth-profile | Bluetooth headset pairs but mic is silent | support | foundational | CONFIGURATION_ERROR | HD-1089 | mixed, shell none | helpdesk | Configuration | — | 4 steps | troubleshooting-method | `bt.verified` |
| support-dock-peripherals | Dock drops monitor, keyboard, and mouse together | support | beginner | INTERMITTENT_FAILURE | HD-1091 | mixed, shell none | helpdesk | Physical/connection | — | 5 steps | troubleshooting-method | `dock.verified` |
| support-file-locked | Budget file opens read-only for edit | support | beginner | COMMUNICATION_SUPPORT | HD-1086 | mixed, shell none | helpdesk | Operational | — | 5 steps | troubleshooting-method | `lock.verified` |
| support-share-permissions | Colleagues can open the folder but not save | support | intermediate | EVIDENCE_DISCRIMINATION | HD-1087 | mixed, shell none | helpdesk | Permissions | — | 5 steps | least-privilege-basics, troubleshooting-method | `share.verified` |
| support-smtp-outbound | We receive client emails but replies never arrive | support | beginner | SERVICE_FAILURE | HD-1090 | mixed, shell none | helpdesk | Configuration | email-not-receiving | 6 steps | troubleshooting-method | `smtp.verified` |
| support-webcam-app | Camera works in Camera app, black in meetings | support | foundational | COMMUNICATION_SUPPORT | HD-1088 | mixed, shell none | helpdesk | Configuration | — | 5 steps | troubleshooting-method | `webcam.verified` |

- Difficulty: intermediate=50, beginner=27, foundational=18, advanced=5
- Type: CONFIGURATION_ERROR=28, FOUNDATIONAL_DIAGNOSIS=11, COMPONENT_FAILURE=10, RESOURCE_EXHAUSTION=10, EVIDENCE_DISCRIMINATION=8, DEPENDENCY_FAILURE=7, SERVICE_FAILURE=7, RECOVERY=5, SECURITY_TRIAGE=5, INTERMITTENT_FAILURE=4, COMMUNICATION_SUPPORT=4, MULTI_FAULT=1
- Root-cause class: Configuration=32, Physical/connection=12, Capacity=11, Operational=9, Hardware=7, Software/version=7, Service state=7, Security=7, Permissions=6, External=2
- Environment: equipment-bench / shell none=31, windows-panel / shell windows=18, mixed / shell none=17, linux-terminal / shell linux=14, network+terminal / shell linux=9, hardware-bench / shell none=5, network+terminal / shell windows=5, mixed / shell windows=1
- Domain: hardware=36, windows=11, linux=11, sysadmin=10, support=9, security=9, database=9, networking=5
- Actions per scenario: min 4, max 9, avg 5.8


## Phase 12–13 expansion summary (39 scenarios)

- **Phase 12** (windows +7, linux +7, sysadmin +7, database +6 = 27):
  tickets HD-1059–HD-1085. **Phase 13** (security +6, support +6 = 12):
  tickets SEC-2004–SEC-2009, HD-1086–HD-1091. Total 39 → catalog 61 → **100**.
- All three approval batches (14 + 13 + 12) shipped with no engine, UI, or
  schema changes; the original 61 scenarios were not modified; count guards in
  `simulation.test.ts` and `equipment/logic.test.ts` updated to 100.
- Difficulties of the 39: F8/B12/I15/A4 (see Final counts). Types skew to
  configuration/service/dependency faults at intermediate level, matching the
  domain floors these batches filled (first advanced cases for database and
  security, first sysadmin/linux Windows-service style cases).

## Prerequisite graph (Phase 13G)

- 66 edges · 65 scenarios with ≥1 prereq · 35 roots · **max depth 4** · no
  cycles (asserted by the catalog-invariant test).
- Most depended on: `linux-service-failing` (6), `router-wan-misconfigured`
  (5), `ap-poe-port-disabled` (5), `printer-queue-paused` (4),
  `windows-app-crash` (4), `db-connection-refused` (4).
- 14 edges run from an intermediate family hub to a simpler family member
  (e.g. `ap-poe-port-disabled → ap-drop-unplugged`) — the Phase 11 family-hub
  pattern. Prereqs render as advisory "Requires …" locks in the catalog;
  rows stay clickable, so no scenario is unreachable.
- Pedagogical progression: foundations are roots; hubs sit at the point where
  a family's method is established; nothing chains deeper than 4 steps.

## Duplication audit (Phase 13G — all 100 compared)

Compared across symptom, root cause, evidence set, diagnostic path, fix
sequence, verification, lesson, environment. Clusters examined:

| Cluster | Scenarios | Verdict |
|---------|-----------|---------|
| DNS resolution | dns-some-sites-broken (resolver down), windows-dns-cache-stale (client cache), sysadmin-dns-record-stale (zone record), linux-resolver-wrong (resolv.conf) | Keep — four distinct layers (upstream resolver / client cache / authoritative record / OS resolver config), each with its own evidence surface |
| Printing | printer-not-printing (support chat, queue paused), printer-queue-paused (device panel), windows-spooler-stopped (spooler service), printer-ip-conflict, duplicate-ip-conflict | Keep — closest pair is the two queue-paused scenarios: same root class but different environment (SupportLab conversation vs equipment panel), audience, and evidence ordering; the others are distinct layers (service / addressing) |
| Credential rotation | backup-failed (SMB 0x80070005), db-auth-failure (stale Vault secret), security-failed-logins-triage (attribution pattern) | Keep — three surfaces of one real-world cause class; each proves it against different tooling |
| Duplicate IP | printer-ip-conflict (device config surface), duplicate-ip-conflict (network ARP/DHCP observation) | Keep — device-lab vs network-lab perspectives; different evidence and fix verbs |
| Service dependency | service-dependency (systemd Requires), windows-service-timeout (Event 7000/7001) | Keep — different OS and tooling, same graph-reading skill |
| Account lockout | account-lockout (identity verification workflow), security-failed-logins-triage (log pattern attribution) | Keep — support workflow vs security attribution |
| Admin-down ports | switch-port-shutdown, printer-network-unreachable, patch-switch-port-disabled, ap-poe-port-disabled | Keep — deliberate cross-device coverage of one fault class; each path is family-specific (panel / tone trace / PoE budget) |

No two scenarios share symptom + root cause + evidence + remediation +
verification. Ticket symptoms and titles are differentiated; no ticket states
its root cause (timing clues are symptom history, not answers). Word-level
overlap reviewed — nothing removed.

## Curriculum coverage and gaps (Phase 13G)

| Domain | Count | Difficulty spread | Gap documented (no new scenarios built) |
|--------|------:|-------------------|-----------------------------------------|
| hardware | 36 | F9 B7 I19 A1 | deepest chain; bench + 6 equipment families |
| windows | 11 | F2 B3 I6 | no advanced scenario |
| linux | 11 | F1 B4 I6 | no advanced scenario |
| sysadmin | 10 | F1 B3 I5 A1 | — |
| database | 9 | I7 A2 | **no foundational/beginner** — floor starts at intermediate |
| security | 9 | F2 B3 I3 A1 | best spread |
| support | 9 | F3 B5 I1 | no intermediate+ beyond one; no advanced |
| networking | 5 | B2 I3 | fewest scenarios; no foundational, no advanced |

Other documented gaps (future phases only): no CROSS_DOMAIN scenario yet
(candidates listed in Phase 10.11); no virtualization/container, monitoring-
first, physical-security, or macOS/mobile scenarios.

### KB linkage (Phase 13G — all 16 articles used)

troubleshooting-method 77 · ip-addressing-basics 18 · windows-event-logs 14 ·
least-privilege-basics 11 · systemd-service-basics 9 · gateway-vs-dns 8 ·
database-connection-basics 8 · disk-space-slow-pc 5 · ups-runtime-basics 5 ·
network-cabling-basics 4 · what-is-dns 4 · poe-power-basics 3 ·
phishing-awareness 3 · linux-permissions-basics 3 · windows-boot-repair 2 ·
vlan-basics 2. Classification: **adequately covered** — the 8 high-traffic
articles above 4 links; **could strengthen existing** — vlan-basics and
windows-boot-repair (thin linkage relative to their scenario surface);
**genuine future gaps (no article today)** — print/spooler troubleshooting,
certificate lifecycle, SMTP mail flow, wireless RF/channel concepts, backup
verification strategy, file locking/SMB sessions, containers/VMs. No KB
article was created in Phase 13G.

## Inventory — Phase 10 (30 scenarios: baseline 15 + expansion 15)

| ID | Domain | Type | Difficulty | Prereq | Primary learning objective | Root cause(s) | Evidence sources | Diagnostic actions | Fix actions | Verification | Environment | 3D/2D | Conversation |
|----|--------|------|-----------|--------|---------------------------|---------------|------------------|--------------------|-------------|--------------|-------------|-------|--------------|
| pc-no-power | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | — | Separate no-POST from no-power; check PSU/cabling/front-panel systematically | Strip switch off **and** loose front-panel header (stacked) | `bench.*` power chain (wall, cable, PSU sw, standby, FP, POST) | check-wall, check-cable, check-front-panel | press-power (+ corrective inspect patches), replace-psu-wrong trap | `bench.posted=true`, fans spin, FP seated | hardware-bench, shell none | 2D SVG + 3D workbench (shared hotspot builder) | State-gated script (Maya Chen) |
| pc-on-no-display | hardware | MULTI_FAULT | beginner | pc-no-power | Differentiate no-POST beeps from display-path failures; isolate GPU/RAM/monitor/cable | Unseated RAM **plus** loose video cable at GPU | `bench.*` (monitorPower, videoCableToGpu, gpuSeated, ramSeated, beepCode, displayOk) | check-monitor-power, listen-beeps | reseat-video-cable, reseat-ram, power-test | display OK + POST clean | hardware-bench, shell none | 2D SVG + 3D workbench | No script |
| ram-instability-crashes | hardware | INTERMITTENT_FAILURE | intermediate | pc-on-no-display | Treat intermittent resets as evidence — history, load pattern, targeted test | Failing DIMM in slot B1 hard-resets the machine under memory pressure | `bench.*` (lastPowerEvent, memTestRun/memTestPass gated, dimmFaultySlot, psu rails via action) | review-crash-logs, check-psu-rails, run-memory-test | remove-failed-dimm, verify-stability, reinstall-os-wrong trap | Memory test passes + 15-min load session clean | hardware-bench, shell none | 2D SVG + 3D workbench (faulty slot red, module removed in both) | No script |
| cpu-thermal-shutdown | hardware | COMPONENT_FAILURE | intermediate | pc-no-power | Correlate time-of-death with sensor logs; verify cooling chain physically | CPU fan header half-seated → 0 RPM → thermal trip at 94°C under load | `bench.*` (cpuFanSpinning observable, thermalLog/fanHeader via actions, lastPowerEvent) | read-thermal-log, inspect-cooler-fan | reseat-fan-header, verify-thermal-load, replace-cpu-wrong trap | 61°C under load, no shutdown | hardware-bench, shell none | 2D SVG (FAN STOPPED label) + 3D workbench (fan stops/spins) | No script |
| storage-not-detected | hardware | COMPONENT_FAILURE | beginner | pc-no-power | Translate 'no boot device' into a link problem; prove enumeration first | SATA data cable loose at drive end after desk cleaning | `bench.*` (sataDataSeated observable, sataPowerSeated, driveDetected, lastPowerEvent) | read-boot-error, inspect-sata-cables, check-boot-order | reseat-sata-data, verify-boot, replace-drive-wrong trap | Firmware enumerates SSD + boots | hardware-bench, shell none | 2D SVG (NO DEVICE label, red cable) + 3D workbench (cable red/pulled, label red) | No script |
| windows-wont-boot | windows | RECOVERY | beginner | — | Safe recovery/startup-repair concepts; correlate update events with boot failure | Incompletely staged update left boot config pending | `boot.*`, Event Viewer `logs[]`, `services[]` | boot-recovery, review-boot-logs, safe-mode | run-startup-repair, normal-boot, factory-reset-wrong trap | Reaches login (normal-boot after repair) | windows-panel, shell windows | 2D only | State-gated script (Sam Ortiz) |
| windows-app-crash | windows | DEPENDENCY_FAILURE | intermediate | windows-wont-boot | Use Event Viewer faulting modules; correlate crashes with config/deps | Missing VC++ 2010 runtime **+** stopped ReportSvc helper | `logs[]` faulting module, `services[]`, `app.*` | open-event-viewer, read-faulting-module | install-dependency, start-service, verify-open-q3, delete-user-file-wrong trap | Q3 file opens without crash | windows-panel, shell windows | 2D only | No script |
| windows-update-failure | windows | RECOVERY | intermediate | windows-app-crash | Read 0x80070002 as state; reset update components only after evidence names the corrupt store | Corrupt KB5041566 package in SoftwareDistribution download cache | `logs[]` (100% download then hash mismatch), `services[]` running, `disks[]` 38% free, `update.*` gated | review-update-history, check-update-services, inspect-update-cache | reset-update-components, retry-update-install, clean-install-wrong trap | History records Success (0x0) | windows-panel, shell windows | 2D only | No script |
| windows-device-error | windows | COMPONENT_FAILURE | intermediate | windows-update-failure | Read Code 43 as failure class; exhaust driver-class fixes before blaming hardware | Driver 24.10.1 installed by Windows Update breaks Contoso HD Cam | `devices[]` (Error code 43 only), `logs[]` timeline (install 09:29 → fail 09:31), `camera.*` gated | open-device-manager, read-device-events, test-another-port | rollback-driver, scan-for-changes, test-camera, replace-camera-wrong trap | Camera preview live, Code 43 cleared | windows-panel, shell windows | 2D only | No script |
| linux-permission-denied | linux | CONFIGURATION_ERROR | beginner | — | Read `ls -l` modes; choose safe permission fixes | `/etc/myapp/config.yaml` root:root 600 while deploy user needs write | VFS modes/owners, `perms.*`, users/groups | whoami-check, ls-config | fix-mode, verify-deploy, chmod-777-wrong trap | Deploy writes config (mode corrected) | linux-terminal, shell linux | 2D only | State-gated script (devon) |
| linux-service-failing | linux | SERVICE_FAILURE | intermediate | linux-permission-denied | Read `systemctl status`; interpret journal errors; fix config safely | `/etc/nginx/nginx.conf` mode 000 after botched script | `services[]`, `logs[]` journal, fs perms | systemctl-status, journalctl-review | fix-conf-mode, restart-nginx, verify-http, reboot-blind-wrong trap | HTTP 200 + unit active | linux-terminal, shell linux | 2D only | No script |
| linux-disk-full | linux | RESOURCE_EXHAUSTION | intermediate | linux-service-failing | Trace ENOSPC from journal to the file owning the bytes; fix growth policy | `debug.log` at 46G with `rotate: disabled` fills `/` (96%) | `disks[]` via `df`, `logs[]` ENOSPC, fs `app.conf` rotation, `disk.*` gated | df-h, journalctl-app, cat-app-conf | purge-and-rotate, restart-app, verify-writes, reboot-wrong trap | df 52% + writes/job succeed | linux-terminal, shell linux | 2D only | No script |
| linux-runaway-process | linux | RESOURCE_EXHAUSTION | intermediate | linux-service-failing | Distinguish starved service from failing service; identify CPU owner before touching the app | `extract.py` loops on malformed archive (cron-launched), pins CPU at 99.7% | `processes[]` + `ps`, `logs[]` slow/504/load, `services[]` degraded, `cpu.*` gated | journalctl-app, ps-aux, inspect-extract-job | stop-extract-job, restart-app, verify-latency, reboot-wrong trap | GET /reports 240 ms | linux-terminal, shell linux | 2D only | No script |
| dns-some-sites-broken | networking | EVIDENCE_DISCRIMINATION | beginner | — | Separate DNS from connectivity; use nslookup/ping effectively | Site's primary DNS resolver down, routing healthy | `network.faults`, dnsZones, `diagnostics.*` | diag-ping-gateway, diag-ping-public, diag-nslookup, diag-tracert | fix-dns, verify-browse, reboot-wifi-wrong trap | Resolve + open a new site | network+terminal, shell windows | 2D only | State-gated script (Alex Rivera) |
| wifi-connected-no-internet | networking | CONFIGURATION_ERROR | beginner | dns-some-sites-broken | Identify wrong gateway config; verify with layered pings | Static gateway 10.0.0.1 outside 192.168.1.0/24 subnet | `network.faults.gateway*`, `diagnostics.*` | diag-ipconfig, diag-ping-gw, diag-ping-public | fix-gateway, verify-internet, forget-wifi-wrong trap | Public ping + browse OK | network+terminal, shell windows | 2D only | State-gated script (Chris Patel) |
| dhcp-addressing-broken | networking | SERVICE_FAILURE | intermediate | wifi-connected-no-internet | Recognize APIPA; diagnose DHCP server failures | DHCP service stopped → 169.254 fallback | `network.faults.dhcp*`, dhcpServer, link state | diag-apipa, check-link, check-dhcp-service | start-dhcp, renew-lease, verify-connectivity, static-ip-wrong trap | Lease renewed, connectivity verified | network+terminal, shell windows | 2D only | No script |
| duplicate-ip-conflict | networking | INTERMITTENT_FAILURE | intermediate | dhcp-addressing-broken | Recognize duplicate-IP symptoms; resolve static/DHCP overlaps | Printer static 192.168.1.120 overlapped DHCP-assigned PC | hosts×2, `network.duplicatePair`, ARP evidence | see-conflict, arp-scan, check-links | move-printer, verify-conflict-clear, disable-dhcp-wrong trap | Conflict cleared on verify | network+terminal, shell windows | 2D only | State-gated script (Dana Fox) |
| firewall-blocks-port | networking | CONFIGURATION_ERROR | intermediate | wifi-connected-no-internet | Isolate a port-specific filter with contrasting port tests; prove path before blaming host | Edge rule `deny-finance-app` drops TCP 8443 from finance subnet (change window) | topology probes (gateway/WAN healthy), `dnsZones` resolves, dual port tests, `fw.*` gated | ping-gateway, resolve-app-name, test-port-8443, test-port-443, ping-public, inspect-firewall-rules | add-allow-rule, verify-port, restart-server-wrong trap | 8443 connects, login page loads | network+terminal, shell windows | 2D only | State-gated script (Rosa Delgado) |
| printer-not-printing | support | FOUNDATIONAL_DIAGNOSIS | foundational | — | Queue → connectivity → device triage order | Print queue paused | `printer.*`, `diagnostics.queue*`, conversation | check-printer-power, open-queue | resume-queue, verify-page, reinstall-wrong trap | Page prints (verified) | mixed, shell windows | 2D only | Script (no extra strip) |
| account-lockout | support | COMMUNICATION_SUPPORT | beginner | — | Safe identity verification; lockout reset workflow | Repeated own-device password failures triggered lockout policy | `identity.*`, conversation facts | verify-identity, check-recent-failures | unlock-reset, verify-login, skip-verify-wrong trap | Logged in, lockout cleared | mixed, shell none | 2D only | State-gated script (Noah Kim) |
| email-not-receiving | support | COMMUNICATION_SUPPORT | beginner | — | Trace message flow before touching the client; separate transport from local filtering | Outlook cleanup created a rule moving partner mail to Deleted Items | `mailflow.*` (trace/quarantine/rules gated), state-gated conversation | run-message-trace, check-quarantine, check-inbox-rules | disable-rule, confirm-delivery, recreate-mailbox-wrong trap | `mailflow.verified` — resent thread lands in Inbox | mixed, shell none | 2D only | State-gated script (Sofia Lang) |
| phishing-ticket-triage | security | SECURITY_TRIAGE | beginner | — | Defensive phishing triage; safe reporting workflow | Credential phishing via lookalike helpdesk domain + urgency | `mail.*` (sender, linkHost, domain), evidence board | inspect-sender, inspect-link | report-phish, educate-user, verify-closed, click-test-wrong trap | Ticket closed after report | mixed, shell none | 2D only | No script (evidence board) |
| suspicious-signin | security | SECURITY_TRIAGE | intermediate | — | Triage impossible-travel alert; contain session before recovering account | Attacker guessed password at 13:57, signed in from consumer VPN exit at 14:02 while user at desk | `identity.*` (signInsToday, failedAttempts persistent; geo/attestation gated), evidence board | review-signin-alert, check-signin-origin, contact-user | revoke-session, reset-password, close-alert, dismiss-alert-wrong trap | `identity.alertClosed` + sessions revoked + password reset | mixed, shell none | 2D only | No script (evidence board) |
| malware-endpoint-alert | security | SECURITY_TRIAGE | intermediate | phishing-ticket-triage | Triage EDR alert from behavior; remove respawn path before declaring clean | Cracked-software installer dropped unsigned stealer with HKCU Run persistence at 07:41 | `endpoint.*` (alertsOpen persistent; origin/persistence/quarantine gated), evidence board | review-alert, trace-origin, check-persistence | quarantine-process, remove-persistence, verify-scan, delete-binary-wrong trap | `endpoint.scanClean` + quarantined + persistence cleared | mixed, shell none | 2D only | No script (evidence board) |
| disk-full-slow-pc | sysadmin | RESOURCE_EXHAUSTION | beginner | — | Correlate free space with performance; safe cleanup verification | C: at 98% capacity → updates fail + sluggishness | `disks[]`, storage view, `logs[]`, Task Manager | check-storage | clear-temp, purge-recycle, verify-performance, delete-user-docs-wrong trap | Free space restored + performance verified | windows-panel, shell windows | 2D only | No script |
| backup-failed | sysadmin | RECOVERY | intermediate | — | Use the job's own history to find the failing step; prove stale credential against target | NAS account password rotated — Windows Backup presents old stored credential (0x80070005) | `backup.*` gated, `logs[]` history (success → 2 failures), `services[]` engine running, `disks[]` C: 38% | read-backup-logs, test-target-share | update-credential, run-backup-now, recreate-backup-job-wrong trap | `backup.verified` — 42.1 GB written to NAS | windows-panel, shell windows | 2D only | No script |
| service-dependency | sysadmin | DEPENDENCY_FAILURE | intermediate | — | Read systemd dependency failure as a graph; fix required unit before dependent | Config push typo `maxmemmory` → redis-cache fails → inventory-api Requires= blocked | `dep.*` gated, `services[]` both failed, `logs[]` journal, VFS unit file + redis.conf | status-app, read-unit-file, status-dep | fix-dep-config, start-dependency, start-app, verify-api, restart-app-wrong trap | `dep.verified` — GET /health 200 with cache | linux-terminal, shell linux | 2D only | No script |
| db-connection-refused | database | SERVICE_FAILURE | intermediate | — | Order DB connectivity checks; separate service vs credential failures | PostgreSQL failed after reboot (stale lock/port conflict) → 5432 closed | `db.*`, ladder states, `services[]`, `logs[]` journal | read-logs, check-port, check-service | restart-db, verify-query, reset-all-passwords-wrong trap | `SELECT 1` verified (app CONNECTED) | network+terminal, shell linux | 2D only (DB ladder) | No script |
| db-auth-failure | database | CONFIGURATION_ERROR | intermediate | db-connection-refused | Place an auth failure on the ladder without blaming the server; match rotation to stale secret | Vault rotated svc_checkout secret at 02:00; app still presents the 30-day-old value | `db.*` (authFailed, secret* gated), ladder states, `services[]`, `logs[]` journal | read-logs, check-port, check-service, compare-secret | sync-secret, verify-query, restart-db-wrong trap | `db.verified` — SELECT 1 as svc_checkout | network+terminal, shell linux | 2D only (DB ladder) | No script |
| db-pool-exhausted | database | RESOURCE_EXHAUSTION | intermediate | db-connection-refused | Separate capacity rejection from service failure; attribute consumed slots to their holders | Deploy 7f3c leaked 178 idle-in-transaction sessions → 200-slot ceiling hit at peak | `db.*` (poolExhausted, maxConnections, sessions* gated), ladder states, `services[]`, `logs[]` | read-logs, check-port, check-service, count-sessions | terminate-idle, verify-query, restart-db-wrong trap | `db.verified` under load — 22/200 in use | network+terminal, shell linux | 2D only (DB ladder) | No script |

## Inventory — Phase 11 equipment expansion (31 scenarios)

| ID | Domain | Type | Difficulty | Prereq | Primary learning objective | Root cause(s) | Evidence sources | Diagnostic actions | Fix actions | Verification | Environment | 3D/2D | Conversation |
|----|--------|------|-----------|--------|---------------------------|---------------|------------------|--------------------|-------------|--------------|-------------|-------|--------------|
| printer-queue-paused | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | — | Read the device panel status before touching cabling or software | The print queue was paused on the device; the laptop, cable, and switch port were all healthy. | `printer.*` (powerOk, netLink, printReady; gated: queueChecked, queuePaused) | check-power, check-cables, check-queue | resume-queue, restart-printer-wrong trap | printer.printReady=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| printer-paper-jam | hardware | COMPONENT_FAILURE | beginner | printer-queue-paused | Follow a panel alarm to the physical fault instead of clearing it blindly | A folded sheet wedged at the tray-1 feed rollers after a rushed refill, tripping the jam sensor. | `printer.*` (powerOk, netLink, printReady; gated: alarmChecked, pathInspected, jamPresent) | check-panel, check-door, check-paper-path | clear-jam, replace-cartridge-wrong trap | printer.printReady=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| printer-network-unreachable | hardware | DEPENDENCY_FAILURE | intermediate | printer-queue-paused | Work the path from the printer's link LED toward the closet | The switch port serving the printer's wall drop was left admin-down after last night's maintenance, so the link never came up. | `printer.*` (powerOk, netLink, printReady; gated: neighborChecked, netPortOk) | check-panel, check-cable, check-wall-drop | enable-port, reinstall-printer-wrong trap | printer.printReady=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| printer-low-toner | hardware | COMPONENT_FAILURE | foundational | printer-queue-paused | Confirm a consumable fault from the gauge before replacing anything | The installed cartridge was genuinely spent — the gauge window was empty behind a correct seating. | `printer.*` (powerOk, netLink, printReady; gated: tonerChecked, tonerOk) | check-output, check-cartridge | replace-toner, reset-counter-wrong trap | printer.printReady=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| printer-ip-conflict | hardware | CONFIGURATION_ERROR | intermediate | printer-queue-paused, printer-network-unreachable | Separate layer-1 link state from layer-3 addressing faults | The printer's static address 10.32.4.18 was duplicated by the newly installed label printer, so replies never returned to the right device. | `printer.*` (powerOk, netLink, printReady; gated: addressChecked, addressOk) | check-panel, check-link, check-address | set-dhcp, reboot-printer-wrong trap | printer.printReady=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-wan-misconfigured | hardware | CONFIGURATION_ERROR | intermediate | — | Prove each layer of the WAN path before editing any configuration | The WAN interface still held the pre-swap PPPoE profile after Tuesday's handoff replacement, so the router never established a gateway on the new DHCP handoff. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: wanChecked, wanConfigOk) | check-power, check-wan-cable, check-wan-config | correct-wan-config, reboot-router-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-dhcp-exhausted | hardware | RESOURCE_EXHAUSTION | intermediate | router-wan-misconfigured | Distinguish an exhausted address scope from a broken uplink | The 10.32.4.0/24 scope had allocated all 254 usable addresses, many of them to laptops that left months ago, so every new client's discover request went unanswered. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: dhcpChecked) | check-power, check-links, check-dhcp | reclaim-and-extend-scope, manual-static-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-cable-loose-wan | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | router-wan-misconfigured | Start a no-internet fault at the physical layer when a room was worked on overnight | The WAN RJ-45 had been knocked out of its latch during the overnight clean, so the router lost its uplink while the LAN carried on normally. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: wanChecked, wanCableSeated) | check-power, check-wan-physical | reseat-wan-cable, replace-router-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-nat-disabled | hardware | CONFIGURATION_ERROR | intermediate | router-wan-misconfigured | Separate router-originated success from client-originated traffic | Yesterday's firewall tidy-up removed the masquerade rule, so client traffic left the WAN interface carrying private 10.32.4.x source addresses and was dropped upstream. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: dhcpChecked, natChecked, natEnabled) | check-power, check-client-dhcp, check-nat | enable-nat, bypass-router-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-upstream-outage | hardware | EVIDENCE_DISCRIMINATION | intermediate | router-wan-misconfigured | Prove your own configuration correct before editing it under outage pressure | A metro fibre cut upstream of the handoff took the site offline; the router's configuration was correct throughout and needed no changes. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: wanChecked, probeDone, upstreamOk) | check-power, check-wan-config, probe-upstream | escalate-outage, reconfigure-wan-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| router-lan-link-down | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | router-wan-misconfigured | Use the difference between working and failing clients as the first piece of evidence | The trunk cable between the router's LAN switch and the second-floor patch panel had been pulled clear when the rack was shifted, so the whole wired segment lost link while Wi-Fi carried on. | `router.*` (powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath; gated: lanChecked, lanCableSeated) | check-power, check-wan, check-lan-physical | reseat-lan-trunk, reboot-router-wrong trap | router.clientPath=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| switch-port-shutdown | hardware | CONFIGURATION_ERROR | intermediate | — | Distinguish an administratively down port from a cable or hardware fault | Maintenance left port 4 administratively down during yesterday's closet tidy-up, so the desk's cable and NIC were healthy but the port never forwarded a frame. | `switch.*` (powerOk, uplinkLink, ports[].link, ports[].path, poeBudgetOk; gated: portChecked) | check-power, check-port-leds, check-uplink | enable-port, replace-switch-wrong trap | switch.ports.3.link=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| switch-vlan-mismatch | hardware | CONFIGURATION_ERROR | intermediate | switch-port-shutdown | Separate a green link light from a working forwarding path | The uplink trunk carried only VLAN 1 after the printers moved to VLAN 10, so port 1 linked at layer 1 while every frame it sent was dropped on the way out of the switch. | `switch.*` (powerOk, uplinkLink, ports[].link, ports[].path, poeBudgetOk; gated: trunkChecked) | check-power, check-port-state, check-trunk | add-vlan-to-trunk, reseat-all-cables-wrong trap | switch.ports.0.path=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| switch-uplink-down | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | switch-port-shutdown | Identify the uplink as the single shared dependency for every VLAN on a switch | The uplink RJ-45 worked loose when the rack was shifted two metres, so every access port kept its local link while the trunk to the server VLAN was gone. | `switch.*` (powerOk, uplinkLink, ports[].link, ports[].path, poeBudgetOk; gated: uplinkChecked, uplinkCableSeated) | check-power, check-uplink | reseat-uplink, reboot-switch-wrong trap | switch.uplinkLink=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| switch-port-faulty | hardware | COMPONENT_FAILURE | intermediate | switch-port-shutdown | Isolate a failed port by substituting a known-good device and cable | Port 3 failed at the hardware level — link training never completed even with a cable and phone that link instantly on the neighbouring port. | `switch.*` (powerOk, uplinkLink, ports[].link, ports[].path, poeBudgetOk; gated: portChecked, poeChecked) | check-power, check-port-leds, check-poe-budget | swap-to-spare-port, replace-switch-wrong trap | switch.ports.3.link=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| switch-poe-overload | hardware | RESOURCE_EXHAUSTION | intermediate | switch-vlan-mismatch | Read the PoE class draw against the switch's rated budget | PoE draw reached 74 W against a 60 W budget after Friday's additions, so the switch refused power to the last ports it serviced and the two ceiling access points stayed dark. | `switch.*` (powerOk, uplinkLink, ports[].link, ports[].path, poeBudgetOk; gated: poeChecked, poeBudgetOk) | check-power, check-poe-budget, check-ap-cables | move-bench-tester-to-injector, reboot-switch-wrong trap | switch.poeBudgetOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-poe-port-disabled | hardware | DEPENDENCY_FAILURE | intermediate | — | Trace an unpowered access point from its face LEDs toward the serving switch port | The replacement closet switch came up with PoE administratively disabled on the port that serves this drop, so the ceiling AP never received power over an otherwise healthy cable. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, upstreamPoeCapable, clientAssociated) | check-ap-face, check-fault-scope, check-drop | enable-poe-port, replace-ap-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-drop-unplugged | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | ap-poe-port-disabled | Read power and radio indicators before touching configuration | The AP's Ethernet pigtail had been knocked loose at the ceiling during the evening cleaning, so neither power nor data reached the unit. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, poeCableSeated, clientAssociated) | check-ap-face, check-drop | reseat-ap-drop, factory-reset-ap-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-wrong-passphrase | hardware | CONFIGURATION_ERROR | intermediate | ap-poe-port-disabled | Use association logs to separate a client-side secret problem from a coverage problem | The laptop still stored last quarter's Wi-Fi passphrase, so its 4-way handshake with the AP failed while every other client associated normally. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, pskOk, clientAssociated) | check-ap-face, check-assoc | update-client-passphrase, disable-encryption-wrong trap, reboot-ap-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-channel-congestion | hardware | CONFIGURATION_ERROR | intermediate | ap-poe-port-disabled | Distinguish an association problem from an airtime contention problem | The neighbouring agency's new APs stacked onto channel 6, driving it to 92% utilisation with a 38% client retry rate while association itself stayed perfect. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, channelClear) | check-ap-face, check-assoc, scan-spectrum | move-radio-to-clear-channel, raise-transmit-power-wrong trap, reboot-ap-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-radio-disabled | hardware | CONFIGURATION_ERROR | beginner | ap-poe-port-disabled | Separate a powered-but-silent radio from failed hardware | Monday's device profile rollout pushed an administratively disabled radio to this AP, so the box stayed powered while the guest SSID stopped broadcasting. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, radioEnabled, clientAssociated) | check-ap-face, check-radio-config | enable-radio, reboot-ap-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ap-client-addressing | hardware | CONFIGURATION_ERROR | beginner | ap-poe-port-disabled | Separate a successful association from address acquisition | The laptop's wireless interface was set to a manual address instead of obtaining a lease, so it associated cleanly and then held link-local 169.254.17.4 with no route to the gateway. | `ap.*` (poePowered, radioUp, clientLink, pathOk; gated: assocChecked, clientIpOk) | check-ap-face, check-assoc | set-client-dhcp, manual-static-wrong trap | ap.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ups-battery-expired | hardware | COMPONENT_FAILURE | beginner | — | Read a UPS self-test alarm as evidence about battery health | The sealed VRLA pack had reached end of life after 36 months and measured 18% of rated capacity, so the daily self-test failed and raised the alarm while utility power stayed perfectly healthy. | `ups.*` (onUtility, outputPresent, loadOk; gated: batteryChecked, batteryOk) | check-panel, check-battery | replace-ups-battery, defer-replacement-wrong trap | ups.batteryOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ups-overload | hardware | RESOURCE_EXHAUSTION | intermediate | ups-battery-expired | Treat a UPS load gauge as a shared power budget that must be added up | A 1500W space heater left on outlet group B alongside the new test rig pushed the bank to 96% of the UPS rating, tripping the overload lamp while output was still live. | `ups.*` (onUtility, outputPresent, loadOk; gated: loadChecked) | check-panel, trace-outlet-load | move-heater-off-ups, ignore-overload-wrong trap | ups.loadOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ups-outlet-group-dead | hardware | COMPONENT_FAILURE | intermediate | ups-battery-expired | Separate a healthy UPS from a de-energised outlet group | The rear outlet-group breaker had popped while the main input breaker stayed closed, so half the rack lost power with the UPS reporting perfectly healthy utility input. | `ups.*` (onUtility, outputPresent, loadOk; gated: outletChecked, outletsLive) | check-panel, check-outlets | reset-outlet-breaker, bypass-ups-wrong trap | ups.outputPresent=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ups-input-unplugged | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | — | Explain what the on-battery lamp actually asserts about the input feed | The mains IEC lead sat proud of the UPS inlet without latching, so the unit saw no utility input and rode the rack on battery while the wall socket stayed live. | `ups.*` (onUtility, outputPresent, loadOk; gated: inputChecked, inputPresent) | check-panel, check-input | reseat-mains-lead, replace-battery-wrong trap | ups.onUtility=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| ups-breaker-tripped | hardware | COMPONENT_FAILURE | beginner | ups-overload | Read a tripped breaker as the answer to a condition rather than a one-off event | The main breaker opened after load reached 88% with the rack fans and a space heater on one branch, and the same load was still connected each time it was reset. | `ups.*` (onUtility, outputPresent, loadOk; gated: breakerChecked, breakerOk) | check-panel, check-breaker | shed-load-reset-breaker, force-reset-wrong trap | ups.outputPresent=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| patch-keystone-loose | hardware | FOUNDATIONAL_DIAGNOSIS | intermediate | — | Prove a cable path one segment at a time with a tone generator | The keystone behind the desk faceplate for jack 3-14 was knocked out of its latches during the morning's cleaning, so the horizontal run stopped at the wall. Panel port 5, the label, and switch port 4 were all correct. | `patch.*` (panelMatch, pathOk; gated: jackTraced, horizontalSeated) | check-desk-end, trace-jack | reseat-keystone, replace-nic-wrong trap, re-crimp-desk-lead-wrong trap | patch.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| patch-crossconnect-mislabelled | hardware | EVIDENCE_DISCRIMINATION | advanced | patch-keystone-loose | Trace a cross-connect through patch panel and keystone labels | The horizontal run for desk 3-14 lands on panel port 9 while the patch lead was patched to port 5, which the cabinet label still advertises as 3-14. The copper was never broken — only the cross-connect and the label disagreed. | `patch.*` (panelMatch, pathOk; gated: jackTraced, horizontalTraced) | check-desk-end, trace-jack, trace-run | repatch-to-landing-port, trust-label-repatch-wrong trap, wait-for-night-team-wrong trap | patch.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| patch-switch-port-disabled | hardware | CONFIGURATION_ERROR | intermediate | patch-keystone-loose | Prove cabling continuity before suspecting switch configuration | Switch access port 4 was left administratively down after the movers re-patched the floor, so every cable in the path was perfect but the port never forwarded a frame for desk 3-14. | `patch.*` (panelMatch, pathOk; gated: jackTraced, horizontalTraced, patchChecked, switchPortEnabled) | check-desk-end, trace-path | enable-switch-port, re-crimp-cable-wrong trap, move-desk-wrong trap | patch.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |
| patch-lead-not-seated | hardware | FOUNDATIONAL_DIAGNOSIS | foundational | patch-keystone-loose | Use physical manipulation as evidence for an intermittent connection | The patch lead's switch-end plug was standing proud of port 4 with its retention latch unclicked, so contact pressure depended on how the lead happened to hang and the link blinked with movement. | `patch.*` (panelMatch, pathOk; gated: jackTraced, horizontalTraced, patchChecked, patchSeated) | check-desk-end, trace-path | reseat-patch-lead, order-new-patch-wrong trap | patch.pathOk=true | equipment-bench, shell none | 2D SVG + 3D stage (EquipmentLabView, capability-gated) | No script |

### Counts (snapshot progression; current total = 100)

| Domain | Pre-expansion baseline | Phase 10 | Phase 11 (equipment) | Phase 12–13 | Current total |
|--------|------------------------|----------|----------------------|-------------|---------------|
| hardware | 2 | 5 | **36** (5 + 31 equipment) | — | 36 |
| windows | 2 | 4 | 4 | +7 | 11 |
| linux | 2 | 4 | 4 | +7 | 11 |
| networking | 4 | 5 | 5 | — | 5 |
| database | 1 | 3 | 3 | +6 | 9 |
| security | 1 | 3 | 3 | +6 | 9 |
| support | 2 | 3 | 3 | +6 | 9 |
| sysadmin | 1 | 3 | 3 | +7 | 10 |
| **Total** | **15** | **30** | **61** | **+39** | **100** |

Phase 11 equipment breakdown (all `category: "hardware"`, `kind:
"equipment-bench"`): printer 5, router 6, switch 5, access point 6, UPS 5,
patch panel 4 = **31**.

_Every scenario above has: a 3-level escalating hint chain, an evaluation
(grade + rationale) on **every** action, a debrief containing a `Rule out`
methodology step and a `Transferable principle`, evidence-first `appliesWhen`
gates on fix actions, and at least one negative-grade trap action (9J
invariants, enforced by `src/engine/contentQuality.test.ts`)._

## Expansion target (Phase 10.2)

Planned additions — final rows appended here as each domain lands:

| Domain | Now | Target | Planned additions (type) |
|--------|-----|--------|--------------------------|
| hardware | 5 | 4–6 | +3: DIMM instability (INTERMITTENT_FAILURE), thermal shutdown (COMPONENT_FAILURE), storage not detected (COMPONENT_FAILURE) ✅ |
| windows | 4 | 4–6 | +2: Windows Update failure (RECOVERY), device error (COMPONENT_FAILURE) ✅ |
| linux | 4 | 4–6 | +2: disk full/inodes (RESOURCE_EXHAUSTION), runaway process (RESOURCE_EXHAUSTION) ✅ |
| networking | 5 | 5–7 | +1: firewall blocks port (CONFIGURATION_ERROR) — only if genuinely new reasoning ✅ |
| database | 3 | 3–5 | +2: auth failure (CONFIGURATION_ERROR), pool exhausted (RESOURCE_EXHAUSTION) ✅ |
| security | 3 | 3–5 | +2: suspicious sign-in triage (SECURITY_TRIAGE), second identity-flavored case (TBD at inspection) ✅ — landed as impossible-travel sign-in + EDR malware triage |
| support | 3 | 3–5 | +1: email not receiving (COMMUNICATION_SUPPORT) ✅ |
| sysadmin | 3 | 3–5 | +2: backup job failed (RECOVERY), service dependency (DEPENDENCY_FAILURE) ✅ |
| **Total** | **30** | **≥30** | +15 |

✅ = landed (Phase 10.3–10.10); **all targets met — 30 scenarios**.

## Cross-domain candidates (Phase 10.11 — identified only, not built)

Candidates that would span two or more domains (`CROSS_DOMAIN` type). Recorded
for a future phase; none were implemented in Phase 10, and each would need its
own engine-impact review first:

| Candidate | Domains | Why it is genuinely cross-domain | Why deferred |
|-----------|---------|----------------------------------|--------------|
| Guest Wi-Fi segmentation hides the printer | networking + support | The support symptom (print job vanished) resolves only via subnet/routing evidence — conversation alone cannot close it | Needs netState + SupportLab state coupling; engine review required |
| Phished credentials lead to a lockout ticket | security + support | Artifact analysis (phishing indicators) and identity workflow (verification/reset) in one ticket chain | Two labs' evidence boards must share state safely |
| DB volume fills, app reports timeouts | database + sysadmin | DB ladder states and disk/ENOSPC evidence must both discriminate before a single fix | Cross-family world state (db.* + disks[]) needs schema review |
| DNS poisoning causes intermittent timeouts | networking + security | Topology probes stay green while zone/certificate evidence names tampering | netState reads only known fault keys — new fault class needed |
| Dependency outage reaches users as "app broken" | sysadmin + support | User conversation facts and systemd graph must gate one shared remediation | Support scenario state would cross into LinuxLab world |

## Phase 10.12 quality audit notes

- All 30 scenarios pass `contentQuality.test.ts` invariants: negative-grade
  `*-wrong` traps, ≤3 escalating hints, no hint spoils a fix label, substantive
  rationale on every action, `Rule out` + `Transferable principle` in every
  debrief, evidence-first `appliesWhen` gates on every fix.
- `scenario.test.ts` validates every scenario schema, knowledgeLink, and
  curriculum reference; `simulation.test.ts` guards the count at 30.
- No engine changes were required for Phase 10 beyond two additive,
  independently tested extensions: `ps`/`ls -l` evidence fidelity (10.5) and
  family-aware `dbStatus` labels (10.7). `ScenarioPage` untouched.

## Phase 11 equipment expansion (summary)

31 equipment scenarios added (`category: "hardware"`, `kind:
"equipment-bench"`, `environment.deviceFamily` set): printer 5, router 6,
switch 5, access point 6, UPS 5, patch panel 4. Ticket ids `HD-1028`–`HD-1058`.
Types: FOUNDATIONAL_DIAGNOSIS 8, CONFIGURATION_ERROR 10, COMPONENT_FAILURE 6,
RESOURCE_EXHAUSTION 3, DEPENDENCY_FAILURE 2, EVIDENCE_DISCRIMINATION 2.
Difficulty: foundational 8, beginner 5, intermediate 17, advanced 1.
**All targets met — 61 scenarios total.**

## Phase 11 quality audit notes

- All 61 scenarios pass `contentQuality.test.ts` invariants; the count guard in
  `simulation.test.ts` now asserts **61** (supersedes the Phase 10 value of 30).
- Equipment scenarios add the same contract plus: evidence-first `appliesWhen`
  gates, spoiler-gated flag reveal (config facts hidden until a check records
  them; LEDs/effect words/ticket symptoms always visible), seed/world
  consistency (`deriveWorld(initial)` is a no-op for every scenario), and
  family/registry↔schema sync.
- Guards: `src/features/environments/equipment/logic.test.ts` (registry sync,
  derivations, gating contracts, hotspot smoke over every scenario × component)
  and `src/features/environments/equipmentExpansion.test.tsx` (routing, focus,
  2D/3D `PART_IDS` parity, capability gate).
- `ScenarioPage` untouched; no scenario-id branching in renderers.
