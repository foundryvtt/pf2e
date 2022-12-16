import { ItemPF2e } from "@item";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
export class TokenImageRuleElement extends RuleElementPF2e {
    /** An image or video path */
    value: string | null;

    /** An optional scale adjustment */
    scale?: number;

    constructor(data: TokenImageSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.value === "string") {
            this.value = data.value;
        } else {
            this.value = null;
        }

        if (typeof data.scale === "number" && Number.isInteger(data.scale)) {
            this.scale = data.scale;
        }
    }

    override afterPrepareData(): void {
        const src = this.resolveValue(this.value);
        if (!this.#srcIsValid(src)) return this.failValidation("Missing or invalid value field");

        if (!this.test()) return;

        const texture: { src: VideoPath; scaleX?: number; scaleY?: number } = { src };
        if (this.scale) {
            texture.scaleX = this.scale;
            texture.scaleY = this.scale;
        }

        this.actor.synthetics.tokenOverrides.texture = texture;
    }

    #srcIsValid(src: unknown): src is VideoPath {
        if (typeof src !== "string") return false;
        const extension = /(?<=\.)[a-z0-9]{3,4}$/i.exec(src)?.at(0);
        return !!extension && (extension in CONST.IMAGE_FILE_EXTENSIONS || extension in CONST.VIDEO_FILE_EXTENSIONS);
    }
}

interface TokenImageSource extends RuleElementSource {
    value?: unknown;
    scale?: unknown;
}
