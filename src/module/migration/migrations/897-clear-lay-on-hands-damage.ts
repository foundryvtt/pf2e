import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellDamageSource, SpellSystemSource } from "@item/spell/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Clear the top level of Lay on Hands (and Touch of Corruption) damage so that it is not added to overlays */
export class Migration897ClearLayOnHandsDamage extends MigrationBase {
    static override version = 0.897;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell" || !["lay-on-hands", "touch-of-corruption"].includes(source.system.slug ?? "")) {
            return;
        }
        source.system.defense = null;

        if ("heightening" in source.system) {
            const system: SpellSystemSource & { "-=heightening"?: null } = source.system;
            system["-=heightening"] = null;
        }

        const damage: Record<string, unknown> = source.system.damage;
        if (Object.keys(damage).length > 0) {
            for (const [key, partial] of Object.entries(damage)) {
                if (partial) damage[`-=${key}`] = null;
            }
        }

        for (const overlay of Object.values(source.system.overlays ?? {})) {
            if (!R.isObject(overlay) || !R.isObject(overlay.system?.damage)) {
                continue;
            }

            const damagePartials = Object.values(overlay.system?.damage ?? {});
            for (const partial of damagePartials.filter((p): p is SpellDamageSource => R.isObject(p))) {
                if (partial?.formula === "6") {
                    partial.kinds = ["healing"];
                } else {
                    partial.kinds = ["damage"];
                }
            }
        }

        if (source.system.slug === "lay-on-hands") {
            source.system.overlays ??= {
                a33QUFoKgoOprovO: {
                    name: "Lay on Hands (Vs. Undead)",
                    overlayType: "override",
                    sort: 2,
                    system: {
                        damage: {
                            "37YW4ZGhxx7Y2mdI": {
                                applyMod: false,
                                category: null,
                                formula: "1d6",
                                kinds: ["damage"],
                                materials: [],
                                type: "vitality",
                            },
                        },
                        defense: { save: { basic: true, statistic: "fortitude" } },
                        heightening: { damage: { "37YW4ZGhxx7Y2mdI": "1d6" }, interval: 1, type: "interval" },
                    },
                },
                uLuOg62dVyxvbW66: {
                    name: "Lay on Hands (Healing)",
                    overlayType: "override",
                    sort: 1,
                    system: {
                        damage: {
                            b39tbePoPlJSzLku: {
                                applyMod: false,
                                category: null,
                                formula: "6",
                                kinds: ["healing"],
                                materials: [],
                                type: "vitality",
                            },
                        },
                        heightening: { damage: { b39tbePoPlJSzLku: "6" }, interval: 1, type: "interval" },
                    },
                },
            };
        } else {
            source.system.overlays ??= {
                "2a6Vm4mIjBgrzlO2": {
                    name: "Touch of Corruption (Vs. Living)",
                    overlayType: "override",
                    sort: 2,
                    system: {
                        damage: {
                            Esn7klJ9WRsIFnrE: {
                                applyMod: false,
                                category: null,
                                formula: "1d6",
                                kinds: ["damage"],
                                materials: [],
                                type: "void",
                            },
                        },
                        defense: { save: { basic: true, statistic: "fortitude" } },
                        heightening: { damage: { Esn7klJ9WRsIFnrE: "1d6" }, interval: 1, type: "interval" },
                    },
                },
                gHIOzknAtexc6GUE: {
                    name: "Touch of Corruption (Healing)",
                    overlayType: "override",
                    sort: 1,
                    system: {
                        damage: {
                            cM137DAlBX1LcWAX: {
                                applyMod: false,
                                category: null,
                                formula: "6",
                                kinds: ["healing"],
                                materials: [],
                                type: "untyped",
                            },
                        },
                        heightening: { damage: { cM137DAlBX1LcWAX: "6" }, interval: 1, type: "interval" },
                    },
                },
            };
        }
    }
}
