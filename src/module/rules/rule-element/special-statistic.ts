import type { CreaturePF2e } from "@actor";
import { Modifier } from "@actor/modifiers.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS, SAVE_TYPES } from "@actor/values.ts";
import type { MagicTradition } from "@item/spell/types.ts";
import { ItemSpellcasting } from "@item/spellcasting-entry/item-spellcasting.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { Statistic, StatisticData } from "@system/statistic/index.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { RuleElement } from "../index.ts";
import type { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/** Create a special-purpose statistic for use in checks and as a DC */
class SpecialStatisticRuleElement extends RuleElement<SpecialStatisticSchema> {
    static override validActorTypes = ["character", "npc"] satisfies ("character" | "npc")[];

    static override defineSchema(): SpecialStatisticSchema {
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
                        v in CONFIG.PF2E.skills ||
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
                required: false,
                choices: Array.from(ATTRIBUTE_ABBREVIATIONS),
                nullable: true,
                initial: null,
            }),
            baseModifier: new fields.SchemaField(
                {
                    mod: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
                    check: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
                    dc: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
                },
                { required: false, nullable: true, initial: null },
            ),
            itemCasting: new fields.SchemaField(
                {
                    predicate: new PredicateField({ required: true, nullable: false }),
                    tradition: new fields.StringField({
                        required: false,
                        nullable: true,
                        choices: () => CONFIG.PF2E.magicTraditions,
                        initial: null,
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
        };
    }

    override afterPrepareData(): void {
        if (this.type === "simple") return;

        const actor = this.actor;
        const checkDomains = this.type === "check" ? [`${this.slug}-check`] : [`${this.slug}-attack-roll`];
        const extendedFrom = this.extends
            ? (actor.getStatistic(this.extends) ?? actor.synthetics.statistics.get(this.extends) ?? null)
            : null;
        if (this.extends && !extendedFrom) {
            return this.failValidation(`extends: unable to resolve statistic "${this.extends}"`);
        }

        const label = this.itemCasting ? (extendedFrom?.label ?? this.label) : this.label;
        const checkType = this.type === "check" ? "check" : "attack-roll";
        const modCheckDC =
            this.baseModifier && actor.type === "npc"
                ? R.mapValues(this.baseModifier, (value, key) => {
                      const slug = typeof this.baseModifier?.mod === "number" && key !== "mod" ? `base-${key}` : "base";
                      const label = "PF2E.ModifierTitle";
                      const modifier = typeof value === "number" && key === "dc" ? value - 10 : value;
                      return typeof modifier === "number" ? [new Modifier({ slug, label, modifier })] : [];
                  })
                : { mod: [], check: [], dc: [] };

        const data: Required<Omit<StatisticData, "filter" | "lore" | "proficient" | "rank" | "rollOptions">> = {
            slug: this.slug,
            label,
            attribute: this.attribute ?? extendedFrom?.attribute ?? null,
            domains: [this.slug],
            modifiers: modCheckDC.mod,
            check: { type: checkType, domains: checkDomains, modifiers: modCheckDC.check },
            dc: { domains: [`${this.slug}-dc`], modifiers: modCheckDC.dc },
        };

        const statistic = extendedFrom?.extend(data) ?? new Statistic(actor, data);
        if (statistic) {
            actor.synthetics.statistics.set(this.slug, statistic);
            if (this.itemCasting) {
                actor.spellcasting.set(
                    this.slug,
                    new ItemSpellcasting({
                        id: this.slug,
                        name: this.label,
                        actor,
                        statistic,
                        castPredicate: this.itemCasting.predicate,
                        tradition: this.itemCasting.tradition,
                    }),
                );
            }
        } else {
            this.failValidation(`Unable to find statistic ${this.extends} to extend from`);
        }
    }
}

interface SpecialStatisticRuleElement
    extends RuleElement<SpecialStatisticSchema>,
        ModelPropsFromRESchema<SpecialStatisticSchema> {
    slug: string;

    get actor(): CreaturePF2e;
}

type SpecialStatisticSchema = RuleElementSchema & {
    type: fields.StringField<StatisticType, StatisticType, true, false, true>;
    /** A base statistic from which to extend */
    extends: fields.StringField<string, string, true, true, true>;
    /** An attribute to associate with the statistic */
    attribute: fields.StringField<AttributeString, AttributeString, false, true, true>;
    /** A base modifier for use with NPC special statistics: separate check and DC values may also be specified. */
    baseModifier: fields.SchemaField<
        {
            mod: fields.NumberField<number, number, false, true, true>;
            check: fields.NumberField<number, number, false, true, true>;
            dc: fields.NumberField<number, number, false, true, true>;
        },
        { mod: number | null; check: number | null; dc: number | null },
        { mod: number | null; check: number | null; dc: number | null },
        false,
        true,
        true
    >;
    itemCasting: fields.SchemaField<
        ItemCastingSchema,
        { predicate: RawPredicate; tradition: MagicTradition | null },
        { predicate: Predicate; tradition: MagicTradition | null },
        false,
        true,
        true
    >;
};

type ItemCastingSchema = {
    predicate: PredicateField<true, false, false>;
    tradition: fields.StringField<MagicTradition, MagicTradition, false, true, true>;
};

type StatisticType = "simple" | "check" | "attack-roll";

export { SpecialStatisticRuleElement };
