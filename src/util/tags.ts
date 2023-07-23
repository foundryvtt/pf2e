import { TraitViewData } from "@actor/data/base.ts";
import Tagify from "@yaireo/tagify";
import { ErrorPF2e, objectHasKey } from "./misc.ts";

type WhitelistData = string[] | Record<string, string | { label: string }>;

function traitSlugToObject(trait: string, dictionary: Record<string, string | undefined>): TraitViewData {
    // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
    // in use, which can include what are normally NPC-only traits
    const traitObject: TraitViewData = {
        name: trait,
        label: game.i18n.localize(dictionary[trait] ?? trait),
    };
    if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
        traitObject.description = CONFIG.PF2E.traitsDescriptions[trait];
    }

    return traitObject;
}

function transformWhitelist(whitelist: WhitelistData) {
    return Array.isArray(whitelist)
        ? whitelist
        : Object.entries(whitelist)
              .map(([key, locPath]) => ({
                  id: key,
                  value: game.i18n.localize(typeof locPath === "string" ? locPath : locPath.label),
              }))
              .sort((a, b) => a.value.localeCompare(b.value, game.i18n.lang));
}

/** Create a tagify select menu out of a JSON input element */
function tagify(input: HTMLInputElement, options?: TagifyOptions): Tagify<TagRecord>;
function tagify(input: HTMLInputElement | null, options?: TagifyOptions): Tagify<TagRecord> | null;
function tagify(
    input: HTMLInputElement | null,
    { whitelist, maxTags, enforceWhitelist = true }: TagifyOptions = {}
): Tagify<TagRecord> | null {
    if (input?.hasAttribute("name") && input.dataset.dtype !== "JSON") {
        throw ErrorPF2e("Usable only on input elements with JSON data-dtype");
    } else if (!input) {
        return null;
    }

    const whitelistTransformed = whitelist ? transformWhitelist(whitelist) : [];
    const maxItems = whitelist ? Object.keys(whitelistTransformed).length : undefined;

    const tagify = new Tagify(input, {
        enforceWhitelist: !!whitelist && enforceWhitelist,
        keepInvalidTags: false,
        skipInvalid: !!whitelist,
        maxTags: maxTags ?? maxItems,
        dropdown: {
            enabled: 0,
            maxItems,
            searchKeys: ["id", "value"],
        },
        whitelist: whitelistTransformed,
    });

    // Add the name to the tags html as an indicator for refreshing
    if (input.name) {
        tagify.DOM.scope.dataset.name = input.name;
    }

    // Work around a tagify bug on Firefox
    // https://github.com/yairEO/tagify/issues/1115
    tagify.DOM.input.blur();

    return tagify;
}

/**
 * Standard properties expected by Tagify, where the `id` and `value` is what Foundry and the system would respectively
 * call the `value` and `label`
 */
type TagRecord = Record<"id" | "value", string>;

interface TagifyOptions {
    /** The maximum number of tags that may be added to the input */
    maxTags?: number;
    /** A whitelist record, typically pulled from `CONFIG.PF2E` */
    whitelist?: WhitelistData;
    /** Whether this whitelist is exhaustive */
    enforceWhitelist?: boolean;
}

export { tagify, traitSlugToObject };
