export {};

declare global {
    /** A type of RollTerm used to denote and perform an arithmetic operation. */
    class OperatorTerm extends RollTerm<OperatorTermData> {
        constructor({ operator, options }: OperatorTermData);

        operator: ArithmeticOperator;

        /** An array of operators which represent arithmetic operations */
        static OPERATORS: ["+", "-", "*", "/"];

        /** @override */
        static REGEXP: RegExp;

        /** @override */
        static SERIALIZE_ATTRIBUTES: ["operator"];

        /** @override */
        get flavor(): ""; // Operator terms cannot have flavor text

        /** @override */
        get expression(): ` ${ArithmeticOperator} `;

        /** @override */
        get total(): ` ${ArithmeticOperator} `;
    }

    type ArithmeticOperator = typeof OperatorTerm["OPERATORS"][number];

    interface OperatorTermData extends RollTermData {
        operator: ArithmeticOperator;
    }
}
