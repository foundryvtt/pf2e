import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { ColorField, NumberField } from "types/foundry/common/data/fields.d.ts";

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
class TokenImageRuleElement extends RuleElementPF2e<TokenImageRuleSchema> {
    static override defineSchema(): TokenImageRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            scale: new fields.NumberField({ required: false, nullable: false, positive: true, initial: undefined }),
            tint: new fields.ColorField({ required: false, nullable: false, initial: undefined }),
            alpha: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        if (!(typeof this.value === "string" || this.isBracketedValue(this.value))) {
            this.failValidation("value must be a string or a bracketed value");
        }
    }

    override afterPrepareData(): void {
        const src = this.resolveValue(this.value);
        if (!this.#srcIsValid(src)) return this.failValidation("Missing or invalid value field");

        if (!this.test()) return;

        const texture: { src: VideoFilePath; scaleX?: number; scaleY?: number; tint?: HexColorString } = { src };
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
        ModelPropsFromSchema<TokenImageRuleSchema> {}

type TokenImageRuleSchema = RuleElementSchema & {
    /** An image or video path */
    value: ResolvableValueField<true, false, false>;
    /** An optional scale adjustment */
    scale: NumberField<number, number, false, false, false>;
    /** An optional tint adjustment */
    tint: ColorField<false, false, false>;
    /** An optional alpha adjustment */
    alpha: NumberField<number, number, false, false, false>;
};

export { TokenImageRuleElement };
