import { ItemSourcePF2e } from "@item/data";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base";

/** Rename references to retired "feature-effects" compendium to "feat-effects" */
export class Migration778RenameRetiredPackRefs extends MigrationBase {
    static override version = 0.778;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const renameFeatureEffects = (text: string) => text.replace(/\bpf2e\.feature-effects\b/g, "pf2e.feat-effects");
        source.system.rules = recursiveReplaceString(source.system.rules, renameFeatureEffects);
        source.system.description = recursiveReplaceString(source.system.description, renameFeatureEffects);

        const renameConsumableEffects = (text: string) =>
            text.replace(/\bpf2e\.consumable-effects\b/g, "pf2e.equipment-effects");
        source.system.rules = recursiveReplaceString(source.system.rules, renameConsumableEffects);
        source.system.description = recursiveReplaceString(source.system.description, renameConsumableEffects);
    }
}
