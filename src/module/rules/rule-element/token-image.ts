import type { AlphaField, ColorField, NumberField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";

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
        };
    }

    override afterPrepareData(): void {
        const src = this.resolveValue(this.value);
        if (!this.#srcIsValid(src)) return this.failValidation("Missing or invalid value field");

        if (!this.test()) return;

        const texture: { src: VideoFilePath; scaleX?: number; scaleY?: number; tint?: Color } = { src };
        if (this.scale) {
            texture.scaleX = this.scale;
            texture.scaleY = this.scale;
        }

        if (this.tint) {
            texture.tint = this.tint;
        }

        if (this.alpha) {
            this.actor.synthetics.tokenOverrides.alpha = this.alpha;
        }

        this.actor.synthetics.tokenOverrides.texture = texture;
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
    value: StringField<string, string, true, false, false>;
    /** An optional scale adjustment */
    scale: NumberField<number, number, false, true, true>;
    /** An optional tint adjustment */
    tint: ColorField;
    /** An optional alpha adjustment */
    alpha: AlphaField<false, true, true>;
};

export { TokenImageRuleElement };
