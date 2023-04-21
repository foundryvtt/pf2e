import { ItemTrait } from "@item/data/base.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { TokenDocumentPF2e } from "../index.ts";

interface TokenAuraData {
    /** The radius of the aura, measured in feet from the boundary of a token's space */
    radius: number;

    /** The token from which this aura is emanating */
    token: TokenPF2e | TokenDocumentPF2e;

    /** The rectangle defining this aura's space */
    bounds: PIXI.Rectangle;

    /** The pixel-coordinate pair of this aura's (and token's) center */
    get center(): Point;

    /** The pixel-coordinate radius of this aura, measured from the center */
    radiusPixels: number;

    /** Traits (especially "visual" and "auditory") associated with this aura */
    traits: Set<ItemTrait>;
}

export { TokenAuraData };
