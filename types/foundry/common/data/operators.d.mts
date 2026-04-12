/**
 * A symbol used to reference the operator value which ensures it does not collide with a proxied key of that value.
 */
export const OPERATOR_VALUE: symbol;

/**
 * A unique string used in serialization to identify that an object should be deserialized to a DataFieldOperator.
 */
export const OPERATOR_IDENTIFIER: "__$OPERATOR$__";

/**
 * A base class used for all special database operations.
 */
export abstract class DataFieldOperator {
    constructor(value: unknown);

    toJSON(): object;

    /**
     * Create a DataFieldOperator using a provided value.
     */
    static create<U>(value: U): DataFieldOperator;

    /**
     * Retrieve the inner value of the DataFieldOperator, or return the value passed if not a DataFieldOperator.
     */
    static get(value: unknown): unknown;

    /**
     * Assign the inner value of the DataFieldOperator.
     */
    static set<U>(operator: DataFieldOperator, value: U): DataFieldOperator;

    /**
     * A comparison helper function that asserts whether two values are equal when one or both values may be
     * DataFieldOperator instances.
     */
    static equals(a: unknown, b: unknown): boolean;
}

/* -------------------------------------------- */

/**
 * Force the deletion of a certain DataModel field, resetting its value back to undefined.
 */
export class ForcedDeletion extends DataFieldOperator {
    constructor();
}

/**
 * Force the replacement of a certain DataModel field, assigning it to some explicit value without inner recursion.
 */
export class ForcedReplacement extends DataFieldOperator {
    constructor(value: unknown);

    /**
     * Create a ForcedReplacement instance that is wrapped in a Proxy so that it can be inspected.
     */
    static create(value: unknown): ForcedReplacement;
}

/* -------------------------------------------- */

/**
 * Reconstruct a DataFieldOperator instance from a serialized object.
 */
export function reconstructOperator(obj: { [OPERATOR_IDENTIFIER]: string; value: unknown }): DataFieldOperator;
