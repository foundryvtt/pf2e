import type { ActorPF2e } from "@actor";
import { createHTMLElement, setHasElement } from "@util";
import type { Converter } from "showdown";
import { processSanctification } from "./ability/helpers.ts";
import type { ItemSourcePF2e, ItemType } from "./base/data/index.ts";
import { ItemTraits, ItemTraitsNoRarity } from "./base/data/system.ts";
import type { ItemPF2e } from "./base/document.ts";
import { ItemTrait } from "./base/types.ts";
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

/**
 * Add a trait to an array of traits--unless it matches an existing trait except by annotation. Replace the trait if
 * the new trait is an upgrade, or otherwise do nothing. Note: the array is mutated as part of this process.
 */
function addOrUpgradeTrait<TTrait extends ItemTrait>(
    traits: ItemTraits<TTrait> | ItemTraitsNoRarity<TTrait> | TTrait[],
    newTrait: TTrait,
): void {
    // Get traits and annotations object to potentially upgrade
    const isArray = Array.isArray(traits);
    const value = isArray ? traits : traits.value;
    const config = isArray ? null : (traits.config ??= {});

    // Check first if its not an annotated trait
    const annotatedTraitMatch = newTrait.match(/^([a-z][-a-z]+)-(\d*d?\d+)$/);
    if (!annotatedTraitMatch) {
        if (!value.includes(newTrait)) value.push(newTrait);
        return;
    }

    // If annotated, log it and potentially upgrade it
    const traitBase = annotatedTraitMatch[1];
    const upgradeAnnotation = annotatedTraitMatch[2];
    const traitPattern = new RegExp(String.raw`${traitBase}-(\d*d?\d*)`);
    const existingTrait = value.find((t) => traitPattern.test(t));
    const existingAnnotation = existingTrait?.match(traitPattern)?.at(1);
    if (!(existingTrait && existingAnnotation)) {
        if (!value.includes(newTrait)) value.push(newTrait);
        if (config) config[traitBase] = Number(upgradeAnnotation);
    } else if (_expectedValueOf(upgradeAnnotation) > _expectedValueOf(existingAnnotation)) {
        value.splice(value.indexOf(existingTrait), 1, newTrait);
        if (config) config[traitBase] = Number(upgradeAnnotation);
    }
}

/**
 * Removes the trait from the traits object, and also updates the annotation if relevant
 * @param traits the traits object to update
 * @param trait the trait being removed, either the full one or an unannotated variant (like "volley")
 */
function removeTrait<TTrait extends ItemTrait>(
    traits: ItemTraits<TTrait> | ItemTraitsNoRarity<TTrait>,
    trait: string,
): void {
    const idx = traits.value.findIndex((t) => t === trait);
    if (idx < 0) return;

    traits.value.splice(idx, 1);
    const annotatedTraitMatch = trait.match(/^([a-z][-a-z]+)-(\d*d?\d+)$/);
    if (annotatedTraitMatch && traits.config) {
        const traitBase = annotatedTraitMatch[1];
        delete traits.config[traitBase];
    }
}

function _expectedValueOf(annotation: string): number {
    const traitValueMatch = annotation.match(/(\d*)d(\d+)/);
    return traitValueMatch
        ? Number(traitValueMatch[1] || 1) * ((Number(traitValueMatch[2]) + 1) / 2)
        : Number(annotation);
}

export { addOrUpgradeTrait, itemIsOfType, markdownToHTML, performLatePreparation, reduceItemName, removeTrait };
