import { ActorPF2e, CharacterPF2e, CreaturePF2e } from "@actor";
import { ConsumablePF2e, ItemPF2e, SpellPF2e } from "@item";
import { ItemSummaryData } from "@item/data";
import { isItemSystemData } from "@item/data/helpers";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { UserVisibility, UserVisibilityPF2e } from "@scripts/ui/user-visibility";

/**
 * Implementation used to populate item summaries, toggle visibility
 * of item summaries, and save expanded/collapsed state of item summaries.
 */
export class ItemSummaryRenderer<TActor extends ActorPF2e> {
    constructor(protected sheet: Application & { get actor(): TActor }) {}

    activateListeners($html: JQuery) {
        $html.find(".item .item-name h4, .item .melee-name h4, .item .action-name h4").on("click", async (event) => {
            const $element = $(event.currentTarget).closest("[data-item-id], .expandable");
            await this.toggleSummary($element);
        });
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary().
     * Returns true if it the item is valid and it was toggled.
     */
    async toggleSummary($element: JQuery, options: { instant?: boolean } = {}) {
        const actor = this.sheet.actor;

        const itemId = $element.attr("data-item-id");
        const itemType = $element.attr("data-item-type");
        if (itemType === "spellSlot") return;
        const item = itemType === "formula" ? await fromUuid(itemId ?? "") : actor.items.get(itemId ?? "");

        // If there is no item id (such as PC strikes) or it is a condition, this is just a visibility toggle
        // We need a better way to detect pre-rendered item-summaries
        const isCondition = item instanceof ItemPF2e && item?.isOfType("condition");
        if ((!itemId || isCondition) && $element.hasClass("expandable")) {
            const $summary = $element.find(".item-summary");
            if ($summary.css("display") === "none") {
                $summary.slideDown();
            } else {
                $summary.slideUp();
            }

            return;
        }

        if (!(item instanceof ItemPF2e) || ["condition", "spellcastingEntry"].includes(item.type)) return;

        // Toggle summary
        if ($element.hasClass("expanded")) {
            const $summary = $element.children(".item-summary");
            if (options.instant) {
                $summary.hide().empty();
            } else {
                $summary.slideUp(200, () => $summary.hide().empty());
            }
        } else {
            const $summary = (() => {
                const $existing = $element.children(".item-summary");
                if ($existing.length) return $existing;

                const $summary = $('<div class="item-summary">');
                return $summary.insertAfter($element.children(".item-name, .item-controls, .action-header").last());
            })();

            const chatData = await item.getChatData({ secrets: actor.isOwner }, $element.data());
            this.renderItemSummary($summary, item, chatData);
            if (options.instant) {
                InlineRollLinks.listen($summary, actor);
            } else {
                $summary.hide().slideDown(200, () => {
                    InlineRollLinks.listen($summary, actor);
                });
            }
        }

        $element.toggleClass("expanded");
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     * @todo Move this to templates
     */
    async renderItemSummary($div: JQuery, item: ItemPF2e, chatData: ItemSummaryData): Promise<void> {
        const itemIsPhysical = item.isOfType("physical");

        // Wrap a span element in another with GM visibility set
        const gmVisibilityWrap = (span: HTMLSpanElement, visibility: UserVisibility): HTMLSpanElement => {
            const wrapper = document.createElement("span");
            wrapper.dataset.visibility = visibility;
            wrapper.append(span);
            return wrapper;
        };

        const rarityTag = itemIsPhysical
            ? ((): HTMLElement => {
                  const span = document.createElement("span");
                  span.classList.add("tag", item.rarity);
                  span.innerText = game.i18n.localize(CONFIG.PF2E.rarityTraits[item.rarity]);

                  // Set GM user visibility of rarity if unidentified
                  return gmVisibilityWrap(span, item.isIdentified ? "all" : "gm");
              })()
            : null;

        const levelPriceLabel =
            itemIsPhysical && item.system.stackGroup !== "coins"
                ? ((): HTMLElement => {
                      const price = item.price.value.toString();
                      const priceLabel = game.i18n.format("PF2E.Item.Physical.PriceLabel", { price });
                      const levelLabel = game.i18n.format("PF2E.LevelN", { level: item.level });

                      const paragraph = document.createElement("p");
                      paragraph.dataset.visibility = item.isIdentified ? "all" : "gm";
                      paragraph.append(levelLabel, document.createElement("br"), priceLabel);
                      return paragraph;
                  })()
                : $();

        const properties =
            chatData.properties
                ?.filter((property): property is string => typeof property === "string")
                .map((property): HTMLElement => {
                    const span = document.createElement("span");
                    span.classList.add("tag", "tag_secondary");
                    span.innerText = game.i18n.localize(property);
                    return itemIsPhysical ? gmVisibilityWrap(span, item.isIdentified ? "all" : "gm") : span;
                }) ?? [];

        // append traits (only style the tags if they contain description data)
        const traitTags = Array.isArray(chatData.traits)
            ? chatData.traits
                  .filter((trait) => !trait.excluded)
                  .map((trait): HTMLElement => {
                      const span = document.createElement("span");
                      span.classList.add("tag");
                      span.innerText = game.i18n.localize(trait.label);
                      if (trait.description) {
                          span.title = game.i18n.localize(trait.description);
                          $(span).tooltipster({ maxWidth: 400, theme: "crb-hover", contentAsHTML: true });
                      }

                      return itemIsPhysical
                          ? gmVisibilityWrap(span, item.isIdentified || !trait.mystified ? "all" : "gm")
                          : span;
                  })
            : [];

        const allTags = [rarityTag, ...traitTags, ...properties].filter((tag): tag is HTMLElement => !!tag);
        const propertiesElem = document.createElement("div");
        propertiesElem.classList.add("tags", "item-properties");
        propertiesElem.append(...allTags);

        const description = isItemSystemData(chatData)
            ? chatData.description.value
            : await TextEditor.enrichHTML(item.description, { rollData: item.getRollData(), async: true });

        $div.append(propertiesElem, levelPriceLabel, `<div class="item-description">${description}</div>`);
        UserVisibilityPF2e.process($div);
    }

    /**
     * Executes a callback, performing a save and restore for all item summaries to maintain visual state.
     * Most restorations are driven by a data-item-id attribute, however data-item-summary-id with a custom string
     * can be used to avoid conflicts in areas such as spell preparation.
     */
    async saveAndRestoreState(callback: () => Promise<JQuery<HTMLElement>>): Promise<JQuery<HTMLElement>> {
        // Identify which item and action summaries are expanded currently
        const $element = this.sheet.element;
        const expandedSummaryElements = $element.find(".item.expanded[data-item-summary-id]");
        const expandedItemElements = $element.find(".item.expanded[data-item-id]:not([data-item-summary-id])");
        const expandedActionElements = $element.find(".item.expanded[data-action-index]");
        const openActionIdxs = new Set(expandedActionElements.map((_i, el) => el.dataset.actionIndex));

        // Create a list of records that act as identification keys for expanded entries
        const openItemsIds = expandedItemElements.map((_, el) => $(el).attr("data-item-id")).get();
        const openSummaryIds = expandedSummaryElements.map((_, el) => $(el).attr("data-item-summary-id")).get();

        const result = await callback.apply(null);

        // Re-open hidden item summaries
        for (const itemId of openItemsIds) {
            const $item = result.find(`.item[data-item-id="${itemId}"]:not([data-item-summary-id])`);
            this.toggleSummary($item, { instant: true });
        }

        for (const summaryId of openSummaryIds) {
            this.toggleSummary(result.find(`.item[data-item-summary-id="${summaryId}"]`), { instant: true });
        }

        // Reopen hidden actions
        for (const elementIdx of openActionIdxs) {
            result.find(`.item[data-action-index=${elementIdx}]`).toggleClass("expanded");
        }

        return result;
    }
}

export class CreatureSheetItemRenderer<AType extends CreaturePF2e> extends ItemSummaryRenderer<AType> {
    override async renderItemSummary(
        $div: JQuery,
        item: Embedded<ItemPF2e>,
        chatData: Record<string, unknown>
    ): Promise<void> {
        await super.renderItemSummary($div, item, chatData);
        const actor = item.actor;
        const buttons = $('<div class="item-buttons"></div>');
        switch (item.type) {
            case "spell":
                if (chatData.isSave) {
                    const save = chatData.save as Record<string, unknown>;
                    buttons.append(`<span>${save.label}</span>`);
                }

                if (actor instanceof CharacterPF2e) {
                    if (Array.isArray(chatData.variants) && chatData.variants.length) {
                        const label = game.i18n.localize("PF2E.Item.Spell.Variants.SelectVariantLabel");
                        buttons.append(
                            `<span><button class="spell_attack" data-action="selectVariant">${label}</button></span>`
                        );
                        break;
                    }
                    if (chatData.isAttack) {
                        const label = game.i18n.localize("PF2E.AttackLabel");
                        buttons.append(
                            `<span><button class="spell_attack" data-action="spellAttack">${label}</button></span>`
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
                if (item instanceof ConsumablePF2e && item.uses.max > 0 && item.isIdentified) {
                    const label = game.i18n.localize("PF2E.ConsumableUseLabel");
                    buttons.append(
                        `<span><button class="consume" data-action="consume">${label} ${item.name}</button></span>`
                    );
                }
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
                case "selectVariant":
                    spell?.toMessage();
                    break;
            }
        });
    }
}
