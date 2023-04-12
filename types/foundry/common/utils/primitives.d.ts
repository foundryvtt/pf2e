declare interface String {
    capitalize(): string;

    titleCase(): string;

    /** Strip any <script> tags which were included within a provided string */
    stripScripts(): string;

    /**
     * Transform any string into a url-viable slug string
     * @param replacement The replacement character to separate terms, default is '-'
     * @param strict      Replace all non-alphanumeric characters, or allow them? Default false
     * @return The cleaned slug string
     */
    slugify(replacement?: string, strict?: boolean): string;
}

/* -------------------------------------------- */
/*  Math Functions                              */
/* -------------------------------------------- */

declare interface Math {
    /**
     * Bound a number between some minimum and maximum value, inclusively.
     * @param num The current value
     * @param min The minimum allowed value
     * @param max The maximum allowed value
     * @return The clamped number
     */
    clamped(num: number, min: number, max: number): number;

    decimals(number: number, places: number): number;

    toDegrees(angle: number): number;
    normalizeDegrees(degrees: number): number;
    toRadians(degree: number): number;
    normalizeRadians(rad: number): number;
}

/* -------------------------------------------- */
/* Number Methods                               */
/* -------------------------------------------- */

declare interface Number {
    ordinalString(): string;

    paddedString(digits: number): string;

    signedString(): string;

    between(a: number, b: number, inclusive?: boolean): boolean;

    /**
     * Test whether a value is numeric
     * This is the highest performing algorithm currently available
     * https://jsperf.com/isnan-vs-typeof/5
     * @param n A value to test
     * @return Is it a number?
     */
    isNumeric(n: unknown): boolean;
}

/* -------------------------------------------- */
/* Array Methods                                */
/* -------------------------------------------- */

declare interface Array<T> {
    fromRange(n: number): T[];

    deepFlatten(): T[];

    /**
     * Test equality of the values of this array against the values of some other Array
     * @param other
     */
    equals(other: T[]): boolean;

    /**
     * Partition an original array into two children array based on a logical test
     * Elements which test as false go into the first result while elements testing as true appear in the second
     * @param rule {Function}
     * @returns An Array of length two whose elements are the partitioned pieces of the original
     */
    partition(rule: (value: T) => number): [T, T];

    /**
     * Join an Array using a string separator, first filtering out any parts which return a false-y value
     * @param sep The separator string
     * @return The joined string, filtered of any false values
     */
    filterJoin(sep: string): string;

    /**
     * Find an element within the Array and remove it from the array
     * @param find      A function to use as input to findIndex
     * @param [replace] A replacement for the spliced element
     * @return The replacement element, the removed element, or null if no element was found.
     */
    findSplice(find: (element: T) => boolean, replace?: T): T | null;
}

declare interface RegExpConstructor {
    escape(string: string): string;
}

declare interface Set<T> {
    /**
     * Return the first value from the set.
     * @returns The first element in the set, or undefined
     */
    first(): T | undefined;
}
