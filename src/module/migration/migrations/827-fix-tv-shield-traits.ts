import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix unannotated shield traits added from Lost Omens: Treasure Vault */
export class Migration827FixTVShieldTraits extends MigrationBase {
    static override version = 0.827;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "armor") return;
        const traits: { value: string[] } = source.system.traits;

        switch (source.system.slug) {
            case "dart-shield": {
                traits.value = ["launching-dart"];
                return;
            }
            case "klar": {
                traits.value = ["integrated-1d6-s-versatile-p"];
                return;
            }
            case "meteor-shield": {
                traits.value = ["shield-throw-30"];
                return;
            }
            case "razor-disc": {
                traits.value = ["integrated-1d6-s", "shield-throw-20"];
                return;
            }
        }
    }
}
