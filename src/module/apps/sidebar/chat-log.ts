import { ActorPF2e } from "@actor";
import { ArmorPF2e } from "@item";
import { TokenPF2e } from "@module/canvas";
import { ChatMessagePF2e } from "@module/chat-message";
import { applyDamageFromMessage } from "@module/chat-message/helpers";
import { CombatantPF2e } from "@module/encounter";
import { CheckPF2e } from "@system/check";
import { DamageRoll } from "@system/damage/roll";
import { fontAwesomeIcon, htmlClosest, htmlQuery, objectHasKey } from "@util";

export class ChatLogPF2e extends ChatLog<ChatMessagePF2e> {
    /** Replace parent method in order to use DamageRoll class as needed */
    protected override async _processDiceCommand(
        command: string,
        matches: RegExpMatchArray[],
        chatData: DeepPartial<foundry.documents.ChatMessageSource>,
        createOptions: ChatMessageModificationContext
    ): Promise<void> {
        const actor = ChatMessage.getSpeakerActor(chatData.speaker ?? {}) || game.user.character;
        const rollData = actor ? actor.getRollData() : {};
        const rolls: Rolled<Roll>[] = [];
        for (const match of matches.filter((m) => !!m)) {
            const [formula, flavor] = match.slice(2, 4);
            if (flavor && !chatData.flavor) chatData.flavor = flavor;
            const RollCls = formula.includes("d20") || /[0-9]dc\b/.test(formula) ? Roll : DamageRoll;
            const roll = await new RollCls(formula, rollData).evaluate({ async: true });
            rolls.push(roll);
        }
        chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
        chatData.rolls = rolls.map((r) => r.toJSON());
        chatData.sound = CONFIG.sounds.dice;
        chatData.content = rolls.reduce((t, r) => t + r.total, 0).toString();
        createOptions.rollMode = objectHasKey(CONFIG.Dice.rollModes, command) ? command : "roll";
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        html.addEventListener("click", (event): void => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const messageEl = htmlClosest<HTMLLIElement>(target, "li.chat-message");
            if (!messageEl) return;
            const message = game.messages.get(messageEl.dataset.messageId ?? "");

            if (message?.isDamageRoll) {
                const button = htmlClosest(target, "button");
                if (!button) return;

                if (button.classList.contains("shield-block")) {
                    return this.#handleShieldButtonClick(button, messageEl);
                }
                const buttonClasses = [
                    "heal-damage",
                    "half-damage",
                    "full-damage",
                    "double-damage",
                    "triple-damage",
                ] as const;
                for (const cssClass of buttonClasses) {
                    if (button.classList.contains(cssClass)) {
                        const index = htmlClosest(button, ".damage-application")?.dataset.rollIndex;
                        return this.#handleDamageButtonClick(message, cssClass, event.shiftKey, index);
                    }
                }
            }
        });
    }

    #handleDamageButtonClick(
        message: ChatMessagePF2e,
        cssClass: DamageButtonClass,
        shiftKey: boolean,
        index?: string
    ): void {
        const multiplier = (() => {
            switch (cssClass) {
                case "heal-damage":
                    return -1;
                case "half-damage":
                    return 0.5;
                case "full-damage":
                    return 1;
                case "double-damage":
                    return 2;
                case "triple-damage":
                    return 3;
            }
        })();

        applyDamageFromMessage({
            message,
            multiplier,
            addend: 0,
            promptModifier: shiftKey,
            rollIndex: Number(index) || 0,
        });
    }

    #handleShieldButtonClick(shieldButton: HTMLButtonElement, messageEl: HTMLLIElement): void {
        const getTokens = (): TokenPF2e[] => {
            const tokens = canvas.tokens.controlled.filter((token) => token.actor);
            if (!tokens.length) {
                ui.notifications.error("PF2E.UI.errorTargetToken", { localize: true });
            }
            return tokens;
        };
        const getNonBrokenShields = (tokens: TokenPF2e[]): ArmorPF2e<ActorPF2e>[] => {
            const actor = tokens[0].actor!;
            const heldShields = actor.itemTypes.armor.filter((armor) => armor.isEquipped && armor.isShield);
            return heldShields.filter((shield) => !shield.isBroken);
        };

        // Add a tooltipster instance to the shield button if needed.
        if (!shieldButton.classList.contains("tooltipstered")) {
            $(shieldButton)
                .tooltipster({
                    animation: "fade",
                    trigger: "click",
                    arrow: false,
                    content: $(messageEl).find("div.hover-content"),
                    contentAsHTML: true,
                    contentCloning: true,
                    debug: BUILD_MODE === "development",
                    interactive: true,
                    side: ["top"],
                    theme: "crb-hover",
                    functionBefore: (): boolean => {
                        const tokens = getTokens();
                        if (!tokens.length) return false;

                        const nonBrokenShields = getNonBrokenShields(tokens);
                        const hasMultipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
                        const shieldActivated = shieldButton.classList.contains("shield-activated");

                        // More than one shield and no selection. Show tooltip.
                        if (hasMultipleShields && !shieldActivated) {
                            return true;
                        }

                        // More than one shield and one was previously selected. Remove selection and show tooltip.
                        if (hasMultipleShields && shieldButton.dataset.shieldId) {
                            shieldButton.attributes.removeNamedItem("data-shield-id");
                            shieldButton.classList.remove("shield-activated");
                            CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                            return true;
                        }

                        // Normal toggle behaviour. Tooltip is suppressed.
                        shieldButton.classList.toggle("shield-activated");
                        CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
                        return false;
                    },
                    functionFormat: (instance, _helper, $content): string | JQuery<HTMLElement> => {
                        const tokens = getTokens();
                        const nonBrokenShields = getNonBrokenShields(tokens);
                        const multipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
                        const shieldActivated = shieldButton.classList.contains("shield-activated");

                        // If the actor is wielding more than one shield, have the user pick which shield to use for blocking.
                        if (multipleShields && !shieldActivated) {
                            const content: HTMLElement = $content[0];
                            // Populate the list with the shield options
                            const listEl = htmlQuery(content, "ul.shield-options");
                            if (!listEl) return $content;
                            const shieldList: HTMLLIElement[] = [];
                            for (const shield of nonBrokenShields) {
                                const input = document.createElement("input");
                                input.classList.add("data");
                                input.type = "radio";
                                input.name = "shield-id";
                                input.value = shield.id;
                                input.addEventListener("click", () => {
                                    shieldButton.dataset.shieldId = input.value;
                                    shieldButton.classList.add("shield-activated");
                                    CONFIG.PF2E.chatDamageButtonShieldToggle = true;
                                    instance.close();
                                });
                                const shieldName = document.createElement("span");
                                shieldName.classList.add("label");
                                shieldName.innerHTML = shield.name;
                                const hardness = document.createElement("span");
                                hardness.classList.add("tag");
                                hardness.innerHTML = `${game.i18n.localize("PF2E.ShieldHardnessLabel")}: ${
                                    shield.hardness
                                }`;
                                const itemLi = document.createElement("li");
                                itemLi.classList.add("item");
                                itemLi.append(input, shieldName, hardness);
                                shieldList.push(itemLi);
                            }
                            listEl.replaceChildren(...shieldList);
                        }
                        return $content;
                    },
                })
                .tooltipster("open");
        }
    }

    protected override _getEntryContextOptions(): EntryContextOption[] {
        const canApplyDamage: ContextOptionCondition = ($li: JQuery) => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
            return canvas.tokens.controlled.length > 0 && message.rolls.some((r) => r instanceof DamageRoll);
        };

        const canApplyTripleDamage: ContextOptionCondition = ($li: JQuery) =>
            canApplyDamage($li) && game.settings.get("pf2e", "critFumbleButtons");

        const canApplyInitiative: ContextOptionCondition = ($li: JQuery) => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });

            // Rolling PC initiative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
            // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
            const validActor =
                message.token?.actor?.type === "npc" && (message.token.combatant?.initiative ?? null) === null;
            const validRollType = message.isRoll && message.isCheckRoll;
            return validActor && validRollType;
        };

        const canReroll: ContextOptionCondition = ($li: JQuery): boolean => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
            return message.isRerollable;
        };

        const canHeroPointReroll: ContextOptionCondition = ($li: JQuery): boolean => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
            const actor = message.actor;
            return message.isRerollable && !!actor?.isOfType("character") && actor.heroPoints.value > 0;
        };

        const canShowRollDetails: ContextOptionCondition = ($li: JQuery): boolean => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
            return game.user.isGM && !!message.flags.pf2e.context;
        };

        const options = super._getEntryContextOptions();
        options.push(
            {
                name: "PF2E.ChatRollDetails.Select",
                icon: fontAwesomeIcon("search").outerHTML,
                condition: canShowRollDetails,
                callback: ($li) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    message.showDetails();
                },
            },
            {
                name: "PF2E.DamageButton.FullContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message });
                },
            },
            {
                name: "PF2E.DamageButton.HalfContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 0.5 });
                },
            },
            {
                name: "PF2E.DamageButton.DoubleContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 2 });
                },
            },
            {
                name: "PF2E.DamageButton.TripleContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyTripleDamage,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: 3 });
                },
            },
            {
                name: "PF2E.DamageButton.HealingContext",
                icon: fontAwesomeIcon("heart").outerHTML,
                condition: canApplyDamage,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    applyDamageFromMessage({ message, multiplier: -1 });
                },
            },
            {
                name: "PF2E.ClickToSetInitiativeContext",
                icon: fontAwesomeIcon("swords").outerHTML,
                condition: canApplyInitiative,
                callback: async ($li) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    const { actor, token } = message;
                    if (!token) {
                        ui.notifications.error(
                            game.i18n.format("PF2E.Encounter.NoTokenInScene", {
                                actor: message.actor?.name ?? message.user?.name ?? "",
                            })
                        );
                        return;
                    }
                    if (!actor) return;
                    const combatant = await CombatantPF2e.fromActor(actor);
                    if (!combatant) return;
                    const value = message.rolls.at(0)?.total ?? 0;

                    await combatant.encounter.setInitiative(combatant.id, value);

                    ui.notifications.info(
                        game.i18n.format("PF2E.Encounter.InitiativeSet", { actor: actor.name, initiative: value })
                    );
                },
            },
            {
                name: "PF2E.RerollMenu.HeroPoint",
                icon: fontAwesomeIcon("hospital-symbol").outerHTML,
                condition: canHeroPointReroll,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message, { heroPoint: true });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepNew",
                icon: fontAwesomeIcon("dice").outerHTML,
                condition: canReroll,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message);
                },
            },
            {
                name: "PF2E.RerollMenu.KeepWorst",
                icon: fontAwesomeIcon("dice-one").outerHTML,
                condition: canReroll,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message, { keep: "worst" });
                },
            },
            {
                name: "PF2E.RerollMenu.KeepBest",
                icon: fontAwesomeIcon("dice-six").outerHTML,
                condition: canReroll,
                callback: ($li: JQuery) => {
                    const message = game.messages.get($li[0].dataset.messageId, { strict: true });
                    CheckPF2e.rerollFromMessage(message, { keep: "best" });
                },
            }
        );

        return options;
    }
}

type DamageButtonClass = "heal-damage" | "half-damage" | "full-damage" | "double-damage" | "triple-damage";
