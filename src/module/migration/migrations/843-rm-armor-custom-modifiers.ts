import { ActorSourcePF2e } from "@actor/data/index.ts";
import { RawModifier } from "@actor/modifiers.ts";
import { MigrationBase } from "../base.ts";

/** Remove custom modifiers in the "armor" statistic */
export class Migration843RMArmorCustomModifiers extends MigrationBase {
    static override version = 0.843;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" && source.system.customModifiers?.armor) {
            const customModifiers: Record<string, RawModifier[] | null> = source.system.customModifiers;
            customModifiers["-=armor"] = null;
        }
    }
}
