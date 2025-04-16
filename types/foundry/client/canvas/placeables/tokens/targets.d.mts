import User from "@client/documents/user.mjs";
import Token from "../token.mjs";

/**
 * A subclass of Set which manages the Token ids which the User has targeted.
 * @see User#targets
 */
export default class UserTargets<TToken extends Token> extends Set<TToken> {
    constructor(user: User);

    user: User;

    /**
     * Return the Token IDs which are user targets
     * @type {string[]}
     */
    get ids(): string[];

    override add(token: Token): this;

    override delete(token: Token): boolean;
}
