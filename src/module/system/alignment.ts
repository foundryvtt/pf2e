import { Alignment } from "@actor/creature/types.ts";

function isEvil(alignment: Alignment): boolean {
    return alignment === "LE" || alignment === "CE" || alignment === "NE";
}

function isGood(alignment: Alignment): boolean {
    return alignment === "LG" || alignment === "CG" || alignment === "NG";
}

function isLawful(alignment: Alignment): boolean {
    return alignment === "LE" || alignment === "LN" || alignment === "LG";
}

function isChaotic(alignment: Alignment): boolean {
    return alignment === "CE" || alignment === "CN" || alignment === "CG";
}

export { isChaotic, isEvil, isGood, isLawful };
