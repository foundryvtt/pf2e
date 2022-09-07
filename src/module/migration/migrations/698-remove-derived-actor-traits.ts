import { ActorSourcePF2e } from "@actor/data";
import { ALIGNMENT_TRAITS } from "@actor/creature/values";
import { AncestrySource } from "@item/data";
import { MigrationBase } from "../base";

/** Remove alignment traits from PCs and NPCs, ancestry traits from PCs  */
export class Migration698RemoveDerivedActorTraits extends MigrationBase {
    static override version = 0.698;

    override async updateActor(source: MaybeWithExtraNestedTraits): Promise<void> {
        if (!source.system.traits.traits) return;
        if (source.type === "character" || source.type === "npc") {
            const traits = source.system.traits.traits.value;
            for (const trait of ALIGNMENT_TRAITS) {
                const index = traits.indexOf(trait);
                if (index >= 0) traits.splice(index, 1);
            }

            if (source.type === "character") {
                const ancestry = source.items.find((i): i is AncestrySource => i.type === "ancestry");
                if (!ancestry) return;
                for (const trait of ancestry.system.traits.value) {
                    const index = traits.indexOf(trait);
                    if (index >= 0) traits.splice(index, 1);
                }
            }
        }
    }
}

type MaybeWithExtraNestedTraits = ActorSourcePF2e & {
    system: {
        traits: {
            traits?: { value: string[] };
        };
    };
};
