import { Alignment } from "@actor/creature/types.ts";

export function isEvil(alignment: Alignment): boolean {
    return alignment === "LE" || alignment === "CE" || alignment === "NE";
}

export function isGood(alignment: Alignment): boolean {
    return alignment === "LG" || alignment === "CG" || alignment === "NG";
}

export function isLawful(alignment: Alignment): boolean {
    return alignment === "LE" || alignment === "LN" || alignment === "LG";
}

export function isChaotic(alignment: Alignment): boolean {
    return alignment === "CE" || alignment === "CN" || alignment === "CG";
}
