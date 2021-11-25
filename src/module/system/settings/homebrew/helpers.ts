import { isObject } from "@util";
import { ConfigPF2eHomebrewRecord, HomebrewElements } from ".";

/** User-defined type guard for checking that an object is a well-formed flag of module-provided homebrew elements */
export function isHomebrewFlag(
    flag: object & { [K in string]?: unknown }
): flag is Record<ConfigPF2eHomebrewRecord, Record<string, string | LabelAndDescription> | undefined> {
    const entries = Object.entries(flag);
    const settings: readonly string[] = HomebrewElements.SETTINGS;
    return (
        entries.length > 0 &&
        entries.every(
            ([key, value]) =>
                settings.includes(key) &&
                (typeof value === "string" ||
                    (isObject(value) &&
                        Object.entries(value).every(
                            ([_hbKey, hbLabel]) =>
                                typeof hbLabel === "string" || (isObject(hbLabel) && isLabelAndDescription(hbLabel))
                        )))
        )
    );
}

function isLabelAndDescription(obj: { label?: unknown; description?: unknown }): obj is LabelAndDescription {
    return typeof obj.label === "string" && typeof obj.description === "string";
}

interface LabelAndDescription {
    label: string;
    description: string;
}
