import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Fix unannotated shield traits added from Lost Omens: Treasure Vault */
export class Migration827FixTVShieldTraits extends MigrationBase {
    static override version = 0.827;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // Sanity check
        const traits: unknown = source.system.traits;
        if (isObject(traits) && "value" in traits && !Array.isArray(traits.value)) {
            traits.value = [];
        }

        if (source.type !== "armor") return;

        switch (source.system.slug) {
            case "dart-shield": {
                source.system.traits.value = ["launching-dart"];
                return;
            }
            case "klar": {
                source.system.traits.value = ["integrated-1d6-s-versatile-p"];
                return;
            }
            case "meteor-shield": {
                source.system.traits.value = ["shield-throw-30"];
                return;
            }
            case "razor-disc": {
                source.system.traits.value = ["integrated-1d6-s", "shield-throw-20"];
                return;
            }
        }
    }
}
