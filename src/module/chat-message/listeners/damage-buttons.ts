import { ChatMessagePF2e } from "@module/chat-message";
import { LocalizePF2e } from "@module/system/localize";
import { applyDamageFromMessage } from "../helpers";

/** Add apply damage buttons after a chat message is rendered */
export const DamageButtons = {
    listen: async (message: ChatMessagePF2e, $html: JQuery): Promise<void> => {
        const $buttons = $html.find(".damage-application");
        const full = $buttons.find("button.full-damage");
        const half = $buttons.find("button.half-damage");
        const double = $buttons.find("button.double-damage");
        const triple = $buttons.find("button.triple-damage");
        const heal = $buttons.find("button.heal-damage");
        const contentSelector = `li.chat-message[data-message-id="${message.id}"] div.hover-content`;
        const $shield = $buttons
            .find("button.shield-block")
            .attr({ "data-tooltip-content": contentSelector })
            .tooltipster({
                animation: "fade",
                trigger: "click",
                arrow: false,
                contentAsHTML: true,
                debug: BUILD_MODE === "development",
                interactive: true,
                side: ["top"],
                theme: "crb-hover",
            });
        $shield.tooltipster("disable");
        $html.find("button.shield-block").attr({ title: LocalizePF2e.translations.PF2E.DamageButton.ShieldBlock });

        // Handle button clicks
        full.on("click", (event) => {
            applyDamageFromMessage(message, 1, 0, event.shiftKey);
        });

        half.on("click", (event) => {
            applyDamageFromMessage(message, 0.5, 0, event.shiftKey);
        });

        double.on("click", (event) => {
            applyDamageFromMessage(message, 2, 0, event.shiftKey);
        });

        triple?.on("click", (event) => {
            applyDamageFromMessage(message, 3, 0, event.shiftKey);
        });

        $shield.on("click", async (event) => {
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
            const shieldActivated = $shield.hasClass("shield-activated");

            if (multipleShields && !shieldActivated) {
                $shield.tooltipster("enable");
                // Populate the list with the shield options
                const $list = $buttons.find("ul.shield-options");
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

        heal.on("click", (event) => {
            applyDamageFromMessage(message, -1, 0, event.shiftKey);
        });
    },
};
