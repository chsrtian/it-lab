import type { KbArticle } from "@/content/schema";

export const kbArticles: KbArticle[] = [
  {
    id: "what-is-dns",
    title: "What DNS is and why it matters",
    track: "Networking",
    summary:
      "DNS turns website names into IP addresses. When DNS fails, names stop resolving even if the network still works.",
    body: `## DNS in plain language

Computers talk using **IP addresses** (like \`192.168.1.10\`). Humans prefer names (\`intranet.corp\`).

**DNS (Domain Name System)** is the phone book that translates names to addresses.

### What a DNS failure looks like
- "This site can't be reached" for *some* sites
- \`ping 8.8.8.8\` works, but \`ping example.com\` fails
- \`nslookup example.com\` times out or returns SERVFAIL

### How to test
1. Ping a raw IP (tests connectivity)
2. \`nslookup example.com\` (tests name resolution)
3. Check configured DNS servers with \`ipconfig\` / \`ip a\`

### How to fix (common cases)
- Point the adapter at a working DNS server
- Restart the DNS Client service (Windows) or \`systemd-resolved\`
- Clear local DNS cache

### Why the fix works
If name resolution works again, browsers can find servers. Connectivity may have been fine the whole time.

### Further reading
Official protocol overview: DNS is described in the free RFCs published by the RFC Editor (link in References).`,
    glossaryTerms: [
      { term: "DNS", definition: "Domain Name System — maps names to IP addresses." },
      { term: "Resolver", definition: "The component that asks DNS servers on your behalf." },
      { term: "A record", definition: "A DNS record that maps a name to an IPv4 address." },
    ],
    relatedScenarios: ["dns-some-sites-broken"],
    relatedArticles: ["ip-addressing-basics", "gateway-vs-dns"],
    references: [
      {
        title: "RFC Editor — DNS resources",
        url: "https://www.rfc-editor.org/search/rfc_search_detail.php?title=dns",
        note: "Official RFCs; freely readable; do not modify RFC text.",
      },
    ],
  },
  {
    id: "ip-addressing-basics",
    title: "IP addressing basics",
    track: "Networking",
    summary: "How hosts get addresses, masks, gateways, and why conflicts break connectivity.",
    body: `## IPv4 building blocks

| Piece | Example | Role |
|---|---|---|
| IP address | 192.168.1.50 | This host's address |
| Subnet mask | 255.255.255.0 | Which part is network vs host |
| Gateway | 192.168.1.1 | Where to send off-network traffic |
| DNS | 192.168.1.1 | Name resolution helper |

### Same subnet?
If your IP is \`192.168.1.50/24\` and the gateway is \`10.0.0.1\`, you are **not** on the gateway's network — traffic never leaves correctly.

### Duplicate IPs
Two hosts claiming the same address cause intermittent drops and weird ARP behavior.

### Quick checks
- \`ipconfig /all\` (Windows) or \`ip a\` (Linux)
- Confirm DHCP lease or static values match the site standard`,
    glossaryTerms: [
      { term: "Subnet", definition: "A logical section of a network defined by IP + mask." },
      { term: "Gateway", definition: "Router used to reach other networks." },
    ],
    relatedScenarios: ["wifi-connected-no-internet", "duplicate-ip-conflict"],
    relatedArticles: ["what-is-dns", "gateway-vs-dns"],
    references: [],
  },
  {
    id: "gateway-vs-dns",
    title: "Gateway problems vs DNS problems",
    track: "Networking",
    summary: "Two different failures that both look like “internet is down.”",
    body: `## Tell them apart fast

| Symptom | Likely DNS | Likely gateway/routing |
|---|---|---|
| Ping IP works, ping name fails | ✅ | |
| Ping gateway works, ping public IP fails | | ✅ |
| Some sites work (cached), new names fail | ✅ | |
| Nothing off-subnet works | | ✅ |

### Decision path
1. \`ping <gateway>\`
2. \`ping 8.8.8.8\` (or any public IP)
3. \`nslookup example.com\`

Fix the **first** failed step.`,
    glossaryTerms: [],
    relatedScenarios: ["dns-some-sites-broken", "wifi-connected-no-internet"],
    relatedArticles: ["what-is-dns", "ip-addressing-basics"],
    references: [],
  },
  {
    id: "linux-permissions-basics",
    title: "Linux file permissions",
    track: "Linux",
    summary: "Owner, group, other — and why Permission denied appears.",
    body: `## Reading \`ls -l\`

\`\`\`
-rw-r--r-- 1 app app  120 config.yaml
drwxr-xr-x 2 app app 4096 logs/
\`\`\`

- First \`-\` or \`d\`: file vs directory
- Next triplets: **owner**, **group**, **other**
- \`r\` read, \`w\` write, \`x\` execute

### Permission denied
Usually:
- Wrong owner/mode
- Trying to write a config as a non-root user without sudo
- SELinux/AppArmor (advanced)

### Safe fix path
1. Confirm identity: \`whoami\`, \`id\`
2. Confirm mode: \`ls -l\`
3. Adjust with the correct principle — often fix ownership or add the user to the right group, not \`chmod 777\`.`,
    glossaryTerms: [
      { term: "mode", definition: "Numeric or symbolic permissions on a file." },
      { term: "SUID", definition: "Special bit that runs a file as its owner." },
    ],
    relatedScenarios: ["linux-permission-denied"],
    relatedArticles: ["systemd-service-basics"],
    references: [],
  },
  {
    id: "systemd-service-basics",
    title: "systemd services and logs",
    track: "Linux",
    summary: "Check status, read unit logs, restart safely.",
    body: `## Everyday service triage

\`\`\`bash
systemctl status app.service
journalctl -u app.service -n 50
sudo systemctl restart app.service
\`\`\`

### Healthy patterns
- \`active (running)\`
- Recent logs without crash loops

### Unhealthy patterns
- \`failed\`
- Repeating start/stop in logs
- Config errors on boot

Always read the **last error** before restarting blindly — restart can clear symptoms while the cause remains.`,
    glossaryTerms: [
      { term: "unit", definition: "systemd's name for a service, socket, or timer." },
    ],
    relatedScenarios: ["linux-service-failing"],
    relatedArticles: ["linux-permissions-basics"],
    references: [
      {
        title: "freedesktop.org systemd docs",
        url: "https://www.freedesktop.org/software/systemd/man/systemctl.html",
        note: "Official project documentation; link out.",
      },
    ],
  },
  {
    id: "windows-event-logs",
    title: "Windows event logs for beginners",
    track: "Windows",
    summary: "Where to look when an app crashes or a service stops.",
    body: `## Event Viewer essentials

Open **Event Viewer** → **Windows Logs**:

- **Application** — app crashes, installs
- **System** — drivers, services, shutdowns
- **Security** — logons (audit policy dependent)

### Useful filters
- Level: Error / Critical
- Source: application or service name
- Last 24 hours

### Reading a crash
1. Note **Event ID** and **Source**
2. Read the description
3. Correlate timestamp with user action
4. Fix config/dependency, then reproduce to verify`,
    glossaryTerms: [
      { term: "Event ID", definition: "Numeric code for a specific event type." },
    ],
    relatedScenarios: ["windows-app-crash"],
    relatedArticles: ["windows-boot-repair"],
    references: [
      {
        title: "Microsoft Learn — Event Viewer",
        url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/eventvwr",
        note: "Link only; content remains Microsoft's.",
      },
    ],
  },
  {
    id: "windows-boot-repair",
    title: "Windows boot troubleshooting paths",
    track: "Windows",
    summary: "From black screen to recovery options without guessing.",
    body: `## Structured boot triage

1. **Does POST complete?** Fans/LEDs/beeps → hardware path
2. **Does Windows logo appear?** → OS/loader path
3. **Does it reach login?** → driver/session path

### Recovery tools (conceptual)
- Startup Repair
- System Restore
- \`sfc /scannow\` and DISM (when OS is reachable)
- Safe Mode to isolate third-party drivers

### Lab note
In this simulator, boot outcomes are modeled as world state so you can practice diagnosis safely.`,
    glossaryTerms: [
      { term: "POST", definition: "Power-On Self-Test performed by firmware." },
      { term: "BCD", definition: "Boot Configuration Data store." },
    ],
    relatedScenarios: ["windows-wont-boot", "pc-no-power", "pc-on-no-display"],
    relatedArticles: ["windows-event-logs"],
    references: [],
  },
  {
    id: "phishing-awareness",
    title: "Phishing triage (defensive)",
    track: "Security",
    summary: "How to investigate a suspicious message without becoming a victim.",
    body: `## Investigate, don't click

Checklist:
1. **Sender** domain — lookalikes?
2. **Urgency / threats** — classic pressure tactic
3. **Links** — hover and read the real destination
4. **Attachments** — unexpected macros/installers
5. **Context** — would this process really email you?

### If suspected
- Do not open links on a work machine
- Report through your org's phishing report button (simulated here)
- Preserve headers for the security team

### Defensive only
This lab teaches **detection and reporting**, never launching attacks.`,
    glossaryTerms: [
      { term: "spear phishing", definition: "Targeted phishing aimed at a specific person." },
      { term: "lookalike domain", definition: "Domain crafted to resemble a trusted one." },
    ],
    relatedScenarios: ["phishing-ticket-triage"],
    relatedArticles: ["least-privilege-basics"],
    references: [
      {
        title: "CISA — Phishing guidance",
        url: "https://www.cisa.gov/topics/cyber-threats-and-advisories/types-threats/phishing",
        note: "US government public guidance.",
      },
    ],
  },
  {
    id: "least-privilege-basics",
    title: "Least privilege and access control",
    track: "Security",
    summary: "Why over-permissioning turns small mistakes into incidents.",
    body: `## Core idea

Give accounts **only** the rights they need — nothing more.

### Practical examples
- Helpdesk techs need reset tools, not Domain Admin
- Service accounts need specific share access, not local admin
- Shared logins hide accountability

### Investigation angle
When reviewing an incident: which identity performed the action, and was that right expected?`,
    glossaryTerms: [
      { term: "least privilege", definition: "Minimum rights required to do a job." },
      { term: "RBAC", definition: "Role-based access control." },
    ],
    relatedScenarios: ["account-lockout", "phishing-ticket-triage"],
    relatedArticles: ["phishing-awareness"],
    references: [],
  },
  {
    id: "disk-space-slow-pc",
    title: "Disk space and slow PCs",
    track: "Sysadmin",
    summary: "Free space, failing disks, and runaway processes.",
    body: `## Slow machine checklist

1. **Disk free space** — below ~10% can break updates and temp files
2. **Disk health** — SMART warnings, chkdsk/fsck errors
3. **CPU/memory** — task manager / \`top\`
4. **Startup bloat** — too many auto-start apps
5. **Thermals** — throttling under heat

### Verify your fix
Free space should rise, and the reported symptom (update fail, freeze) should no longer reproduce.`,
    glossaryTerms: [
      { term: "SMART", definition: "Self-Monitoring, Analysis and Reporting Technology for disks." },
    ],
    relatedScenarios: ["disk-full-slow-pc"],
    relatedArticles: ["windows-event-logs"],
    references: [],
  },
  {
    id: "database-connection-basics",
    title: "Database connection failures",
    track: "Databases",
    summary: "Service down, wrong credentials, firewall, wrong port.",
    body: `## Triage order

1. Is the DB **service** running?
2. Are **credentials** correct?
3. Is the **port** reachable (5432/3306/1433…)?
4. Does the app use the right **host/name**?

### Common errors
- \`connection refused\` → service not listening
- \`password authentication failed\` → credentials
- \`timeout\` → firewall/network path

Always distinguish **client config** from **server outage**.`,
    glossaryTerms: [
      { term: "connection string", definition: "Host, port, db name, and credentials for clients." },
    ],
    relatedScenarios: ["db-connection-refused"],
    relatedArticles: ["gateway-vs-dns"],
    references: [],
  },
  {
    id: "troubleshooting-method",
    title: "The troubleshooting method",
    track: "Foundations",
    summary: "A repeatable process that prevents random guessing.",
    body: `## The ten steps

1. Understand the problem
2. Gather information
3. Reproduce the issue
4. Form hypotheses
5. Gather evidence
6. Test a hypothesis
7. Identify root cause
8. Apply a fix
9. Verify the fix
10. Document the solution

### Why it matters
Skipping verification is how “fixed it” becomes a ticket reopen. Every lab in this product asks you to **verify** before debrief.`,
    glossaryTerms: [
      { term: "root cause", definition: "The underlying condition that produced the symptom." },
    ],
    relatedScenarios: [],
    relatedArticles: ["what-is-dns", "least-privilege-basics"],
    references: [],
  },
  {
    id: "vlan-basics",
    title: "VLANs: what they are and why ports belong to them",
    track: "Networking",
    summary:
      "A VLAN is a logical network segment. A device only reaches others when the switch port it sits on carries that VLAN.",
    body: `## VLANs in plain language

A **VLAN (Virtual LAN)** splits one physical switch into separate logical networks. Ports assigned to VLAN 10 can talk to each other; they cannot reach VLAN 20 unless a router or layer-3 switch is involved.

### Why they matter
- Segmentation: guest Wi-Fi cannot reach finance servers
- Isolation: a fault in one VLAN does not flood another
- Policy: ACLs, QoS, and monitoring apply per VLAN

### The two port roles
| Role | Carries | Typical use |
|---|---|---|
| Access port | One VLAN (untagged) | Desk phone, printer, PC |
| Trunk port | Multiple VLANs (tagged) | Uplinks between switches |

### What a VLAN mismatch looks like
- Link light is on, but the host gets no address or cannot reach its gateway
- The port shows the "wrong" VLAN compared with the rest of the desk
- A trunk that does not carry the access VLAN blocks traffic end to end

### How to check
1. Read the port's VLAN assignment on the switch
2. Compare it with a known-good port on the same desk row
3. On the uplink trunk, confirm the VLAN is in the allowed/active list

### Why the fix works
Once the port (and the trunk on the path) carry the same VLAN the host is configured for, frames arrive where the gateway and DHCP server are listening — connectivity returns without touching the cable or the PC.`,
    glossaryTerms: [
      { term: "VLAN", definition: "A logical broadcast domain carved out of a physical switch." },
      { term: "Access port", definition: "A port carrying a single untagged VLAN for end devices." },
      { term: "Trunk port", definition: "A link carrying tagged frames for multiple VLANs." },
    ],
    relatedScenarios: ["switch-vlan-mismatch", "patch-crossconnect-mislabelled"],
    relatedArticles: ["ip-addressing-basics", "network-cabling-basics"],
    references: [
      {
        title: "IEEE 802.1Q — VLAN tagging",
        url: "https://standards.ieee.org/ieee/802.1Q/7071/",
        note: "Standard behind VLAN tags; link only.",
      },
    ],
  },
  {
    id: "poe-power-basics",
    title: "PoE power budgets and why ports drop devices",
    track: "Networking",
    summary:
      "PoE switches have a finite power budget. When the draw exceeds it, ports refuse or drop the devices attached to them.",
    body: `## PoE in plain language

**Power over Ethernet (PoE)** carries DC power on the same cable as the data. Access points, cameras, and phones draw power from the switch port instead of a wall adapter.

### The budget rule
A switch advertises a total **PoE budget** (for example 60 W) and a per-port class (for example 802.3at, up to 30 W per port). Each powered device requests a class; the switch adds up the requests.

- Total requested **≤ budget** → every port powers up
- Total requested **> budget** → the switch prioritizes and refuses or drops the lowest-priority ports

### What an overloaded budget looks like
- Some ports show link but the device stays dark
- Rebooting the device does not help; moving it to a free port works
- The switch log or dashboard shows "insufficient PoE power"

### How to check
1. Read the switch's PoE budget and current draw
2. List which ports are drawing power and their class
3. Total the draw — if it exceeds the budget, the arithmetic is the fault

### Why the fix works
PoE admission is purely budget arithmetic. Rebalancing ports, disabling unused powered ports, or using a higher-wattage PSU returns power without replacing any device.`,
    glossaryTerms: [
      { term: "PoE budget", definition: "Total watts a switch can deliver to powered devices at once." },
      { term: "PSE", definition: "Power Sourcing Equipment — the switch port that supplies power." },
      { term: "PD", definition: "Powered Device — the access point, phone, or camera receiving power." },
    ],
    relatedScenarios: ["switch-poe-overload", "ap-poe-port-disabled"],
    relatedArticles: ["vlan-basics", "network-cabling-basics"],
    references: [
      {
        title: "IEEE 802.3 PoE overview",
        url: "https://standards.ieee.org/ieee/802.3/6969/",
        note: "Standard family behind PoE classes; link only.",
      },
    ],
  },
  {
    id: "ups-runtime-basics",
    title: "UPS runtime, batteries, and load limits",
    track: "Hardware",
    summary:
      "A UPS only protects what its battery and load rating can carry — expired batteries and overloads both cut the output.",
    body: `## UPS in plain language

A **UPS (Uninterruptible Power Supply)** bridges short outages and cleans utility power. Two things decide whether it holds: a healthy battery and a load within its rating.

### The three failure shapes
| Symptom | Likely condition |
|---|---|
| Utility present, output dead | Outlet group off / breaker tripped / input unplugged |
| On battery, immediate drop | Battery expired or too weak to hold the load |
| Immediate alarm, rapid shutdown | Load exceeds the VA/watt rating |

### Battery aging
Batteries are chemistry with a lifetime (typically 3–5 years). An expired battery may pass a self-test that only checks presence but collapses the moment real load transfers.

### How to check
1. Confirm utility input is actually present at the UPS
2. Read the load percentage against the rated capacity
3. Check battery age/health status and outlet-group state
4. Trip the resettable breaker back on if it is open

### Why the fix works
Output is only as reliable as the source path, the battery, and the load headroom. Fixing the open breaker, replacing an expired pack, or shedding load restores protection without touching the protected equipment.`,
    glossaryTerms: [
      { term: "VA rating", definition: "Apparent-power capacity the UPS can carry continuously." },
      { term: "Transfer time", definition: "Milliseconds between utility loss and battery pickup." },
      { term: "Outlet group", definition: "A switched bank of outlets controlled together by the UPS." },
    ],
    relatedScenarios: [
      "ups-battery-expired",
      "ups-overload",
      "ups-outlet-group-dead",
      "ups-input-unplugged",
      "ups-breaker-tripped",
    ],
    relatedArticles: ["poe-power-basics"],
    references: [],
  },
  {
    id: "network-cabling-basics",
    title: "Structured cabling: patch leads, keystones, and cross-connects",
    track: "Networking",
    summary:
      "Every link crosses a chain of connectors. A seat, a label, or a port at any hop breaks the path even when parts of it still show light.",
    body: `## The physical chain

A desk connection is a series of hops:

\`device → patch lead → keystone jack → horizontal cable → patch panel port → patch lead → switch port\`

Each hop is a potential fault. Link lights only prove the hops *they* sit next to — not the whole chain.

### Common physical faults
- **Lead not fully seated** — intermittent link that returns when the cable is touched
- **Keystone not punched / loose** — no continuity at the wall end
- **Mislabelled cross-connect** — panel port number does not match the horizontal run's label
- **Switch port administratively down** — perfect cabling, dark port

### How to trace
1. Confirm both ends of the suspect segment are seated
2. Use a cable tracer to follow the exact run between panel and jack
3. Compare panel port labels with the horizontal cable labels
4. Check the switch port's admin state only after continuity is proven

### Why the fix works
Data needs an unbroken physical path *and* the right logical endpoint. Restoring the loose seat or correcting the label re-creates the path the switch and the desk are already configured to use.`,
    glossaryTerms: [
      { term: "Keystone jack", definition: "The snap-in wall outlet a patch lead plugs into." },
      { term: "Patch panel", definition: "Fixed panel where horizontal runs terminate, numbered per port." },
      { term: "Cross-connect", definition: "The patching between a panel port and a switch port." },
    ],
    relatedScenarios: [
      "patch-keystone-loose",
      "patch-crossconnect-mislabelled",
      "patch-switch-port-disabled",
      "patch-lead-not-seated",
    ],
    relatedArticles: ["vlan-basics", "poe-power-basics"],
    references: [],
  },
];
