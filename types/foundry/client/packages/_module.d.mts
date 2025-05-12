/** @module packages */

import Module from "./module.mjs";
import System from "./system.mjs";
import World from "./world.mjs";

export * from "@common/packages/_module.mjs";
export * from "./_types.mjs";
export { default as ClientPackageMixin } from "./client-package.mts";
export { Module, System, World };

/**
 * A mapping of allowed package types and the classes which implement them.
 */
export const PACKAGE_TYPES: Readonly<{
    world: World;
    system: System;
    module: Module;
}>;
