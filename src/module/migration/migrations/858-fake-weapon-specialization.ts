import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { sluggify } from "@util";
import { RuleElementSource } from "@module/rules/index.ts";

/**
 * Several classes have their own ad-hoc "weapon specialization" that injected a roll option to trick the system, which were
 * removed for a more "correct" solution, but unfortunately it turns out they're actually required for things like barbarian rage.
 */
export class Migration858FakeWeaponSpecialization extends MigrationBase {
    static override version = 0.858;

    #testHasOption(source: ItemSourcePF2e) {
        return source.system.rules.some(
            (r) =>
                r.key === "RollOption" &&
                "option" in r &&
                ["feature:greater-weapon-specialization", "feature:weapon-specialization"].includes(String(r.option)),
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const slug = source.system.slug ?? sluggify(source.name);
        if (slug === "greater-weapon-specialization-barbarian" && !this.#testHasOption(source)) {
            source.system.rules.push({
                domain: "all",
                key: "RollOption",
                option: "feature:greater-weapon-specialization",
            } as RuleElementSource);
        } else if (slug === "psychic-weapon-specialization" && !this.#testHasOption(source)) {
            source.system.rules.push({
                domain: "all",
                key: "RollOption",
                option: "feature:weapon-specialization",
            } as RuleElementSource);
        }
    }
}
