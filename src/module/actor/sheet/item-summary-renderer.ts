import { ActorPF2e } from "@actor/base.ts";
import { AbstractEffectPF2e, ConsumablePF2e, ItemPF2e, SpellPF2e } from "@item";
import { ItemSummaryData } from "@item/data/index.ts";
import { isItemSystemData } from "@item/data/helpers.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility.ts";
import { htmlClosest, htmlQuery, htmlQueryAll } from "@util";

/**
 * Implementation used to populate item summaries, toggle visibility
 * of item summaries, and save expanded/collapsed state of item summaries.
 */
export class ItemSummaryRenderer<TActor extends ActorPF2e> {
    constructor(protected sheet: Application & { get actor(): TActor }) {}

    activateListeners(html: HTMLElement): void {
        const itemNameElems = htmlQueryAll(html, ".item .item-name h4, .item .melee-name h4, .item .action-name h4");
        for (const itemNameElem of itemNameElems) {
            itemNameElem.addEventListener("click", async () => {
                const element = htmlClosest(itemNameElem, "[data-item-id], .expandable");
                if (element) await this.toggleSummary(element);
            });
        }
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary().
     * Returns true if it the item is valid and it was toggled.
     */
    async toggleSummary(element: HTMLElement, options: { instant?: boolean } = {}): Promise<void> {
        const actor = this.sheet.actor;

        const { itemId, itemType, actionIndex } = element.dataset;
        const isFormula = !!element.dataset.isFormula;
        const duration = 0.4;

        if (itemType === "spellSlot") return;

        const item: ClientDocument | null = isFormula
            ? await fromUuid(itemId ?? "")
            : itemType === "condition"
            ? actor.conditions.get(itemId, { strict: true })
            : actionIndex
            ? actor.system.actions?.[Number(actionIndex)].item ?? null
            : actor.items.get(itemId, { strict: true });

        if (!(item instanceof ItemPF2e)) return;

        const summary = await (async () => {
            const existing = htmlQuery(element, ":scope > .item-summary");
            if (existing) return existing;

            if (!item.isOfType("spellcastingEntry")) {
                const insertLocation = htmlQueryAll(
                    element,
                    ":scope > .item-name, :scope > .item-controls, :scope > .action-header"
                ).at(-1)?.parentNode?.lastChild;
                if (!insertLocation) return null;

                const summary = document.createElement("div");
                summary.classList.add("item-summary");
                summary.hidden = true;
                insertLocation.after(summary);

                const chatData = await item.getChatData({ secrets: actor.isOwner }, element.dataset);
                await this.renderItemSummary(summary, item, chatData);
                InlineRollLinks.listen(summary, actor);
                return summary;
            }

            return null;
        })();

        if (!summary) return;

        const showSummary = !element.classList.contains("expanded") || summary.hidden;

        if (options.instant) {
            summary.hidden = !showSummary;
            element.classList.toggle("expanded", showSummary);
        } else if (showSummary) {
            element.classList.add("expanded");
            await gsap.fromTo(
                summary,
                { height: 0, opacity: 0, hidden: false },
                { height: "auto", opacity: 1, duration }
            );
        } else {
            await gsap.to(summary, {
                height: 0,
                duration,
                opacity: 0,
                paddingTop: 0,
                paddingBottom: 0,
                margin: 0,
                clearProps: "all",
                onComplete: () => {
                    summary.hidden = true;
                    element.classList.remove("expanded");
                },
            });
        }
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     */
    async renderItemSummary(div: HTMLElement, item: ItemPF2e, chatData: ItemSummaryData): Promise<void> {
        const description = isItemSystemData(chatData)
            ? chatData.description.value
            : await TextEditor.enrichHTML(item.description, { rollData: item.getRollData(), async: true });

        const rarity = item.system.traits?.rarity;
        const isEffect = item instanceof AbstractEffectPF2e;

        const summary = await renderTemplate("systems/pf2e/templates/actors/partials/item-summary.hbs", {
            item,
            description,
            identified: game.user.isGM || !(item.isOfType("physical") || isEffect) || item.isIdentified,
            rarityLabel: rarity && item.isOfType("physical") ? CONFIG.PF2E.rarityTraits[rarity] : null,
            isCreature: item.actor?.isOfType("creature"),
            chatData,
        });

        div.innerHTML = summary;
        UserVisibilityPF2e.process(div);

        if (item.actor?.isOfType("creature")) {
            for (const button of htmlQueryAll(div, "button")) {
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const spell = (
                        item.isOfType("spell") ? item : item.isOfType("consumable") ? item.embeddedSpell : null
                    ) as SpellPF2e<ActorPF2e> | null;

                    // Which function gets called depends on the type of button stored in the dataset attribute action
                    switch (button.dataset.action) {
                        case "spellAttack":
                            spell?.rollAttack(event);
                            break;
                        case "spellDamage":
                            spell?.rollDamage(event);
                            break;
                        case "consume":
                            if (item.isOfType("consumable")) {
                                (item as ConsumablePF2e<ActorPF2e>).consume();
                            }
                            break;
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
    async saveAndRestoreState(callback: () => Promise<JQuery<HTMLElement>>): Promise<JQuery<HTMLElement>> {
        // Identify which item and action summaries are expanded currently
        const element = this.sheet.element[0];
        const expandedSummaryElements = htmlQueryAll(element, ".item.expanded[data-item-summary-id]");
        const expandedItemElements = htmlQueryAll(element, ".item.expanded[data-item-id]:not([data-item-summary-id])");
        const expandedActionElements = htmlQueryAll(element, ".item.expanded[data-action-index]");

        // Create a list of records that act as identification keys for expanded entries
        const openActionIdxs = new Set(expandedActionElements.map((el) => el.dataset.actionIndex));
        const openItemsIds = expandedItemElements.map((el) => el.dataset.itemId);
        const openSummaryIds = expandedSummaryElements.map((el) => el.dataset.itemSummaryId);

        const $result = await callback.apply(null);
        const result = $result[0]!;

        // Listen to inline rolls before opening the item summaries (to avoid double listeners)
        InlineRollLinks.listen(result, this.sheet.actor);

        // Re-open hidden item summaries
        for (const itemId of openItemsIds) {
            const item = htmlQuery(result, `.item[data-item-id="${itemId}"]:not([data-item-summary-id])`);
            if (item) await this.toggleSummary(item, { instant: true });
        }

        for (const summaryId of openSummaryIds) {
            const item = htmlQuery(result, `.item[data-item-summary-id="${summaryId}"]`);
            if (item) await this.toggleSummary(item, { instant: true });
        }

        // Reopen hidden actions
        for (const elementIdx of openActionIdxs) {
            $result.find(`.item[data-action-index=${elementIdx}]`).toggleClass("expanded");
        }

        return $result;
    }
}
