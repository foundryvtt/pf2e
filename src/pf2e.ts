import { HooksPF2e } from "@scripts/hooks";

import "@system/measure";
import "./styles/main.scss";

HooksPF2e.listen();

// world clock application
Hooks.on("getSceneControlButtons", (controls: any[]) => {
    controls
        .find((c) => c.name === "token")
        .tools.push({
            name: "worldclock",
            title: "CONTROLS.WorldClock",
            icon: "fas fa-clock",
            visible:
                game.settings.get("pf2e", "worldClock.showClockButton") &&
                (game.user.isGM || game.settings.get("pf2e", "worldClock.playersCanView")),
            onClick: () => game.pf2e.worldClock!.render(true),
            button: true,
        });
});

Hooks.on("renderChatMessage", (message, html) => {
    // remove elements the user does not have permission to see
    html.find('[data-visibility="none"]').remove();

    if (!game.user.isGM) {
        html.find('[data-visibility="gm"]').remove();
    }

    const actor = message.data.speaker?.actor ? game.actors.get(message.data.speaker.actor) : undefined;
    if (!((actor && actor.isOwner) || game.user.isGM || message.isAuthor)) {
        html.find('[data-visibility="owner"]').remove();
    }

    // show DC for inline checks if user has sufficient permission
    html.find('[data-pf2-dc]:not([data-pf2-dc=""])[data-pf2-show-dc]:not([data-pf2-show-dc=""])').each((_idx, elem) => {
        const dc = elem.dataset.pf2Dc!.trim()!;
        const role = elem.dataset.pf2ShowDc!.trim();
        if (
            role === "all" ||
            (role === "gm" && game.user.isGM) ||
            (role === "owner" && ((actor && actor.isOwner) || game.user.isGM || message.isAuthor))
        ) {
            elem.innerHTML = game.i18n.format("PF2E.DCWithValue", {
                dc,
                text: elem.innerHTML,
            });
            elem.removeAttribute("data-pf2-show-dc"); // short-circuit the global DC interpolation
        }
    });
});
