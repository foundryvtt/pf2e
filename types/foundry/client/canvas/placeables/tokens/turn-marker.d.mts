import { SpriteMesh } from "../../containers/_module.mjs";
import Token from "../token.mjs";
import { TurnMarkerAnimationConfigData } from "./turn-marker-data.mjs";

/**
 * @import Token from "../token.mjs";
 * @import {TurnMarkerAnimationConfigData} from "../_types.mjs"
 */

/**
 * The Turn Marker of a {@link Token}.
 */
export default class TokenTurnMarker extends PIXI.Container {
    /**
     * Construct a TokenTurnMarker by providing a Token object instance.
     * @param token The Token that this Turn Marker belongs to
     */
    constructor(token: Token);

    /**
     * The Token who this Turn Marker belongs to.
     */
    get token(): Token;

    /**
     * The sprite of the Turn Marker.
     */
    mesh: SpriteMesh;

    /**
     * The animation configuration of the Turn Marker.
     */
    animation: TurnMarkerAnimationConfigData;

    /**
     * Draw the Turn Marker.
     */
    draw(): Promise<void>;

    /**
     * Animate the Turn Marker.
     * @param deltaTime The delta time
     */
    animate(deltaTime: number): void;
}
