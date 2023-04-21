import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Record PC sneak attack damage in an actor flag for reuse by related abilities */
export class Migration824SneakAttackDamageSource extends MigrationBase {
    static override version = 0.824;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        switch (source.system.slug) {
            case "sneak-attack": {
                const rules = [
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.number",
                        predicate: ["class:rogue"],
                        value: "ternary(lt(@actor.level, 5), 1, ternary(lt(@actor.level, 11), 2, ternary(lt(@actor.level, 17), 3, 4)))",
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.faces",
                        predicate: ["class:rogue"],
                        value: 6,
                    },
                    {
                        category: "precision",
                        diceNumber: "@actor.flags.pf2e.sneakAttackDamage.number",
                        dieSize: "d{actor|flags.pf2e.sneakAttackDamage.faces}",
                        key: "DamageDice",
                        predicate: [
                            "target:condition:flat-footed",
                            {
                                or: [
                                    "item:trait:agile",
                                    "item:trait:finesse",
                                    { and: ["item:ranged", { not: "item:thrown-melee" }] },
                                ],
                            },
                        ],
                        selector: "strike-damage",
                    },
                    {
                        domain: "all",
                        key: "RollOption",
                        label: "PF2E.SpecificRule.TOTMToggle.FlatFooted",
                        option: "target:condition:flat-footed",
                        toggleable: "totm",
                    },
                ];

                source.system.rules = rules;
                return;
            }
            case "ruffian": {
                const rules = [
                    {
                        category: "precision",
                        diceNumber: "@actor.flags.pf2e.sneakAttackDamage.number",
                        dieSize: "d{actor|flags.pf2e.sneakAttackDamage.faces}",
                        key: "DamageDice",
                        label: "PF2E.SpecificRule.SneakAttack",
                        predicate: [
                            "target:condition:flat-footed",
                            "item:category:simple",
                            {
                                nor: [
                                    { and: ["item:ranged", { not: "item:thrown-melee" }] },
                                    "item:trait:agile",
                                    "item:trait:finesse",
                                ],
                            },
                        ],
                        selector: "strike-damage",
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.martial.medium.rank",
                        value: 1,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "upgrade",
                        path: "system.skills.itm.rank",
                        value: 1,
                    },
                    {
                        key: "CriticalSpecialization",
                        predicate: [
                            "target:condition:flat-footed",
                            "item:category:simple",
                            { lte: ["item:damage:die:faces", 8] },
                        ],
                    },
                ];
                source.system.rules = rules;
                return;
            }
            case "sneak-attacker": {
                const rules = [
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.number",
                        value: 1,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.faces",
                        value: "ternary(lt(@actor.level, 6), 4, 6)",
                    },
                    { key: "GrantItem", uuid: "Compendium.pf2e.classfeatures.Sneak Attack" },
                ];
                source.system.rules = rules;
                return;
            }
            case "butterflys-sting": {
                const rules = [
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.number",
                        value: 1,
                    },
                    {
                        key: "ActiveEffectLike",
                        mode: "override",
                        path: "flags.pf2e.sneakAttackDamage.faces",
                        value: 6,
                    },
                    { key: "GrantItem", uuid: "Compendium.pf2e.classfeatures.Sneak Attack" },
                    {
                        domain: "all",
                        key: "RollOption",
                        label: "PF2E.SpecificRule.TOTMToggle.FlatFooted",
                        option: "target:condition:flat-footed",
                        toggleable: "totm",
                    },
                ];
                source.system.rules = rules;
                return;
            }
            case "magical-trickster": {
                const rules = [
                    {
                        category: "precision",
                        diceNumber: "@actor.flags.pf2e.sneakAttackDamage.number",
                        dieSize: "d{actor|flags.pf2e.sneakAttackDamage.faces}",
                        key: "DamageDice",
                        predicate: ["item:trait:attack", "target:condition:flat-footed"],
                        selector: "spell-damage",
                    },
                ];
                source.system.rules = rules;
                return;
            }
        }
    }
}
