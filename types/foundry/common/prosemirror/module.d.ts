import type * as Commands from "prosemirror-commands";

export * from "./dropdown.ts";
export * from "./menu.ts";
export * from "./plugin.ts";
export const commands: typeof Commands;
export const defaultSchema: ProseMirror.Schema;
export const defaultPlugins: Record<string, ProseMirror.Plugin>;
export const Plugin: ConstructorOf<ProseMirror.Plugin>;
