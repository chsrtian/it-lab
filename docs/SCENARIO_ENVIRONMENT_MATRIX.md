# Scenario → Environment Matrix

Maps each of the 100 scenarios to its visual environment, terminal requirement, conversation, and evidence types. The first block (61 rows) is the Phase 10/11 baseline + equipment set; the Phase 12-13 expansion (39 rows) follows.

| Scenario ID | Category | env.kind | shell | Primary visual system | Terminal | Conversation | Evidence types |
|-------------|----------|----------|-------|----------------------|----------|--------------|----------------|
| pc-no-power | hardware | hardware-bench | none | HardwareLab — chassis SVG + power chain | **Hidden** | Yes (Maya Chen, state-gated) | bench flags (wall, cable, PSU sw, standby, FP, POST) |
| pc-on-no-display | hardware | hardware-bench | none | HardwareLab — chassis SVG + display/RAM path | **Hidden** | No | bench (monitorPower, videoCable, gpuSeated, ramSeated, beepCode, displayOk) |
| windows-wont-boot | windows | windows-panel | windows | WindowsLab — boot/recovery + Event Viewer (`logs`) + Services | Optional (recovery UI primary) | Yes (Sam Ortiz) | boot.*, logs[], services[] |
| windows-app-crash | windows | windows-panel | windows | WindowsLab — Event Viewer + Services | Optional | No | logs[], services[], app.* |
| linux-permission-denied | linux | linux-terminal | linux | LinuxLab — filesystem tree + perms detail | **Essential** | Yes (devon) | fs modes/owners, users/groups, perms.* |
| linux-service-failing | linux | linux-terminal | linux | LinuxLab — services + logs + fs conf perms | **Essential** (diag) | No | services[], logs[], fs, svc.* |
| dns-some-sites-broken | networking | network+terminal | windows | NetworkLab — topology + causal path + DNS flow | **Essential** | Yes (Alex Rivera, state-gated) | hosts, network.faults, dnsZones, diagnostics.* |
| wifi-connected-no-internet | networking | network+terminal | windows | NetworkLab — topology + gateway path | **Essential** | No | hosts, network.faults.gateway*, diagnostics.* |
| dhcp-addressing-broken | networking | network+terminal | windows | NetworkLab — topology + DHCP lease state | **Essential** | No | network.faults.dhcp*, dhcpServer, diagnostics.* |
| duplicate-ip-conflict | networking | network+terminal | windows | NetworkLab — dual-host conflict highlight | Optional | No | hosts×2, network.duplicatePair |
| printer-not-printing | support | mixed | windows | **Printer device strip** + SupportLab chat | Optional | No* | printer.*, diagnostics.queue* |
| account-lockout | support | mixed | none | **Identity/account strip** + SupportLab chat | **Hidden** | Yes (Noah Kim) | identity.* |
| phishing-ticket-triage | security | mixed | none | SecurityLab — email client + IOC + timeline | **Hidden** | No | mail.* (sender, linkHost, domain) |
| disk-full-slow-pc | sysadmin | windows-panel | windows | **WindowsLab** storage/disk view + task manager | Optional | No | disks[], storage.*, logs[], services[] |
| db-connection-refused | database | network+terminal | linux | **DatabaseLab** — stage-first rack ladder: app→pool→wire→host⊃service→port→database→storage (Phase 9G) | SQL/db shell contextual | No | db.*, services[], network, logs[] |
| ram-instability-crashes | hardware | hardware-bench | none | HardwareLab — chassis SVG + faulty DIMM slot highlight | **Hidden** | No | bench (lastPowerEvent, memTest*, dimmFaultySlot, psu rails) |
| cpu-thermal-shutdown | hardware | hardware-bench | none | HardwareLab — chassis SVG + FAN STOPPED label | **Hidden** | No | bench (cpuFanSpinning, thermalLog, lastPowerEvent) |
| storage-not-detected | hardware | hardware-bench | none | HardwareLab — chassis SVG + NO DEVICE label + SATA cable path | **Hidden** | No | bench (sataDataSeated, sataPowerSeated, driveDetected, lastPowerEvent) |
| windows-update-failure | windows | windows-panel | windows | WindowsLab — Event Viewer + Services + update cache view | Optional | No | logs[], services[], disks[], update.* |
| windows-device-error | windows | windows-panel | windows | WindowsLab — Device Manager + Event Viewer timeline | Optional | No | devices[] (Code 43), logs[] timeline, camera.* |
| linux-disk-full | linux | linux-terminal | linux | LinuxLab — filesystem + df view + journal | **Essential** | No | disks[] (96%), logs[] ENOSPC, fs app.conf, disk.* |
| linux-runaway-process | linux | linux-terminal | linux | LinuxLab — process list + services + journal | **Essential** | No | processes[] via ps, logs[], services[], cpu.* |
| firewall-blocks-port | networking | network+terminal | windows | NetworkLab — topology probes + dual port tests + firewall rules | **Essential** | Yes (Rosa Delgado, state-gated) | probes (gateway/WAN), dnsZones, port tests, fw.* |
| email-not-receiving | support | mixed | none | **SupportLab** conversation + mailflow state (no device strip) | **Hidden** | Yes (Sofia Lang, state-gated) | mailflow.* (trace/quarantine/rules), conversation facts |
| suspicious-signin | security | mixed | none | SecurityLab — evidence board (identity rows + gated origin/attestation) | **Hidden** | No | identity.* (signInsToday/failedAttempts persistent; geo/attestation gated) |
| malware-endpoint-alert | security | mixed | none | SecurityLab — evidence board (endpoint rows + gated origin/persistence) | **Hidden** | No | endpoint.* (alertsOpen persistent; origin/persistence/quarantine gated) |
| backup-failed | sysadmin | windows-panel | windows | WindowsLab — Event Viewer history + Services + Storage | Optional | No | backup.* gated, logs[] history, services[], disks[] |
| service-dependency | sysadmin | linux-terminal | linux | LinuxLab — services + fs unit files + journal | **Essential** | No | dep.* gated, services[] (both failed), logs[], VFS unit file + redis.conf |
| db-auth-failure | database | network+terminal | linux | DatabaseLab — ladder + checks strip (read-logs/check-port/check-service/compare) | SQL/db shell contextual | No | db.* (authFailed, secret* gated), services[], logs[] |
| db-pool-exhausted | database | network+terminal | linux | DatabaseLab — ladder + checks strip (read-logs/check-port/check-service/count-sessions) | SQL/db shell contextual | No | db.* (poolExhausted, maxConnections, sessions* gated), services[], logs[] |

