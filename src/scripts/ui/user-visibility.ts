import { ActorPF2e } from "@actor";

export const UserVisibility = {
    /** Edits HTML live based on permission settings. Used to hide certain blocks and values */
    process: ($html: JQuery, options: { actor?: ActorPF2e | null } = {}) => {
        // Always remove visibility none elements, and remove GM elements if not a GM.
        $html.find('[data-visibility="none"]').remove();
        if (!game.user.isGM) {
            $html.find('[data-visibility="gm"]').remove();
        }

        // Handle owner visibility scopes, but only if an actor is supplied
        if (options.actor) {
            const hasOwnership = options.actor?.isOwner || game.user.isGM;
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
        }
    },
};
