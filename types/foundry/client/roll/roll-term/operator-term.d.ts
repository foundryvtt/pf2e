/** A type of RollTerm used to denote and perform an arithmetic operation. */
declare class OperatorTerm extends RollTerm {
    constructor({ operator, options }: { operator: ArithmeticOperator; options?: Record<string, unknown> });
    operator: ArithmeticOperator;

    /** An array of operators which represent arithmetic operations */
    static OPERATORS: ['+', '-', '*', '/'];

    /** @override */
    static REGEXP: RegExp;

    /** @override */
    static SERIALIZE_ATTRIBUTES: ['operator'];

    /** @override */
    get flavor(): ''; // Operator terms cannot have flavor text

    /** @override */
    get expression(): ` ${ArithmeticOperator} `;

    /** @override */
    get total(): ` ${ArithmeticOperator} `;
}

declare type ArithmeticOperator = typeof OperatorTerm['OPERATORS'][number];
