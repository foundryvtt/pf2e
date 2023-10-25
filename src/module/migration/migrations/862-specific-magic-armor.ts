import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ZeroToThree } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

/** Attempt to infer armor intened as specific magic armor and mark it as such. */
export class Migration862SpecificMagicArmor extends MigrationBase {
    static override version = 0.862;

    #resilientRuneValues = new Map<string, ZeroToThree>([
        ["", 0],
        ["resilient", 1],
        ["greaterResilient", 3],
        ["majorResilient", 3],
    ]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "armor" || source.system.category === "shield") {
            return;
        }

        switch (source.system.slug) {
            case "power-suit":
                source.system.baseItem = "power-suit";
                break;
            case "subterfuge-suit":
                source.system.baseItem === "subterfuge-suit";
                break;
            case "clothing-explorers":
                source.system.slug = "explorers-clothing";
                if (source.name.endsWith("Clothing (Explorer's)")) {
                    source.name = "Explorer's Clothing";
                }
        }

        if (source.system.slug === "power-suit") source.system.baseItem ??= "power-suit";
        if (source.system.slug === "subterfuge-suit") source.system.baseItem ??= "subterfuge-suit";

        const isMagical = !!(source.system.potencyRune.value || source.system.resiliencyRune.value);
        const hasBaseAndSlug = !!(source.system.baseItem && source.system.slug);
        if (isMagical && hasBaseAndSlug && source.system.baseItem !== source.system.slug) {
            source.system.specific ??= {
                value: true,
                material: source.system.material ?? null,
                runes: {
                    potency: source.system.potencyRune?.value || 1,
                    resilient: this.#resilientRuneValues.get(source.system.resiliencyRune?.value ?? "") || 0,
                },
            };
        }
    }
}
