import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

export class Migration941InvestedGrafts extends MigrationBase {
    static override version = 0.941;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical")) return;

        const isInvested = source.system.equipped?.invested;
        const isImplant = source.system.usage?.value === "implanted";
        if (isInvested && isImplant && source.system.equipped.carryType !== "implanted") {
            source.system.equipped.carryType = "implanted";
        }
    }
}
