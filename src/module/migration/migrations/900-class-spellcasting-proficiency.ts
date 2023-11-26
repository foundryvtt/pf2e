import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ZeroToFour } from "@module/data.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { MigrationBase } from "../base.ts";

/** Record initial spellcasting proficiency in class item data */
export class Migration900ClassSpellcastingProficiency extends MigrationBase {
    static override version = 0.9;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "class") {
            const aeLikeIncrease = source.system.rules.find(
                (r: MaybeAELike) => r.key === "ActiveEffectLike" && r.path === "system.proficiencies.spellcasting.rank",
            );
            if (aeLikeIncrease) {
                source.system.spellcasting = Math.max(1, source.system.spellcasting ?? 0) as ZeroToFour;
                source.system.rules.splice(source.system.rules.indexOf(aeLikeIncrease), 1);
            } else if (["sorcerer", "summoner", "witch", "wizard"].includes(source.system.slug ?? "")) {
                source.system.spellcasting = 1;
            } else {
                source.system.spellcasting = Math.max(0, source.system.spellcasting ?? 0) as ZeroToFour;
            }
        }

        if (source.type === "feat" && source.system.slug?.includes("spellcast")) {
            const baseRule: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "upgrade",
                path: "system.proficiencies.spellcasting.rank",
            };

            switch (source.system.slug) {
                case "expert-spellcaster":
                case "expert-spellcasting":
                    source.system.rules = [{ ...baseRule, value: 2 }];
                    break;
                case "master-spellcaster":
                case "master-spellcasting":
                    source.system.rules = [{ ...baseRule, value: 3 }];
                    break;
                case "legendary-spellcaster":
                    source.system.rules = [{ ...baseRule, value: 4 }];
                    break;
            }
        }
    }
}

type MaybeAELike = AELikeSource;
