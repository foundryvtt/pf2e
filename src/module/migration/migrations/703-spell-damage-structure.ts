import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Correct the structure of spell damage in case it slipped past a previous migration */
export class Migration703SpellDamageStructure extends MigrationBase {
    static override version = 0.703;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "spell") {
            const system: { damage: unknown } = source.system;
            if (!isObject<Record<string, unknown>>(system.damage)) {
                system.damage = { value: {} };
            } else if (!("value" in system.damage) || !isObject(system.damage.value)) {
                system.damage.value = {};
            }
        }
    }
}
