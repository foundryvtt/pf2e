import { CharacterPF2e } from "@actor/character/document.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { localizer } from "@util";

export function steelYourResolve(options: ActionDefaultOptions): void {
    const localize = localizer("PF2E.Actions.SteelYourResolve");

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof CharacterPF2e)) {
        return ui.notifications.error(localize("BadArgs"));
    }

    const toChat = (alias: string, content: string) => {
        ChatMessage.create({
            user: game.user.id,
            content,
            speaker: { alias },
        });
    };

    if (!game.settings.get("pf2e", "staminaVariant")) {
        return ui.notifications.error(localize("StaminaNotEnabled"));
    }

    Dialog.confirm({
        title: localize("Title"),
        content: localize("Content"),
        yes: () => {
            const { resolve, sp } = actor.system.attributes;
            const spRatio = `${sp.value}/${sp.max}`;
            const recoverStamina = localize("RecoverStamina", { name: actor.name, ratio: spRatio });
            const noStamina = localize("NoStamina", { name: actor.name });
            if (resolve.value > 0) {
                toChat(actor.name, recoverStamina);
                const newSP = sp.value + Math.floor(sp.max / 2);
                actor.update({
                    "system.attributes.sp.value": Math.min(newSP, sp.max),
                    "system.attributes.resolve.value": resolve.value - 1,
                });
            } else {
                toChat(actor.name, noStamina);
            }
        },
        defaultYes: true,
    });
}
