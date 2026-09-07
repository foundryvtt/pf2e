import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Weapon Expertise is a shared class feature; the old thaumaturge-specific slug never matches. */
export class Migration960ThaumaturgeWeaponCritSpec extends MigrationBase {
    static override version = 0.96;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const slug = source.system.slug || sluggify(source.name);
        if (slug !== "initiate-benefit-weapon") return;

        const rules: { key: string; predicate?: JSONValue }[] = source.system.rules;
        for (const rule of rules) {
            if (rule.key !== "CriticalSpecialization" || !Array.isArray(rule.predicate)) continue;
            rule.predicate = rule.predicate.map((entry) =>
                entry === "feature:thaumaturge-weapon-expertise" ? "feature:weapon-expertise" : entry,
            );
        }
    }
}
