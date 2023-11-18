import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import * as R from "remeda";
import { SpellSystemSource } from "@item/spell/data.ts";

/** Convert string values in adjustName property to a boolean */
export class Migration895FixHealHarmTraits extends MigrationBase {
    static override version = 0.895;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell" || !["harm", "heal"].includes(source.system.slug ?? "")) {
            return;
        }

        const damage = source.system.damage["0"];
        if (R.isObject(damage)) {
            damage.kinds = ["damage", "healing"];
        }
        if (source.system.slug === "heal") {
            source.system.traits.value = ["healing", "manipulate", "vitality"];
        } else {
            source.system.traits.value = ["manipulate", "void"];
        }

        const variants = R.isObject(source.system.overlays)
            ? Object.values(source.system.overlays).filter(
                  (o) => R.isObject(o) && R.isObject(o.system.traits) && Array.isArray(o.system.traits.value),
              )
            : [];

        for (const variant of variants) {
            if (!variant.system.traits) continue;
            const system: DeepPartial<SpellSystemSource> & { "-=traits"?: null } = variant.system;
            if (system.time?.value === "1") {
                system["-=traits"] = null;
            } else {
                system.traits =
                    source.system.slug === "heal"
                        ? { value: ["concentrate", "healing", "manipulate", "vitality"] }
                        : { value: ["concentrate", "manipulate", "void"] };
                if (system.damage?.["0"]?.formula?.includes("+")) {
                    system.damage["0"].kinds = ["healing"];
                    system.defense = null;
                } else if (system.time?.value === "2" && !system.damage?.["0"]) {
                    system.damage = { "0": { kinds: ["damage"] } };
                }
            }
        }
    }
}
