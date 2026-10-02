/**
 * Pure part-visibility rules for the 3D workbench. The scene receives the
 * same `visible` predicate the 2D SVG uses (derived from the scenario's
 * declarative `environment.components` list), so both renderers gate parts
 * through one shared rule set.
 */
export interface ScenePartVisibility {
  board: boolean;
  psu: boolean;
  wall: boolean;
  frontPanel: boolean;
  cooler: boolean;
  dimms: boolean;
  gpu: boolean;
  storage: boolean;
}

export function scenePartVisibility(visible: (id: string) => boolean): ScenePartVisibility {
  const board = visible("motherboard");
  return {
    board,
    psu: visible("power-supply"),
    wall: visible("wall"),
    frontPanel: visible("front-panel"),
    cooler: board && visible("cpu-cooler"),
    dimms: board && visible("ram"),
    gpu: board && visible("gpu"),
    storage: visible("storage"),
  };
}
