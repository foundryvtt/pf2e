import { ItemSourcePF2e } from "@item/data/index.ts";
import { ZeroToTen } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

type LevelOld = { value?: ZeroToTen };

/** Increase level of 0th-level Cantrips to 1 */
export class Migration640CantripsAreNotZeroLevel extends MigrationBase {
    static override version = 0.64;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "spell") return;

        const level: LevelOld = itemData.system.level;
        if (level.value === 0) {
            level.value = 1;
            if (!itemData.system.traits.value.includes("cantrip")) {
                itemData.system.traits.value.push("cantrip");
            }
        }
    }
}
