import { ItemSourcePF2e } from "@item/data";
import { PhysicalSystemSource } from "@item/physical/data";
import { MigrationBase } from "../base";

/** Remove the `invested` property from uninvestable item types */
export class Migration648RemoveInvestedProperty extends MigrationBase {
    static override version = 0.648;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (!(itemSource.type === "treasure" || itemSource.type === "consumable")) return;
        const systemData: NotInvestableSource = itemSource.data;
        delete systemData.invested;
        if ("game" in globalThis) {
            systemData["-=invested"] = null;
        }
    }
}

interface NotInvestableSource extends PhysicalSystemSource {
    invested?: unknown;
    "-=invested"?: null;
}
