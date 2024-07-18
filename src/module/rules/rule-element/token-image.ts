import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
class TokenImageRuleElement extends RuleElementPF2e<TokenImageRuleSchema> {
    static override defineSchema(): TokenImageRuleSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            value: new fields.StringField({
                required: true,
                nullable: false,
                initial: undefined,
                label: "TOKEN.ImagePath",
            }),
            scale: new fields.NumberField({
                required: false,
                nullable: true,
                positive: true,
                initial: null,
                label: "Scale",
            }),
            tint: new fields.ColorField({ label: "TOKEN.TintColor" }),
            alpha: new fields.AlphaField({
                label: "PF2E.RuleEditor.General.Opacity",
                required: false,
                nullable: true,
                initial: null,
            }),
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
        const src = this.resolveValue(this.value);
        if (!this.#srcIsValid(src)) return this.failValidation("Missing or invalid value field");

        if (!this.test()) return;

        const texture: { src: VideoFilePath; scaleX?: number; scaleY?: number; tint?: Maybe<Color> } = { src };
        if (this.scale) {
            texture.scaleX = this.scale;
            texture.scaleY = this.scale;
        }
        texture.tint = this.tint;

        this.actor.synthetics.tokenOverrides.texture = texture;
        this.actor.synthetics.tokenOverrides.alpha = this.alpha;
        this.actor.synthetics.tokenOverrides.animation = this.animation ?? {};
    }

    #srcIsValid(src: unknown): src is VideoFilePath {
        if (typeof src !== "string") return false;
        const extension = /(?<=\.)[a-z0-9]{3,4}$/i.exec(src)?.at(0);
        return !!extension && (extension in CONST.IMAGE_FILE_EXTENSIONS || extension in CONST.VIDEO_FILE_EXTENSIONS);
    }
}

interface TokenImageRuleElement
    extends RuleElementPF2e<TokenImageRuleSchema>,
        ModelPropsFromRESchema<TokenImageRuleSchema> {}

type TokenImageRuleSchema = RuleElementSchema & {
    /** An image or video path */
    value: fields.StringField<string, string, true, false, false>;
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
