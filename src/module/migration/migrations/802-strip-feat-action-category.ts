import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { FeatSystemSource } from "@item/feat/data.ts";
import { MigrationBase } from "../base.ts";

export class Migration802StripFeatActionCategory extends MigrationBase {
    static override version = 0.802;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const feat: FeatMaybeWithActionCategory = source.system;
        if (feat.actionCategory) {
            delete feat.actionCategory;
            feat["-=actionCategory"] = null;
        }
    }
}

interface FeatMaybeWithActionCategory extends FeatSystemSource {
    actionCategory?: unknown;
    "-=actionCategory"?: null;
}
