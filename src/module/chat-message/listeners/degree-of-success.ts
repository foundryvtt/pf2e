import { ChatMessagePF2e } from "@module/chat-message";

/** Highlight critical success or failure on d20 rolls */
export const DegreeOfSuccessHighlights = {
    listen: (message: ChatMessagePF2e, $html: JQuery): void => {
        if ($html.find(".pf2e-reroll-indicator").length > 0) return;
        if (!message.roll || message.data.flags.pf2e.damageRoll) return;

        const dice = message.roll.dice[0] ?? {};
        if (!(dice.faces === 20 && message.isContentVisible)) return;
        const $diceTotal = $html.find(".dice-total");
        if (dice.total === 20) {
            $diceTotal.addClass("success");
        } else if (dice.total === 1) {
            $diceTotal.addClass("failure");
        }
    },
};
