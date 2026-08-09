import type { ForcedDeletion } from "@common/data/operators.d.mts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { setHasElement } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove `usage` properties from items with only a single (or no) usage */
export class Migration905UnpersistUsage extends MigrationBase {
    static override version = 0.905;

    override async updateItem(source: MaybeWithToBeDeletedUsage): Promise<void> {
        if (["armor", "shield", "treasure"].includes(source.type)) {
            source.system.usage = _del;
            return;
        } else if (source.system.usage?.value === "") {
            source.system.usage.value = "carried";
        }
        if (!setHasElement(PHYSICAL_ITEM_TYPES, source.type) && "usage" in source.system) {
            source.system.usage = _del;
        }
    }
}

interface MaybeWithToBeDeletedUsage {
    type: string;
    system: object & { usage?: { value?: string } | (ForcedDeletion & { value?: never }) };
}
