import { ActorSourcePF2e } from "@actor/data";
import { ALIGNMENT_TRAITS } from "@actor/creature/values";
import { AncestrySource } from "@item/data";
import { MigrationBase } from "../base";

/** Remove alignment traits from PCs and NPCs, ancestry traits from PCs  */
export class Migration698RemoveDerivedActorTraits extends MigrationBase {
    static override version = 0.698;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "character" || actorSource.type === "npc") {
            const traits = actorSource.data.traits.traits.value;
            for (const trait of ALIGNMENT_TRAITS) {
                const index = traits.indexOf(trait);
                if (index >= 0) traits.splice(index, 1);
            }

            if (actorSource.type === "character") {
                const ancestry = actorSource.items.find((i): i is AncestrySource => i.type === "ancestry");
                if (!ancestry) return;
                for (const trait of ancestry.data.traits.value) {
                    const index = traits.indexOf(trait);
                    if (index >= 0) traits.splice(index, 1);
                }
            }
        }
    }
}
