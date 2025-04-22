import { ActorPF2e } from "@actor";
import { handleKingdomChatMessageEvent } from "@actor/party/kingdom/chat.ts";
import type { ApplicationRenderContext } from "@client/applications/_types.d.mts";
import { ContextMenuCondition, ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import { Rolled } from "@client/dice/_module.mjs";
import type { ChatMessageCreateOperation, ChatMessageSource } from "@common/documents/chat-message.d.mts";
import type { ShieldPF2e } from "@item";
import { applyDamageFromMessage } from "@module/chat-message/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { CombatantPF2e } from "@module/encounter/index.ts";
import { TokenDocumentPF2e } from "@scene";
import { CheckPF2e } from "@system/check/index.ts";
import { looksLikeDamageRoll } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, objectHasKey } from "@util";

class ChatLogPF2e extends fa.sidebar.tabs.ChatLog {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        actions: {
            applyDamage: ChatLogPF2e.#onClickApplyDamage,
            findToken: ChatLogPF2e.#onClickFindToken,
            kingdomAction: ChatLogPF2e.#onClickKingdomAction,
            revertDamage: ChatLogPF2e.#onClickRevertDamage,
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
        const log = htmlQuery(this.element, "ol.chat-log");
        if (!log) throw ErrorPF2e("Unexpected failure to find ChatLog element");
        log.dataset.tooltipDirection = "UP";
        log.addEventListener("dblclick", async (event): Promise<void> => {
            const { message } = ChatLogPF2e.#messageFromEvent(event);
            const senderEl = message ? htmlClosest(event.target, ".message-sender") : null;
            if (senderEl && message) return ChatLogPF2e.#onClickFindToken(event);
        });
    }

    /** Handle clicks of "Set as initiative" buttons */
    protected override _onDiceRollClick(event: JQuery.ClickEvent): void {
        const message = ChatLogPF2e.#messageFromEvent(event.originalEvent).message;
        if (message && htmlClosest(event.target, "button[data-action=set-as-initiative]")) {
            event.stopPropagation();
            this.#onClickSetAsInitiative(message);
        } else {
            return super._onDiceRollClick(event);
        }
    }

    /** Replace parent method in order to use DamageRoll class as needed */
    protected override async _processDiceCommand(
        command: string,
        matches: RegExpMatchArray[],
        chatData: DeepPartial<Omit<ChatMessageSource, "rolls">> & { rolls: (string | RollJSON)[] },
        createOptions: ChatMessageCreateOperation,
    ): Promise<void> {
        const actor = ChatMessage.getSpeakerActor(chatData.speaker ?? {}) || game.user.character;
        const rollData = actor?.getRollData() ?? {};
        const rolls: Rolled<Roll>[] = [];
        createOptions.rollMode = objectHasKey(CONFIG.Dice.rollModes, command)
            ? command
            : game.settings.get("core", "rollMode");

        for (const match of matches.filter((m) => !!m)) {
            const [formula, flavor] = match.slice(2, 4);
            if (flavor && !chatData.flavor) chatData.flavor = flavor;
            const roll = await ((): Promise<Rolled<DamageRoll>> | null => {
                try {
                    const damageRoll = new DamageRoll(formula, rollData);
                    return looksLikeDamageRoll(damageRoll) ? damageRoll.evaluate() : null;
                } catch {
                    return null;
                }
            })();
            if (roll) {
                rolls.push(roll);
            } else {
                // Super up and return early if this isn't a damage roll
                return super._processDiceCommand(command, matches, chatData, createOptions);
            }
        }
        chatData.rolls = rolls.map((r) => r.toJSON());
        chatData.sound = CONFIG.sounds.dice;
        chatData.content = rolls.reduce((t, r) => t + r.total, 0).toString();
    }

    static #messageFromEvent(
        event: Maybe<Event>,
    ): { element: HTMLLIElement; message: ChatMessagePF2e } | { element: null; message: null } {
        const element = htmlClosest<HTMLLIElement>(event?.target, "li[data-message-id]");
        const messageId = element?.dataset.messageId ?? "";
        const message = game.messages.get(messageId);
        return element && message ? { element, message } : { element: null, message: null };
    }

    static async #onClickApplyDamage(this: ChatLogPF2e, event: PointerEvent, button: HTMLElement): Promise<void> {
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

    static async #onClickKingdomAction(this: ChatLogPF2e, event: PointerEvent): Promise<void> {
        const { message, element: messageEl } = ChatLogPF2e.#messageFromEvent(event);
        if (message && messageEl) return handleKingdomChatMessageEvent({ event, message, messageEl });
    }

    static async #onClickRevertDamage(this: ChatLogPF2e, event: PointerEvent, button: HTMLElement): Promise<void> {
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

    static async #onClickShieldBlock(event: PointerEvent, button: HTMLElement): Promise<void> {
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

    static async #onClickFindToken(event: MouseEvent): Promise<void> {
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

    async #onClickSetAsInitiative(message: ChatMessagePF2e): Promise<void> {
        const { speakerActor: actor, token } = message;
        if (!token) {
            ui.notifications.error(
                game.i18n.format("PF2E.Encounter.NoTokenInScene", {
                    actor: message.actor?.name ?? message.author?.name ?? "",
                }),
            );
            return;
        }
        if (!actor) return;
        const combatant = await CombatantPF2e.fromActor(actor);
        if (!combatant) return;
        const value = message.rolls.at(0)?.total ?? 0;
        await combatant.encounter.setInitiative(
            combatant.id,
            value,
            message.flags.pf2e.modifierName ? String(message.flags.pf2e.modifierName) : undefined,
        );

        ui.notifications.info(
            game.i18n.format("PF2E.Encounter.InitiativeSet", { actor: token.name, initiative: value }),
        );
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
                    CheckPF2e.rerollFromMessage(message, { heroPoint: true });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepNew",
                icon: fa.fields.createFontAwesomeIcon("dice").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message);
                },
            },
            {
                name: "PF2E.RerollMenu.KeepLower",
                icon: fa.fields.createFontAwesomeIcon("dice-one").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message, { keep: "lower" });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepHigher",
                icon: fa.fields.createFontAwesomeIcon("dice-six").outerHTML,
                condition: canReroll,
                callback: (li) => {
                    const message = game.messages.get(li.dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message, { keep: "higher" });
                },
            },
        );

        return options;
    }
}

export { ChatLogPF2e };
