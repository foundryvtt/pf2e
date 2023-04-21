import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { BracketedValue, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
export class TokenImageRuleElement extends RuleElementPF2e {
    /** An image or video path */
    value: string | BracketedValue | null;

    /** An optional scale, tint, and alpha adjustment */
    scale?: number;
    tint?: HexColorString;
    alpha?: number;

    constructor(data: TokenImageSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.value === "string" || this.isBracketedValue(data.value)) {
            this.value = data.value;
        } else {
            this.value = null;
        }

        if (typeof data.scale === "number" && data.scale > 0) {
            this.scale = data.scale;
        }

        if (typeof data.tint === "string") {
            this.tint = new Color(data.tint).toString();
        }

        if (typeof data.alpha === "number") {
            this.alpha = data.alpha;
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

        if (typeof this.alpha === "number") {
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

interface TokenImageSource extends RuleElementSource {
    value?: unknown;
    scale?: unknown;
    tint?: unknown;
    alpha?: unknown;
}
