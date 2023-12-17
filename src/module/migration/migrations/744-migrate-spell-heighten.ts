import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import { MigrationBase } from "../base.ts";

export class Migration744MigrateSpellHeighten extends MigrationBase {
    static override version = 0.744;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;
        const system: SpellScalingOld = source.system;
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

interface SpellScalingOld extends SpellSystemSource {
    scaling?: {
        interval: number;
        damage: Record<string, string>;
    };
    "-=scaling"?: null;
}
