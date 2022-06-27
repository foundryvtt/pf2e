import { TraitViewData } from "@actor/data/base";
import Tagify from "@yaireo/tagify";
import { ErrorPF2e, objectHasKey } from "./misc";

function traitSlugToObject(trait: string, dictionary: Record<string, string | undefined>): TraitViewData {
    // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
    // in use, which can include what are normally NPC-only traits
    const label = dictionary[trait] ?? trait;
    const traitObject: TraitViewData = {
        name: trait,
        label,
    };
    if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
        traitObject.description = CONFIG.PF2E.traitsDescriptions[trait];
    }

    return traitObject;
}

/** Create a tagify select menu out of a JSON input element */
function tagify(input: HTMLInputElement | null, { whitelist, maxTags }: TagifyOptions): Tagify<TagRecord> {
    if (input?.dataset.dtype !== "JSON") {
        throw ErrorPF2e("Usable only on input elements with JSON data-dtype");
    }

    return new Tagify(input, {
        enforceWhitelist: true,
        keepInvalidTags: false,
        skipInvalid: true,
        maxTags,
        dropdown: {
            closeOnSelect: false,
            enabled: 0,
            maxItems: Object.keys(whitelist).length,
            searchKeys: ["id", "value"],
        },
        whitelist: Object.entries(whitelist).map(([key, locPath]) => ({
            id: key,
            value: game.i18n.localize(typeof locPath === "string" ? locPath : locPath.label),
        })),
    });
}

/**
 * Standard properties expected by Tagify, where the `id` and `value` is what Foundry and the system would respectively
 * call the `value` and `label`
 */
type TagRecord = Record<"id" | "value", string>;

interface TagifyOptions {
    /** The maximum number of tags that may be added to the input */
    maxTags: number;
    /** A whitelist record, typically pulled from `CONFIG.PF2E` */
    whitelist: Record<string, string | { label: string }>;
}

export { tagify, traitSlugToObject };