| printer-queue-paused | hardware | equipment-bench | none | EquipmentLab — Printer SVG + lazy 3D stage + InspectDock | **Hidden** | No script | printer.* (gated: queueChecked, queuePaused) |
| printer-paper-jam | hardware | equipment-bench | none | EquipmentLab — Printer SVG + lazy 3D stage + InspectDock | **Hidden** | No script | printer.* (gated: alarmChecked, pathInspected, jamPresent) |
| printer-network-unreachable | hardware | equipment-bench | none | EquipmentLab — Printer SVG + lazy 3D stage + InspectDock | **Hidden** | No script | printer.* (gated: neighborChecked, netPortOk) |
| printer-low-toner | hardware | equipment-bench | none | EquipmentLab — Printer SVG + lazy 3D stage + InspectDock | **Hidden** | No script | printer.* (gated: tonerChecked, tonerOk) |
| printer-ip-conflict | hardware | equipment-bench | none | EquipmentLab — Printer SVG + lazy 3D stage + InspectDock | **Hidden** | No script | printer.* (gated: addressChecked, addressOk) |
| router-wan-misconfigured | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: wanChecked, wanConfigOk) |
| router-dhcp-exhausted | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: dhcpChecked) |
| router-cable-loose-wan | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: wanChecked, wanCableSeated) |
| router-nat-disabled | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: dhcpChecked, natChecked, natEnabled) |
| router-upstream-outage | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: wanChecked, probeDone, upstreamOk) |
| router-lan-link-down | hardware | equipment-bench | none | EquipmentLab — Router SVG + lazy 3D stage + InspectDock | **Hidden** | No script | router.* (gated: lanChecked, lanCableSeated) |
| switch-port-shutdown | hardware | equipment-bench | none | EquipmentLab — Switch SVG + lazy 3D stage + InspectDock | **Hidden** | No script | switch.* (gated: portChecked) |
| switch-vlan-mismatch | hardware | equipment-bench | none | EquipmentLab — Switch SVG + lazy 3D stage + InspectDock | **Hidden** | No script | switch.* (gated: trunkChecked) |
| switch-uplink-down | hardware | equipment-bench | none | EquipmentLab — Switch SVG + lazy 3D stage + InspectDock | **Hidden** | No script | switch.* (gated: uplinkChecked, uplinkCableSeated) |
| switch-port-faulty | hardware | equipment-bench | none | EquipmentLab — Switch SVG + lazy 3D stage + InspectDock | **Hidden** | No script | switch.* (gated: portChecked, poeChecked) |
| switch-poe-overload | hardware | equipment-bench | none | EquipmentLab — Switch SVG + lazy 3D stage + InspectDock | **Hidden** | No script | switch.* (gated: poeChecked, poeBudgetOk) |
| ap-poe-port-disabled | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, upstreamPoeCapable, clientAssociated) |
| ap-drop-unplugged | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, poeCableSeated, clientAssociated) |
| ap-wrong-passphrase | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, pskOk, clientAssociated) |
| ap-channel-congestion | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, channelClear) |
| ap-radio-disabled | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, radioEnabled, clientAssociated) |
| ap-client-addressing | hardware | equipment-bench | none | EquipmentLab — Access point SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ap.* (gated: assocChecked, clientIpOk) |
| ups-battery-expired | hardware | equipment-bench | none | EquipmentLab — UPS SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ups.* (gated: batteryChecked, batteryOk) |
| ups-overload | hardware | equipment-bench | none | EquipmentLab — UPS SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ups.* (gated: loadChecked) |
| ups-outlet-group-dead | hardware | equipment-bench | none | EquipmentLab — UPS SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ups.* (gated: outletChecked, outletsLive) |
| ups-input-unplugged | hardware | equipment-bench | none | EquipmentLab — UPS SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ups.* (gated: inputChecked, inputPresent) |
| ups-breaker-tripped | hardware | equipment-bench | none | EquipmentLab — UPS SVG + lazy 3D stage + InspectDock | **Hidden** | No script | ups.* (gated: breakerChecked, breakerOk) |
| patch-keystone-loose | hardware | equipment-bench | none | EquipmentLab — Patch panel SVG + lazy 3D stage + InspectDock | **Hidden** | No script | patch.* (gated: jackTraced, horizontalSeated) |
| patch-crossconnect-mislabelled | hardware | equipment-bench | none | EquipmentLab — Patch panel SVG + lazy 3D stage + InspectDock | **Hidden** | No script | patch.* (gated: jackTraced, horizontalTraced) |
| patch-switch-port-disabled | hardware | equipment-bench | none | EquipmentLab — Patch panel SVG + lazy 3D stage + InspectDock | **Hidden** | No script | patch.* (gated: jackTraced, horizontalTraced, patchChecked, switchPortEnabled) |
| patch-lead-not-seated | hardware | equipment-bench | none | EquipmentLab — Patch panel SVG + lazy 3D stage + InspectDock | **Hidden** | No script | patch.* (gated: jackTraced, horizontalTraced, patchChecked, patchSeated) |

