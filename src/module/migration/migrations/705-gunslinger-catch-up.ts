import { FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Catch up Gunslinger class features with newly-included REs */
export class Migration705GunslingerCatchUp extends MigrationBase {
    static override version = 0.705;

    #isClassFeature(source: ItemSourcePF2e): source is FeatSource & { system: { featType: "classfeature" } } {
        return (
            source.type === "feat" &&
            "featType" in source.system &&
            isObject<{ value: string }>(source.system.featType) &&
            source.system.featType.value === "classfeature"
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!this.#isClassFeature(source)) return;

        switch (source.system.slug) {
            case "singular-expertise": {
                const rules = [
                    {
                        key: "FlatModifier",
                        selector: "firearm-weapon-group-damage",
                        type: "circumstance",
                        value: 1,
                    },
                    {
                        key: "FlatModifier",
                        predicate: { all: ["weapon:tag:crossbow"] },
                        selector: "bow-weapon-group-damage",
                        type: "circumstance",
                        value: 1,
                    },
                ];
                source.system.rules = rules;
                break;
            }
            case "gunslinger-weapon-mastery": {
                const rules = [
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.unarmed.rank",
                        value: 2,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.simple.rank",
                        value: 2,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.martial.rank",
                        value: 2,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.advanced-firearms-crossbows.rank",
                        value: 2,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.simple-firearms-crossbows.rank",
                        value: 3,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.martial-firearms-crossbows.rank",
                        value: 3,
                    },
                ];
                source.system.rules = rules;
                break;
            }
            case "gunslinging-legend": {
                const rules = [
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.unarmed.rank",
                        value: 3,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.simple.rank",
                        value: 3,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.martial.rank",
                        value: 3,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.advanced-firearms-crossbows.rank",
                        value: 3,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.simple-firearms-crossbows.rank",
                        value: 4,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.martial-firearms-crossbows.rank",
                        value: 4,
                    },
                ];
                source.system.rules = rules;
                break;
            }
        }
    }
}
