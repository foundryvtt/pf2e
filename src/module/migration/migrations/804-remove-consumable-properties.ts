import { ConsumableSystemSource } from "@item/consumable/data.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration804RemoveConsumableProperties extends MigrationBase {
    static override version = 0.804;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "consumable") return;

        const system: MaybeWithConsumableOldData = source.system;
        if (system.uses) {
            delete system.uses;
            system["-=uses"] = null;
        }
        if (system.autoUse) {
            delete system.autoUse;
            system["-=autoUse"] = null;
        }
        if ("_deprecated" in system.charges) {
            delete system.charges._deprecated;
            system.charges["-=deprecated"] = null;
        }
        if ("_deprecated" in system.consume) {
            delete system.consume._deprecated;
            system.consume["-=deprecated"] = null;
        }
    }
}

interface MaybeWithConsumableOldData extends ConsumableSystemSource {
    uses?: unknown;
    "-=uses"?: unknown;
    autoUse?: unknown;
    "-=autoUse"?: unknown;
    charges: ConsumableSystemSource["charges"] & {
        _deprecated?: unknown;
        "-=deprecated"?: null;
    };
    consume: ConsumableSystemSource["consume"] & {
        _deprecated?: unknown;
        "-=deprecated"?: null;
    };
}
