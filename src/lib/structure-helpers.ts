import type { StructureModuleNode } from "./definitions";

/**
 * Returns the chain of modules from the first matching root to the target module id.
 * Example: [Root, Child, Target]. Returns null when the module isn't found.
 */
export function findModulePath(
  nodes: StructureModuleNode[] | undefined,
  targetId: string
): StructureModuleNode[] | null {
  if (!nodes || nodes.length === 0) return null;

  for (const node of nodes) {
    if (node.id === targetId) {
      return [node];
    }

    const childModules = node.items.filter(
      (item): item is StructureModuleNode => item.type === "module"
    );
    const path = findModulePath(childModules, targetId);
    if (path) {
      return [node, ...path];
    }
  }

  return null;
}
