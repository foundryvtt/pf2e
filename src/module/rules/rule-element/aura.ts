import { AuraAppearanceData, AuraData, AuraEffectData, SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { EffectTrait } from "@item/abstract-effect/data.ts";
import { PredicateField, StrictArrayField, StrictNumberField } from "@system/schema-data-fields.ts";
import { isImageOrVideoPath, sluggify } from "@util";
import * as R from "remeda";
import type {
    AlphaField,
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
    declare appearance: AuraREAppearanceData;

    constructor(source: AuraRuleElementSource, options: RuleElementOptions) {
        super(source, options);
        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        for (const effect of this.effects) {
            effect.includesSelf ??= effect.affects !== "enemies";
            effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        }

        this.appearance = mergeObject(this.schema.fields.appearance.clean({}) ?? {}, this.appearance ?? {});
        this.appearance.highlight.color ??= ((): HexColorString => {
            const { actor } = this;
            const user =
                game.users.find((u) => u.character === actor) ??
                game.users.players.find((u) => actor.testUserPermission(u, "OWNER")) ??
                actor.primaryUpdater;
            return user?.color ?? "#43dfdf";
        })();
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

        const xyPairSchema = ({ integer }: { integer: boolean }): XYPairSchema => ({
            x: new StrictNumberField({
                required: true,
                integer,
                nullable: false,
                initial: undefined,
            }),
            y: new StrictNumberField({
                required: true,
                integer,
                nullable: false,
                initial: undefined,
            }),
        });

        const appearanceSchema: AuraAppearanceSchema = {
            border: new fields.SchemaField(
                {
                    color: new fields.ColorField({ required: true, nullable: false, initial: "#000000" }),
                    alpha: new fields.AlphaField({ required: true, nullable: false, initial: 0.5 }),
                } as const,
                { required: false, nullable: true, initial: () => ({ alpha: 0.5, color: "#000000" }) } as const
            ),
            highlight: new fields.SchemaField(
                {
                    color: new fields.ColorField({ required: false, nullable: false, initial: undefined }),
                    alpha: new fields.AlphaField({ required: false, nullable: false, initial: 0.25 }),
                } as const,
                { required: false, nullable: false, initial: () => ({ alpha: 0.25, color: undefined }) }
            ),
            texture: new fields.SchemaField(
                {
                    src: new fields.StringField({ required: true, nullable: false, initial: undefined }),
                    alpha: new fields.AlphaField({ required: true, nullable: false, initial: 0.5 }),
                    scale: new StrictNumberField({ required: true, nullable: false, positive: true, initial: 1 }),
                    translation: new fields.SchemaField(xyPairSchema({ integer: true }), {
                        required: false,
                        nullable: false,
                        initial: undefined,
                    } as const),
                } as const,
                { required: false, nullable: true, initial: null }
            ),
        };

        return {
            ...super.defineSchema(),
            radius: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            level: new ResolvableValueField({ required: false, nullable: true, initial: null }),
            traits: new StrictArrayField(auraTraitField, { required: true, nullable: false, initial: [] }),
            effects: new StrictArrayField(effectSchemaField, { required: false, nullable: false, initial: [] }),
            appearance: new fields.SchemaField(appearanceSchema, {
                required: false,
                nullable: false,
                initial: undefined,
            }),
            mergeExisting: new fields.BooleanField({ required: false, nullable: false, initial: true }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamped(Math.ceil(Number(this.resolveValue(this.radius)) / 5) * 5, 5, 240);

        if (Number.isInteger(radius) && radius > 0) {
            const level = this.resolveValue(this.level);
            const data: AuraData = {
                slug: this.slug,
                radius,
                level:
                    typeof level === "number"
                        ? Math.trunc(level)
                        : this.item.isOfType("effect")
                        ? this.item.level
                        : null,
                effects: this.#processEffects(),
                traits: R.uniq(this.traits.filter((t) => t !== "aura")).sort(),
                appearance: this.#processAppearanceData(),
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

            const existing = this.actor.auras.get(this.slug);
            if (existing && this.mergeExisting) {
                existing.radius = data.radius;
                existing.traits = R.uniq([...existing.traits, ...data.traits]).sort();
                for (const effect of data.effects) {
                    const existingIndex = existing.effects.findIndex((e) => e.uuid === effect.uuid);
                    if (existingIndex !== -1) {
                        existing.effects.splice(existingIndex, 1, effect);
                    } else {
                        existing.effects.push(effect);
                    }
                }
            } else {
                this.actor.auras.set(this.slug, data);
            }
        }
    }

    /** Resolve level values on effects */
    #processEffects(): AuraEffectData[] {
        return this.effects.map((e) => ({
            ...e,
            uuid: this.resolveInjectedProperties(e.uuid),
            save: null,
        }));
    }

    #processAppearanceData(): AuraAppearanceData {
        const { border, highlight, texture } = this.appearance;
        const textureSrc = ((): ImageFilePath | VideoFilePath | null => {
            if (!texture) return null;
            const maybeTextureSrc = this.resolveInjectedProperties(texture.src);
            return isImageOrVideoPath(maybeTextureSrc) ? maybeTextureSrc : "icons/svg/hazard.svg";
        })();

        return {
            border: border && { color: Number(Color.fromString(border.color)), alpha: border.alpha },
            highlight: { color: Number(Color.fromString(highlight.color!)), alpha: highlight.alpha },
            texture:
                texture?.alpha && textureSrc
                    ? {
                          src: textureSrc,
                          alpha: texture.alpha,
                          scale: texture.scale,
                          translation: texture.translation ?? null,
                      }
                    : null,
        };
    }
}

interface AuraRuleElement extends RuleElementPF2e<AuraSchema>, ModelPropsFromSchema<AuraSchema> {
    slug: string;
    effects: AuraEffectREData[];
}

type AuraSchema = RuleElementSchema & {
    /** The radius of the order in feet, or a string that will resolve to one */
    radius: ResolvableValueField<true, false, false>;
    /** An optional level for the aura, to be used to set the level of the effects it transmits */
    level: ResolvableValueField<false, true, true>;
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
     * Custom border, highlight, and texture for the aura: if omitted, the border color will be black, the fill
     * color the user's configured color, and no texture.
     */
    appearance: SchemaField<
        AuraAppearanceSchema,
        SourceFromSchema<AuraAppearanceSchema>,
        ModelPropsFromSchema<AuraAppearanceSchema>,
        false,
        false,
        false
    >;
    /**
     * If another aura with the same slug is already being emitted, merge this aura's data in with the other's,
     * combining traits and effects as well as merging `colors` data.
     */
    mergeExisting: BooleanField<boolean, boolean, false, false, true>;
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
        { type: StringField<SaveType, SaveType, true, false, false>; dc: ResolvableValueField<true, false, false> },
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

type AuraAppearanceSchema = {
    /** Configuration of the border's color and alpha */
    border: SchemaField<
        { color: ColorField<true, false, true>; alpha: AlphaField<true, false, true> },
        { color: HexColorString; alpha: number },
        { color: HexColorString; alpha: number },
        false,
        true,
        true
    >;
    /** Configuration of the highlight's color and alpha */
    highlight: SchemaField<
        { color: ColorField<false, false, false>; alpha: AlphaField<false, false, true> },
        { color: HexColorString | undefined; alpha: number },
        { color: HexColorString | undefined; alpha: number },
        false,
        false,
        true
    >;
    /** Configuration for a texture (image or video) drawn as part of the aura */
    texture: SchemaField<
        AuraTextureSchema,
        SourceFromSchema<AuraTextureSchema>,
        ModelPropsFromSchema<AuraTextureSchema>,
        false,
        true,
        true
    >;
};

type AuraTextureSchema = {
    /** The path to the texture file: can be injected */
    src: StringField<string, string, true, false, false>;
    alpha: AlphaField<true, false, true>;
    /** A manual rescaling of the texture resource */
    scale: StrictNumberField<number, number, true, false, true>;
    /** A manual x/y translation of the texture resource */
    translation: SchemaField<
        XYPairSchema,
        SourceFromSchema<XYPairSchema>,
        ModelPropsFromSchema<XYPairSchema>,
        false,
        false,
        false
    >;
};

type XYPairSchema = {
    x: StrictNumberField<number, number, true, false, false>;
    y: StrictNumberField<number, number, true, false, false>;
};

type AuraREAppearanceData = ModelPropsFromSchema<AuraAppearanceSchema>;

interface AuraEffectREData extends ModelPropsFromSchema<AuraEffectSchema> {
    includesSelf: boolean;
    removeOnExit: boolean;
}

interface AuraRuleElementSource extends RuleElementSource {
    radius?: unknown;
    effects?: unknown;
    traits?: unknown;
}

export { AuraRuleElement };