## Phase 12-13 expansion (39 scenarios)

| Scenario ID | Category | env.kind | shell | Primary visual system | Terminal | Conversation | Evidence types |
|-------------|----------|----------|-------|----------------------|----------|--------------|----------------|
| windows-profile-temp | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, logs, disks, profile; action-gated evidence (3 gated actions) |
| windows-dns-cache-stale | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, hosts, dnsZones, logs, net; action-gated evidence (4 gated actions) |
| windows-service-timeout | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, services, logs, agent; action-gated evidence (4 gated actions) |
| windows-acl-local | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | Yes (Alice Fontaine) | currentUser, logs, acl; action-gated evidence (4 gated actions) |
| windows-memory-exhaustion | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, processes, logs, mem; action-gated evidence (4 gated actions) |
| windows-spooler-stopped | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | Yes (Greg Mullins) | currentUser, services, logs, printq; action-gated evidence (4 gated actions) |
| windows-nic-disabled | windows | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, hosts, devices, net; action-gated evidence (3 gated actions) |
| linux-unit-invalid | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, services, logs, fs, svc; action-gated evidence (3 gated actions) |
| linux-ssh-key-perms | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, logs, users, groups, fs, perms; action-gated evidence (2 gated actions) |
| linux-inode-exhaustion | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, disks, services, logs, fs, ino; action-gated evidence (3 gated actions) |
| linux-fs-readonly | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, disks, services, logs, fs, ro; action-gated evidence (3 gated actions) |
| linux-package-conflict | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, packages, services, logs, fs, pkg; action-gated evidence (2 gated actions) |
| linux-cron-not-running | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, services, logs, fs, cronf; action-gated evidence (2 gated actions) |
| linux-resolver-wrong | linux | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | Yes (Mira Okonkwo) | currentUser, cwd, hosts, network, dnsZones, res, fs; action-gated evidence (2 gated actions) |
| sysadmin-backup-verify | sysadmin | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, backup, services, disks, logs; action-gated evidence (4 gated actions) |
| sysadmin-task-condition | sysadmin | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, task, services, logs; action-gated evidence (4 gated actions) |
| sysadmin-dns-record-stale | sysadmin | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, hosts, dnsZones, logs, net; action-gated evidence (3 gated actions) |
| sysadmin-disk-smart | sysadmin | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, disk, services, disks, logs; action-gated evidence (4 gated actions) |
| sysadmin-clock-drift | sysadmin | windows-panel | windows | WindowsLab — Event Viewer / Services / storage panels (scenario-specific) | Optional | No | currentUser, time, logs; action-gated evidence (4 gated actions) |
| sysadmin-cert-expired | sysadmin | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, services, logs, cert, fs; action-gated evidence (4 gated actions) |
| sysadmin-change-regression | sysadmin | linux-terminal | linux | LinuxLab — terminal + services/logs/fs panels | **Essential** | No | currentUser, cwd, services, logs, print, fs; action-gated evidence (4 gated actions) |
| db-grant-missing | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, logs; action-gated evidence (3 gated actions) |
| db-lock-contention | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, logs; action-gated evidence (3 gated actions) |
| db-stale-pool-conns | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, logs; action-gated evidence (3 gated actions) |
| db-wal-bloat-full | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, disks, logs; action-gated evidence (3 gated actions) |
| db-replication-lag | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, logs; action-gated evidence (4 gated actions) |
| db-schema-mismatch | database | network+terminal | linux | DatabaseLab — ladder + checks strip | **Essential** | No | currentUser, hosts, services, network, db, logs; action-gated evidence (3 gated actions) |
| security-task-persistence | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | endpoint; action-gated evidence (5 gated actions) |
| security-browser-extension | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | browser; action-gated evidence (4 gated actions) |
| security-failed-logins-triage | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | identity; action-gated evidence (4 gated actions) |
| security-edr-agent-unhealthy | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | endpoint; action-gated evidence (4 gated actions) |
| security-privilege-change | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | priv; action-gated evidence (5 gated actions) |
| security-outbound-beacon | security | mixed | none | SecurityLab — evidence board + ticket inbox | **Hidden** | No | beacon; action-gated evidence (5 gated actions) |
| support-file-locked | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Dana Ortiz) | lock; action-gated evidence (4 gated actions) |
| support-share-permissions | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Ravi Mehta) | share; action-gated evidence (4 gated actions) |
| support-webcam-app | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Tomas Weber) | webcam; action-gated evidence (4 gated actions) |
| support-bluetooth-profile | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Aisha Bello) | bt; action-gated evidence (3 gated actions) |
| support-smtp-outbound | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Lena Fischer) | smtp; action-gated evidence (5 gated actions) |
| support-dock-peripherals | support | mixed | none | SupportLab — customer conversation + evidence board | **Hidden** | Yes (Chloe Barnes) | dock; action-gated evidence (4 gated actions) |

