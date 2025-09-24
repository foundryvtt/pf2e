import { ActorPF2e } from "@actor";
import { craftItem, craftSpellConsumable } from "@actor/character/crafting/helpers.ts";
import { ElementalBlast } from "@actor/character/elemental-blast.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { Rolled } from "@client/dice/roll.d.mts";
import { PhysicalItemPF2e, type ItemPF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { Coins } from "@item/physical/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { effectTraits } from "@scripts/config/traits.ts";
import { onRepairChatCardEvent } from "@system/action-macros/crafting/repair.ts";
import { CheckRoll } from "@system/check/index.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, objectHasKey, sluggify, tupleHasValue } from "@util";
import { ChatMessagePF2e, CheckContextChatFlag } from "../index.ts";

class ChatCards {
    static #lastClick = 0;

    static listen(message: ChatMessagePF2e, html: HTMLElement): void {
        const selector = ["a[data-action], button[data-action], .collapsed[data-action=expand-description]"].join(",");
        for (const button of htmlQueryAll<HTMLButtonElement>(html, selector)) {
            button.addEventListener("click", async (event) => this.#onClickButton({ message, event, html, button }));
        }
    }

    static async #onClickButton({ message, event, html, button }: OnClickButtonParams): Promise<void> {
        const currentTime = Date.now();
        if (currentTime - this.#lastClick < 500) return;
        this.#lastClick = currentTime;

        // Extract card data
        const action = button.dataset.action ?? "";

        // Get the actor and item from the chat message
        const item = message.item;
        const actor = item?.actor ?? message.actor;
        if (!actor) return;

        // Confirm roll permission
        if (!game.user.isGM && !actor.isOwner && !["spell-save", "expand-description"].includes(action)) {
            return;
        }

        // Handle strikes
        const strikeAction = message._strike;
        if (strikeAction && action?.startsWith("strike-")) {
            const context = (
                message.rolls.some((r) => r instanceof CheckRoll) ? (message.flags.pf2e.context ?? null) : null
            ) as CheckContextChatFlag | null;
            const mapIncreases =
                context && "mapIncreases" in context && tupleHasValue([0, 1, 2], context.mapIncreases)
                    ? context.mapIncreases
                    : null;
            const altUsage = context && "altUsage" in context ? context.altUsage : null;
            const target = message.target?.token?.object ?? null;
            const rollArgs = { event, altUsage, mapIncreases, checkContext: context, target };

            switch (sluggify(action ?? "")) {
                case "strike-attack":
                    strikeAction.variants[0].roll(rollArgs);
                    return;
                case "strike-attack2":
                    strikeAction.variants[1].roll(rollArgs);
                    return;
                case "strike-attack3":
                    strikeAction.variants[2].roll(rollArgs);
                    return;
                case "strike-damage": {
                    const method = button.dataset.outcome === "success" ? "damage" : "critical";
                    strikeAction[method]?.(rollArgs);
                    return;
                }
            }
        }

        if (action === "expand-description") {
            const element = htmlClosest(button, ".description, .collapsed");
            if (element && "autoCollapse" in element.dataset) {
                element.classList.remove("collapsed");
                const shadow = element.nextElementSibling;
                if (shadow?.classList.contains("shadow")) {
                    shadow.remove();
                }
                delete button.dataset.tooltip;
                delete button.dataset.action;
                game.tooltip.deactivate();
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (element && item) {
                // temporary support for the old way involving dom replacement
                // todo: remove in a future release
                element.innerHTML = (await item.getDescription()).value;
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        // Handle everything else
        if (item) {
            const spell = item.isOfType("spell") ? item : item.isOfType("consumable") ? item.embeddedSpell : null;

            // Spell actions
            switch (action) {
                case "spell-attack":
                    await spell?.rollAttack(event);
                    return;
                case "spell-attack-2":
                    await spell?.rollAttack(event, 2);
                    return;
                case "spell-attack-3":
                    await spell?.rollAttack(event, 3);
                    return;
                case "spell-damage":
                    spell?.rollDamage(event);
                    return;
                case "spell-save":
                    return this.#rollActorSaves({ event, button, actor, item });
                case "affliction-save":
                    if (item?.isOfType("affliction")) {
                        item.rollRecovery();
                    }
                    return;
                case "spell-counteract":
                    spell?.rollCounteract(event);
                    return;
                case "spell-template":
                    spell?.placeTemplate(message);
                    return;
                case "spell-template-clear": {
                    const templateIds =
                        canvas.scene?.templates.filter((t) => t.message === message).map((t) => t.id) ?? [];
                    button.disabled = true;
                    await canvas.scene?.deleteEmbeddedDocuments("MeasuredTemplate", templateIds);
                    button.disabled = false;
                    return;
                }
                case "spell-variant": {
                    const castRank = Number(htmlQuery(html, "div.chat-card")?.dataset.castRank) || 1;
                    const overlayIds = button.dataset.overlayIds?.split(",").map((id) => id.trim());
                    if (overlayIds) {
                        const variantSpell = spell?.loadVariant({ overlayIds, castRank });
                        if (variantSpell) {
                            const data = { castRank };
                            const variantMessage = await variantSpell.toMessage(null, { data, create: false });
                            if (variantMessage) {
                                const whisper = message._source.whisper;
                                const changes = variantMessage.clone({ whisper }).toObject();
                                await message.update(changes);
                            }
                        }
                    } else if (spell) {
                        const originalSpell = spell.loadBaseVariant();
                        const restoredMessage = await originalSpell.toMessage(null, { create: false });
                        if (restoredMessage) {
                            const whisper = message._source.whisper;
                            const changes = restoredMessage.clone({ whisper }).toObject();
                            await message.update(changes);
                        }
                    }
                    return;
                }
                case "consume": {
                    // Consumable usage
                    if (item.isOfType("consumable")) {
                        item.consume();
                    } else if (item.isOfType("melee")) {
                        // Button is from an NPC attack effect
                        const consumable = actor.items.get(button.dataset.item ?? "");
                        if (consumable?.isOfType("consumable")) {
                            const oldQuant = consumable.quantity;
                            const consumableString = game.i18n.localize("TYPES.Item.consumable");
                            const toReplace = `${consumable.name} - ${consumableString} (${oldQuant})`;
                            await consumable.consume();
                            const currentQuant = oldQuant === 1 ? 0 : consumable.quantity;
                            let flavor = message.flavor.replace(
                                toReplace,
                                `${consumable.name} - ${consumableString} (${currentQuant})`,
                            );
                            if (currentQuant === 0) {
                                const buttonStr = `>${game.i18n.localize("PF2E.Item.Consumable.Uses.Use")}</button>`;
                                flavor = flavor?.replace(buttonStr, ` disabled${buttonStr}`);
                            }
                            await message.update({ flavor });
                            message.render(true);
                        }
                    }
                    return;
                }
                case "elemental-blast-damage": {
                    if (!actor.isOfType("character")) return;
                    const roll = message.rolls.find(
                        (r): r is Rolled<CheckRoll> => r instanceof CheckRoll && r.options.action === "elemental-blast",
                    );
                    const checkContext = (
                        roll ? (message.flags.pf2e.context ?? null) : null
                    ) as CheckContextChatFlag | null;
                    const outcome = button.dataset.outcome === "success" ? "success" : "criticalSuccess";
                    const [element, damageType, meleeOrRanged, actionCost]: (string | undefined)[] =
                        roll?.options.identifier?.split(".") ?? [];
                    if (objectHasKey(effectTraits, element) && objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                        await new ElementalBlast(actor).damage({
                            element,
                            damageType,
                            melee: meleeOrRanged === "melee",
                            actionCost: Number(actionCost) || 1,
                            checkContext,
                            outcome,
                            event,
                        });
                    }
                }
            }
        } else if (action && actor.isOfType("character", "npc")) {
            const buttonGroup = htmlClosest(button, ".chat-card, .message-buttons");
            const physicalItem = await (async (): Promise<PhysicalItemPF2e | null> => {
                const itemUuid = buttonGroup?.dataset.itemUuid ?? "";
                const maybeItem = await fromUuid(itemUuid);
                return maybeItem instanceof PhysicalItemPF2e ? maybeItem : null;
            })();
            const quantity = Number(buttonGroup?.dataset.craftingQuantity) || 1;

            if (action === "repair-item" && buttonGroup) {
                await onRepairChatCardEvent(event, message, buttonGroup);
            } else if (physicalItem && action === "pay-crafting-costs") {
                const quantity = Number(buttonGroup?.dataset.craftingQuantity) || 1;
                const craftingCost = Coins.fromPrice(physicalItem.price, quantity);
                const coinsToRemove = button.classList.contains("full") ? craftingCost : craftingCost.scale(0.5);
                if (!(await actor.inventory.removeCoins(coinsToRemove))) {
                    ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                    return;
                }

                if (isSpellConsumable(physicalItem.id) && physicalItem.isOfType("consumable")) {
                    craftSpellConsumable(physicalItem, quantity, actor);
                    ChatMessagePF2e.create({
                        author: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                            actorName: actor.name,
                            cost: coinsToRemove.toString(),
                            quantity: quantity,
                            itemName: physicalItem.name,
                        }),
                        speaker: { alias: actor.name },
                    });
                    return;
                }

                const itemObject = physicalItem.toObject();
                itemObject.system.quantity = quantity;

                const result = await actor.addToInventory(itemObject, undefined);
                if (!result) {
                    ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
                    return;
                }

                ChatMessagePF2e.create({
                    author: game.user.id,
                    content: game.i18n.format("PF2E.Actions.Craft.Information.LoseMaterials", {
                        actorName: actor.name,
                        cost: coinsToRemove.toString(),
                        quantity: quantity,
                        itemName: physicalItem.name,
                    }),
                    speaker: { alias: actor.name },
                });
            } else if (physicalItem && action === "lose-materials") {
                const craftingCost = Coins.fromPrice(physicalItem.price, quantity);
                const materialCosts = craftingCost.scale(0.5);
                const coinsToRemove = materialCosts.scale(0.1);
                if (!(await actor.inventory.removeCoins(coinsToRemove))) {
                    ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                } else {
                    ChatMessagePF2e.create({
                        author: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                            actorName: actor.name,
                            cost: coinsToRemove.toString(),
                        }),
                        speaker: { alias: actor.name },
                    });
                }
            } else if (action === "receieve-crafting-item" && physicalItem) {
                if (isSpellConsumable(physicalItem.id) && physicalItem.isOfType("consumable")) {
                    return craftSpellConsumable(physicalItem, quantity, actor);
                } else {
                    return craftItem(physicalItem, quantity, actor);
                }
            }
        } else if (action === "army-strike-damage" && actor.isOfType("army")) {
            // todo: remove when StrikeData is a more generalized structure that supports non-items,
            // and we can do army strikes via actor.system.actions
            const roll = message.rolls.find(
                (r): r is Rolled<CheckRoll> => r instanceof CheckRoll && r.options.action === "army-strike",
            );
            const checkContext = (roll ? (message.flags.pf2e.context ?? null) : null) as CheckContextChatFlag | null;
            const action = button.dataset.outcome === "success" ? "damage" : "critical";
            const strike = actor.strikes[roll?.options.identifier ?? ""];
            strike?.[action]({ checkContext, event });
        }
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    static async #rollActorSaves({ event, button, actor, item }: RollActorSavesParams): Promise<void> {
        const tokens = game.user.getActiveTokens();
        if (tokens.length === 0) {
            ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
            return;
        }
        const saveType = button.dataset.save;
        if (!tupleHasValue(SAVE_TYPES, saveType)) {
            throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
        }

        const dc = Number(button.dataset.dc ?? "NaN");
        for (const token of tokens) {
            const save = token.actor?.saves?.[saveType];
            if (!save) return;

            save.check.roll({
                ...eventToRollParams(event, { type: "check" }),
                dc: Number.isInteger(dc) ? { value: Number(dc) } : null,
                item,
                origin: actor,
            });
        }
    }
}

interface OnClickButtonParams {
    message: ChatMessagePF2e;
    event: PointerEvent;
    html: HTMLElement;
    button: HTMLButtonElement;
}

interface RollActorSavesParams {
    event: PointerEvent;
    button: HTMLButtonElement;
    actor: ActorPF2e;
    item: ItemPF2e<ActorPF2e>;
}

export { ChatCards };
