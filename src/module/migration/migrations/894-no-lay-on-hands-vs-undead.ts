import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert string values in adjustName property to a boolean */
export class Migration894NoLayOnHandsVsUndead extends MigrationBase {
    static override version = 0.894;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.items = source.items.filter(
            (i) => i.type !== "spell" || (i.system.slug ?? sluggify(i.name)) !== "lay-on-hands-vs-undead",
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const { description } = source.system;
        if (source.type === "effect") {
            description.value = description.value.replace(
                /@UUID\[Compendium\.pf2e\.spells-srd\.Item\.(?:Lay on Hands \(Vs\. Undead\)|IxyD7YdRbSSucxZp)\]/g,
                "game" in globalThis
                    ? "@UUID[Compendium.pf2e.spells-srd.Item.zNN9212H2FGfM7VS]"
                    : "@UUID[Compendium.pf2e.spells-srd.Item.Lay on Hands]",
            );
        } else {
            description.value = description.value.replace(
                /<p>(?:<em>)?@UUID\[Compendium.pf2e.spells-srd\.(?:Item\.)?(?:Lay on Hands \(Vs\. Undead\)|IxyD7YdRbSSucxZp)\](?:<\/em>)?<\/p>\n?/g,
                "",
            );
        }
        if (source.type === "spell" && source.system.slug === "lay-on-hands") {
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

            if (
                source.system.overlays?.["uLuOg62dVyxvbW66"]?.overlayType === "override" &&
                source.system.overlays["uLuOg62dVyxvbW66"].system?.damage?.["b39tbePoPlJSzLku"]
            ) {
                source.system.overlays["uLuOg62dVyxvbW66"].system.damage["b39tbePoPlJSzLku"].kinds = ["healing"];
            }
        }
    }
}
