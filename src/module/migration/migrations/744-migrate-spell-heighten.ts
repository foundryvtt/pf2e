import { ItemSourcePF2e } from "@item/data";
import { SpellSystemData } from "@item/spell/data";
import { MigrationBase } from "../base";

export class Migration744MigrateSpellHeighten extends MigrationBase {
    static override version = 0.744;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (item.type !== "spell") return;
        const system: SpellScalingOld = item.data;
        if (system.scaling) {
            system.heightening = {
                type: "interval",
                interval: system.scaling.interval,
                damage: system.scaling.damage,
            };
            delete system.scaling;
            system["-=scaling"] = null;
        }
    }
}

interface SpellScalingOld extends SpellSystemData {
    scaling?: {
        interval: number;
        damage: Record<string, string>;
    };
    "-=scaling"?: null;
}
