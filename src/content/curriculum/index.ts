import type { Track } from "@/content/schema";

export const curriculum: Track[] = [
  {
    id: "foundations",
    title: "Foundations",
    description: "Troubleshooting method and core vocabulary.",
    modules: [
      {
        id: "foundations-method",
        title: "How ITs troubleshoot",
        topics: [
          {
            id: "topic-method",
            title: "Troubleshooting method",
            articleIds: ["troubleshooting-method"],
            scenarioIds: [],
            prereqTopicIds: [],
          },
        ],
      },
    ],
  },
  {
    id: "hardware",
    title: "Computer Hardware",
    description: "No-POST, no-display, and bench diagnostics.",
    modules: [
      {
        id: "hw-power",
        title: "Power and POST",
        topics: [
          {
            id: "topic-no-power",
            title: "PC does not power on",
            articleIds: ["windows-boot-repair"],
            scenarioIds: ["pc-no-power"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-no-display",
            title: "Powers on, no display",
            articleIds: ["windows-boot-repair"],
            scenarioIds: ["pc-on-no-display"],
            prereqTopicIds: ["topic-no-power"],
          },
          {
            id: "topic-ram-instability",
            title: "Intermittent reboots under load",
            articleIds: ["troubleshooting-method"],
            scenarioIds: ["ram-instability-crashes"],
            prereqTopicIds: ["topic-no-display"],
          },
          {
            id: "topic-thermal-shutdown",
            title: "Thermal shutdowns",
            articleIds: ["troubleshooting-method"],
            scenarioIds: ["cpu-thermal-shutdown"],
            prereqTopicIds: ["topic-no-power"],
          },
          {
            id: "topic-storage-detect",
            title: "No boot device found",
            articleIds: ["troubleshooting-method"],
            scenarioIds: ["storage-not-detected"],
            prereqTopicIds: ["topic-no-power"],
          },
        ],
      },
    ],
  },
  {
    id: "windows",
    title: "Windows",
    description: "Boot, services, events, and everyday faults.",
    modules: [
      {
        id: "win-os",
        title: "OS health",
        topics: [
          {
            id: "topic-boot",
            title: "Boot failures",
            articleIds: ["windows-boot-repair", "windows-event-logs"],
            scenarioIds: ["windows-wont-boot"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-crash",
            title: "Application crashes",
            articleIds: ["windows-event-logs"],
            scenarioIds: ["windows-app-crash"],
            prereqTopicIds: ["topic-boot"],
          },
          {
            id: "topic-update-failure",
            title: "Update failures",
            articleIds: ["windows-event-logs", "windows-boot-repair"],
            scenarioIds: ["windows-update-failure"],
            prereqTopicIds: ["topic-crash"],
          },
          {
            id: "topic-device-error",
            title: "Device error codes",
            articleIds: ["windows-event-logs"],
            scenarioIds: ["windows-device-error"],
            prereqTopicIds: ["topic-update-failure"],
          },
        ],
      },
    ],
  },
  {
    id: "linux",
    title: "Linux",
    description: "Permissions, services, and logs.",
    modules: [
      {
        id: "linux-admin",
        title: "Admin basics",
        topics: [
          {
            id: "topic-perms",
            title: "Permissions",
            articleIds: ["linux-permissions-basics"],
            scenarioIds: ["linux-permission-denied"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-services",
            title: "Services",
            articleIds: ["systemd-service-basics"],
            scenarioIds: ["linux-service-failing"],
            prereqTopicIds: ["topic-perms"],
          },
          {
            id: "topic-disk-full",
            title: "Disk full on a server",
            articleIds: ["disk-space-slow-pc", "troubleshooting-method"],
            scenarioIds: ["linux-disk-full"],
            prereqTopicIds: ["topic-services"],
          },
          {
            id: "topic-runaway",
            title: "Runaway processes",
            articleIds: ["troubleshooting-method"],
            scenarioIds: ["linux-runaway-process"],
            prereqTopicIds: ["topic-services"],
          },
        ],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking",
    description: "IP, DNS, DHCP, gateways — real outage triage.",
    modules: [
      {
        id: "net-core",
        title: "Connectivity faults",
        topics: [
          {
            id: "topic-dns",
            title: "DNS failures",
            articleIds: ["what-is-dns", "gateway-vs-dns"],
            scenarioIds: ["dns-some-sites-broken"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-gateway",
            title: "Gateway / no internet",
            articleIds: ["ip-addressing-basics", "gateway-vs-dns"],
            scenarioIds: ["wifi-connected-no-internet"],
            prereqTopicIds: ["topic-dns"],
          },
          {
            id: "topic-dhcp",
            title: "DHCP failures",
            articleIds: ["ip-addressing-basics"],
            scenarioIds: ["dhcp-addressing-broken"],
            prereqTopicIds: ["topic-gateway"],
          },
          {
            id: "topic-dup-ip",
            title: "Duplicate IPs",
            articleIds: ["ip-addressing-basics"],
            scenarioIds: ["duplicate-ip-conflict"],
            prereqTopicIds: ["topic-dhcp"],
          },
          {
            id: "topic-firewall",
            title: "Firewall blocks a port",
            articleIds: ["gateway-vs-dns", "troubleshooting-method"],
            scenarioIds: ["firewall-blocks-port"],
            prereqTopicIds: ["topic-gateway"],
          },
        ],
      },
    ],
  },
  {
    id: "support",
    title: "IT Support",
    description: "Helpdesk tickets end-to-end.",
    modules: [
      {
        id: "support-desk",
        title: "Common tickets",
        topics: [
          {
            id: "topic-printer",
            title: "Printer not printing",
            articleIds: ["troubleshooting-method"],
            scenarioIds: ["printer-not-printing"],
            prereqTopicIds: ["topic-method"],
          },
            {
              id: "topic-lockout",
              title: "Account lockout",
              articleIds: ["least-privilege-basics"],
              scenarioIds: ["account-lockout"],
              prereqTopicIds: ["topic-method"],
            },
            {
              id: "topic-email-delivery",
              title: "Email not arriving",
              articleIds: ["troubleshooting-method"],
              scenarioIds: ["email-not-receiving"],
              prereqTopicIds: ["topic-method"],
            },
          ],
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Defensive investigation workflows.",
    modules: [
      {
        id: "sec-defensive",
        title: "Awareness & triage",
        topics: [
            {
              id: "topic-phishing",
              title: "Phishing triage",
              articleIds: ["phishing-awareness", "least-privilege-basics"],
              scenarioIds: ["phishing-ticket-triage"],
              prereqTopicIds: ["topic-method"],
            },
            {
              id: "topic-suspicious-signin",
              title: "Impossible-travel sign-in",
              articleIds: ["least-privilege-basics", "troubleshooting-method"],
              scenarioIds: ["suspicious-signin"],
              prereqTopicIds: ["topic-phishing"],
            },
            {
              id: "topic-malware-triage",
              title: "Endpoint malware triage",
              articleIds: ["phishing-awareness", "troubleshooting-method"],
              scenarioIds: ["malware-endpoint-alert"],
              prereqTopicIds: ["topic-phishing"],
            },
          ],
      },
    ],
  },
  {
    id: "sysadmin",
    title: "System Administration",
    description: "Storage and capacity.",
    modules: [
      {
        id: "sys-ops",
        title: "Capacity",
        topics: [
          {
            id: "topic-disk",
            title: "Disk full / slow PC",
            articleIds: ["disk-space-slow-pc"],
            scenarioIds: ["disk-full-slow-pc"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-backup",
            title: "Backup job failing",
            articleIds: ["windows-event-logs", "troubleshooting-method"],
            scenarioIds: ["backup-failed"],
            prereqTopicIds: ["topic-disk"],
          },
          {
            id: "topic-service-deps",
            title: "Service dependency failure",
            articleIds: ["systemd-service-basics", "troubleshooting-method"],
            scenarioIds: ["service-dependency"],
            prereqTopicIds: ["topic-disk"],
          },
        ],
      },
    ],
  },
  {
    id: "database",
    title: "Databases",
    description: "Connection and service failures.",
    modules: [
      {
        id: "db-triage",
        title: "Connectivity",
        topics: [
          {
            id: "topic-db-conn",
            title: "Connection refused",
            articleIds: ["database-connection-basics"],
            scenarioIds: ["db-connection-refused"],
            prereqTopicIds: ["topic-method"],
          },
          {
            id: "topic-db-auth",
            title: "Authentication rejected",
            articleIds: ["database-connection-basics", "troubleshooting-method"],
            scenarioIds: ["db-auth-failure"],
            prereqTopicIds: ["topic-db-conn"],
          },
          {
            id: "topic-db-capacity",
            title: "Connection capacity",
            articleIds: ["database-connection-basics", "troubleshooting-method"],
            scenarioIds: ["db-pool-exhausted"],
            prereqTopicIds: ["topic-db-conn"],
          },
        ],
      },
    ],
  },
];
