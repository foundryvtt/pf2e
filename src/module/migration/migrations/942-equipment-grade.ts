import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { Grade } from "@item/physical/types.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

export class Migration942EquipmentGrade extends MigrationBase {
    static override version = 0.942;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon" && source.type !== "armor") return;
        const isSF2eItem = source.system.traits.value.some((t) => ["tech", "analog"].includes(t));
        if (source.system.grade || !isSF2eItem) return;

        const grade =
            source.type === "weapon"
                ? weaponImprovements.findLast(
                      (f) => source.system.runes.potency >= f.potency && source.system.runes.striking >= f.striking,
                  )?.slug
                : armorImprovements.findLast(
                      (f) => source.system.runes.potency >= f.potency && source.system.runes.resilient >= f.resilient,
                  )?.slug;
        if (grade) {
            const previousProperty: string[] = source.system.runes.property;
            source.system.grade = grade;
            source.system.runes.potency = 0;
            source.system.runes.property = [];
            if (source.type === "weapon") {
                source.system.runes.striking = 0;
            } else {
                source.system.runes.resilient = 0;
            }

            // Property runes cannot be migrated, upgrades work completely differently.
            // We add a note to allow the character to correct it later.
            if (previousProperty.length && "game" in globalThis) {
                const runes = previousProperty.map((p) => {
                    const weaponKey = `PF2E.WeaponPropertyRune.${p}.Name`;
                    const armorKey = `PF2E.ArmorPropertyRune${sluggify(p, { camel: "bactrian" })}`;
                    return game.i18n.has(weaponKey)
                        ? game.i18n.localize(weaponKey)
                        : game.i18n.has(armorKey)
                          ? game.i18n.localize(armorKey)
                          : null;
                });
                source.system.description.value += `<hr/>The following property runes were removed when migrating to a tech/analog weapon: ${runes.join(", ")}`;
            }
        }
    }
}

const weaponImprovements: { slug: Grade; potency: number; striking: number }[] = [
    { slug: "commercial", potency: 0, striking: 0 },
    { slug: "tactical", potency: 1, striking: 0 },
    { slug: "advanced", potency: 1, striking: 1 },
    { slug: "superior", potency: 2, striking: 1 },
    { slug: "elite", potency: 2, striking: 2 },
    { slug: "ultimate", potency: 3, striking: 2 },
    { slug: "paragon", potency: 3, striking: 3 },
];

const armorImprovements: { slug: Grade; potency: number; resilient: number }[] = [
    { slug: "commercial", potency: 0, resilient: 0 },
    { slug: "tactical", potency: 1, resilient: 0 },
    { slug: "advanced", potency: 1, resilient: 1 },
    { slug: "superior", potency: 2, resilient: 1 },
    { slug: "elite", potency: 2, resilient: 2 },
    { slug: "ultimate", potency: 3, resilient: 2 },
    { slug: "paragon", potency: 3, resilient: 3 },
];
