import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS, SAVE_TYPES, SKILL_LONG_FORMS } from "@actor/values.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import { Statistic, StatisticData } from "@system/statistic/index.ts";
import { setHasElement, tupleHasValue } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e } from "../index.ts";
import type { RuleElementSchema } from "./data.ts";

/** Create a special-purpose statistic for use in checks and as a DC */
class SpecialStatisticRuleElement extends RuleElementPF2e<StatisticRESchema> {
    static override defineSchema(): StatisticRESchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            slug: new SlugField({
                required: true,
                nullable: false,
                initial: undefined,
                validate: (v) =>
                    typeof v === "string" &&
                    !(
                        v in CONFIG.PF2E.magicTraditions ||
                        v in CONFIG.PF2E.classTraits ||
                        setHasElement(SKILL_LONG_FORMS, v) ||
                        tupleHasValue(SAVE_TYPES, v) ||
                        ["perception", "initiative"].includes(v)
                    ),
            }),
            type: new fields.StringField({
                required: true,
                choices: ["simple", "check", "attack-roll"],
                initial: "check",
            }),
            extends: new fields.StringField({ required: true, nullable: true, initial: null }),
            attribute: new fields.StringField({
                required: true,
                choices: Array.from(ATTRIBUTE_ABBREVIATIONS),
                nullable: true,
                initial: null,
            }),
        };
    }

    override afterPrepareData(): void {
        if (this.type === "simple") return;

        const checkDomains = this.type === "check" ? [`${this.slug}-check`] : [`${this.slug}-attack-roll`];
        const extendedFrom = this.extends ? this.actor.getStatistic(this.extends) : null;
        const data: StatisticData = {
            slug: this.slug,
            label: this.label,
            attribute: this.attribute ?? extendedFrom?.attribute ?? null,
            domains: [this.slug],
            check: { type: this.type === "check" ? "check" : "attack-roll", domains: checkDomains },
            dc: { domains: [`${this.slug}-dc`] },
        };

        const statistic = extendedFrom?.extend(data) ?? new Statistic(this.actor, data);
        if (statistic) {
            this.actor.synthetics.statistics.set(this.slug, statistic);
        } else {
            this.failValidation(`Unable to find statistic ${this.extends} to extend from`);
        }
    }
}

interface SpecialStatisticRuleElement
    extends RuleElementPF2e<StatisticRESchema>,
        ModelPropsFromSchema<StatisticRESchema> {
    slug: string;
}

type StatisticRESchema = RuleElementSchema & {
    type: StringField<StatisticType, StatisticType, true, false, true>;
    extends: StringField<string, string, true, true, true>;
    attribute: StringField<AttributeString, AttributeString, true, true, true>;
};

type StatisticType = "simple" | "check" | "attack-roll";

export { SpecialStatisticRuleElement };
