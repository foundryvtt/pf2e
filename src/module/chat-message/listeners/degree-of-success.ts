import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { htmlQuery, htmlQueryAll } from "@util";

/** Highlight critical success or failure on d20 rolls */
export const DegreeOfSuccessHighlights = {
    listen: (message: ChatMessagePF2e, html: HTMLElement): void => {
        if (htmlQueryAll(html, ".pf2e-reroll-indicator").length > 0) return;

        const firstRoll = message.rolls.at(0);
        if (!firstRoll || message.isDamageRoll) return;

        const firstDice = firstRoll.dice.at(0);
        if (!(firstDice instanceof Die && firstDice.faces === 20 && message.isContentVisible)) {
            return;
        }

        const diceTotal = htmlQuery(html, ".dice-total");
        const results = firstDice.results.filter((r) => r.active);
        if (results.every((r) => r.result === 20)) {
            diceTotal?.classList.add("success");
        } else if (results.every((r) => r.result === 1)) {
            diceTotal?.classList.add("failure");
        }
    },
};
