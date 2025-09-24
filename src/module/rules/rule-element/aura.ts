import { userColorForActor } from "@actor/helpers.ts";
import type { AuraAppearanceData, AuraData, AuraEffectData, SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { HexColorString, ImageFilePath, VideoFilePath } from "@common/constants.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import { DataUnionField, LaxArrayField, PredicateField, StrictArrayField } from "@system/schema-data-fields.ts";
import { isImageOrVideoPath, sluggify } from "@util";
import * as R from "remeda";
import { RuleElement, RuleElementOptions } from "./base.ts";
import {
    ModelPropsFromRESchema,
    ResolvableValueField,
    RuleElementSchema,
    RuleElementSource,
    RuleValue,
} from "./data.ts";
import { ItemAlteration } from "./item-alteration/alteration.ts";
import fields = foundry.data.fields;

/** A Pathfinder 2e aura, capable of transmitting effects and with a visual representation on the canvas */
class AuraRuleElement extends RuleElement<AuraSchema> {
    constructor(source: AuraRuleElementSource, options: RuleElementOptions) {
        super(source, options);
        if (this.invalid) return;

        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        for (const effect of this.effects) {
            effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        }
    }

    static override defineSchema(): AuraSchema {
        const auraTraitField = new fields.StringField<EffectTrait, EffectTrait, true, false, false>({
            required: true,
            nullable: false,
            initial: undefined,
            choices: CONFIG.PF2E.effectTraits,
        });

        const effectSchemaField: fields.SchemaField<AuraEffectSchema> = new fields.SchemaField({
            uuid: new fields.DocumentUUIDField({ required: true, type: "Item", nullable: false, initial: undefined }),
            affects: new fields.StringField({
                required: true,
                nullable: false,
                blank: false,
                initial: "all",
                choices: ["allies", "enemies", "all"],
                label: "PF2E.RuleEditor.Aura.Effects.Affects",
            }),
            events: new StrictArrayField(
                new fields.StringField({
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
                    type: new fields.StringField({
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
            predicate: new PredicateField(),
            removeOnExit: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: true,
                label: "PF2E.RuleEditor.Aura.Effects.RemoveOnExit",
            }),
            includesSelf: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: (d) => d.affects !== "enemies",
                label: "PF2E.RuleEditor.Aura.Effects.IncludesSelf",
            }),
            alterations: new StrictArrayField(new fields.EmbeddedDataField(ItemAlteration)),
        });

        const xyPairSchema = ({ integer }: { integer: boolean }): XYPairSchema => ({
            x: new fields.NumberField({
                required: true,
                integer,
                nullable: false,
                initial: undefined,
                label: "PF2E.RuleEditor.Aura.Appearance.Translation.X",
            }),
            y: new fields.NumberField({
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
                            new fields.StringField<"user-color", "user-color", true, false, false>({
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
                            new fields.StringField<"user-color", "user-color", true, false, false>({
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
                    src: new fields.StringField({
                        required: true,
                        nullable: false,
                        initial: undefined,
                        label: "TOKEN.FIELDS.texture.src.label",
                    }),
                    alpha: new fields.AlphaField({
                        required: true,
                        nullable: false,
                        initial: 1,
                        label: "PF2E.RuleEditor.General.Opacity",
                    }),
                    scale: new fields.NumberField({
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
                    loop: new fields.BooleanField<boolean, boolean, true, false, true>({
                        required: true,
                        nullable: false,
                        initial: true,
                        label: "PF2E.RuleEditor.Aura.Appearance.Loop.Label",
                        hint: "PF2E.RuleEditor.Aura.Appearance.Loop.Hint",
                    }),
                    playbackRate: new fields.NumberField({
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
                label: "PF2E.RuleEditor.Aura.Basics.Radius",
            }),
            level: new ResolvableValueField({
                required: false,
                nullable: true,
                initial: null,
                label: "PF2E.RuleEditor.Aura.Basics.Level.Label",
                hint: "PF2E.RuleEditor.Aura.Basics.Level.Hint",
            }),
            traits: new LaxArrayField(auraTraitField, {
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
            mergeExisting: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: true,
                label: "PF2E.RuleEditor.Aura.Basics.MergeExisting.Label",
                hint: "PF2E.RuleEditor.Aura.Basics.MergeExisting.Hint",
            }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamp(Math.ceil(Number(this.resolveValue(this.radius)) / 5) * 5, 5, 240);

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
                traits: R.unique(this.traits.filter((t) => t !== "aura")).sort(),
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
                existing.traits = R.unique([...existing.traits, ...data.traits]).sort();
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
            parent: this.item,
            uuid: this.resolveInjectedProperties(e.uuid),
            predicate: this.resolveInjectedProperties(e.predicate),
            save: null,
        }));
    }

    #processAppearanceData(): AuraAppearanceData {
        const appearance = fu.deepClone(this.appearance);
        const { border, highlight, texture } = appearance;
        const textureSrc = ((): ImageFilePath | VideoFilePath | null => {
            if (!texture) return null;
            const maybeTextureSrc = this.resolveInjectedProperties(texture.src);
            return isImageOrVideoPath(maybeTextureSrc) ? maybeTextureSrc : "icons/svg/hazard.svg";
        })();

        if (border) {
            border.color =
                border.color === "user-color" ? Color.fromString(userColorForActor(this.actor)) : border.color;
        }
        highlight.color =
            highlight.color === "user-color" ? Color.fromString(userColorForActor(this.actor)) : highlight.color;

        return {
            border: border && { color: Number(border.color), alpha: border.alpha },
            highlight: { color: Number(highlight.color), alpha: highlight.alpha },
            texture: texture?.alpha && textureSrc ? { ...texture, src: textureSrc } : null,
        };
    }
}

interface AuraRuleElement extends RuleElement<AuraSchema>, ModelPropsFromRESchema<AuraSchema> {
    slug: string;
    effects: AuraEffectREData[];
}

type AuraSchema = RuleElementSchema & {
    /** The radius of the order in feet, or a string that will resolve to one */
    radius: ResolvableValueField<true, false, true>;
    /** An optional level for the aura, to be used to set the level of the effects it transmits */
    level: ResolvableValueField<false, true, true>;
    /** Associated traits, including ones that determine transmission through walls ("visual", "auditory") */
    traits: fields.ArrayField<
        fields.StringField<EffectTrait, EffectTrait, true, false, false>,
        EffectTrait[],
        EffectTrait[],
        true,
        false,
        true
    >;
    /** References to effects included in this aura */
    effects: StrictArrayField<
        fields.SchemaField<AuraEffectSchema>,
        fields.SourceFromSchema<AuraEffectSchema>[],
        fields.ModelPropsFromSchema<AuraEffectSchema>[],
        true,
        false,
        true
    >;
    /**
     * Custom border, highlight, and texture for the aura: if omitted, the border color will be black, the fill
     * color the user's configured color, and no texture.
     */
    appearance: fields.SchemaField<
        AuraAppearanceSchema,
        fields.SourceFromSchema<AuraAppearanceSchema>,
        fields.ModelPropsFromSchema<AuraAppearanceSchema>,
        true,
        false,
        true
    >;
    /**
     * If another aura with the same slug is already being emitted, merge this aura's data in with the other's,
     * combining traits and effects as well as merging `colors` data.
     */
    mergeExisting: fields.BooleanField<boolean, boolean, true, false, true>;
};

type AuraEffectSchema = {
    uuid: fields.DocumentUUIDField<ItemUUID, true, false, false>;
    affects: fields.StringField<"allies" | "enemies" | "all", "allies" | "enemies" | "all", true, false, true>;
    events: fields.ArrayField<
        fields.StringField<
            "enter" | "turn-start" | "turn-end",
            "enter" | "turn-start" | "turn-end",
            true,
            false,
            false
        >,
        ("enter" | "turn-start" | "turn-end")[],
        ("enter" | "turn-start" | "turn-end")[],
        true,
        false,
        true
    >;
    save: fields.SchemaField<
        {
            type: fields.StringField<SaveType, SaveType, true, false, false>;
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
    removeOnExit: fields.BooleanField;
    /** Whether the effect is applied to the actor emitting the aura */
    includesSelf: fields.BooleanField;
    /** An array of alterations to apply to the effect before transmitting it */
    alterations: StrictArrayField<fields.EmbeddedDataField<ItemAlteration>>;
};

type AuraAppearanceSchema = {
    /** Configuration of the border's color and alpha */
    border: fields.SchemaField<
        {
            color: DataUnionField<
                | fields.StringField<"user-color", "user-color", true, false, false>
                | fields.ColorField<true, false, false>,
                true,
                false,
                true
            >;
            alpha: fields.AlphaField<true, false, true>;
        },
        { color: "user-color" | HexColorString; alpha: number },
        { color: "user-color" | Color; alpha: number },
        false,
        true,
        true
    >;
    /** Configuration of the highlight's color and alpha */
    highlight: fields.SchemaField<
        {
            color: DataUnionField<
                | fields.StringField<"user-color", "user-color", true, false, false>
                | fields.ColorField<true, false, false>,
                true,
                false,
                true
            >;
            alpha: fields.AlphaField<false, false, true>;
        },
        { color: "user-color" | HexColorString; alpha: number },
        { color: "user-color" | Color; alpha: number },
        false,
        false,
        true
    >;
    /** Configuration for a texture (image or video) drawn as part of the aura */
    texture: fields.SchemaField<
        AuraTextureSchema,
        fields.SourceFromSchema<AuraTextureSchema>,
        fields.ModelPropsFromSchema<AuraTextureSchema>,
        false,
        true,
        true
    >;
};

type AuraTextureSchema = {
    /** The path to the texture file: can be injected */
    src: fields.StringField<string, string, true, false, false>;
    alpha: fields.AlphaField<true, false, true>;
    /** A manual rescaling of the texture resource */
    scale: fields.NumberField<number, number, true, false, true>;
    /** A manual x/y translation of the texture resource */
    translation: fields.SchemaField<
        XYPairSchema,
        fields.SourceFromSchema<XYPairSchema>,
        fields.ModelPropsFromSchema<XYPairSchema>,
        false,
        true,
        true
    >;
    /** If the `src` is a video, whether to loop it */
    loop: fields.BooleanField;
    /** If the `src` is a video, the playback rate of resulting `HTMLVideoElement` */
    playbackRate: fields.NumberField<number, number, false, false, true>;
};

type XYPairSchema = {
    x: fields.NumberField<number, number, true, false, false>;
    y: fields.NumberField<number, number, true, false, false>;
};

interface AuraEffectREData extends fields.ModelPropsFromSchema<AuraEffectSchema> {
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
