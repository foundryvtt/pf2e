import { AuraColors, AuraEffectData, SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { EffectTrait } from "@item/abstract-effect/data.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import type {
    ArrayField,
    BooleanField,
    ColorField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField, RuleElementSchema, RuleValue } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

/** A Pathfinder 2e aura, capable of transmitting effects and with a visual representation on the canvas */
class AuraRuleElement extends RuleElementPF2e<AuraSchema> {
    constructor(source: AuraRuleElementSource, options: RuleElementOptions) {
        super(source, options);
        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        for (const effect of this.effects) {
            effect.includesSelf ??= effect.affects !== "enemies";
            effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        }
    }

    static override defineSchema(): AuraSchema {
        const { fields } = foundry.data;

        const auraTraitField = new fields.StringField<EffectTrait, EffectTrait, true, false, false>({
            required: true,
            nullable: false,
            initial: undefined,
            choices: { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.actionTraits },
        });

        const effectSchemaField: SchemaField<AuraEffectSchema> = new fields.SchemaField({
            uuid: new fields.StringField({ required: true, blank: false, nullable: false, initial: undefined }),
            affects: new fields.StringField({
                required: true,
                nullable: false,
                blank: false,
                initial: "all",
                choices: ["allies", "enemies", "all"],
            }),
            events: new fields.ArrayField(
                new fields.StringField({
                    required: true,
                    blank: false,
                    nullable: false,
                    initial: undefined,
                    choices: ["enter", "turn-start", "turn-end"],
                }),
                { required: true, nullable: false, initial: ["enter"] }
            ),
            save: new fields.SchemaField(
                {
                    type: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                        choices: SAVE_TYPES,
                    }),
                    dc: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
                },
                { required: true, nullable: true, initial: null }
            ),
            predicate: new PredicateField({ required: false, nullable: false }),
            removeOnExit: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            includesSelf: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        });

        return {
            ...super.defineSchema(),
            radius: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            traits: new fields.ArrayField(auraTraitField, { required: true, nullable: false, initial: [] }),
            effects: new fields.ArrayField(effectSchemaField, { required: false, nullable: false, initial: [] }),
            colors: new fields.SchemaField(
                {
                    border: new fields.ColorField({ required: false, nullable: true, initial: null }),
                    fill: new fields.ColorField({ required: false, nullable: true, initial: null }),
                },
                { required: false, nullable: true, initial: null }
            ),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamped(Number(this.resolveValue(this.radius)), 5, 240);

        if (Number.isInteger(radius) && radius > 0 && radius % 5 === 0) {
            const data = {
                slug: this.slug,
                level: this.item.system.level?.value ?? null,
                radius,
                effects: this.#processEffects(),
                traits: this.traits,
                colors: this.colors,
            };

            // Late validation check of effect UUID
            for (const effect of data.effects) {
                const indexEntry = fromUuidSync(effect.uuid);
                if (!(indexEntry && "type" in indexEntry && typeof indexEntry.type === "string")) {
                    this.failValidation(`Unable to resolve effect uuid: ${effect.uuid}`);
                    return;
                }
                if (!["effect", "affliction"].includes(indexEntry.type)) {
                    this.failValidation(`effects transmitted by auras must be of type "effect" or "affliction"`);
                }
            }

            this.actor.auras.set(this.slug, data);
        }
    }

    /** Resolve level values on effects */
    #processEffects(): AuraEffectData[] {
        return this.effects.map((e) => ({
            ...e,
            uuid: this.resolveInjectedProperties(e.uuid),
            level: this.item.system.level?.value ?? null,
            save: null,
        }));
    }
}

interface AuraRuleElement extends RuleElementPF2e<AuraSchema>, ModelPropsFromSchema<AuraSchema> {
    slug: string;
    effects: AuraEffectREData[];
}

type AuraSchema = RuleElementSchema & {
    /** The radius of the order in feet, or a string that will resolve to one */
    radius: ResolvableValueField<true, false, false>;
    /** Associated traits, including ones that determine transmission through walls ("visual", "auditory") */
    traits: ArrayField<
        StringField<EffectTrait, EffectTrait, true, false, false>,
        EffectTrait[],
        EffectTrait[],
        true,
        false,
        true
    >;
    /** References to effects included in this aura */
    effects: ArrayField<
        SchemaField<AuraEffectSchema>,
        SourceFromSchema<AuraEffectSchema>[],
        ModelPropsFromSchema<AuraEffectSchema>[],
        false,
        false,
        true
    >;
    /**
     * Custom border and fill colors for the aura: if omitted, the border color will be black, and the fill color the
     * user's assigned color
     */
    colors: SchemaField<
        {
            border: ColorField<false, true, true>;
            fill: ColorField<false, true, true>;
        },
        AuraColors,
        AuraColors,
        false,
        true,
        true
    >;
};

type AuraEffectSchema = {
    uuid: StringField<string, string, true, false, false>;
    affects: StringField<"allies" | "enemies" | "all", "allies" | "enemies" | "all", true, false, true>;
    events: ArrayField<
        StringField<"enter" | "turn-start" | "turn-end", "enter" | "turn-start" | "turn-end", true, false, false>,
        ("enter" | "turn-start" | "turn-end")[],
        ("enter" | "turn-start" | "turn-end")[],
        true,
        false,
        true
    >;
    save: SchemaField<
        {
            type: StringField<SaveType, SaveType, true, false, false>;
            dc: ResolvableValueField<true, false, false>;
        },
        { type: SaveType; dc: RuleValue },
        { type: SaveType; dc: RuleValue },
        true,
        true,
        true
    >;
    predicate: PredicateField<false, false, true>;
    removeOnExit: BooleanField<boolean, boolean, false, false, false>;
    includesSelf: BooleanField<boolean, boolean, false, false, false>;
};

interface AuraEffectREData extends ModelPropsFromSchema<AuraEffectSchema> {
    includesSelf: boolean;
    removeOnExit: boolean;
}

interface AuraRuleElementSource extends RuleElementSource {
    radius?: unknown;
    effects?: unknown;
    traits?: unknown;
    colors?: unknown;
}

export { AuraRuleElement };
