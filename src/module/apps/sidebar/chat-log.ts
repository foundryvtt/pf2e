import { ActorPF2e } from "@actor";
import { Kingdom } from "@actor/party/kingdom/model.ts";
import type { ApplicationRenderContext, ApplicationRenderOptions } from "@client/applications/_types.d.mts";
import type ChatPopout from "@client/applications/sidebar/apps/chat-popout.d.mts";
import type { ContextMenuCondition, ContextMenuEntry } from "@client/applications/ux/context-menu.d.mts";
import type { Rolled } from "@client/dice/_module.d.mts";
import type { ChatMessageSource, ChatSpeakerData } from "@common/documents/chat-message.d.mts";
import { EffectPF2e, ItemPF2e, type ShieldPF2e } from "@item";
import { EffectSource } from "@item/effect/data.ts";
import { applyDamageFromMessage } from "@module/chat-message/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { CombatantPF2e } from "@module/encounter/index.ts";
import { TokenDocumentPF2e } from "@scene";
import { Check } from "@system/check/index.ts";
import { looksLikeDamageRoll } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { createHTMLElement, ErrorPF2e, fontAwesomeIcon, htmlClosest, htmlQuery, objectHasKey } from "@util";
import * as R from "remeda";

class ChatLogPF2e extends fa.sidebar.tabs.ChatLog {
    static override DEFAULT_OPTIONS = {
        actions: {
            activate: ChatLogPF2e.#onClickActivate,
            applyDamage: ChatLogPF2e.#onClickApplyDamage,
            applyEffect: ChatLogPF2e.#onClickApplyEffect,
            findToken: ChatLogPF2e.#onClickFindToken,
            kingdomCollect: ChatLogPF2e.#onClickKingdomAction,
            revertDamage: ChatLogPF2e.#onClickRevertDamage,
            recoverPersistentDamage: ChatLogPF2e.#onClickRecoverPersistent,
            setAsInitiative: ChatLogPF2e.#onClickSetAsInitiative,
            shieldBlock: ChatLogPF2e.#onClickShieldBlock,
        } satisfies Record<string, fa.ApplicationClickAction>,
    };

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override async _onRender(
        context: ApplicationRenderContext,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        if (!options.parts.includes("log")) return;
        const log = htmlQuery(this.element, "ol.chat-log");
        if (!log) throw ErrorPF2e("Unexpected failure to find ChatLog element");
        log.dataset.tooltipDirection = "UP";
        log.addEventListener("dblclick", async (event): Promise<void> => {
            const { message } = ChatLogPF2e.#messageFromEvent(event);
            const senderEl = message ? htmlClosest(event.target, ".message-sender") : null;
            if (senderEl && message) return ChatLogPF2e.#onClickFindToken.call(this, event as PointerEvent);
        });
    }

    /** Replace parent method in order to use DamageRoll class as needed */
    override async processMessage(
        message: string,
        options?: { speaker?: ChatSpeakerData },
    ): Promise<ChatMessagePF2e | undefined>;
    override async processMessage(
        message: string,
        options: { speaker?: ChatSpeakerData } = {},
    ): Promise<ChatMessage | undefined> {
        const [command, matches] = ChatLogPF2e.parse(message) ?? [];
        const isRollCommand = ["roll", "publicroll", "gmroll", "blindroll", "selfroll"].includes(command);
        if (!isRollCommand || !Array.isArray(matches)) return super.processMessage(message, options);

        const speaker = (options.speaker ??= ChatMessagePF2e.getSpeaker());
        const chatData: DeepPartial<ChatMessageSource> = { speaker, author: game.user.id, flavor: "" };
        const actor = ChatMessagePF2e.getSpeakerActor(speaker) ?? game.user.character;
        const rollData = actor?.getRollData() ?? {};
        const rolls: Rolled<Roll>[] = [];
        for (const match of matches.filter((m) => !!m)) {
            const [formula, flavor] = match.slice(2, 4);
            if (flavor && !chatData.flavor) chatData.flavor = flavor;
            const roll = await ((): Promise<Rolled<DamageRoll>> | null => {
                try {
                    const damageRoll = new DamageRoll(formula, rollData);
                    const rollMode = command === "roll" ? game.settings.get("core", "rollMode") : command;
                    const allowInteractive = rollMode !== "blindroll";
                    return looksLikeDamageRoll(damageRoll) ? damageRoll.evaluate({ allowInteractive }) : null;
                } catch {
                    return null;
                }
            })();
            if (roll) {
                rolls.push(roll);
            } else {
                // Super up and return early if this isn't a damage roll
                return super.processMessage(message, options);
            }
        }
        if (Hooks.call("chatMessage", this, message, chatData) === false) return;
        chatData.rolls = rolls.map((r) => JSON.stringify(r.toJSON()));
        chatData.sound ??= CONFIG.sounds.dice;
        chatData.content = rolls.reduce((t, r) => t + r.total, 0).toString();
        const operation = {
            rollMode: objectHasKey(CONFIG.Dice.rollModes, command) ? command : game.settings.get("core", "rollMode"),
        };
        return ChatMessagePF2e.create(chatData, operation);
    }

