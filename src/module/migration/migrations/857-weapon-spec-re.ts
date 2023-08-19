import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { sluggify } from "@util";
import { RuleElementSource } from "@module/rules/index.ts";

/**
 * Move weapon specialization to rule elements.
 * Note that several classes have their own ad-hoc "weapon specialization" that inject a roll option to trick the system
 */
export class Migration857WeaponSpecializationRE extends MigrationBase {
    static override version = 0.857;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug ?? sluggify(source.name);
        if (!slug.includes("weapon-specialization") || slug.includes("eidolon-weapon-specialization")) {
            return;
        }

        // If this already has the REs, skip
        const hasREs = source.system.rules.some((r) => r.slug === "weapon-specialization");
        if (hasREs) return;

        // Filter out any rules that attempt to "trick" weapon spec first
        source.system.rules = source.system.rules.filter(
            (r) =>
                !(
                    r.key === "RollOption" &&
                    "option" in r &&
                    ["feature:greater-weapon-specialization", "feature:weapon-specialization"].includes(
                        String(r.option)
                    )
                )
        );

        // Add the new rule elements
        if (slug.includes("greater-weapon-specialization")) {
            source.system.rules.unshift({
                key: "AdjustModifier",
                mode: "multiply",
                relabel: "PF2E.GreaterWeaponSpecialization",
                selector: "strike-damage",
                slug: "weapon-specialization",
                value: 2,
            } as RuleElementSource);
        } else {
            source.system.rules.unshift(
                {
                    hideIfDisabled: true,
                    key: "FlatModifier",
                    label: "PF2E.WeaponSpecialization",
                    predicate: [
                        {
                            gte: ["item:proficiency:rank", 2],
                        },
                    ],
                    selector: "strike-damage",
                    slug: "weapon-specialization",
                    value: 2,
                } as RuleElementSource,
                {
                    key: "AdjustModifier",
                    mode: "upgrade",
                    predicate: ["item:proficiency:rank:3"],
                    priority: 0,
                    selector: "strike-damage",
                    slug: "weapon-specialization",
                    value: 3,
                } as RuleElementSource,
                {
                    key: "AdjustModifier",
                    mode: "upgrade",
                    predicate: ["item:proficiency:rank:4"],
                    priority: 0,
                    selector: "strike-damage",
                    slug: "weapon-specialization",
                    value: 4,
                } as RuleElementSource
            );
        }
    }
}
