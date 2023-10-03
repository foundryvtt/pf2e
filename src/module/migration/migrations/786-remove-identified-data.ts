import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { IdentificationStatus } from "@item/physical/data.ts";
import { MigrationBase } from "../base.ts";

/** Remove stored `system.identification.identified` properties on physical items */
export class Migration786RemoveIdentifiedData extends MigrationBase {
    static override version = 0.786;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(source)) return;

        const identification: MaybeWithIdentifiedData = source.system.identification ?? {};
        if (identification.identified) {
            identification["-=identified"] = null;
        }
    }
}

interface MaybeWithIdentifiedData {
    status: IdentificationStatus;
    identified?: unknown;
    "-=identified"?: null;
}
