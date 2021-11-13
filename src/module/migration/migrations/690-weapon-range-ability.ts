import { ItemSourcePF2e } from "@item/data";
import { WeaponRange, WeaponSystemSource } from "@item/weapon/data";
import { RANGED_WEAPON_GROUPS } from "@item/weapon/data/values";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base";

/** Normalize weapon range to numeric or null, remove ability property */
export class Migration690WeaponRangeAbility extends MigrationBase {
    /** Nice. */
    static override version = 0.69;

    private isOldRangeData(range: WeaponRange | null | { value: string }): range is { value: string } {
        return range instanceof Object && "value" in range && typeof range["value"] === "string";
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "weapon") {
            const systemData: MaybeOldData = itemSource.data;
            const hasOldRangeData = this.isOldRangeData(systemData.range);
            systemData.range = hasOldRangeData
                ? ((Number((systemData.range as { value: string }).value) || null) as WeaponRange | null)
                : systemData.range;

            if (hasOldRangeData && systemData.ability) {
                if (
                    systemData.ability.value === "str" &&
                    !tupleHasValue(RANGED_WEAPON_GROUPS, systemData.group.value)
                ) {
                    // The range thrown melee weapons are set by a thrown trait
                    systemData.range = null;
                }
                delete systemData.ability;
                systemData["-=ability"] = null;
            }

            // Correct thrown trait on ranged (rather than melee) thrown weapons
            if (tupleHasValue(RANGED_WEAPON_GROUPS, systemData.group.value)) {
                const thrownIndex = systemData.traits.value.findIndex((trait) => /^thrown-\d+/.test(trait));
                if (thrownIndex !== -1) {
                    systemData.traits.value[thrownIndex] = "thrown";
                    systemData.reload.value = "-";
                }
            }
        }

        // Remove setting of ability on Strike rule elements
        const strikeRules = itemSource.data.rules.filter((rule): rule is StrikeRuleSource =>
            rule.key.endsWith("Strike")
        );
        for (const rule of strikeRules) {
            rule.key = "Strike";
            rule.range = Number(rule.range) || null;
            delete rule.ability;
        }
    }
}

interface StrikeRuleSource extends RuleElementSource {
    ability?: unknown;
    range?: unknown;
}

type MaybeOldData = WeaponSystemSource & {
    range: WeaponRange | null | { value: string };
    ability?: { value: string };
    "-=ability"?: null;
};
