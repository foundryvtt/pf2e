import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Catch up Gunslinger class features with newly-included REs */
export class Migration705GunslingerCatchUp extends MigrationBase {
    static override version = 0.705;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (!(itemSource.type === "feat" && itemSource.system.featType.value === "classfeature")) return;

        switch (itemSource.system.slug) {
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
                itemSource.system.rules = rules;
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
                itemSource.system.rules = rules;
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
                itemSource.system.rules = rules;
                break;
            }
        }
    }
}
