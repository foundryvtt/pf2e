import { isObject } from "@util";

/** User-defined type guard for checking that an object is a well-formed flag category of module-provided homebrew elements */
export function isHomebrewFlagCategory(
    value: object & { [K in string]?: unknown }
): value is Record<string, string | LabelAndDescription> {
    return Object.entries(value).every(
        ([_hbKey, hbLabel]) => typeof hbLabel === "string" || (isObject(hbLabel) && isLabelAndDescription(hbLabel))
    );
}

function isLabelAndDescription(obj: { label?: unknown; description?: unknown }): obj is LabelAndDescription {
    return typeof obj.label === "string" && typeof obj.description === "string";
}

interface LabelAndDescription {
    label: string;
    description: string;
}
