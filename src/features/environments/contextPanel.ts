import type { ReactNode } from "react";

export interface LabContextPanel {
  id: string;
  title: string;
  body: ReactNode;
  componentId?: string;
  onClose?: () => void;
}

export type SetLabContextPanel = (panel: LabContextPanel | null) => void;
