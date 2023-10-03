import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Rename references to retired compendiums */
export class Migration778RenameRetiredPackRefs extends MigrationBase {
    static override version = 0.778;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rename = (text: string) =>
            text
                .replace(/\bpf2e\.consumable-effects\b/g, "pf2e.equipment-effects")
                .replace(/\bpf2e\.exploration-effects\b/g, "pf2e.other-effects")
                .replace(/\bpf2e\.feature-effects\b/g, "pf2e.feat-effects")
                .replace(/\bpf2e\.equipment-effects\.I9lfZUiCwMiGogVi\b/g, "pf2e.other-effects.I9lfZUiCwMiGogVi")
                // Cover in dev environment:
                .replace(/\bpf2e\.equipment-effects\.Cover\b/g, "pf2e.other-effects.Effect: Cover");

        source.system.rules = recursiveReplaceString(source.system.rules, rename);
        source.system.description = recursiveReplaceString(source.system.description, rename);
    }
}
