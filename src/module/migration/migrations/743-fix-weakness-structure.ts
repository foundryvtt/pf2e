import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Move tracking of roll-option toggles to the rules themselves */
export class Migration743FixWeaknessStructure extends MigrationBase {
    static override version = 0.743;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character" && source.type !== "npc") return;

        if (!Array.isArray(source.data.traits.dv)) {
            source.data.traits.dv = [];
        }

        // No sign of this being broken anywhere, but just to make sure
        if (!Array.isArray(source.data.traits.dr)) {
            source.data.traits.dr = [];
        }
    }
}
