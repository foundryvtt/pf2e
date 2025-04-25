import type { CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import * as R from "remeda";

async function takeABreather(): Promise<void> {
    if (!game.pf2e.settings.variants.stamina) return;
    const actors = R.unique(game.user.getActiveTokens().map((t) => t.actor)).filter(R.isNonNull);
    const pcs = actors.filter((a): a is CharacterPF2e => a.isOfType("character"));
    if (pcs.length === 0) {
        ui.notifications.error("PF2E.ErrorMessage.NoPCTokenSelected", { localize: true });
        return;
    }

    await fa.api.DialogV2.confirm({
        window: { title: "Take a Breather" },
        content: "<div>Rest for 10 minutes, spend a resolve point, and regain stamina?</div>",
        yes: {
            callback: async () => {
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
                        await ChatMessagePF2e.create({
                            speaker,
                            content: `${name} has ${sp.value}/${sp.max} SP and spends a resolve point, taking a 10 minute breather. Stamina refreshed.`,
                        });
                    } else {
                        await ChatMessagePF2e.create({
                            speaker,
                            content: `${name} is tired and needs to go to bed! No resolve points remaining.`,
                        });
                    }
                }
            },
            default: true,
        },
    });
}

export { takeABreather };
