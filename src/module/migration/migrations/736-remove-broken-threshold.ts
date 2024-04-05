import { ItemSourcePF2e, PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

/** Remove brokenThreshold property left undeleted in `Migration728FlattenPhysicalProperties` */
export class Migration736RemoveBrokenThreshold extends MigrationBase {
    static override version = 0.736;

    #hasBrokenThreshold(source: ItemSourcePF2e): source is SourceWithBrokenThreshold {
        return itemIsOfType(source, "physical") && "brokenThreshold" in source.system;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (this.#hasBrokenThreshold(source)) {
            delete source.system.brokenThreshold;
            source.system["-=brokenThreshold"] = null;
        }
    }
}

type SourceWithBrokenThreshold = PhysicalItemSource & {
    system: {
        brokenThreshold?: unknown;
        "-=brokenThreshold"?: null;
    };
};
