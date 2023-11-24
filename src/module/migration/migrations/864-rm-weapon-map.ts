import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove MAP property from weapon system data, transferring to a rule element if set. */
export class Migration864RemoveWeaponMAP extends MigrationBase {
    static override version = 0.864;

    override async updateItem(source: MaybeWithMAPProperty): Promise<void> {
        if (source.type !== "weapon") return;

        if (isObject<{ value: unknown }>(source.system.MAP)) {
            const mapValue = -1 * Number(source.system.MAP.value);
            if (mapValue < 0 && mapValue !== -5) {
                const rule = { key: "MultipleAttackPenalty", selector: "{item|id}-attack", value: mapValue };
                source.system.rules.push(rule);
            }

            if ("game" in globalThis) {
                source.system["-=MAP"] = null;
            } else {
                delete source.system.MAP;
            }
        }
    }
}

type MaybeWithMAPProperty = ItemSourcePF2e & {
    system: {
        MAP?: unknown;
        "-=MAP"?: null;
    };
};
