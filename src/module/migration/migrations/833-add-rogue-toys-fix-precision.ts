import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add rule elements to Surprise Attack and Dread Striker, fix damage type of Precision edge */
export class Migration833AddRogueToysFixPrecision extends MigrationBase {
    static override version = 0.833;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        switch (source.system.slug) {
            case "surprise-attack": {
                const rules = [
                    {
                        key: "EphemeralEffect",
                        predicate: [
                            "encounter:round:1",
                            {
                                lt: ["self:participant:initiative:rank", "target:participant:initiative:rank"],
                            },
                            {
                                or: [
                                    "self:participant:initiative:stat:deception",
                                    "self:participant:initiative:stat:stealth",
                                ],
                            },
                        ],
                        selectors: ["strike-attack-roll", "spell-attack-roll", "strike-damage", "attack-spell-damage"],
                        uuid: "Compendium.pf2e.conditionitems.AJh5ex99aV6VTggg",
                    },
                ];
                source.system.rules = rules;
                break;
            }
            case "dread-striker": {
                const rules = [
                    {
                        key: "EphemeralEffect",
                        predicate: ["target:condition:frightened"],
                        selectors: ["strike-attack-roll", "spell-attack-roll", "strike-damage", "attack-spell-damage"],
                        uuid: "Compendium.pf2e.conditionitems.AJh5ex99aV6VTggg",
                    },
                ];
                source.system.rules = rules;
                break;
            }
            case "precision": {
                if (source.system.rules.some((r) => "damageType" in r && r.damageType === "precision")) {
                    const rules = [
                        {
                            domain: "all",
                            key: "RollOption",
                            label: "PF2E.SpecificRule.Ranger.HuntersEdge.FirstAttack",
                            option: "first-attack",
                            toggleable: true,
                        },
                        {
                            category: "precision",
                            diceNumber: "ternary(lt(@actor.level, 11), 1, ternary(lt(@actor.level, 19), 2, 3))",
                            dieSize: "d8",
                            key: "DamageDice",
                            predicate: ["first-attack"],
                            selector: "strike-damage",
                        },
                    ];
                    source.system.rules = rules;
                }
                break;
            }
        }
    }
}
