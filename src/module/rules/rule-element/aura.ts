import { userColorForActor } from "@actor/helpers.ts";
import { AuraAppearanceData, AuraData, AuraEffectData, SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { EffectTrait } from "@item/abstract-effect/data.ts";
import {
    DataUnionField,
    PredicateField,
    StrictArrayField,
    StrictBooleanField,
    StrictNumberField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import { isImageOrVideoPath, sluggify } from "@util";
import * as R from "remeda";
import type {
    AlphaField,
    ArrayField,
    BooleanField,
    ColorField,
    EmbeddedDataField,
    SchemaField,
} from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField, RuleElementSchema, RuleValue } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";
import { ItemAlteration } from "./item-alteration/alteration.ts";

/** A Pathfinder 2e aura, capable of transmitting effects and with a visual representation on the canvas */
class AuraRuleElement extends RuleElementPF2e<AuraSchema> {
    constructor(source: AuraRuleElementSource, options: RuleElementOptions) {
        super(source, options);
        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        for (const effect of this.effects) {
            effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        }
    }

    static override defineSchema(): AuraSchema {
        const { fields } = foundry.data;

        const auraTraitField = new StrictStringField<EffectTrait, EffectTrait, true, false, false>({
            required: true,
            nullable: false,
            initial: undefined,
            choices: { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.actionTraits },
        });

        const effectSchemaField: SchemaField<AuraEffectSchema> = new fields.SchemaField({
            uuid: new StrictStringField({ required: true, blank: false, nullable: false, initial: undefined }),
            affects: new StrictStringField({
                required: true,
                nullable: false,
                blank: false,
                initial: "all",
                choices: ["allies", "enemies", "all"],
                label: "PF2E.RuleEditor.Aura.Effects.Affects",
            }),
            events: new StrictArrayField(
                new StrictStringField({
                    required: true,
                    blank: false,
                    nullable: false,
                    initial: undefined,
                    choices: ["enter", "turn-start", "turn-end"],
                }),
                { required: true, nullable: false, initial: ["enter"], label: "PF2E.RuleEditor.Aura.Effects.Events" },
            ),
            save: new fields.SchemaField(
                {
                    type: new StrictStringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                        choices: SAVE_TYPES,
                        label: "PF2E.RuleEditor.Aura.Effects.Type",
                    }),
                    dc: new ResolvableValueField({
                        required: true,
                        nullable: false,
                        initial: undefined,
                        label: "PF2E.Check.DC.Unspecific",
                    }),
                },
                { required: true, nullable: true, initial: null, label: "PF2E.SavesHeader" },
            ),
            predicate: new PredicateField({ required: false, nullable: false }),
            removeOnExit: new StrictBooleanField({
                required: true,
                nullable: false,
                initial: true,
                label: "PF2E.RuleEditor.Aura.Effects.RemoveOnExit",
            }),
            includesSelf: new StrictBooleanField({
                required: false,
                nullable: false,
                initial: (d) => d.affects !== "enemies",
                label: "PF2E.RuleEditor.Aura.Effects.IncludesSelf",
            }),
            alterations: new StrictArrayField(new fields.EmbeddedDataField(ItemAlteration)),
        });

        const xyPairSchema = ({ integer }: { integer: boolean }): XYPairSchema => ({
            x: new StrictNumberField({
                required: true,
                integer,
                nullable: false,
                initial: undefined,
                label: "PF2E.RuleEditor.Aura.Appearance.Translation.X",
            }),
            y: new StrictNumberField({
                required: true,
                integer,
                nullable: false,
                initial: undefined,
                label: "PF2E.RuleEditor.Aura.Appearance.Translation.Y",
            }),
        });

        const appearanceSchema: AuraAppearanceSchema = {
            border: new fields.SchemaField(
                {
                    color: new DataUnionField(
                        [
                            new StrictStringField<"user-color", "user-color", true, false, false>({
                                required: true,
                                choices: ["user-color"],
                                initial: undefined,
                            }),
                            new fields.ColorField({ required: true, nullable: false, initial: undefined }),
                        ],
                        {
                            required: true,
                            nullable: false,
                            initial: "#000000",
                            label: "PF2E.RuleEditor.Aura.Appearance.Color",
                        },
                    ),
                    alpha: new fields.AlphaField({
                        required: true,
                        nullable: false,
                        initial: 0.75,
                        label: "PF2E.RuleEditor.General.Opacity",
                    }),
                } as const,
                {
                    required: false,
                    nullable: true,
                    initial: () => ({ color: "#000000", alpha: 0.75 }),
                    label: "PF2E.RuleEditor.Aura.Appearance.Border",
                } as const,
            ),
            highlight: new fields.SchemaField(
                {
                    color: new DataUnionField(
                        [
                            new StrictStringField<"user-color", "user-color", true, false, false>({
                                required: true,
                                nullable: false,
                                choices: ["user-color"],
                                initial: undefined,
                            }),
                            new fields.ColorField({ required: true, nullable: false, initial: undefined }),
                        ],
                        {
                            required: true,
                            nullable: false,
                            initial: "user-color",
                            label: "PF2E.RuleEditor.Aura.Appearance.Color",
                        },
                    ),
                    alpha: new fields.AlphaField({
                        required: false,
                        nullable: false,
                        initial: 0.25,
                        label: "PF2E.RuleEditor.General.Opacity",
                    }),
                } as const,
                {
                    required: false,
                    nullable: false,
                    initial: () => ({ color: "user-color", alpha: 0.25 }),
                    label: "PF2E.RuleEditor.Aura.Appearance.Highlight",
                },
            ),
            texture: new fields.SchemaField(
                {
                    src: new StrictStringField({
                        required: true,
                        nullable: false,
                        initial: undefined,
                        label: "TOKEN.ImagePath",
                    }),
                    alpha: new fields.AlphaField({
                        required: true,
                        nullable: false,
                        initial: 1,
                        label: "PF2E.RuleEditor.General.Opacity",
                    }),
                    scale: new StrictNumberField({
                        required: true,
                        nullable: false,
                        positive: true,
                        initial: 1,
                        label: "Scale",
                    }),
                    translation: new fields.SchemaField(xyPairSchema({ integer: true }), {
                        required: false,
                        nullable: true,
                        initial: null,
                        label: "PF2E.RuleEditor.Aura.Appearance.Translation.Label",
                        hint: "PF2E.RuleEditor.Aura.Appearance.Translation.Hint",
                    } as const),
                    loop: new StrictBooleanField({
                        required: false,
                        nullable: false,
                        initial: true,
                        label: "PF2E.RuleEditor.Aura.Appearance.Loop.Label",
                        hint: "PF2E.RuleEditor.Aura.Appearance.Loop.Hint",
                    }),
                    playbackRate: new StrictNumberField({
                        required: false,
                        nullable: false,
                        positive: true,
                        max: 4,
                        initial: 1,
                        label: "PF2E.RuleEditor.Aura.Appearance.PlaybackRate.Label",
                        hint: "PF2E.RuleEditor.Aura.Appearance.PlaybackRate.Hint",
                    }),
                } as const,
                { required: false, nullable: true, initial: null, label: "PF2E.RuleEditor.Aura.Appearance.Texture" },
            ),
        };

        return {
            ...super.defineSchema(),
            radius: new ResolvableValueField({
                required: true,
                nullable: false,
                initial: 5,
                label: "PF2E.RuleEditor.Aura.Basic.Radius",
            }),
            level: new ResolvableValueField({
                required: false,
                nullable: true,
                initial: null,
                label: "PF2E.RuleEditor.Aura.Basic.Level.Label",
                hint: "PF2E.RuleEditor.Aura.Basic.Level.Hint",
            }),
            traits: new StrictArrayField(auraTraitField, {
                required: true,
                nullable: false,
                label: "PF2E.TraitsLabel",
            }),
            effects: new StrictArrayField(effectSchemaField, {
                required: true,
                nullable: false,
                label: "PF2E.RuleEditor.Aura.Effects.Label",
            }),
            appearance: new fields.SchemaField(appearanceSchema, {
                required: true,
                nullable: false,
                initial: () => ({
                    border: { color: "#000000", alpha: 0.75 },
                    highlight: { color: "user-color", alpha: 0.25 },
                    texture: null,
                }),
                label: "PF2E.RuleEditor.Aura.Appearance.Label",
            }),
            mergeExisting: new StrictBooleanField({
                required: true,
                nullable: false,
                initial: true,
                label: "PF2E.RuleEditor.Aura.Basic.MergeExisting.Label",
                hint: "PF2E.RuleEditor.Aura.Basic.MergeExisting.Hint",
            }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamped(Math.ceil(Number(this.resolveValue(this.radius)) / 5) * 5, 5, 240);

        if (Number.isInteger(radius) && radius > 0) {
            const level = this.resolveValue(this.level, null);
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

            // Check if the aura already exists to merge new data into it. Radius/Appearance is always overriden.
            const existing = this.actor.auras.get(this.slug);
            if (existing && this.mergeExisting) {
                existing.radius = data.radius;
                existing.traits = R.uniq([...existing.traits, ...data.traits]).sort();
                existing.appearance = data.appearance;
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
        const appearance = deepClone(this.appearance);
        const { border, highlight, texture } = appearance;
        const textureSrc = ((): ImageFilePath | VideoFilePath | null => {
            if (!texture) return null;
            const maybeTextureSrc = this.resolveInjectedProperties(texture.src);
            return isImageOrVideoPath(maybeTextureSrc) ? maybeTextureSrc : "icons/svg/hazard.svg";
        })();

        if (border) border.color = border.color === "user-color" ? userColorForActor(this.actor) : border.color;
        highlight.color = highlight.color === "user-color" ? userColorForActor(this.actor) : highlight.color;

        return {
            border: border && { color: Number(Color.fromString(border.color)), alpha: border.alpha },
            highlight: { color: Number(Color.fromString(highlight.color)), alpha: highlight.alpha },
            texture: texture?.alpha && textureSrc ? { ...texture, src: textureSrc } : null,
        };
    }
}

interface AuraRuleElement extends RuleElementPF2e<AuraSchema>, ModelPropsFromSchema<AuraSchema> {
    slug: string;
    effects: AuraEffectREData[];
}

type AuraSchema = RuleElementSchema & {
    /** The radius of the order in feet, or a string that will resolve to one */
    radius: ResolvableValueField<true, false, true>;
    /** An optional level for the aura, to be used to set the level of the effects it transmits */
    level: ResolvableValueField<false, true, true>;
    /** Associated traits, including ones that determine transmission through walls ("visual", "auditory") */
    traits: ArrayField<
        StrictStringField<EffectTrait, EffectTrait, true, false, false>,
        EffectTrait[],
        EffectTrait[],
        true,
        false,
        true
    >;
    /** References to effects included in this aura */
    effects: StrictArrayField<
        SchemaField<AuraEffectSchema>,
        SourceFromSchema<AuraEffectSchema>[],
        ModelPropsFromSchema<AuraEffectSchema>[],
        true,
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
        true,
        false,
        true
    >;
    /**
     * If another aura with the same slug is already being emitted, merge this aura's data in with the other's,
     * combining traits and effects as well as merging `colors` data.
     */
    mergeExisting: BooleanField<boolean, boolean, true, false, true>;
};

type AuraEffectSchema = {
    uuid: StrictStringField<string, string, true, false, false>;
    affects: StrictStringField<"allies" | "enemies" | "all", "allies" | "enemies" | "all", true, false, true>;
    events: ArrayField<
        StrictStringField<"enter" | "turn-start" | "turn-end", "enter" | "turn-start" | "turn-end", true, false, false>,
        ("enter" | "turn-start" | "turn-end")[],
        ("enter" | "turn-start" | "turn-end")[],
        true,
        false,
        true
    >;
    save: SchemaField<
        {
            type: StrictStringField<SaveType, SaveType, true, false, false>;
            dc: ResolvableValueField<true, false, false>;
        },
        { type: SaveType; dc: RuleValue },
        { type: SaveType; dc: RuleValue },
        true,
        true,
        true
    >;
    /** A predicating limiting whether the effect is transmitted to an actor */
    predicate: PredicateField<false, false, true>;
    /** Whether to remove the effect from an actor immediately after its token exits the area */
    removeOnExit: StrictBooleanField<true, false, true>;
    /** Whether the effect is applied to the actor emitting the aura */
    includesSelf: StrictBooleanField<false, false, true>;
    /** An array of alterations to apply to the effect before transmitting it */
    alterations: StrictArrayField<EmbeddedDataField<ItemAlteration>>;
};

type AuraAppearanceSchema = {
    /** Configuration of the border's color and alpha */
    border: SchemaField<
        {
            color: DataUnionField<
                StrictStringField<"user-color", "user-color", true, false, false> | ColorField<true, false, false>,
                true,
                false,
                true
            >;
            alpha: AlphaField<true, false, true>;
        },
        { color: "user-color" | HexColorString; alpha: number },
        { color: "user-color" | HexColorString; alpha: number },
        false,
        true,
        true
    >;
    /** Configuration of the highlight's color and alpha */
    highlight: SchemaField<
        {
            color: DataUnionField<
                StrictStringField<"user-color", "user-color", true, false, false> | ColorField<true, false, false>,
                true,
                false,
                true
            >;
            alpha: AlphaField<false, false, true>;
        },
        { color: "user-color" | HexColorString; alpha: number },
        { color: "user-color" | HexColorString; alpha: number },
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
    src: StrictStringField<string, string, true, false, false>;
    alpha: AlphaField<true, false, true>;
    /** A manual rescaling of the texture resource */
    scale: StrictNumberField<number, number, true, false, true>;
    /** A manual x/y translation of the texture resource */
    translation: SchemaField<
        XYPairSchema,
        SourceFromSchema<XYPairSchema>,
        ModelPropsFromSchema<XYPairSchema>,
        false,
        true,
        true
    >;
    /** If the `src` is a video, whether to loop it */
    loop: StrictBooleanField<false, false, true>;
    /** If the `src` is a video, the playback rate of resulting `HTMLVideoElement` */
    playbackRate: StrictNumberField<number, number, false, false, true>;
};

type XYPairSchema = {
    x: StrictNumberField<number, number, true, false, false>;
    y: StrictNumberField<number, number, true, false, false>;
};

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
export type { AuraSchema as AuraRuleElementSchema, AuraTextureSchema as AuraRuleElementTextureSchema };
