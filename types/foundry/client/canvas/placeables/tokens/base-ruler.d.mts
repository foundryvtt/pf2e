import { TokenRulerData } from "@client/_module.mjs";
import Token from "../token.mjs";

/**
 * The ruler of a Token visualizes
 *   - the movement history of the Token,
 *   - the movment path the Token currently animating along, and
 *   - the planned movement path while the Token is being dragged.
 */
export default abstract class BaseTokenRuler<TObject extends Token> {
    /**
     * @param token The Token that this ruler belongs to
     */
    constructor(token: TObject);

    /**
     * The reference to the Token this ruler belongs to.
     */
    get token(): TObject;

    /**
     * Is the ruler visible?
     * @default false
     */
    get visible(): boolean;

    /**
     * Set to {@link BaseTokenRuler#isVisible} in {@link Token#_refreshState}.
     */
    set visible(value: boolean);

    /**
     * Called when the ruler becomes visible or invisible.
     */
    protected abstract _onVisibleChange(): void;

    /**
     * Is the ruler supposed to be visible?
     * {@link BaseTokenRuler#visible} is set to {@link BaseTokenRuler#isVisible} in {@link Token#_refreshState}.
     */
    get isVisible(): boolean;

    /**
     * Draw the ruler.
     * Called in {@link Token#_draw}.
     * @abstract
     */
    abstract draw(): Promise<void>;

    /**
     * Clear the ruler.
     * Called in {@link Token#clear}.
     * @
     */
    abstract clear(): void;

    /**
     * Destroy the ruler.
     * Called in {@link Token#_destroy}.
     */
    abstract destroy(): void;

    /**
     * Refresh the ruler.
     * Called in {@link Token#_refreshRuler}.
     */
    abstract refresh(rulerData: DeepReadonly<TokenRulerData>): void;
}
