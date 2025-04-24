import User from "@client/documents/user.mjs";
import { Point } from "@common/_types.mjs";

/**
 * A single Mouse Cursor
 */
export default class Cursor extends PIXI.Container {
    /**
     * @param user The user associated with this cursor
     */
    constructor(user: User);

    /**
     * The target cursor position.
     */
    target: Point;

    /**
     * Update the position of this cursor based on the current position?
     * @internal
     */
    _updatePosition: boolean;

    override updateTransform(): void;

    /**
     * Update visibility and animations
     */
    refreshVisibility(user: User): void;

    /**
     * Draw the user's cursor as a small dot with their user name attached as text
     */
    draw(user: User): void;

    destroy(options?: boolean | PIXI.IDestroyOptions): void;
}
