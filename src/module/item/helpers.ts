import type { ActorPF2e } from "@actor";
import { createHTMLElement, objectHasKey, setHasElement, sluggify } from "@util";
import type { Converter } from "showdown";
import { processSanctification } from "./ability/helpers.ts";
import type { ItemSourcePF2e, ItemType } from "./base/data/index.ts";
import type {
    ItemTrait,
    ItemTraits,
    ItemTraitsNoRarity,
    OtherTagsOnly,
    RarityTraitAndOtherTags,
    ValuedTraits,
} from "./base/data/system.ts";
import type { ItemPF2e } from "./base/document.ts";
import type { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import type { ItemInstances } from "./types.ts";

type ItemOrSource = PreCreate<ItemSourcePF2e> | ItemPF2e;

/** Determine in a type-safe way whether an `ItemPF2e` or `ItemSourcePF2e` is among certain types */
function itemIsOfType<TParent extends ActorPF2e | null, TType extends ItemType>(
    item: ItemOrSource,
    ...types: TType[]
): item is ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"];
function itemIsOfType<TParent extends ActorPF2e | null, TType extends "physical" | ItemType>(
    item: ItemOrSource,
    ...types: TType[]
): item is TType extends "physical"
    ? PhysicalItemPF2e<TParent> | PhysicalItemPF2e<TParent>["_source"]
    : TType extends ItemType
      ? ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"]
      : never;
function itemIsOfType<TParent extends ActorPF2e | null>(
    item: ItemOrSource,
    type: "physical",
): item is PhysicalItemPF2e<TParent> | PhysicalItemPF2e["_source"];
function itemIsOfType(item: ItemOrSource, ...types: string[]): boolean {
    return (
        typeof item.name === "string" &&
        types.some((t) => (t === "physical" ? setHasElement(PHYSICAL_ITEM_TYPES, item.type) : item.type === t))
    );
}

/** Create a "reduced" item name; that is, one without an "Effect:" or similar prefix */
function reduceItemName(label: string): string {
    return label.includes(":") ? label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : label;
}

/**
 * Performs late prep tasks on an item that doesn't exist in the actor, such as a cloned one.
 * If the item isn't embedded, nothing happens.
 */
function performLatePreparation(item: ItemPF2e): void {
    const actor = item.actor;
    if (!actor) return;

    for (const alteration of actor.synthetics.itemAlterations.filter((a) => !a.isLazy)) {
        alteration.applyAlteration({ singleItem: item as ItemPF2e<ActorPF2e> });
    }

    if (item.isOfType("spell", "feat", "action")) {
        processSanctification(item);
    }
}

let mdConverter: Converter | null = null;

function markdownToHTML(markdown: string): string {
    const converter = (mdConverter ??= new showdown.Converter());
    const htmlStripped = createHTMLElement("div", { innerHTML: game.i18n.localize(markdown).trim() }).innerText;
    // Prevent markdown converter from treating Foundry content links as markdown links
    const withSubbedBrackets = htmlStripped.replaceAll("[", "⟦").replaceAll("]", "⟧");
    const stringyHTML = converter
        .makeHtml(withSubbedBrackets)
        .replace(/<\/?p[^>]*>/g, "")
        .replaceAll("⟦", "[")
        .replaceAll("⟧", "]");

    return fa.ux.TextEditor.implementation
        .truncateHTML(createHTMLElement("div", { innerHTML: stringyHTML }))
        .innerHTML.trim();
}

const valueRegex = /^([\w-]+)-(\d{1,3})$/;

function evaluateTraitConfig(traits?: string[]): ValuedTraits {
    if (!traits) return {};

    const data: ValuedTraits = {};
    for (const trait of traits) {
        const match = valueRegex.exec(trait);
        if (match) {
            const key = sluggify(match[1]);
            data[key] = Math.max(data[key] ?? 0, Number(match[2]));
        }
    }
    return data;
}

/**
 * Wraps over item data to extend for the purposes of system data.
 * @todo once all items use data models, replace with data model implementation
 */
function wrapItemTraits<T extends ItemTraits | ItemTraitsNoRarity | RarityTraitAndOtherTags | OtherTagsOnly>(
    item: ItemPF2e,
    traits: T,
): T {
    traits.value &&= traits.value.filter((t) => t in item.constructor.validTraits);

    // Implement cache busting when the traits are being updated
    let config: ValuedTraits | null = null;
    let value = traits.value ? createDirtyCheckArray(traits.value, () => (config = null)) : traits.value;
    const expanded = Object.defineProperties(traits, {
        value: {
            get: function () {
                return value;
            },
            set: function (value: ItemTrait[]) {
                if (traits.value && value !== traits.value) {
                    value = createDirtyCheckArray(traits.value, () => (config = null));
                    config = null;
                }
            },
        },
        config: {
            get: function () {
                return (config ??= evaluateTraitConfig(traits.value));
            },
            set: function (value: ValuedTraits | null) {
                config = value;
            },
        },
    });

    return expanded;
}

/** Internal helper that creates an array that calls a callback whenever any value changes */
function createDirtyCheckArray<T>(arr: T[] & { isProxy?: boolean }, onChange: () => void): T[] & { isProxy: boolean } {
    arr = arr.isProxy ? Array.from(arr) : arr;
    return new Proxy(arr, {
        get(target, key, receiver) {
            if (key === "isProxy") {
                return true;
            }

            return Reflect.get(target, key, receiver);
        },
        deleteProperty: function (target: Record<keyof T[], unknown>, property) {
            if (objectHasKey(target, property)) {
                delete target[property];
                onChange();
                return true;
            }

            return false;
        },
        set: function (target: Record<keyof T[], unknown>, property, value) {
            // Used for setting *any* value, even "length"
            target[property as keyof typeof target] = value;
            if (Number.isNumeric(property)) {
                onChange();
            }
            return true;
        },
    }) as T[] & { isProxy: boolean };
}

export { itemIsOfType, markdownToHTML, performLatePreparation, reduceItemName, wrapItemTraits };
