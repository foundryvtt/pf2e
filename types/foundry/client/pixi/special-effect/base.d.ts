export {};

declare global {
    /** TODO: Document Me */
    abstract class SpecialEffect {
        static OPTION_TYPES: {
            VALUE: 1;
            CHECKBOX: 2;
            RANGE: 3;
            SELECT: 4;
        };

        static get label(): string;
    }
}
