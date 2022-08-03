import { ItemSourcePF2e, PhysicalItemSource } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MigrationBase } from "../base";

/** Remove brokenThreshold property left undeleted in `Migration728FlattenPhysicalProperties` */
export class Migration736RemoveBrokenThreshold extends MigrationBase {
    static override version = 0.736;

    #hasBrokenThreshold(source: ItemSourcePF2e): source is SourceWithBrokenThreshold {
        return isPhysicalData(source) && "brokenThreshold" in source.system;
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
