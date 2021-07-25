/** The Tokens Container */
declare class TokenLayer<TToken extends Token> extends PlaceablesLayer<TToken> {
    constructor();

    /** The current index position in the tab cycle */
    protected _tabIndex: number | null;

    /** Remember the last drawn wildcard token image to avoid repetitions */
    _lastWildcard: string | null;
}
