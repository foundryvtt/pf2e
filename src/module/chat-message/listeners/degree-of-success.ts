import { ChatMessagePF2e } from "@module/chat-message";

/** Highlight critical success or failure on d20 rolls */
export const DegreeOfSuccessHighlights = {
    listen: (message: ChatMessagePF2e, $html: JQuery): void => {
        if ($html.find(".pf2e-reroll-indicator").length > 0) return;

        const firstRoll = message.rolls.at(0);
        if (!firstRoll || message.isDamageRoll) return;

        const dice = firstRoll.dice[0] ?? {};
        if (!(dice.faces === 20 && message.isContentVisible)) return;
        const $diceTotal = $html.find(".dice-total");
        if (dice.total === 20) {
            $diceTotal.addClass("success");
        } else if (dice.total === 1) {
            $diceTotal.addClass("failure");
        }
    },
};
