import { ActorPF2e } from "@actor";
import { EffectPF2e } from "@item/effect";
import { ErrorPF2e } from "@util";

const ITEM_UUID = "Compendium.pf2e.bestiary-effects.4oQSjijgpQ0zlVi0";

export async function setCooldown(actor: ActorPF2e, cooldown: string, pf2Unit: string | undefined) {
    const effect = await fromUuid(ITEM_UUID);

    if (!(effect instanceof EffectPF2e)) {
        throw ErrorPF2e("Cooldown effect not found");
    }

    const effectSource = effect.toObject();

    if (cooldown) {
        if (cooldown.includes("d")) {
            effectSource.data.duration.value = new Roll(cooldown).roll({ async: false }).total;
        } else {
            effectSource.data.duration.value = Number(cooldown);
        }

        if (pf2Unit) {
            effectSource.data.duration.unit = pf2Unit;
        }

        await actor.createEmbeddedDocuments("Item", [effectSource]);
    }
}
