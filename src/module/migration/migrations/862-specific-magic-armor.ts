import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ZeroToFour, ZeroToThree } from "@module/data.ts";
import * as R from "remeda";
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
        if (source.type !== "armor" || (source.system.category as string) === "shield") {
            return;
        }

        switch (source.system.slug) {
            case "power-suit":
                source.system.baseItem = "power-suit";
                break;
            case "subterfuge-suit":
                source.system.baseItem = "subterfuge-suit";
                break;
            case "clothing-explorers":
                source.system.slug = "explorers-clothing";
                if (source.name.endsWith("Clothing (Explorer's)")) {
                    source.name = "Explorer's Clothing";
                }
        }

        if (source.system.slug === "power-suit") source.system.baseItem ??= "power-suit";
        if (source.system.slug === "subterfuge-suit") source.system.baseItem ??= "subterfuge-suit";

        const isMagical = !!(
            ("potencyRune" in source.system &&
                R.isPlainObject(source.system.potencyRune) &&
                source.system.potencyRune.value) ||
            ("resiliencyRune" in source.system &&
                R.isPlainObject(source.system.resiliencyRune) &&
                source.system.resiliencyRune.value)
        );
        const hasBaseAndSlug = !!(source.system.baseItem && source.system.slug);
        if (hasBaseAndSlug && isMagical && source.system.baseItem !== source.system.slug) {
            const system: { specific?: object | null } = source.system;
            system.specific ??= {
                value: true,
                material: source.system.material ?? null,
                runes: {
                    potency:
                        "potencyRune" in source.system &&
                        R.isPlainObject(source.system.potencyRune) &&
                        source.system.potencyRune.value
                            ? (Number(source.system.potencyRune?.value) as ZeroToFour) || 1
                            : 0,
                    resilient:
                        "resiliencyRune" in source.system &&
                        R.isPlainObject(source.system.resiliencyRune) &&
                        source.system.resiliencyRune.value
                            ? (this.#resilientRuneValues.get(
                                  String(source.system.resiliencyRune?.value ?? ""),
                              ) as ZeroToThree) || 1
                            : 0 || 0,
                    property: [],
                },
            };
        }
    }
}
