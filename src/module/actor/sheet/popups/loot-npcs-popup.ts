import type { ActorPF2e } from "@actor";
import { transferItemsBetweenActors } from "@actor/helpers.ts";
import * as R from "remeda";

/** Prompt the user to loot from selected tokens, transferring items from each checked token's actor. */
async function lootNPCs(actor: ActorPF2e): Promise<void> {
    const tokens = canvas.ready ? canvas.tokens.controlled.filter((t) => t.actor && t.actor.id !== actor.id) : [];
    if (tokens.length === 0) {
        ui.notifications.warn("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
        return;
    }

    const tokenInfo = R.sortBy(
        tokens.map((t) => ({
            id: t.id,
            name: t.name,
            checked: !t.actor?.hasPlayerOwner,
        })),
        (t) => t.name,
    );
    const content = await fa.handlebars.renderTemplate(
        `systems/${SYSTEM_ID}/templates/actors/loot/loot-npcs-popup.hbs`,
        { tokenInfo },
    );
    const selection = await foundry.applications.api.DialogV2.input<Record<string, boolean> | null>({
        id: "loot-npcs",
        window: { title: _loc("PF2E.loot.LootNPCsTitle") },
        position: { width: 300 },
        content,
        ok: {},
    });
    if (!selection) return;

    for (const token of tokens) {
        if (selection[token.id] && token.actor) {
            await transferItemsBetweenActors(token.actor, actor);
        }
    }
}

export { lootNPCs };
