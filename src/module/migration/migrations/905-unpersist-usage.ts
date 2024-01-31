import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

/** Remove `usage` properties from items with only a single (or no) usage */
export class Migration905UnpersistUsage extends MigrationBase {
    static override version = 0.905;

    override async updateItem(source: MaybeWithToBeDeletedUsage): Promise<void> {
        if (!itemIsOfType(source, "physical")) {
            if ("usage" in source.system) source.system["-=usage"] = null;
            return;
        }
        if (itemIsOfType(source, "armor", "shield", "treasure") && "usage" in source.system) {
            source.system["-=usage"] = null;
        } else if (source.system.usage?.value === "") {
            source.system.usage.value = "carried";
        }
    }
}

type MaybeWithToBeDeletedUsage = ItemSourcePF2e & { system: { "-=usage"?: null } };
