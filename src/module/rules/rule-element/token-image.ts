import { isImageOrVideoPath } from "@util";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
class TokenImageRuleElement extends RuleElementPF2e<TokenImageRuleSchema> {
    static override defineSchema(): TokenImageRuleSchema {
        return {
            ...super.defineSchema(),
            value: new fields.StringField({
                required: true,
                nullable: false,
                initial: undefined,
                label: "TOKEN.ImagePath",
            }),
            tint: new fields.ColorField({ label: "TOKEN.TintColor" }),
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
                },
                { required: false, nullable: false, initial: undefined },
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
                        choices: Object.values(TextureTransitionFilter.TYPES),
                        initial: undefined,
                    }),
                    easing: new fields.StringField({
                        required: false,
                        blank: false,
                        nullable: false,
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
        const src = this.resolveInjectedProperties(this.value);
        if (!isImageOrVideoPath(src)) return this.failValidation("Missing or invalid value field");

        if (!this.test()) return;

        const texture: { src: ImageFilePath | VideoFilePath; scaleX?: number; scaleY?: number; tint?: Maybe<Color> } = {
            src,
        };
        if (this.scale) {
            texture.scaleX = this.scale;
            texture.scaleY = this.scale;
        }
        texture.tint = this.tint;
        this.actor.synthetics.tokenOverrides.texture = texture;

        const subjectTexture = this.resolveInjectedProperties(this.ring?.subject.texture ?? "");
        if (this.ring && ImageHelper.hasImageExtension(subjectTexture)) {
            this.actor.synthetics.tokenOverrides.ring = {
                subject: {
                    scale: this.ring.subject.scale,
                    texture: subjectTexture,
                },
                colors: { ...this.ring.colors },
            };
        }

        this.actor.synthetics.tokenOverrides.alpha = this.alpha;
        this.actor.synthetics.tokenOverrides.animation = this.animation ?? {};
    }
}

interface TokenImageRuleElement
    extends RuleElementPF2e<TokenImageRuleSchema>,
        ModelPropsFromRESchema<TokenImageRuleSchema> {}

type TokenImageRuleSchema = RuleElementSchema & {
    /** An image or video path */
    value: fields.StringField<string, string, true, false, false>;
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
        },
        {
            subject: { texture: string; scale: number };
            colors: { background: HexColorString | null; ring: HexColorString | null };
        },
        {
            subject: { texture: string; scale: number };
            colors: { background: Color | null; ring: Color | null };
        },
        false,
        false,
        false
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
            easing: fields.StringField<string, string, false, false, false>;
            name: fields.StringField<string, string, false, false, false>;
        },
        {
            duration: number | undefined;
            transition: TextureTransitionType | undefined;
            easing: string | undefined;
            name: string | undefined;
        },
        {
            duration: number | undefined;
            transition: TextureTransitionType | undefined;
            easing: string | undefined;
            name: string | undefined;
        },
        false,
        true,
        true
    >;
};

export { TokenImageRuleElement };
