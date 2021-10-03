import { ActorPF2e, CharacterPF2e, CreaturePF2e } from "@actor";
import { ConsumablePF2e, ItemPF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { isItemSystemData } from "@item/data/helpers";
import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";

interface ActorSheetOptionsExtended extends ActorSheetOptions {
    itemIdentificationAttributes?: string[];
}

/**
 * Implementation used to populate item summaries, toggle visibility
 * of item summaries, and save expanded/collapsed state of item summaries.
 */
export class ItemSummaryRendererPF2e<AType extends ActorPF2e> {
    constructor(protected sheet: ActorSheet<AType, ItemPF2e>) {}

    activateListeners($html: JQuery) {
        $html.find(".item .item-name h4, .item .melee-name h4").on("click", (event) => {
            const $li = $(event.currentTarget).closest("li");
            this.toggleItemSummary($li);
        });
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary()
     */
    toggleItemSummary($li: JQuery, options: { instant?: boolean } = {}) {
        const itemId = $li.attr("data-item-id");
        const itemType = $li.attr("data-item-type");

        if (itemType === "spellSlot") return;

        const actor = this.sheet.actor;
        const item = actor.items.get(itemId ?? "");
        if (!item || ["condition", "spellcastingEntry"].includes(item.type)) return;

        // Toggle summary
        if ($li.hasClass("expanded")) {
            const $summary = $li.children(".item-summary");
            if (options.instant) {
                $summary.remove();
            } else {
                $summary.slideUp(200, () => $summary.remove());
            }
        } else {
            const $summary = $('<div class="item-summary">');
            const chatData = item.getChatData({ secrets: actor.isOwner }, $li.data());
            this.renderItemSummary($summary, item, chatData);
            $li.append($summary);
            if (options.instant) {
                InlineRollsLinks.listen($summary);
            } else {
                $summary.hide().slideDown(200, () => {
                    InlineRollsLinks.listen($summary);
                });
            }
        }

        $li.toggleClass("expanded");
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     * @todo Move this to templates
     */
    renderItemSummary($div: JQuery, item: Embedded<ItemPF2e>, chatData: Record<string, unknown>) {
        const localize = game.i18n.localize.bind(game.i18n);

        const props = $('<div class="item-properties tags"></div>');
        if (item instanceof PhysicalItemPF2e) {
            const mystifiedClass = item.isIdentified ? "" : " mystified";
            const rarityLabel = CONFIG.PF2E.rarityTraits[item.rarity];
            props.append(`<span class="tag tag_secondary${mystifiedClass}">${localize(rarityLabel)}</span>`);
        }

        if (Array.isArray(chatData.properties)) {
            const mystifiedClass = item instanceof PhysicalItemPF2e && !item.isIdentified ? " mystified" : "";
            chatData.properties
                .filter((property): property is string => typeof property === "string")
                .forEach((property) => {
                    props.append(`<span class="tag tag_secondary${mystifiedClass}">${localize(property)}</span>`);
                });
        }

        // append traits (only style the tags if they contain description data)
        const traits = chatData["traits"];
        if (Array.isArray(traits)) {
            for (const trait of traits) {
                if (trait.excluded) continue;
                const label: string = game.i18n.localize(trait.label);
                const mystifiedClass = trait.mystified ? "mystified" : [];
                if (trait.description) {
                    const classes = ["tag", mystifiedClass].flat().join(" ");
                    const description = game.i18n.localize(trait.description);
                    const $trait = $(`<span class="${classes}" title="${description}">${label}</span>`).tooltipster({
                        animation: "fade",
                        maxWidth: 400,
                        theme: "crb-hover",
                        contentAsHTML: true,
                    });
                    props.append($trait);
                } else {
                    const classes: string = ["tag", "tag_alt", mystifiedClass].flat().join(" ");
                    props.append(`<span class="${classes}">${label}</span>`);
                }
            }
        }

        if (item instanceof PhysicalItemPF2e && item.data.data.stackGroup.value !== "coins") {
            const priceLabel = game.i18n.format("PF2E.Item.Physical.PriceLabel", { price: item.price });
            $div.append($(`<p>${priceLabel}</p>`));
        }

        $div.append(props);

        const description = isItemSystemData(chatData)
            ? chatData.description.value
            : TextEditor.enrichHTML(item.description);
        $div.append(`<div class="item-description">${description}</div></div>`);
    }

    async saveAndRestoreState(callback: () => Promise<JQuery<HTMLElement>>): Promise<JQuery<HTMLElement>> {
        // Identify which item and action summaries are expanded currently
        const expandedItemElements = this.sheet.element.find(".item.expanded[data-item-id]");
        const expandedActionElements = this.sheet.element.find(".item.expanded[data-action-index]");
        const openActionIdxs = new Set(expandedActionElements.map((_i, el) => el.dataset.actionIndex));

        // Create a list of records that act as identification keys for expanded entries
        const sheetOptions: ActorSheetOptionsExtended = (this.sheet.constructor as typeof ActorSheet).defaultOptions;
        const properties = ["data-item-id", ...(sheetOptions.itemIdentificationAttributes || [])];
        const openItems: Record<string, string>[] = expandedItemElements
            .map((_i, el) => {
                const $el = $(el);
                const pairs = properties.map((prop) => [prop, $el.attr(prop)]);
                return Object.fromEntries(pairs.filter((pair) => typeof pair[1] !== "undefined"));
            })
            .get();

        const result = await callback.apply(null);

        // Re-open hidden item summaries
        for (const itemProps of openItems) {
            const searchProps = [".item"];
            for (const [key, value] of Object.entries(itemProps)) {
                searchProps.push(`[${key}=${value}]`);
            }

            this.toggleItemSummary(result.find(searchProps.join("")), { instant: true });
        }

        for (const elementIdx of openActionIdxs) {
            result.find(`.item[data-action-index=${elementIdx}]`).toggleClass("expanded");
        }

        return result;
    }
}

export class CreatureSheetItemRenderer<AType extends CreaturePF2e> extends ItemSummaryRendererPF2e<AType> {
    override renderItemSummary($div: JQuery, item: Embedded<ItemPF2e>, chatData: Record<string, unknown>) {
        super.renderItemSummary($div, item, chatData);
        const actor = item.actor;
        const buttons = $('<div class="item-buttons"></div>');
        switch (item.data.type) {
            case "spell":
                if (chatData.isSave && chatData.save && typeof chatData.save === "object") {
                    const save = chatData.save as Record<string, unknown>;
                    buttons.append(
                        `<span>${game.i18n.localize("PF2E.SaveDCLabel")} ${save.dc} ${save.basic} ${save.str}</span>`
                    );
                }

                if (actor instanceof CharacterPF2e) {
                    if (chatData.isAttack) {
                        buttons.append(
                            `<span><button class="spell_attack" data-action="spellAttack">${game.i18n.localize(
                                "PF2E.AttackLabel"
                            )}</button></span>`
                        );
                    }
                    if (chatData.hasDamage) {
                        buttons.append(
                            `<span><button class="spell_damage" data-action="spellDamage">${chatData.damageLabel}: ${chatData.formula}</button></span>`
                        );
                    }
                }

                break;
            case "consumable":
                if (item instanceof ConsumablePF2e && item.charges.max > 0 && item.isIdentified)
                    buttons.append(
                        `<span><button class="consume" data-action="consume">${game.i18n.localize(
                            "PF2E.ConsumableUseLabel"
                        )} ${item.name}</button></span>`
                    );
                break;
            default:
        }

        $div.append(buttons);

        buttons.find("button").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const spell = item instanceof SpellPF2e ? item : item instanceof ConsumablePF2e ? item.embeddedSpell : null;

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case "spellAttack":
                    spell?.rollAttack(event);
                    break;
                case "spellDamage":
                    spell?.rollDamage(event);
                    break;
                case "consume":
                    if (item instanceof ConsumablePF2e) item.consume();
                    break;
            }
        });
    }
}
