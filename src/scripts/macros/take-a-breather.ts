import type { ActorPF2e, CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { fontAwesomeIcon } from "@util";
import * as R from "remeda";

function takeABreather(): void {
    let applyChanges = false;
    const actors: ActorPF2e[] = R.uniq(
        R.compact([game.user.character, canvas.tokens.controlled.map((t) => t.actor)].flat()),
    );
    const pcs = actors.filter((a): a is CharacterPF2e => a.isOfType("character"));
    if (!game.settings.get("pf2e", "staminaVariant")) {
        return;
    } else if (pcs.length === 0) {
        ui.notifications.error("PF2E.ErrorMessage.NoPCTokenSelected", { localize: true });
        return;
    }

    new Dialog({
        title: "Take a Breather",
        content: "<div>Rest for 10 minutes, spend a resolve point, and regain stamina?</div>",
        buttons: {
            yes: {
                icon: fontAwesomeIcon("check").outerHTML,
                label: "Take a Breather",
                callback: () => {
                    applyChanges = true;
                },
            },
            no: {
                icon: fontAwesomeIcon("times").outerHTML,
                label: `Cancel`,
            },
        },
        default: "yes",
        close: () => {
            if (!applyChanges) return;

            for (const actor of pcs) {
                const token = actor.getActiveTokens(true, true).shift();
                const name = token?.name ?? actor.name;
                const sp = actor.system.attributes.hp.sp;
                const resolve = actor.system.resources.resolve;
                if (!(sp && resolve)) continue;

                const speaker = ChatMessagePF2e.getSpeaker({ token, actor });

                if (resolve.value > 0) {
                    actor.update({
                        "system.attributes.hp.sp.value": sp.max,
                        "system.resources.resolve.value": resolve.value - 1,
                    });
                    ChatMessagePF2e.create({
                        speaker,
                        content: `${name} has ${sp.value}/${sp.max} SP and spends a resolve point, taking a 10 minute breather. Stamina refreshed.`,
                    });
                } else {
                    ChatMessagePF2e.create({
                        speaker,
                        content: `${name} is tired and needs to go to bed! No resolve points remaining.`,
                    });
                }
            }
        },
    }).render(true);
}

export { takeABreather };
