import type { TextureTransitionType } from "@client/canvas/rendering/filters/transition.d.mts";
import type { HexColorString, ImageFilePath, VideoFilePath } from "@common/constants.d.mts";
import { isImageOrVideoPath } from "@util";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
class TokenImageRuleElement extends RuleElement<TokenImageRuleSchema> {
    static override defineSchema(): TokenImageRuleSchema {
        return {
            ...super.defineSchema(),
            value: new fields.StringField({
                required: true,
                nullable: true,
                initial: null,
                label: "TOKEN.FIELDS.texture.src.label",
            }),
            tint: new fields.ColorField({ label: "TOKEN.FIELDS.texture.tint.label" }),
            alpha: new fields.AlphaField({
                label: "PF2E.RuleEditor.General.Opacity",
                required: false,
                nullable: true,
                initial: null,
            }),
            scale: new fields.NumberField({
                required: false,
                nullable: true,
                positive: true,
                initial: null,
                label: "Scale",
            }),
            ring: new fields.SchemaField(
                {
                    subject: new fields.SchemaField(
                        {
                            texture: new fields.StringField({
                                required: true,
                                nullable: false,
                                blank: false,
                                initial: undefined,
                                label: "TOKEN.FIELDS.ring.subject.texture.label",
                            }),
                            scale: new fields.NumberField({
                                required: true,
                                nullable: false,
                                min: 0.8,
                                initial: 1,
                                label: "PF2E.RuleEditor.TokenImage.Ring.ScaleCorrection",
                            }),
                        },
                        { required: true, nullable: false, initial: undefined },
                    ),
                    colors: new fields.SchemaField(
                        {
                            background: new fields.ColorField({
                                required: false,
                                nullable: true,
                                initial: null,
                                label: "TOKEN.FIELDS.ring.colors.background.label",
                            }),
                            ring: new fields.ColorField({
                                required: false,
                                nullable: true,
                                initial: null,
                                label: "TOKEN.FIELDS.ring.colors.ring.label",
                            }),
                        },
                        { required: true, nullable: false, initial: () => ({ background: null, ring: null }) },
                    ),
                    effects: new fields.NumberField({
                        required: false,
                        nullable: false,
                        integer: true,
                        initial: 1,
                        min: 0,
                        max: 8388607,
                    }),
                    enabled: new fields.BooleanField({ initial: true, persisted: false }),
                },
                { required: true, nullable: true, initial: null },
            ),
            animation: new fields.SchemaField(
                {
                    duration: new fields.NumberField({
                        required: false,
                        nullable: false,
                        integer: true,
                        positive: true,
                        initial: undefined,
                    }),
                    transition: new fields.StringField({
                        required: false,
                        blank: false,
                        nullable: false,
                        choices: Object.values(fc.rendering.filters.TextureTransitionFilter.TYPES),
                        initial: undefined,
                    }),
                    easing: new fields.StringField({
                        required: false,
                        blank: false,
                        nullable: false,
                        choices: ["easeInOutCosine", "easeOutCircle", "easeInCircle"] as const,
                        initial: undefined,
                    }),
                    name: new fields.StringField({
                        required: false,
                        blank: false,
                        nullable: false,
                        initial: undefined,
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        const changes = (this.actor.tokenActiveEffectChanges.final ??= []);
        const baseChange = { type: "override", priority: this.priority, phase: "final" };
        const has = { texture: false, subject: false };
        if (this.value) {
            const src = this.resolveInjectedProperties(this.value);
            if (!isImageOrVideoPath(src)) return this.failValidation("invalid value field");
            has.texture = true;
            const texture: PartialTexture = { src, tint: this.tint?.toHTML() ?? null };
            if (this.scale) texture.scaleX = texture.scaleY = this.scale;
            changes.push({ ...baseChange, key: "texture", value: texture });
        }
        if (this.ring?.subject.texture) {
            const subjectTexture = this.resolveInjectedProperties(this.ring?.subject.texture ?? "");
            if (!fh.media.ImageHelper.hasImageExtension(subjectTexture)) {
                return this.failValidation("invalid subject texture");
            }
            has.subject = true;
            this.ring.subject.texture = subjectTexture;
            changes.push({ ...baseChange, key: "ring", value: fu.deepClone(this.ring) });
        } else {
            changes.push({ ...baseChange, key: "ring.enabled", value: false });
        }
        if (!has.texture && !has.subject) {
            return this.failValidation("either a texture source or subject texture must be provided");
        }
        if (this.alpha !== null) changes.push({ ...baseChange, key: "alpha", value: this.alpha });
        this.actor.synthetics.tokenOverrides.animation = this.animation ?? {};
    }
}

interface TokenImageRuleElement
    extends RuleElement<TokenImageRuleSchema>, ModelPropsFromRESchema<TokenImageRuleSchema> {}

type TokenImageRuleSchema = RuleElementSchema & {
    /** An image or video path */
    value: fields.StringField<string, string, true, true, true>;
    /** Dynamic token ring */
    ring: fields.SchemaField<
        {
            subject: fields.SchemaField<
                {
                    texture: fields.StringField<string, string, true, false, false>;
                    scale: fields.NumberField<number, number, true, false, true>;
                },
                { texture: string; scale: number },
                { texture: string; scale: number },
                true,
                false,
                false
            >;
            colors: fields.SchemaField<
                {
                    background: fields.ColorField<false, true, true>;
                    ring: fields.ColorField<false, true, true>;
                },
                { background: HexColorString | null; ring: HexColorString | null },
                { background: Color | null; ring: Color | null },
                true,
                false,
                true
            >;
            effects: fields.NumberField<number, number, false, false, true>;
        },
        {
            subject: { texture: string; scale: number };
            colors: { background: HexColorString | null; ring: HexColorString | null };
            effects: number;
        },
        {
            subject: { texture: string; scale: number };
            colors: { background: Color | null; ring: Color | null };
            effects: number;
            enabled: true;
        },
        true,
        true,
        true
    >;
    /** An optional scale adjustment */
    scale: fields.NumberField<number, number, false, true, true>;
    /** An optional tint adjustment */
    tint: fields.ColorField;
    /** An optional alpha adjustment */
    alpha: fields.AlphaField<false, true, true>;
    /** Animation options for when the image is applied */
    animation: fields.SchemaField<
        {
            duration: fields.NumberField<number, number, false, false, false>;
            transition: fields.StringField<TextureTransitionType, TextureTransitionType, false, false, false>;
            easing: fields.StringField<
                "easeInOutCosine" | "easeOutCircle" | "easeInCircle",
                "easeInOutCosine" | "easeOutCircle" | "easeInCircle",
                false,
                false,
                false
            >;
            name: fields.StringField<string, string, false, false, false>;
        },
        {
            duration: number | undefined;
            transition: TextureTransitionType | undefined;
            easing: "easeInOutCosine" | "easeOutCircle" | "easeInCircle" | undefined;
            name: string | undefined;
        },
        {
            duration: number | undefined;
            transition: TextureTransitionType | undefined;
            easing: "easeInOutCosine" | "easeOutCircle" | "easeInCircle" | undefined;
            name: string | undefined;
        },
        false,
        true,
        true
    >;
};

interface PartialTexture {
    src: ImageFilePath | VideoFilePath;
    scaleX?: number;
    scaleY?: number;
    tint: HexColorString | null;
}

export { TokenImageRuleElement };