\* Support-category scenarios currently route primarily to SupportLab; Phase 8H adds device/account state strips so `printer.*` / `identity.*` are visible beside the conversation.

## Terminal policy (by environment)

| Environment | Terminal default | Rationale |
|-------------|------------------|-----------|
| Hardware | Hidden (`shell: none`) | Bench is the tool |
| Equipment | Hidden (`shell: none`) | Device panel, inspection, and cable tracer are the tools |
| Network | Compact drawer | CLI diagnostics essential for several scenarios |
| Database | Compact SQL/db shell when relevant | Env chain is primary; shell for logs/ss/systemctl |
| Windows | Hidden unless scenario requires CLI | Recovery/Event Viewer/Services are primary |
| Linux | Full-width primary tool | Terminal-first administration |
| Security | Hidden | Evidence board / mail inspector |
| Support | Hidden unless shell set for device ops | Conversation primary |
| Sysadmin | Optional (storage panels first) | df/du via terminal when enabled |

`showTerminal` is never set in content today; visibility = `shell !== "none" && showTerminal !== false`. Phase 8+ may set `showTerminal: false` on scenarios where terminal is noise.

## Routing fixes required (Phase 8A)

| Scenario | Current router bug | Target |
|----------|-------------------|--------|
| db-connection-refused | `category=database` → LinuxLab | DatabaseLab |
| disk-full-slow-pc | `category=sysadmin` → LinuxLab | WindowsLab (shell windows) |
| printer-not-printing | support → chat only | Printer strip + SupportLab |
| account-lockout | support → chat only | Identity strip + SupportLab |
