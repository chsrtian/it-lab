/** 3D part vocabulary per family stage — must equal the family component ids. */
export const PRINTER_PART_IDS = [
  "printer",
  "printer-paper",
  "printer-cartridge",
  "printer-network",
] as const;

export const ROUTER_PART_IDS = [
  "router",
  "router-wan",
  "router-lan",
  "router-dhcp",
  "router-nat",
] as const;

export const SWITCH_PART_IDS = [
  "switch",
  "switch-uplink",
  "switch-port",
  "switch-vlan",
] as const;

export const AP_PART_IDS = ["access-point", "ap-poe", "ap-radio"] as const;

export const UPS_PART_IDS = ["ups", "ups-input", "ups-output", "ups-battery"] as const;

export const PATCH_PART_IDS = [
  "patch-panel",
  "wall-jack",
  "ethernet-cable",
  "switch-port",
] as const;
