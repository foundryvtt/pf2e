import { ItemSourcePF2e } from "@item/data/index.ts";
import { WeaponSystemSource } from "@item/weapon/data.ts";
import { WeaponCategory, WeaponGroup, WeaponRangeIncrement } from "@item/weapon/types.ts";
import { MANDATORY_RANGED_GROUPS } from "@item/weapon/values.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject, setHasElement } from "@util";
import { MigrationBase } from "../base.ts";

/** Normalize weapon range to numeric or null, remove ability property, and let's do category and group too! */
export class Migration691WeaponRangeAbilityCategoryGroup extends MigrationBase {
    static override version = 0.691;

    private isOldGroupData(group: OldOrNewGroup): group is { value: WeaponGroup | null } {
        return isObject<{ value: unknown }>(group) && (typeof group.value === "string" || group.value === null);
    }

    private isOldRangeData(range: WeaponRangeIncrement | null | { value: string }): range is { value: string } {
        return range instanceof Object && "value" in range && typeof range["value"] === "string";
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "weapon") {
            const systemData: MaybeOldData = itemSource.system;

            // Category
            systemData.category =
                (systemData.weaponType ? systemData.weaponType.value : systemData.category) || "simple";
            if (systemData.weaponType) {
                systemData["-=weaponType"] = null;
                if (!("game" in globalThis)) delete systemData.weaponType;
            }

            // Group
            systemData.group =
                (this.isOldGroupData(systemData.group) ? systemData.group.value : systemData.group) || null;

            // Range
            const hasOldRangeData = this.isOldRangeData(systemData.range);
            systemData.range = hasOldRangeData
                ? ((Number((systemData.range as { value: string }).value) || null) as WeaponRangeIncrement | null)
                : systemData.range;

            if (hasOldRangeData && isObject(systemData.ability)) {
                if (systemData.ability.value === "str" && !setHasElement(MANDATORY_RANGED_GROUPS, systemData.group)) {
                    // The range thrown melee weapons are set by a thrown trait
                    systemData.range = null;
                }
                delete systemData.ability;
                systemData["-=ability"] = null;
            }

            // Correct thrown trait on ranged (rather than melee) thrown weapons
            if (setHasElement(MANDATORY_RANGED_GROUPS, systemData.group)) {
                const thrownIndex = systemData.traits.value.findIndex((trait) => /^thrown-\d+/.test(trait));
                if (thrownIndex !== -1) {
                    systemData.traits.value[thrownIndex] = "thrown";
                    systemData.reload.value = "-";
                }
            }

            // Falchions and knuckle daggers have been languishing with no group for a very long time
            if (systemData.baseItem === "falchion") {
                systemData.group = "sword";
            } else if (systemData.baseItem === "orc-knuckle-dagger") {
                systemData.group = "knife";
            }
        }

        // Remove setting of ability on Strike rule elements
        const { rules } = itemSource.system;
        const strikeRules = rules.filter((rule): rule is StrikeRuleSource => /\bStrike$/.test(String(rule.key)));
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

type OldOrNewGroup = WeaponGroup | null | { value: WeaponGroup | null };
type MaybeOldData = WeaponSystemSource & {
    weaponType?: { value: WeaponCategory };
    "-=weaponType"?: null;
    group: OldOrNewGroup;
    range: WeaponRangeIncrement | null | { value: string };
    ability?: string | { value: string } | null;
    "-=ability"?: null;
};
