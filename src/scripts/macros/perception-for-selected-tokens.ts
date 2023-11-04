import type { CreaturePF2e } from "@actor";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { eventToRollParams } from "@scripts/sheet-util.ts";

export async function perceptionForSelected(event: JQuery.ClickEvent): Promise<void> {
    const actors = canvas.tokens.controlled
        .flatMap((t) => t.actor ?? [])
        .filter((a): a is CreaturePF2e<TokenDocumentPF2e<ScenePF2e> | null> => !!a.isOfType("creature"));
    if (actors.length === 0) {
        ui.notifications.error("You must select at least one PC/NPC token.");
        return;
    }

    const argsFromEvent = eventToRollParams(event, { type: "check" });
    for (const actor of actors) {
        await actor.perception.roll({ ...argsFromEvent, traits: ["secret"] });
    }
}
