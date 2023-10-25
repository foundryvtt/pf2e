import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { PhysicalItemHPSource } from "@item/physical/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove broken threshold from physical item source data */
export class Migration849DeleteBrokenThreshold extends MigrationBase {
    static override version = 0.849;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const hitPoints: MaybeWithStoredBT | null =
            "hp" in source.system && isObject(source.system.hp) ? source.system.hp : null;
        if (isObject(hitPoints) && "brokenThreshold" in hitPoints) {
            delete hitPoints.brokenThreshold;
            hitPoints["-=brokenThreshold"] = null;
        }
    }
}

interface MaybeWithStoredBT extends PhysicalItemHPSource {
    brokenThreshold?: unknown;
    "-=brokenThreshold"?: null;
}
