import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Update rule element on Devise a Stratagem action and related feats. */
export class Migration916PreciseStrikeFlag extends MigrationBase {
    static override version = 0.916;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            source.type === "feat" &&
            source.system.slug === "precise-strike" &&
            !source.system.rules.some((r) => r.key === "ActiveEffectLike")
        ) {
            const rule = {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.swashbuckler.preciseStrike.value",
                predicate: ["class:swashbuckler"],
                value: "ceil(@actor.level/4) + 1",
            };
            source.system.rules.push(rule);
        } else if (
            source.type === "feat" &&
            source.system.slug === "finishing-precision" &&
            !source.system.rules.some((r) => r.key === "ActiveEffectLike")
        ) {
            {
                const rule = {
                    key: "ActiveEffectLike",
                    mode: "override",
                    path: "flags.pf2e.swashbuckler.preciseStrike.value",
                    value: 1,
                };
                source.system.rules.push(rule);
            }
        }
    }
}
