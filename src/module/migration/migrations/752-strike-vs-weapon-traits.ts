import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { weaponTraits } from "@scripts/config/traits.ts";
import { objectHasKey } from "@util";
import { MigrationBase } from "../base.ts";

/** Change several AdjustStrike rule elements to modify weapon traits rather than action traits */
export class Migration752StrikeVsWeaponTraits extends MigrationBase {
    static override version = 0.752;

    /** These actually change the traits on the Strike actions rather than the weapons */
    #toSkip = new Set(["ghost-hunter", "stance-arcane-cascade", "spirit-strikes"]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (this.#toSkip.has(source.system.slug ?? "")) return;

        const rules = source.system.rules.filter(
            (r: MaybeAdjustStrike): r is AdjustStrikeSource => r.key === "AdjustStrike" && r.property === "traits"
        );

        for (const rule of rules) {
            if (objectHasKey(weaponTraits, rule.value)) {
                rule.property = "weapon-traits";
            }
        }
    }
}

interface MaybeAdjustStrike extends RuleElementSource {
    property?: unknown;
}

interface AdjustStrikeSource extends MaybeAdjustStrike {
    property: string;
    value: string;
}
