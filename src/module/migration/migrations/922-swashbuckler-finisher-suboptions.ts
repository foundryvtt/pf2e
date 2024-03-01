import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

/** Move existing swashbucklers finishers to the new mergeable suboptions **/
export class Migration922SwashbucklerFinishers extends MigrationBase {
    static override version = 0.922;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug;

        if (!slug) return;

        if (source.type === "action") {
            if (slug === "basic-finisher" || slug === "confident-finisher") {
                if (!source.system.rules.some((r) => "mergeable" in r)) {
                    source.system.rules.push(this.#buildRule(slug));
                }
            }
        } else if (source.type === "feat") {
            const featSlugs = [
                "bleeding-finisher",
                "dual-finisher",
                "impaling-finisher",
                "lethal-finisher",
                "mobile-finisher",
                "perfect-finisher",
                "stunning-finisher",
                "targeting-finisher",
                "unbalancing-finisher",
            ];

            if (!source.system.rules.some((r) => "mergeable" in r)) {
                if (featSlugs.includes(slug)) {
                    source.system.rules.push(this.#buildRule(slug));
                }
            }

            if (slug === "precise-strike") {
                source.system.rules = source.system.rules.filter((r) => !("option" in r && r.option === "finisher"));
            }
        }
    }

    #buildRule(slug: string) {
        const name = sluggify(slug, { camel: "bactrian" }).replace("Finisher", "");

        const rule = {
            disabledIf: [
                {
                    not: "self:effect:panache",
                },
            ],
            disabledValue: false,
            domain: "all",
            key: "RollOption",
            label: "PF2E.SpecificRule.Swashbuckler.Finisher.Label",
            mergeable: true,
            option: "finisher",
            suboptions: [
                {
                    label: `PF2E.SpecificRule.Swashbuckler.Finisher.${name}`,
                    value: `${slug.replace("-finisher", "")}`,
                },
            ],
            toggleable: true,
        };

        return rule;
    }
}
