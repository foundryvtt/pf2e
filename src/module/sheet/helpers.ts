import { ActorPF2e } from "@actor";
import type Application from "@client/appv1/api/application-v1.d.mts";
import type { TooltipDirection } from "@client/helpers/interaction/tooltip-manager.d.mts";
import type { RollMode } from "@common/constants.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import { ItemPF2e, ItemProxyPF2e, MeleePF2e, PhysicalItemPF2e } from "@item";
import type { TraitChatData } from "@item/base/data/index.ts";
import { createEffectAreaLabel } from "@item/helpers.ts";
import type { ItemType } from "@item/types.ts";
import type { Rarity } from "@module/data.ts";
import { htmlClosest, htmlQuery, sortLabeledRecord } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";

/** Prepare form options on an item or actor sheet */
function createSheetOptions(
    options: Record<string, string | { label: string }>,
    selections: SheetSelections = [],
    { selected = false } = {},
): SheetOptions {
    const sheetOptions = Object.entries(options).reduce((compiledOptions: SheetOptions, [stringKey, value]) => {
        const selectionList = Array.isArray(selections) ? selections : selections.value;
        const key = typeof selectionList[0] === "number" ? Number(stringKey) : stringKey;
        const isSelected = selectionList.includes(key);
        if (isSelected || !selected) {
            compiledOptions[key] = {
                label: game.i18n.localize(R.isObjectType(value) ? value.label : value),
                value: stringKey,
                selected: isSelected,
            };
        }

        return compiledOptions;
    }, {});

    return sortLabeledRecord(sheetOptions);
}

function createSheetTags(
    options: Record<string, string | { label: string }>,
    selections: SheetSelections,
): SheetOptions {
    return createSheetOptions(options, selections, { selected: true });
}

function createTagifyTraits(traits: Iterable<string>, { sourceTraits, record }: TagifyTraitOptions): TagifyEntry[] {
    const sourceSet = new Set(sourceTraits ?? traits);
    const traitSlugs = new Set(traits);
    const readonlyTraits = traitSlugs.filter((t) => !sourceSet.has(t));
    const hiddenTraits = sourceSet.filter((t) => !traitSlugs.has(t));
    return [...traitSlugs, ...hiddenTraits]
        .map((slug) => {
            const label = game.i18n.localize(record?.[slug] ?? slug);
            const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
            const tooltip = traitDescriptions[slug];
            return {
                id: slug,
                value: label,
                readonly: readonlyTraits.has(slug),
                // Must be undefined for tagify to work
                hidden: !traitSlugs.has(slug) || undefined,
                "data-tooltip": tooltip,
            };
        })
        .sort((t1, t2) => t1.value.localeCompare(t2.value));
}

/**
 * Get a CSS class for an adjusted value
 * @param value A value from prepared/derived data
 * @param base A value from base/source data
 * @param options.better Which value is "better" in the context of the data: default is "higher"
 **/
function getAdjustment(
    value: number,
    base: number,
    { better = "higher" }: { better?: "higher" | "lower" } = {},
): "adjusted-higher" | "adjusted-lower" | null {
    if (value === base) return null;
    const isBetter = better === "higher" ? value > base : value < base;
    return isBetter ? "adjusted-higher" : "adjusted-lower";
}

function getAdjustedValue(value: number, reference: number, options?: { better?: "higher" | "lower" }): AdjustedValue {
    const adjustmentClass = getAdjustment(value, reference, options);
    return {
        value,
        adjustmentClass,
        adjustedHigher: adjustmentClass === "adjusted-higher",
        adjustedLower: adjustmentClass === "adjusted-lower",
    };
}

interface AdjustedValue {
    value: number;
    adjustedHigher: boolean;
    adjustedLower: boolean;
    adjustmentClass: "adjusted-higher" | "adjusted-lower" | null;
}

/** Override to refocus tagify elements in _render() to workaround handlebars full re-render */
async function maintainFocusInRender(sheet: Application, renderLogic: () => Promise<void>): Promise<void> {
    const element = sheet.element.get(0);
    const { activeElement } = document;
    const activeWasHere = element?.contains(activeElement);
    await renderLogic();
    if (!activeElement || !activeWasHere) return;

    // If the active element was a tagify that is part of this sheet, re-render
    if (activeElement instanceof HTMLInputElement && activeElement.dataset.property) {
        const sameInput = htmlQuery(element, `input[data-property="${activeElement.dataset.property}"]`);
        sameInput?.focus();
    } else if (activeElement.classList.contains("tagify__input")) {
        const name = htmlClosest(activeElement, "tags")?.dataset.name;
        if (name) {
            htmlQuery(element, `tags[data-name="${name}"] span[contenteditable]`)?.focus();
        }
    }
}

async function getItemFromDragEvent(event: DragEvent): Promise<ItemPF2e | null> {
    try {
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData = JSON.parse(dataString ?? "");
        return (await ItemPF2e.fromDropData(dropData)) ?? null;
    } catch {
        return null;
    }
}

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = { skipDialog: boolean; rollMode?: RollMode | "roll" };

