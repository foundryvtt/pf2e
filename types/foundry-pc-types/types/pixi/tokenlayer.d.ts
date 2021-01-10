/** The Tokens Container */
declare class TokenLayer<ActorType extends Actor> extends PlaceablesLayer {
    /** @todo: fill */

    /** @override */
    get(objectId: string): Token<ActorType> | undefined;

    /** @override */
    get controlled(): Token<ActorType>[];

    /** @override */
    get placeables(): Token<ActorType>[];
}