    static #messageFromEvent(
        event: Maybe<Event>,
    ): { element: HTMLLIElement; message: ChatMessagePF2e } | { element: null; message: null } {
        const element = htmlClosest<HTMLLIElement>(event?.target, "li[data-message-id]");
        const messageId = element?.dataset.messageId ?? "";
        const message = game.messages.get(messageId);
        return element && message ? { element, message } : { element: null, message: null };
    }

    static async onRenderChatPopout(popout: ChatPopout, options: ApplicationRenderOptions): Promise<void> {
        if (!options.isFirstRender) return;
        Object.assign(
            popout.options.actions,
            R.pick(this.DEFAULT_OPTIONS.actions, [
                "activate",
                "applyDamage",
                "applyEffect",
                "findToken",
                "revertDamage",
                "recoverPersistentDamage",
                "setAsInitiative",
                "shieldBlock",
            ]),
        );
    }

    static async #onClickActivate(
        this: ChatLogPF2e | ChatPopout,
        event: PointerEvent,
        button: HTMLElement,
    ): Promise<void> {
        const { message } = ChatLogPF2e.#messageFromEvent(event);
        if (!message) throw ErrorPF2e("Unexpected failure to acquire message");
        const uuid = button.dataset.uuid ?? "";
        const item = await fromUuid<ItemPF2e>(uuid);
        if (!item?.isOfType("physical") || item.quantity === 0) {
            ui.notifications.warn("PF2E.Item.Activation.Warning.ItemDoesNotExist", { localize: true });
            return;
        }

        // Consumables don't have a proper activation flow yet, change implementation when they do
        await item.toMessage();
    }

    static async #onClickApplyDamage(
        this: ChatLogPF2e | ChatPopout,
        event: PointerEvent,
        button: HTMLElement,
    ): Promise<void> {
        const { message } = ChatLogPF2e.#messageFromEvent(event);
        if (!message) throw ErrorPF2e("Unexpected failure to acquire message");
        const multiplier = Number(button.dataset.multiplier);
        const rollIndex = Number(htmlClosest(button, "[data-roll-index]")?.dataset.rollIndex) || 0;
        return applyDamageFromMessage({
            message,
            multiplier,
            rollIndex,
            addend: 0,
            promptModifier: event.shiftKey,
        });
    }

    static async #onClickApplyEffect(
        this: ChatLogPF2e | ChatPopout,
        event: PointerEvent,
        button: HTMLElement,
    ): Promise<void> {
        if (!(button instanceof HTMLButtonElement)) return;
        button.disabled = true;
        const target = fromUuidSync(button.dataset.targets ?? "");
        const message = ChatLogPF2e.#messageFromEvent(event).message;
        const { actor, item } = message ?? {};
        if (!message || !actor || !item) return;
        const effect =
            item.isOfType("action", "feat") && item.system.selfEffect
                ? await fromUuid(item.system.selfEffect.uuid)
                : null;
        if (!(target instanceof ActorPF2e) || !(effect instanceof EffectPF2e)) return;
        const traits = item.system.traits.value?.filter((t) => t in EffectPF2e.validTraits) ?? [];
        const effectSource: EffectSource = fu.mergeObject(effect.toObject(), {
            _id: null,
            system: {
                context: {
                    origin: {
                        actor: actor.uuid,
                        token: message.token?.uuid ?? null,
                        item: item.uuid,
                        spellcasting: null,
                        rollOptions: item.getOriginData().rollOptions,
                    },
                    target: {
                        actor: target.uuid,
                        token: target.getActiveTokens(true, true).at(0)?.uuid ?? null,
                    },
                    roll: null,
                },
                traits: { value: traits },
            },
        });
        await target.createEmbeddedDocuments("Item", [effectSource]);
        const parsedMessageContent = ((): HTMLElement => {
            const container = document.createElement("div");
            container.innerHTML = message.content;
            return container;
        })();

        // Replace the "Apply Effect" button with a success notice
        const buttons = htmlQuery(parsedMessageContent, ".message-buttons");
        if (buttons) {
            const span = createHTMLElement("span", { classes: ["effect-applied"] });
            const anchor = effect.toAnchor({ attrs: { draggable: "true" } });
            const locKey = "PF2E.Item.Ability.SelfAppliedEffect.Applied";
            const statement = game.i18n.format(locKey, { effect: anchor.outerHTML });
            span.innerHTML = statement;
            htmlQuery(buttons, "button[data-action=applyEffect]")?.replaceWith(span);
            await message.update({ content: parsedMessageContent.innerHTML });
        }
    }

    static async #onClickSetAsInitiative(this: ChatLogPF2e | ChatPopout, event: PointerEvent): Promise<void> {
        const { message } = ChatLogPF2e.#messageFromEvent(event);
        if (!message) return;
        const { speakerActor: actor, token } = message ?? {};
        if (!token) {
            ui.notifications.error("PF2E.Encounter.NoTokenInScene", {
                format: { actor: message.actor?.name ?? message.author?.name ?? "" },
            });
            return;
        }
        if (!actor?.isOwner) return;
        const combatant = await CombatantPF2e.fromActor(actor);
        if (!combatant) return;
        const value = message.rolls.at(0)?.total ?? 0;
        const statistic = message.flags.pf2e.modifierName ? String(message.flags.pf2e.modifierName) : undefined;
        await combatant.encounter.setInitiative(combatant.id, value, statistic);
        ui.notifications.info("PF2E.Encounter.InitiativeSet", { format: { actor: token.name, initiative: value } });
    }

    static async #onClickKingdomAction(this: ChatLogPF2e, event: PointerEvent): Promise<void> {
        const { message, element: messageEl } = ChatLogPF2e.#messageFromEvent(event);
        if (!message || !messageEl) return;

        const party = message.actor ?? game.actors.party;
        if (!party?.isOfType("party") || !party?.isOwner || !(party?.campaign instanceof Kingdom)) {
            return;
        }

        const kingdom = party.campaign;
        await kingdom.collect();

        const content = createHTMLElement("div", { innerHTML: message.content });
        htmlQuery(content, "[data-action=kingdomCollect]")?.replaceWith(
            createHTMLElement("div", {
                classes: ["confirmation"],
                children: [fontAwesomeIcon("fa-check"), "Resources Collected"],
            }),
        );
        await message.update({ content: content.innerHTML });
    }

    static async #onClickRevertDamage(
        this: ChatLogPF2e | ChatPopout,
        event: PointerEvent,
        button: HTMLElement,
    ): Promise<void> {
        const { message, element } = ChatLogPF2e.#messageFromEvent(event);
        const appliedDamage = message?.flags.pf2e.appliedDamage;
        if (!appliedDamage) return;
        const actor = fromUuidSync(appliedDamage.uuid);
        if (!(actor instanceof ActorPF2e)) return;

        await actor.undoDamage(appliedDamage);
        ui.notifications.info(
            game.i18n.format(`PF2E.RevertDamage.${appliedDamage.isHealing ? "Healing" : "Damage"}Message`, {
                actor: actor.name,
            }),
        );
        htmlQuery(element, "span.statements")?.classList.add("reverted");
        button.remove();
        await message.update({
            "flags.pf2e.appliedDamage.isReverted": true,
            content: htmlQuery(element, ".message-content")?.innerHTML ?? message.content,
        });
    }

    static async #onClickRecoverPersistent(this: ChatLogPF2e | ChatPopout, event: PointerEvent): Promise<void> {
        const message = ChatLogPF2e.#messageFromEvent(event).message;
        const actor = message?.speakerActor;
        const roll = message?.rolls.find((r): r is Rolled<DamageRoll> => r instanceof DamageRoll);
        if (!actor || !roll) return;

        const damageType = roll.instances.find((i) => i.persistent)?.type;
        if (!damageType) return;

        const condition = actor.getCondition(`persistent-damage-${damageType}`);
        if (!condition?.system.persistent) {
            const damageTypeLocalized = game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType);
            const message = game.i18n.format("PF2E.Item.Condition.PersistentDamage.Error.DoesNotExist", {
                damageType: damageTypeLocalized,
            });
            ui.notifications.warn(message);
            return;
        }
        await condition.rollRecovery();
    }

    static async #onClickShieldBlock(
        this: ChatLogPF2e | ChatPopout,
        event: PointerEvent,
        button: HTMLElement,
    ): Promise<void> {
        const { element: messageEl } = ChatLogPF2e.#messageFromEvent(event);
        const getTokens = (): TokenDocumentPF2e[] => {
            const tokens = game.user.getActiveTokens();
            if (tokens.length === 0) {
                ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
            }
            return tokens;
        };
        const getNonBrokenShields = (tokens: TokenDocumentPF2e[]): ShieldPF2e<ActorPF2e>[] => {
            const actor = tokens.find((t) => !!t.actor)?.actor;
            return actor?.itemTypes.shield.filter((s) => s.isEquipped && !s.isBroken && !s.isDestroyed) ?? [];
        };

        // Add a tooltipster instance to the shield button if needed.
        if (!button.classList.contains("tooltipstered")) {
            const $shieldButton = $(button).tooltipster({
                animation: "fade",
                trigger: "click",
                arrow: false,
                content: htmlQuery(messageEl, "div.hover-content"),
                contentAsHTML: true,
                contentCloning: true,
                debug: BUILD_MODE === "development",
                interactive: true,
                side: ["top"],
                theme: "crb-hover",
                functionBefore: (): boolean => {
                    const tokens = getTokens();
                    if (tokens.length === 0) return false;

                    const nonBrokenShields = getNonBrokenShields(tokens);
                    const hasMultipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
                    const shieldActivated = button.classList.contains("shield-activated");

                    // More than one shield and no selection. Show tooltip.
                    if (hasMultipleShields && !shieldActivated) {
                        return true;
                    }

                    // More than one shield and one was previously selected. Remove selection and show tooltip.
                    if (hasMultipleShields && button.dataset.shieldId) {
                        button.attributes.removeNamedItem("data-shield-id");
                        button.classList.remove("shield-activated");
                        CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                        return true;
                    }

                    // Normal toggle behaviour. Tooltip is suppressed.
                    button.classList.toggle("shield-activated");
                    CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
                    return false;
                },
                functionFormat: (instance, _helper, contentEl: HTMLElement): string | JQuery => {
                    const tokens = getTokens();
                    const nonBrokenShields = getNonBrokenShields(tokens);
                    const multipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
                    const shieldActivated = button.classList.contains("shield-activated");

                    // If the actor is wielding more than one shield, have the user pick which shield to use for blocking.
                    if (multipleShields && !shieldActivated) {
                        // Populate the list with the shield options
                        const listEl = htmlQuery(contentEl, "ul.shield-options");
                        if (!listEl) return $(contentEl);

                        const shieldList = nonBrokenShields.map((shield): HTMLLIElement => {
                            const input = document.createElement("input");
                            input.classList.add("data");
                            input.type = "radio";
                            input.name = "shield-id";
                            input.value = shield.id;
                            input.addEventListener("click", () => {
                                button.dataset.shieldId = input.value;
                                button.classList.add("shield-activated");
                                CONFIG.PF2E.chatDamageButtonShieldToggle = true;
                                instance.close();
                            });
                            const shieldName = document.createElement("span");
                            shieldName.classList.add("label");
                            shieldName.innerHTML = shield.name;

                            const hardness = document.createElement("span");
                            hardness.classList.add("tag");
                            const hardnessLabel = game.i18n.localize("PF2E.HardnessLabel");
                            hardness.innerHTML = `${hardnessLabel}: ${shield.hardness}`;

                            const itemLi = document.createElement("li");
                            itemLi.classList.add("item");
                            itemLi.append(input, shieldName, hardness);

                            return itemLi;
                        });

                        listEl.replaceChildren(...shieldList);
                    }

                    return $(contentEl);
                },
            });
            $shieldButton.tooltipster("open");
        }
    }

    static async #onClickFindToken(this: ChatLogPF2e | ChatPopout, event: PointerEvent): Promise<void> {
        if (!canvas.ready) return;
        const { message } = ChatLogPF2e.#messageFromEvent(event);
        const token = message?.token?.object;
        if (!token?.isVisible || !token.isOwner) return;
        if (token.controlled) {
            token.release();
        } else {
            token.control({ releaseOthers: !event.shiftKey });
        }
        // If a double click, also pan to the token
        if (event.type === "dblclick") {
            const scale = Math.max(1, canvas.stage.scale.x);
            canvas.animatePan({ ...token.center, scale, duration: 1000 });
        }
    }

    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const canApplyDamage: (li: HTMLElement) => boolean = (li) => {
            const message = game.messages.get(li.dataset.messageId, { strict: true });
            return canvas.tokens.controlled.length > 0 && message.rolls.some((r) => r instanceof DamageRoll);
        };

        const canApplyTripleDamage: ContextMenuCondition = (li) =>
            canApplyDamage(li) && game.pf2e.settings.critFumble.buttons;

        const canReroll: ContextMenuCondition = (li) => {
            const message = game.messages.get(li.dataset.messageId, { strict: true });
            return message.isRerollable;
        };

        const canHeroPointReroll: ContextMenuCondition = (li) => {
            const message = game.messages.get(li.dataset.messageId, { strict: true });
            const messageActor = message.actor;
            const actor = messageActor?.isOfType("familiar") ? messageActor.master : messageActor;
            return message.isRerollable && !!actor?.isOfType("character") && actor.heroPoints.value > 0;
        };

        const canMythicPointReroll: ContextMenuCondition = (li) => {
            const message = game.messages.get(li.dataset.messageId, { strict: true });
            const actor = message.actor;
            return (
                message.isRerollable && !!actor?.isOfType("character") && actor.system.resources.mythicPoints.value > 0
            );
        };

        const canShowRollDetails: ContextMenuCondition = (li) => {
            const message = game.messages.get(li.dataset.messageId, { strict: true });
            return game.user.isGM && !!message.flags.pf2e.context;
        };

        const options = super._getEntryContextOptions();
        options.push(
            {
                name: "PF2E.ChatRollDetails.Select",
                icon: fa.fields.createFontAwesomeIcon("face-monocle").outerHTML,
                condition: canShowRollDetails,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    message.showDetails();
                },
            },
            {
                name: "PF2E.DamageButton.FullContext",
                icon: fa.fields.createFontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message });
                },
            },
            {
                name: "PF2E.DamageButton.HalfContext",
                icon: fa.fields.createFontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 0.5 });
                },
            },
            {
                name: "PF2E.DamageButton.DoubleContext",
                icon: fa.fields.createFontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 2 });
                },
            },
            {
                name: "PF2E.DamageButton.TripleContext",
                icon: fa.fields.createFontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyTripleDamage,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 3 });
                },
            },
            {
                name: "PF2E.DamageButton.HealingContext",
                icon: fa.fields.createFontAwesomeIcon("heart").outerHTML,
                condition: canApplyDamage,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: -1 });
                },
            },
            {
                name: "PF2E.RerollMenu.HeroPoint",
                icon: fa.fields.createFontAwesomeIcon("hospital-symbol").outerHTML,
                condition: canHeroPointReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    Check.rerollFromMessage(message, { resource: "hero-points" });
                },
            },
            {
                name: "PF2E.RerollMenu.MythicPoint",
                icon: fa.fields.createFontAwesomeIcon("circle-m").outerHTML,
                condition: canMythicPointReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    Check.rerollFromMessage(message, { resource: "mythic-points" });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepNew",
                icon: fa.fields.createFontAwesomeIcon("dice").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    Check.rerollFromMessage(message);
                },
            },
            {
                name: "PF2E.RerollMenu.KeepLower",
                icon: fa.fields.createFontAwesomeIcon("dice-one").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    Check.rerollFromMessage(message, { keep: "lower" });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepHigher",
                icon: fa.fields.createFontAwesomeIcon("dice-six").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    Check.rerollFromMessage(message, { keep: "higher" });
                },
            },
        );
        return options;
    }
}

export { ChatLogPF2e };
