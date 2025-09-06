export {};

declare global {
    interface Array<T> {
        /**
         * Flatten nested arrays by concatenating their contents
         * @returns An array containing the concatenated inner values
         */
        deepFlatten(): T[];

        /**
         * Test equality of the values of this array against the values of some other Array
         * @param other Some other array against which to test equality
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

    interface ReadonlyArray<T> {
        /**
         * Test equality of the values of this array against the values of some other Array
         * @param other Some other array against which to test equality
         */
        equals(other: T[]): boolean;
    }

    interface ArrayConstructor {
        /**
         * Create and initialize an array of length n with integers from 0 to n-1
         * @param n       The desired array length
         * @param [min=0] A desired minimum number from which the created array starts
         * @returns An array of integers from min to min+n
         */
        fromRange<T extends number>(n: number, min?: number): T[];
    }
}
