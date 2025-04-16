/** @module dice */

import { RollParseNode } from "./_types.mjs";
import { RollTermData } from "./terms/_types.mjs";

export * from "./_types.mjs";
export * as terms from "./terms/_module.mjs";

export const RollGrammar: { parse(formula: string): RollParseNode | RollTermData };

export { default as RollParser } from "./parser.mjs";
export * from "./roll.mjs";
export { default as Roll } from "./roll.mjs";
export { default as MersenneTwister } from "./twister.mjs";
