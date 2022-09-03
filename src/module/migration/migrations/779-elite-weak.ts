import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Store indication of NPC elite/weak adjustment in attributes instead of traits */
export class Migration779EliteWeak extends MigrationBase {
    static override version = 0.779;
    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "npc") return;

        const traits = source.system.traits.traits;
        const adjustment = traits.value.includes("elite") ? "elite" : traits.value.includes("weak") ? "weak" : null;
        if (adjustment) {
            source.system.attributes.adjustment = adjustment;
            traits.value = traits.value.filter((trait) => trait !== "elite" && trait !== "weak");
        }
    }
}
