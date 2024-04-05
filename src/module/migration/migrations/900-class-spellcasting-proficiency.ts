import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ZeroToFour } from "@module/data.ts";
import type { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/** Record initial spellcasting proficiency in class item data */
export class Migration900ClassSpellcastingProficiency extends MigrationBase {
    static override version = 0.9;

    /** Remove persisted spellcasting proficiency */
    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" && source.system.proficiencies) {
            const proficiencies: { attacks?: object; "-=spellcasting"?: null } = source.system.proficiencies;
            if ("spellcasting" in proficiencies) {
                proficiencies["-=spellcasting"] = null;
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "class") {
            const aeLikeIncrease = source.system.rules.find(
                (r: MaybeAELike) => r.key === "ActiveEffectLike" && r.path === "system.proficiencies.spellcasting.rank",
            );
            if (aeLikeIncrease) {
                source.system.spellcasting = Math.max(1, source.system.spellcasting ?? 0) as ZeroToFour;
                source.system.rules.splice(source.system.rules.indexOf(aeLikeIncrease), 1);
            } else if (["sorcerer", "summoner", "witch"].includes(source.system.slug ?? "")) {
                source.system.spellcasting = 1;
            } else {
                source.system.spellcasting = Math.max(0, source.system.spellcasting ?? 0) as ZeroToFour;
            }
        }

        if (source.type === "feat") {
            const baseRule: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "upgrade",
                path: "system.proficiencies.spellcasting.rank",
            };

            switch (source.system.slug) {
                case "bloodline":
                case "patron":
                    source.system.rules = source.system.rules.filter(
                        (r: MaybeAELike) => r.path !== "system.proficiencies.spellcasting.rank",
                    );
                    break;
                case "expert-spellcaster": {
                    const rule = { ...baseRule, value: 2 };
                    source.system.rules = [rule];
                    source.system.publication = {
                        ...(source.system.publication ?? {}),
                        license: "ORC",
                        remaster: true,
                        title: "Pathfinder Player Core",
                    };
                    break;
                }
                case "expert-spellcasting": {
                    const rule = { ...baseRule, value: 2 };
                    source.system.rules = [rule];
                    break;
                }
                case "master-spellcaster": {
                    const rule = { ...baseRule, value: 3 };
                    source.system.rules = [rule];
                    source.system.publication = {
                        ...(source.system.publication ?? {}),
                        license: "ORC",
                        remaster: true,
                        title: "Pathfinder Player Core",
                    };
                    break;
                }
                case "master-spellcasting": {
                    const rule = { ...baseRule, value: 3 };
                    source.system.rules = [rule];
                    break;
                }
                case "legendary-spellcaster": {
                    const rule = { ...baseRule, value: 4 };
                    source.system.rules = [rule];
                    source.system.publication = {
                        ...(source.system.publication ?? {}),
                        license: "ORC",
                        remaster: true,
                        title: "Pathfinder Player Core",
                    };
                    break;
                }
            }
        }
    }
}

type MaybeAELike = AELikeSource;
