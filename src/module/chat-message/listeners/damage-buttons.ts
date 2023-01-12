import { ChatMessagePF2e } from "@module/chat-message";
import { LocalizePF2e } from "@module/system/localize";
import { htmlQuery, htmlQueryAll } from "@util";
import { applyDamageFromMessage } from "../helpers";

/** Add apply damage buttons after a chat message is rendered */
class DamageButtons {
    static async listen(message: ChatMessagePF2e, html: HTMLElement): Promise<void> {
        // Mark each button group with the index in the message's `rolls` array
        const buttonGroups = htmlQueryAll(html, ".damage-application").map((buttons, index) => ({ buttons, index }));
        for (const data of buttonGroups) {
            this.#addListeners({ ...data, message });
        }
    }

    static #addListeners({ buttons, index, message }: AddListenersParams): void {
        buttons.dataset.rollIndex = index.toString();

        const fullButton = htmlQuery(buttons, "button.full-damage");
        const halfButton = htmlQuery(buttons, "button.half-damage");
        const doubleButton = htmlQuery(buttons, "button.double-damage");
        const tripleButton = htmlQuery(buttons, "button.triple-damage");
        const healButton = htmlQuery(buttons, "button.heal-damage");
        const shieldButton = htmlQuery(buttons, "button.shield-block");
        if (shieldButton) {
            shieldButton.dataset.tooltipContent = `li.chat-message[data-message-id="${message.id}"] div.hover-content`;
            shieldButton.title = LocalizePF2e.translations.PF2E.DamageButton.ShieldBlock;

            $(shieldButton)
                .tooltipster({
                    animation: "fade",
                    trigger: "click",
                    arrow: false,
                    contentAsHTML: true,
                    debug: BUILD_MODE === "development",
                    interactive: true,
                    side: ["top"],
                    theme: "crb-hover",
                })
                .tooltipster("disable");
        }

        // Handle button clicks
        fullButton?.addEventListener("click", (event) => {
            applyDamageFromMessage({
                message,
                multiplier: 1,
                addend: 0,
                promptModifier: event.shiftKey,
                rollIndex: index,
            });
        });

        halfButton?.addEventListener("click", (event) => {
            applyDamageFromMessage({
                message,
                multiplier: 0.5,
                addend: 0,
                promptModifier: event.shiftKey,
                rollIndex: index,
            });
        });

        doubleButton?.addEventListener("click", (event) => {
            applyDamageFromMessage({
                message,
                multiplier: 2,
                addend: 0,
                promptModifier: event.shiftKey,
                rollIndex: index,
            });
        });

        tripleButton?.addEventListener("click", (event) => {
            applyDamageFromMessage({
                message,
                multiplier: 3,
                addend: 0,
                promptModifier: event.shiftKey,
                rollIndex: index,
            });
        });

        healButton?.addEventListener("click", (event) => {
            applyDamageFromMessage({
                message,
                multiplier: -1,
                addend: 0,
                promptModifier: event.shiftKey,
                rollIndex: index,
            });
        });

        shieldButton?.addEventListener("click", async (event) => {
            const tokens = canvas.tokens.controlled.filter((token) => token.actor);
            if (tokens.length === 0) {
                const errorMsg = LocalizePF2e.translations.PF2E.UI.errorTargetToken;
                ui.notifications.error(errorMsg);
                event.stopPropagation();
                return;
            }

            // If the actor is wielding more than one shield, have the user pick which shield to block for blocking.
            const actor = tokens[0].actor!;
            const heldShields = actor.itemTypes.armor.filter((armor) => armor.isEquipped && armor.isShield);
            const nonBrokenShields = heldShields.filter((shield) => !shield.isBroken);
            const multipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
            const shieldActivated = shieldButton.classList.contains("shield-activated");
            const $shield = $(shieldButton);

            if (multipleShields && !shieldActivated) {
                $shield.tooltipster("enable");
                // Populate the list with the shield options
                const $list = $(buttons).find("ul.shield-options");
                $list.children("li").remove();

                const $template = $list.children("template");
                for (const shield of nonBrokenShields) {
                    const $listItem = $($template.html());
                    $listItem.children("input.data").val(shield.id);
                    $listItem.children("span.label").text(shield.name);
                    const hardnessLabel = LocalizePF2e.translations.PF2E.ShieldHardnessLabel;
                    $listItem.children("span.tag").text(`${hardnessLabel}: ${shield.hardness}`);

                    $list.append($listItem);
                }
                $list.find("li input").on("change", (event) => {
                    const $input = $(event.currentTarget);
                    $shield.attr({ "data-shield-id": $input.val() });
                    $shield.tooltipster("close").tooltipster("disable");
                    $shield.addClass("shield-activated");
                    CONFIG.PF2E.chatDamageButtonShieldToggle = true;
                });
                $shield.tooltipster("open");
                return;
            } else {
                $shield.tooltipster("disable");
                $shield.removeAttr("data-shield-id");
                event.stopPropagation();
            }

            $shield.toggleClass("shield-activated");
            CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
        });
    }
}

interface AddListenersParams {
    buttons: HTMLElement;
    index: number;
    message: ChatMessagePF2e;
}

export { DamageButtons };
