import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove properties from unused "activatedEffect" template defaults */
export class Migration807RMActivatedEffectFields extends MigrationBase {
    static override version = 0.807;

    override async updateItem(source: ItemSourceWithDeletions): Promise<void> {
        if (source.type === "consumable") {
            for (const property of ["activation", "duration", "range", "target", "uses"] as const) {
                if (property in source.system) {
                    delete source.system[property];
                    source.system[`-=${property}`] = null;
                }
            }
        }
    }
}

type ActivatedEffectKey = "activation" | "duration" | "range" | "target" | "uses";

type ItemSourceWithDeletions = ItemSourcePF2e & {
    system: {
        [K in ActivatedEffectKey | `-=${ActivatedEffectKey}`]?: unknown;
    };
};
