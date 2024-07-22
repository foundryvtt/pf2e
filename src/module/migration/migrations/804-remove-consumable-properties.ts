import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ConsumableSystemSource } from "@item/consumable/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration804RemoveConsumableProperties extends MigrationBase {
    static override version = 0.804;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "consumable") return;

        const system: MaybeWithConsumableOldData = source.system;
        if (system.uses) {
            delete system.uses;
        }
        if (system.autoUse) {
            delete system.autoUse;
            system["-=autoUse"] = null;
        }
        if (R.isPlainObject(system.charges) && "_deprecated" in system.charges) {
            delete system.charges._deprecated;
            system.charges["-=deprecated"] = null;
        }
        if (R.isPlainObject(system.consume) && "_deprecated" in system.consume) {
            delete system.consume._deprecated;
            system.consume["-=deprecated"] = null;
        }
    }
}

type MaybeWithConsumableOldData = Omit<ConsumableSystemSource, "uses"> & {
    uses: unknown;
    "-=uses"?: unknown;
    autoUse?: unknown;
    "-=autoUse"?: unknown;
    charges?: {
        _deprecated?: unknown;
        "-=deprecated"?: null;
    };
    consume?: {
        _deprecated?: unknown;
        "-=deprecated"?: null;
    };
};
