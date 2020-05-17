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
 * @param first
 * @param second
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
 * @param string
 * @return {boolean}
 */
export function isBlank(string) {
    return string === null || string === undefined || string.trim() === '';
}

/**
 * Used as a function reference
 * @param x
 * @param y
 * @return {*}
 */
export function add(x, y) {
    return x + y;
}
