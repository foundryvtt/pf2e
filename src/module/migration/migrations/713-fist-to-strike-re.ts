import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Grant an extra fist attack from the "Powerful Fist" and "Martial Artist Dedication" items */
export class Migration713FistToStrikeRE extends MigrationBase {
    static override version = 0.713;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const fistFeatures: unknown[] = ["powerful-fist", "martial-artist-dedication"];
        if (!(itemSource.type === "feat" && fistFeatures.includes(itemSource.system.slug))) return;
        if (itemSource.system.rules.some((rule) => rule.key === "Strike")) return;

        const strike = {
            key: "Strike",
            img: "systems/pf2e/icons/features/classes/powerful-fist.webp",
            slug: "fist",
            category: "unarmed",
            damage: { base: { damageType: "bludgeoning", dice: 1, die: "d6" } },
            group: "brawling",
            label: "PF2E.Strike.Fist.Label",
            range: null,
            traits: ["agile", "finesse", "nonlethal", "unarmed"],
        };
        itemSource.system.rules = [strike];
    }
}
