import type { ActorPF2e } from "@actor";
import { MeasuredTemplateType } from "@common/constants.mjs";
import { MeasuredTemplatePF2e } from "@module/canvas/measured-template.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { DamageType } from "@system/damage/types.ts";
import { createHTMLElement, ErrorPF2e, objectHasKey, setHasElement, tupleHasValue } from "@util";
import type { Converter } from "showdown";
import { processSanctification } from "./ability/helpers.ts";
import type { ItemSourcePF2e } from "./base/data/index.ts";
import type { ItemTraits, ItemTraitsNoRarity } from "./base/data/system.ts";
import type { ItemPF2e } from "./base/document.ts";
import { ItemTrait } from "./base/types.ts";
import type { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import type { EffectAreaShape, ItemInstances, ItemType } from "./types.ts";
import { EFFECT_AREA_SHAPES } from "./values.ts";

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

const VERSATILE_DAMAGE_TYPES: Record<string, DamageType | undefined> = {
    b: "bludgeoning",
    p: "piercing",
    s: "slashing",
};

/**
 * Add a trait to an array of traits--unless it matches an existing trait except by annotation. Replace the trait if
 * the new trait is an upgrade, or otherwise do nothing. Note: the array is mutated as part of this process.
 */
function addOrUpgradeTrait<TTrait extends ItemTrait>(
    traits: ItemTraits<TTrait> | ItemTraitsNoRarity<TTrait> | TTrait[],
    newTrait: TTrait,
    { mode = "upgrade" }: { mode?: "upgrade" | "override" } = {},
): void {
    // Get traits and annotations object to potentially upgrade
    const isArray = Array.isArray(traits);
    const value = isArray ? traits : traits.value;
    const config = isArray ? null : (traits.config ??= {});

    // Any special non-numerical annotated trait like area or versatile. These need special handling.
    const specialTraitRegex = /^(area|versatile)-(.*)$/;
    const [_, specialTraitBase, specialTraitValue] = newTrait.match(specialTraitRegex) ?? [null, null, null];
    if (specialTraitBase === "versatile" && config) {
        config.versatile ??= [];
        const damageType = VERSATILE_DAMAGE_TYPES[specialTraitValue ?? ""] ?? specialTraitValue;
        if (objectHasKey(CONFIG.PF2E.damageTypes, damageType) && !config.versatile.includes(damageType)) {
            config.versatile.push(damageType);
            value.push(newTrait);
        }
        return;
    } else if (specialTraitBase === "area") {
        const areaMatch = specialTraitValue?.match(/^([\w]+)(?:-(\d+))?/) ?? [];
        const type = areaMatch.at(1);
        const range = areaMatch.at(2) ? Number(areaMatch.at(2)) : null;
        if (!tupleHasValue(EFFECT_AREA_SHAPES, type)) {
            console.error(`Unexpected area shape ${type}`);
            return;
        }

        const performUpdate =
            mode === "override" ||
            !config?.area ||
            config.area.type !== type ||
            (range && config.area.value && range > config.area.value);
        if (performUpdate) {
            if (config) config.area = { type, value: range };
            const existing = value.find((t) => t.startsWith("area-"));
            if (existing) {
                value.splice(value.indexOf(existing), 1, newTrait);
            } else {
                value.push(newTrait);
            }
        }
        return;
    }

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
    const configValue = ["deadly", "fatal"].includes(traitBase) ? upgradeAnnotation : Number(upgradeAnnotation);
    if (!(existingTrait && existingAnnotation)) {
        if (!value.includes(newTrait)) value.push(newTrait);
        if (config) config[traitBase] = configValue;
    } else if (mode === "override" || _expectedValueOf(upgradeAnnotation) > _expectedValueOf(existingAnnotation)) {
        value.splice(value.indexOf(existingTrait), 1, newTrait);
        if (config) config[traitBase] = configValue;
    }
}

/**
 * Removes the trait from the traits object, and also updates the annotation if relevant
 * @param traits the traits object to update
 * @param trait the trait being removed
 */
function removeTrait<TTrait extends ItemTrait>(
    traits: Pick<ItemTraits<TTrait>, "value" | "config">,
    trait: string,
): void {
    const config = traits.config;
    const idx = traits.value.findIndex((t) => t === trait);
    if (idx < 0) return;

    traits.value.splice(idx, 1);
    const annotatedTraitMatch = trait.match(/^([a-z][-a-z]+)-(\d*d?\d+)$/) ?? trait.match(/^(area|versatile)-(.*)$/);
    if (annotatedTraitMatch && config) {
        const traitBase = annotatedTraitMatch[1];
        if (traitBase === "versatile" && config.versatile) {
            const value = annotatedTraitMatch[2];
            const damageType = VERSATILE_DAMAGE_TYPES[value ?? ""] ?? value;
            config.versatile = config.versatile.filter((d) => d !== damageType);
            if (config.versatile.length === 0) delete config.versatile;
        } else {
            delete config[traitBase];
        }
    }
}

function _expectedValueOf(annotation: string): number {
    const traitValueMatch = annotation.match(/(\d*)d(\d+)/);
    return traitValueMatch
        ? Number(traitValueMatch[1] || 1) * ((Number(traitValueMatch[2]) + 1) / 2)
        : Number(annotation);
}

function createEffectAreaLabel(areaData: { type: EffectAreaShape; value: number }): string {
    const formatString = "PF2E.Item.Spell.Area";
    const shape = game.i18n.localize(`PF2E.Area.Shape.${areaData.type}`);

    // Handle special cases of very large areas
    const largeAreaLabel = {
        1320: "PF2E.Area.Size.Quarter",
        2640: "PF2E.Area.Size.Half",
        5280: "1",
    }[areaData.value];
    if (largeAreaLabel) {
        const size = game.i18n.localize(largeAreaLabel);
        const unit = game.i18n.localize("PF2E.Area.Size.Mile");
        return game.i18n.format(formatString, { shape, size, unit, units: unit });
    }

    const size = Number(areaData.value);
    const unit = game.i18n.localize("PF2E.Foot.Label");
    const units = game.i18n.localize("PF2E.Foot.Plural");
    return game.i18n.format(formatString, { shape, size, unit, units });
}

function placeItemTemplate(
    area: { type: EffectAreaShape; value: number },
    { message, item }: { message?: ChatMessagePF2e; item: ItemPF2e },
): Promise<MeasuredTemplatePF2e> {
    if (!canvas.ready) throw ErrorPF2e("No canvas");

    const templateConversion: Record<EffectAreaShape, MeasuredTemplateType> = {
        burst: "circle",
        cone: "cone",
        cube: "rect",
        cylinder: "circle",
        emanation: "circle",
        line: "ray",
        square: "rect",
    } as const;

    const templateType = templateConversion[area.type];

    const templateData: DeepPartial<foundry.documents.MeasuredTemplateSource> = {
        t: templateType,
        distance: (Number(area.value) / 5) * canvas.dimensions.distance,
        fillColor: game.user.color.toString(),
        flags: {
            pf2e: {
                messageId: message?.id,
                origin: {
                    name: item.name,
                    slug: item.slug,
                    traits: fu.deepClone(item.system.traits.value),
                    ...item.getOriginData(),
                },
                areaShape: area.type,
            },
        },
    };

    switch (templateType) {
        case "ray":
            templateData.width = CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
            break;
        case "cone":
            templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
            break;
        case "rect": {
            const distance = templateData.distance ?? 0;
            templateData.distance = Math.hypot(distance, distance);
            templateData.width = distance;
            templateData.direction = 45;
            break;
        }
    }

    return canvas.templates.createPreview(templateData);
}

export {
    addOrUpgradeTrait,
    createEffectAreaLabel,
    itemIsOfType,
    markdownToHTML,
    performLatePreparation,
    placeItemTemplate,
    reduceItemName,
    removeTrait,
};
