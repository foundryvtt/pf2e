/**
 * Given an array and a key function, create a map where the key is the value that
 * gets returned when each item is pushed into the function. Accumulate
 * items in an array that have the same key
 * @param array
 * @param criterion
 * @return
 */
export function groupBy<T, R>(array: T[], criterion: (value: T) => R): Map<R, T[]> {
    const result = new Map<R, T[]>();
    for (const elem of array) {
        const key = criterion(elem);
        if (result.get(key) === undefined) {
            result.set(key, [elem]);
        } else {
            result.get(key).push(elem);
        }
    }
    return result;
}

/**
 * Given an array, adds a certain amount of elements to it
 * until the desired length is being reached
 */
export function padArray<T>(array: T[], requiredLength, padWith: T): T[] {
    const result = [...array];
    for (let i = array.length; i < requiredLength; i += 1) {
        result.push(padWith);
    }
    return result;
}

/**
 * Return a new object that combines all the keys and values from
 * both. If both have the same key, assign the value of the merge function.
 * Example:
 *     // returns {a: 3, b: 5, c: 0}
 *     combineObjects({a: 3, b: 4}, {b: 1, c: 0}, (a, b) => a+b)
 * @param first
 * @param second
 * @param mergeFunction if duplicate keys exist, both values
 * are passed into this function to return the result
 * @return
 */
export function combineObjects<K extends keyof any, V>(
    first: Record<K, V> | {},
    second: Record<K, V> | {},
    mergeFunction: (first: V, second: V) => V,
): Record<K, V> {
    const combinedKeys = new Set([...Object.keys(first), ...Object.keys(second)]);

    const combinedObject = {} as Record<K, V>;
    for (const name of combinedKeys) {
        if (name in first && name in second) {
            combinedObject[name] = mergeFunction(first[name], second[name]);
        } else if (name in first) {
            combinedObject[name] = first[name];
        } else if (name in second) {
            combinedObject[name] = second[name];
        }
    }
    return combinedObject;
}

export type Optional<T> = T | null | undefined;

/**
 * Returns true if the string is null, undefined or only consists of 1..n spaces
 */
export function isBlank(string: Optional<string>) {
    return string === null || string === undefined || string.trim() === '';
}

/**
 * Parses a string, number, null or undefined into a Number
 * @param value
 * @return parsed value or undefined/null if either was provided or
 * undefined if it couldn't be parsed as a number
 */
export function toNumber(value: Optional<string> | Optional<number>): Optional<number> {
    if (value === null || value === undefined || typeof value === 'number') {
        return value as Optional<number>;
    }
    const result = parseInt(value, 10);
    if (Number.isNaN(result)) {
        return undefined;
    }
    return result;
}

/**
 * Used as a function reference
 */
export function add(x: number, y: number): number {
    return x + y;
}

/**
 * Adds a + if positive, nothing if 0 or - if negative
 */
export function addSign(number: number): string {
    if (number < 0) {
        return `${number}`;
    }
    if (number > 0) {
        return `+${number}`;
    }
    return '0';
}

/**
 * No idea why this isn't built in
 */
export function sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
}

/**
 * Zip to arrays together based on a given zip function
 * @param a
 * @param b
 * @param zipFunction
 */
export function zip<A, B, R>(a: A[], b: B[], zipFunction: (a: A, b: B) => R): R[] {
    if (a.length > b.length) {
        return b.map((elem, index) => zipFunction(a[index], elem));
    } else {
        return a.map((elem, index) => zipFunction(elem, b[index]));
    }
}

export interface Fraction {
    numerator: number;
    denominator: number;
}

/**
 * Continually apply a function on the result of itself until times is reached
 *
 * @param func
 * @param times
 * @param start start element, also result if times is 0
 */
export function applyNTimes<T>(func: (val: T) => T, times: number, start: T): T {
    let result = start;
    for (let i = 0; i < times; i += 1) {
        result = func(result);
    }
    return result;
}
