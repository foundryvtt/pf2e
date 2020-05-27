/**
 * @callback criterion
 * {}
 */

/**
 * Given an array and a key function, create a map where the key is the value that
 * gets returned when each item is pushed into the function. Accumulate
 * items in an array that have the same key
 * @param array
 * @param criterion
 * @return {Map<any, any>}
 */
export function groupBy(array, criterion) {
    const result = new Map();
    for (const elem of array) {
        const key = criterion(elem);
        if (result.get(key) === undefined) {
            result.set(key, [elem]);
        } else {
            result.get(key)
                .push(elem);
        }
    }
    return result;
}

/**
 * Return a new object that combines all the keys and values from
 * both. If both have the same key, assign the value of the merge function.
 * Example:
 *     // returns {a: 3, b: 5, c: 0}
 *     combineObjects({a: 3, b: 4}, {b: 1, c: 0}, (a, b) => a+b)
 * @param {{}} first
 * @param {{}} second
 * @param mergeFunction
 * @return {{}}
 */
export function combineObjects(first, second, mergeFunction) {
    const combinedKeys = new Set([
        ...(Object.keys(first)),
        ...(Object.keys(second))
    ]);

    const combinedObject = {};
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

/**
 * Returns true if the string is null, undefined or only consists of 1..n spaces
 * @param {?string|null} string
 * @return {boolean}
 */
export function isBlank(string) {
    return string === null || string === undefined || string.trim() === '';
}

/**
 * Parses a string, number, null or undefined into a Number
 * @param {(number|string|null|undefined)} value
 * @return {(number|null|undefined)} parsed value or undefined/null if either was provided or
 * undefined if it couldn't be parsed as a number
 */
export function toNumber(value) {
    if (value === null || value === undefined || Number.isInteger(value)) {
        return value;
    }
    const result = parseInt(value, 10);
    if (Number.isNaN(result)) {
        return undefined;
    }
    return result;
}

/**
 * Used as a function reference
 * @param {number} x
 * @param {number} y
 * @return {number}
 */
export function add(x, y) {
    return x + y;
}


/**
 * Adds a + if positive, nothing if 0 or - if negative
 * @param {number} number
 * @return {string}
 */
export function addSign(number) {
    if (number < 0) {
        return `${number}`;
    }
    if (number > 0) {
        return `+${number}`;
    }
    return '0';
}