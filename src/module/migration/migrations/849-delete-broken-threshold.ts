import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Remove broken threshold from physical item source data */
export class Migration849DeleteBrokenThreshold extends MigrationBase {
    static override version = 0.849;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const system: object = source.system;
        const hitPoints: MaybeWithStoredBT = "hp" in system && R.isPlainObject(system.hp) ? system.hp : {};
        if ("brokenThreshold" in hitPoints) {
            delete hitPoints.brokenThreshold;
            hitPoints["-=brokenThreshold"] = null;
        }
    }
}

interface MaybeWithStoredBT {
    value?: unknown;
    brokenThreshold?: unknown;
    "-=brokenThreshold"?: null;
}
