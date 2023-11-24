declare interface Date {
    /**
     * Test whether a Date instance is valid.
     * A valid date returns a number for its timestamp, and NaN otherwise.
     * NaN is never equal to itself.
     */
    isValid(): boolean;

    /**
     * Return a standard YYYY-MM-DD string for the Date instance.
     * @returns The date in YYYY-MM-DD format
     */
    toDateInputString(): string;

    /**
     * Return a standard H:M:S.Z string for the Date instance.
     * @returns The time in H:M:S format
     */
    toTimeInputString(): string;
}
