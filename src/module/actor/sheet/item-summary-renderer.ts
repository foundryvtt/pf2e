import type { ActorPF2e } from "@actor/base.ts";
import type Application from "@client/appv1/api/application-v1.d.mts";
import type { ClientDocument } from "@client/documents/abstract/client-document.d.mts";
import { AbstractEffectPF2e, ItemPF2e } from "@item";
import type { RawItemChatData } from "@item/base/data/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, htmlSelectorFor } from "@util";

/**
 * Implementation used to populate item summaries, toggle visibility
 * of item summaries, and save expanded/collapsed state of item summaries.
 */
export class ItemSummaryRenderer<TActor extends ActorPF2e, TSheet extends Application & { get actor(): TActor }> {
    protected sheet: TSheet;

    constructor(sheet: TSheet) {
        this.sheet = sheet;
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary().
     * Returns true if it the item is valid and it was toggled.
     */
    async toggleSummary(element: HTMLElement, options: { visible?: boolean; instant?: boolean } = {}): Promise<void> {
        if (element.dataset.itemType === "spellSlot") return;

        const duration = 0.4;
        const item = await this.getItemFromElement(element);

        const summaryElem = await (async () => {
            const container = htmlQuery(element, ".item-summary");
            if (container?.hasChildNodes()) return container;
            if (!container || !(item instanceof ItemPF2e)) return null;
            const chatData = await item.getChatData({ secrets: item.isOwner }, { ...element.dataset });
            await this.renderItemSummary(container, item, chatData);
            return container;
        })();
        if (!summaryElem) return;

        // Determine if we need to hide or show the summary. options overrides all checks
        const showSummary = options.visible ?? summaryElem.hidden;
        if (options.instant) {
            summaryElem.hidden = !showSummary;
        } else if (showSummary) {
            // Only animate if not already showing
            if (summaryElem.hidden) {
                await gsap.fromTo(
                    summaryElem,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration },
                );
            }
        } else {
            await gsap.to(summaryElem, {
                height: 0,
                duration,
                opacity: 0,
                paddingTop: 0,
                paddingBottom: 0,
                margin: 0,
                clearProps: "all",
                onComplete: () => {
                    summaryElem.hidden = true;
                },
            });
        }
    }

    /** Retrieves the item from the element that the current toggleable summary is for */
    protected async getItemFromElement(element: HTMLElement): Promise<ClientDocument | null> {
        const actor = this.sheet.actor;
        const { subitemId, itemId, itemUuid, itemType, actionIndex } = element.dataset;
        const isFormula = !!itemUuid && "isFormula" in element.dataset;
        const realItemId = subitemId ? htmlClosest(element, "[data-item-id]")?.dataset.itemId : itemId;
        const subitem = subitemId
            ? actor.inventory.get(realItemId, { strict: true }).subitems.get(subitemId, { strict: true })
            : null;
        if (subitem) return subitem;
        if (isFormula) return fromUuid(itemUuid);
        if (itemType === "spell") {
            const collectionId = htmlClosest(element, "[data-entry-id]")?.dataset.entryId;
            const collections = actor.spellcasting?.collections;
            return collections?.get(collectionId, { strict: true }).get(itemId, { strict: true }) ?? null;
        }

        return itemType === "condition"
            ? actor.conditions.get(itemId, { strict: true })
            : actionIndex
              ? (actor.system.actions?.[Number(actionIndex)].item ?? null)
              : (actor.items.get(realItemId ?? "") ?? null);
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     */
    async renderItemSummary(
        container: HTMLElement,
        item: ItemPF2e<ActorPF2e>,
        chatData: RawItemChatData,
    ): Promise<void> {
        const isEffect = item instanceof AbstractEffectPF2e;
        const selfEffectLink = (() => {
            if (!item.isOfType("action", "feat") || !item.system.selfEffect) return null;
            const uuid = item.system.selfEffect.uuid;
            const effectItem = fromUuidSync(uuid);
            const name = effectItem?.name ?? item.system.selfEffect.name;
            return `@UUID[${uuid}]{${name}}`;
        })();

        const price = item.isOfType("physical", "kit") ? item.system.price : null;
        const summary = await fa.handlebars.renderTemplate("systems/pf2e/templates/actors/partials/item-summary.hbs", {
            item,
            description: chatData.description,
            identified: game.user.isGM || !(item.isOfType("physical") || isEffect) || item.isIdentified,
            isCreature: item.actor?.isOfType("creature"),
            chatData,
            selfEffect: selfEffectLink && (await TextEditorPF2e.enrichHTML(selfEffectLink)),
            price: !price ? null : price.per > 1 ? `${price.value.toString()} / ${price.per}` : price.value.toString(),
        });

        container.innerHTML = summary;

        if (item.isOfType("spell") && item.actor.isOfType("creature")) {
            for (const button of htmlQueryAll(container, "button")) {
                button.addEventListener("click", (event): Promise<unknown> | void => {
                    event.stopPropagation();
                    switch (button.dataset.action) {
                        case "spellAttack":
                            return item.rollAttack(event);
                        case "spellDamage":
                            return item.rollDamage(event);
                        case "spellTemplate":
                            return item.placeTemplate();
                    }
                });
            }
        }
    }

    /**
     * Executes a callback, performing a save and restore for all item summaries to maintain visual state.
     * Most restorations are driven by a data-item-id attribute, however data-item-summary-id with a custom string
     * can be used to avoid conflicts in areas such as spell preparation.
     */
    async saveAndRestoreState(callback: () => Promise<JQuery>): Promise<JQuery> {
        // Identify which item and action summaries are expanded currently
        const html: HTMLElement | null = this.sheet.element[0] ?? null;
        const summaries = htmlQueryAll(html, ".item-summary:not([hidden])");
        const selectors = ["subitem-id", "item-id", "action-index"].map((s) => `[data-${s}]`).join(",");
        const elements = summaries.flatMap((s) => htmlClosest(s, selectors) ?? htmlClosest(s, "li") ?? []);
        const $result = await callback.apply(null);
        const result = $result[0];

        // Re-open hidden item summaries
        if (elements.length > 0) {
            const selector = elements.map((s) => htmlSelectorFor(s)).join(",");
            const promises = htmlQueryAll(result, selector).map((container) =>
                this.toggleSummary(container, { instant: true, visible: true }),
            );
            await Promise.all(promises);
        }

        return $result;
    }
}
