import { CharacterTraitsData } from "@actor/character/data";
import { ActorSourcePF2e } from "@actor/data";
import { NPCTraitsSource } from "@actor/npc/data";
import { MigrationBase } from "../base";

/** Move tracking of roll-option toggles to the rules themselves */
export class Migration743FixWeaknessStructure extends MigrationBase {
    static override version = 0.743;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character" && source.type !== "npc") return;

        const traits: WithWRTraits = source.system.traits;

        if (!Array.isArray(traits.dv)) {
            traits.dv = [];
        }

        // No sign of this being broken anywhere, but just to make sure
        if (!Array.isArray(traits.dr)) {
            traits.dr = [];
        }
    }
}

type WithWRTraits = (CharacterTraitsData | NPCTraitsSource) & {
    dv?: never[];
    dr?: never[];
};
