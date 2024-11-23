export {};

declare global {
    /**
     * A subclass of Set which manages the Token ids which the User has targeted.
     * @extends {Set}
     * @see User#targets
     */
    class UserTargets<TToken extends Token> extends Set<TToken> {
        constructor(user: User);

        /**
         * Return the Token IDs which are user targets
         * @type {string[]}
         */
        get ids(): string[];

        /** @override */
        add(token: TToken): this;

        /** @override */
        clear(): void;

        /** @override */
        delete(token: TToken): boolean;
    }
}
