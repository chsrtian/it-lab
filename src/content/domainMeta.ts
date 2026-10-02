import {
  Cpu,
  Database,
  HardDrive,
  LifeBuoy,
  Monitor,
  Network,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { ComponentType } from "react";
import type { z } from "zod";
import { categorySchema } from "@/content/schema";

export type Category = z.infer<typeof categorySchema>;

export interface DomainMeta {
  id: Category;
  label: string;
  tagline: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  trackId: string;
}

/**
 * Domain registry for technician workstations. Presentation metadata enriched
 * with authentic IT specialty areas.
 */
export const DOMAINS: readonly DomainMeta[] = [
  {
    id: "hardware",
    label: "Hardware",
    tagline: "Components, thermals, power sequencing & storage links",
    icon: Cpu,
    trackId: "hardware",
  },
  {
    id: "networking",
    label: "Networking",
    tagline: "Topology, DNS, DHCP, VLAN trunking & packet routing",
    icon: Network,
    trackId: "networking",
  },
  {
    id: "windows",
    label: "Windows",
    tagline: "Services, registry, event logs, drivers & startup repair",
    icon: Monitor,
    trackId: "windows",
  },
  {
    id: "linux",
    label: "Linux",
    tagline: "VFS permissions, systemd units, processes & log rotation",
    icon: Terminal,
    trackId: "linux",
  },
  {
    id: "sysadmin",
    label: "Sysadmin",
    tagline: "Scheduled backups, service chains, dependencies & recovery",
    icon: Server,
    trackId: "sysadmin",
  },
  {
    id: "database",
    label: "Databases",
    tagline: "Connection pools, auth handshakes, query latency & locks",
    icon: Database,
    trackId: "database",
  },
  {
    id: "security",
    label: "Security",
    tagline: "Endpoint alerts, anomalous sign-ins, audit trails & quarantine",
    icon: ShieldCheck,
    trackId: "security",
  },
  {
    id: "support",
    label: "IT Support",
    tagline: "Customer triage, printer queues, mail delivery & local perms",
    icon: LifeBuoy,
    trackId: "support",
  },
  {
    id: "cloud",
    label: "Cloud",
    tagline: "Object stores, cloud IAM, gateways & virtual appliances",
    icon: HardDrive,
    trackId: "cloud",
  },
] as const;

/** Discipline label for prose; falls back to the raw category id. */
export function disciplineLabel(category: string): string {
  return DOMAINS.find((x) => x.id === category)?.label ?? category;
}

export const DIFFICULTIES = [
  "foundational",
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type DifficultyLabel = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<DifficultyLabel, string> = {
  foundational: "Foundational",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Lab environments phrased as authentic diagnostic setups. */
export const ENVIRONMENT_LABEL: Record<string, string> = {
  "hardware-bench": "PC Hardware Bench",
  "equipment-bench": "Network Equipment Bench",
  "windows-panel": "Windows Console",
  "linux-terminal": "Linux Shell",
  "network+terminal": "Network Probe Console",
  mixed: "Mixed Diagnostic Bench",
};

export const MODE_NOTES: Record<string, { label: string; desc: string }> = {
  guided: {
    label: "Guided",
    desc: "Interactive instructor-assisted walkthrough with targeted inspection rings.",
  },
  practice: {
    label: "Practice",
    desc: "Autonomous investigation with progressive diagnostic hints available.",
  },
  challenge: {
    label: "Challenge",
    desc: "Full evaluation mode. No hints; assessed on evidence and optimal action path.",
  },
};

/** Category title from curriculum track, falling back to label. */
export function trackTitle(
  trackId: string,
  tracks: readonly { id: string; title: string }[],
): string {
  return tracks.find((t) => t.id === trackId)?.title ?? trackId;
}

export function trackDescription(
  trackId: string,
  tracks: readonly { id: string; description: string }[],
): string {
  return tracks.find((t) => t.id === trackId)?.description ?? "";
}

export const METHOD_ARTICLE_ID = "troubleshooting-method";
export const METHOD_TRACK = "Troubleshooting method";

