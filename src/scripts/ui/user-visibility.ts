import { ActorPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";

export const UserVisibility = {
    /** Edits HTML live based on permission settings. Used to hide certain blocks and values */
    process: ($html: JQuery, { message, actor }: { message?: ChatMessagePF2e; actor?: ActorPF2e | null } = {}) => {
        // Always remove visibility none elements, and remove GM elements if not a GM.
        $html.find('[data-visibility="none"]').remove();
        if (!game.user.isGM) {
            $html.find('[data-visibility="gm"]').remove();
        }

        // Handle owner visibility scopes, but only if an actor is supplied
        if (actor) {
            const hasOwnership = actor?.isOwner || game.user.isGM;
            if (!hasOwnership) {
                $html.find('[data-visibility="owner"]').remove();
            }

            // Show DC for inline checks if user has sufficient permission
            $html.find("[data-pf2-dc][data-pf2-show-dc]").each((_idx, elem) => {
                const dc = elem.dataset.pf2Dc!.trim()!;
                const role = elem.dataset.pf2ShowDc!.trim();
                if (role === "all" || (role === "gm" && game.user.isGM) || (role === "owner" && hasOwnership)) {
                    elem.innerHTML = game.i18n.format("PF2E.DCWithValue", { dc, text: elem.innerHTML });
                    elem.removeAttribute("data-pf2-show-dc"); // short-circuit the global DC interpolation
                }
            });

            $html.find("[data-owner-title]").each((_idx, elem) => {
                if (hasOwnership) {
                    const value = elem.dataset.ownerTitle!;
                    elem.setAttribute("title", value);
                } else {
                    elem.removeAttribute("data-owner-title");
                }
            });
        }

        // Hide the sender name from the card if it can't be seen from the canvas
        const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame.tokenSetsNameVisibility");
        if (message?.token && tokenSetsNameVisibility) {
            const $sender = $html.find("h4.message-sender");
            const nameToHide = message.token.name.trim();
            const shouldHideName = !message.token.playersCanSeeName && $sender.text().trim() === nameToHide;
            if (shouldHideName) {
                if (game.user.isGM) {
                    $sender.attr({ "data-visibility": "gm" });
                } else {
                    $sender.text(message.user?.name ?? "Gamemaster");
                }
            }
        }
    },
};