function isRelevantEvent(event: Maybe<Event>): event is PointerEvent | TouchEvent | KeyboardEvent | WheelEvent {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

/** Set roll mode and dialog skipping from a user's input */
function eventToRollParams(event: Maybe<Event>, rollType: { type: "check" | "damage" }): ParamsFromEvent {
    const key = rollType.type === "check" ? "showCheckDialogs" : "showDamageDialogs";
    const skipDefault = !game.user.settings[key];
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}

/** Set roll mode from a user's input: used for messages that are not actually rolls. */
function eventToRollMode(event: Maybe<Event>): RollMode | "roll" {
    if (!isRelevantEvent(event)) return "roll";
    return isControlDown(event) ? (game.user.isGM ? "gmroll" : "blindroll") : "roll";
}

/** Returns true if the control key is held down, handling mac */
function isControlDown(event: PointerEvent | KeyboardEvent | TouchEvent | WheelEvent): boolean {
    return fh.interaction.KeyboardManager.CONTROL_KEY_STRING === "⌘" ? event.metaKey : event.ctrlKey;
}

/** Given a uuid, loads the item and sends it to chat, potentially recontextualizing it with a given actor */
async function sendItemToChat(itemUuid: ItemUUID, options: { event?: Event; actor?: ActorPF2e }): Promise<void> {
    const itemLoaded = await fromUuid<ItemPF2e>(itemUuid);
    if (!itemLoaded) return;

    const item =
        options.actor && itemLoaded.actor?.uuid !== options.actor.uuid
            ? new ItemProxyPF2e(itemLoaded.toObject(), { parent: options.actor })
            : itemLoaded;
    item.toMessage(options.event);
}

function getBasePhysicalItemViewData(item: PhysicalItemPF2e): BasePhysicalItemViewData {
    return {
        ...R.pick(item, ["id", "uuid", "img", "name"]),
        type: item.type as ItemType,
        level: item.level,
        rarity: item.rarity,
        traits: item.traitChatData(),
    };
}

/** Creates a listener that can be used to create tooltips with dynamic content */
function createTooltipListener(
    element: HTMLElement,
    options: {
        /** Controls if the top edge of this tooltip aligns with the top edge of the target */
        align?: "top";
        /** If given, the tooltip will spawn on elements that match this selector */
        selector?: string;
        locked?: boolean;
        direction?: TooltipDirection;
        cssClass?: string;
        render: (element: HTMLElement) => Promise<HTMLElement | null>;
    },
): void {
    const tooltipOptions = R.pick(options, ["cssClass", "direction", "locked"]);

    element.addEventListener(
        "pointerenter",
        async (event) => {
            const target = options.selector ? htmlClosest(event.target, options.selector) : element;
            if (!target) return;
            const html = await options.render(target);
            if (!html) return;

            if (options.locked) {
                game.tooltip.dismissLockedTooltips();
            }
            game.tooltip.activate(target, { html, ...tooltipOptions });

            // A very crude implementation only designed for align top. Make it more flexible if we need to later
            if (options.align === "top") {
                const pad = fh.interaction.TooltipManager.TOOLTIP_MARGIN_PX;
                const actualTooltip = options.locked ? html.closest("aside") : game.tooltip.tooltip;
                if (actualTooltip) {
                    const bounds = target.getBoundingClientRect();
                    const maxH = window.innerHeight - actualTooltip.offsetHeight;
                    actualTooltip.style.top = `${Math.clamp(bounds.top, pad, maxH - pad)}px`;
                }
            }
        },
        true,
    );
}

function createNPCAttackTraitsAndTags(item: MeleePF2e): NPCAttackTraitOrTag[] {
    const tags: NPCAttackTraitOrTag[] = item.system.traits.value.map((t) =>
        traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits),
    );

    // Area/Auto fire adds a tag to the traits list
    if (item.system.action !== "strike" && item.system.area) {
        tags.push({ label: createEffectAreaLabel(item.system.area) });
    }

    // Include range data with traits.
    const range = item.range;
    if (range && !item.system.traits.config?.thrown) {
        const description = game.i18n.localize("PF2E.TraitDescriptionRange");
        if (range.increment) {
            tags.push({
                label: game.i18n.format("PF2E.Item.NPCAttack.Tags.RangeIncrementN", {
                    n: range.increment,
                }),
                description,
            });
        } else if (range.max) {
            const label = game.i18n.format("PF2E.Item.NPCAttack.Tags.RangeN", { n: range.max });
            tags.push({ label, description });
        }
    }

    return tags.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
}

interface SheetOption {
    value: string;
    label: string;
    selected: boolean;
}

type SheetOptions = Record<string, SheetOption>;

type SheetSelections = { value: (string | number)[] } | (string[] & { custom?: never });

interface TagifyTraitOptions {
    sourceTraits?: Iterable<string>;
    record?: Record<string, string>;
}

interface TagifyEntry {
    id: string;
    value: string;
    /** If true, the tag will exist in tagify but unremovable. */
    readonly: boolean;
    /**
     * If true, it will be hidden from tagify itself but exist in submit data.
     * Tagify treats any value as true, even false or null.
     */
    hidden?: true;
    "data-tooltip"?: string;
}

/**
 * An NPC trait or tag to show next to a strike (or area/auto fire in SF2e).
 * Sometimes Paizo will include a non-trait in the traits list.
 * "As Melee, but also lists range or range increment *with* traits" - Monster Core Pg 5
 */
interface NPCAttackTraitOrTag {
    name?: string;
    label: string;
    description?: string | null;
}

interface BasePhysicalItemViewData {
    id: string;
    uuid: ItemUUID;
    type: ItemType;
    img: string;
    name: string;
    traits: TraitChatData[];
    level: number | null;
    rarity: Rarity | null;
}

export {
    createNPCAttackTraitsAndTags,
    createSheetOptions,
    createSheetTags,
    createTagifyTraits,
    createTooltipListener,
    eventToRollMode,
    eventToRollParams,
    getAdjustedValue,
    getAdjustment,
    getBasePhysicalItemViewData,
    getItemFromDragEvent,
    isControlDown,
    maintainFocusInRender,
    sendItemToChat,
};
export type { AdjustedValue, BasePhysicalItemViewData, NPCAttackTraitOrTag, SheetOption, SheetOptions, TagifyEntry };
