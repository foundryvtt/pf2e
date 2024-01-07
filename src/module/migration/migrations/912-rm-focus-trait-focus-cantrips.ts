import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Remove the "focus" traits from focus cantrips. */
export class Migration912RmFocusTraitFocusCantrips extends MigrationBase {
    static override version = 0.912;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const magicTraditions: Set<string> = MAGIC_TRADITIONS;
        const traits = source.system.traits;
        const misplacedMagicTraditions = traits.value.filter((t): t is MagicTradition => magicTraditions.has(t));
        traits.traditions ??= [];
        traits.traditions.push(...misplacedMagicTraditions);
        traits.value = traits.value.filter((t) => !magicTraditions.has(t));

        if (traits.value.includes("focus")) traits.traditions = [];
        if (traits.value.includes("cantrip")) {
            traits.value = traits.value.filter((t) => t !== "focus");
        }

        traits.traditions = R.uniq(traits.traditions.sort());
        traits.value = R.uniq(traits.value.sort());
    }
}
