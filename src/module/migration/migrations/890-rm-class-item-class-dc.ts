import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove AE-likes that increase the size of a PC's focus pool. */
export class Migration890RMClassItemClassDC extends MigrationBase {
    static override version = 0.89;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "class" && "classDC" in source.system) {
            const system: { classDC?: unknown; "-=classDC"?: unknown } = source.system;
            system["-=classDC"] = null;
        }
    }
}
