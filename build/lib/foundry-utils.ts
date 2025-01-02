/* eslint-disable @typescript-eslint/no-explicit-any */

///////////////////////////////////////////
// Deep Clone
///////////////////////////////////////////

/**
 * Deeply clone simple data (objects, arrays, dates, primitives).
 *
 * - This does NOT reliably handle Sets, Maps, or other advanced classes.
 * - It DOES handle nested arrays/objects and Dates.
 * - Any unrecognized prototype-based object will be returned as-is,
 *   since we can't reliably reconstruct specialized classes without custom logic.
 *
 * @param original  The data to clone
 * @returns         A deeply cloned copy
 */
export function deepClone<T>(
  original: T
): T extends Set<any> | Map<any, any> | Collection<any> ? never : T {
  // Non-object or null means primitive or function => return as is
  if (typeof original !== "object" || original === null) {
    return original as any;
  }

  // If array, clone each element
  if (Array.isArray(original)) {
    return original.map((item) => deepClone(item)) as any;
  }

  // Date
  if (original instanceof Date) {
    return new Date(original.getTime()) as any;
  }

  // If not a plain object, return as is (or throw if you prefer)
  if ((original as { constructor: unknown }).constructor !== Object) {
    // Return the object "as is" to avoid partial duplication of advanced classes
    return original as any;
  }

  // Otherwise, plain object => recursively clone each property
  const cloneObj: Record<string, unknown> = {};
  for (const key of Object.keys(original)) {
    cloneObj[key] = deepClone((original as Record<string, unknown>)[key]);
  }
  return cloneObj as any;
}

///////////////////////////////////////////
// setProperty
///////////////////////////////////////////

/**
 * Assign a value in an object using "dot" notation for nested paths.
 *
 * @param obj   The object to update in-place
 * @param path  Dot-notation path, e.g. "a.b.c"
 * @param value The value to assign
 * @returns     True if changed, otherwise false
 */
export function setProperty(obj: object, path: string, value: unknown): boolean {
  let target = obj;
  let changed = false;

  if (path.includes(".")) {
    const parts = path.split(".");
    path = parts.pop() ?? "";
    // Descend into the object, building missing intermediate objects as needed
    for (const part of parts) {
      if (!Object.prototype.hasOwnProperty.call(target, part)) {
        (target as Record<string, any>)[part] = {};
      }
      target = (target as Record<string, any>)[part];
      if (typeof target !== "object" || target === null) {
        throw new Error(`Path conflict at segment '${part}'. Not an object.`);
      }
    }
  }

  // Perform the assignment if not equal
  const oldVal = (target as Record<string, unknown>)[path];
  if (oldVal !== value) {
    (target as Record<string, unknown>)[path] = value;
    changed = true;
  }

  return changed;
}

///////////////////////////////////////////
// getType
///////////////////////////////////////////

export class Color extends Number {}

/**
 * Identify a variable's "type" string label:
 *   - undefined, null, number, string, boolean, function
 *   - Array, Set, Map, Promise, Error, HTMLElement, Object (fallback)
 *
 * @param variable The input to inspect
 * @returns        A string representing the variable's conceptual type
 */
export function getType(variable: unknown): string {
  const typeOf = typeof variable;
  if (typeOf !== "object") {
    // e.g. "undefined", "string", "boolean", "number", "function", "symbol"
    return typeOf;
  }

  // object or null
  if (variable === null) return "null";

  // If no constructor, fallback as a plain object
  if (!(variable as object).constructor) return "Object";

  // Named constructor checks
  const name = (variable as object).constructor.name;
  if (name === "Object") return "Object";

  // Well-known types
  if (Array.isArray(variable)) return "Array";
  if (variable instanceof Set) return "Set";
  if (variable instanceof Map) return "Map";
  if (variable instanceof Promise) return "Promise";
  if (variable instanceof Error) return "Error";
  if (variable instanceof Color) return "number";

  // Optional check if running in a browser environment
  if ("HTMLElement" in globalThis) {
    const HTMLElementRef = (globalThis as any).HTMLElement;
    if (variable instanceof HTMLElementRef) {
      return "HTMLElement";
    }
  }

  // Fallback
  return "Object";
}

///////////////////////////////////////////
// expandObject
///////////////////////////////////////////

/**
 * Expand a flattened object into a nested object by converting dot-notation keys into sub-objects.
 *
 * @param obj  The object to expand
 * @param depth recursion guard to limit expansions
 */
export function expandObject(obj: object, depth = 0): object {
  if (depth > 100) {
    // arbitrary large recursion limit
    throw new Error("Max recursion depth exceeded in expandObject.");
  }
  const expanded: Record<string, unknown> = {};

  for (const [k, val] of Object.entries(obj)) {
    let v = val;
    // If we see an object, expand recursively
    if (v && typeof v === "object" && !Array.isArray(v)) {
      v = expandObject(v, depth + 1);
    }
    // Set property will interpret any "dots" in k and nest accordingly
    setProperty(expanded, k, v);
  }
  return expanded;
}

///////////////////////////////////////////
// duplicate
///////////////////////////////////////////

/**
 * Clone data by JSON-serialization. Works well for plain data or array-of-objects, but
 *   *cannot handle* advanced data types like Set, Map, Classes, circular references, etc.
 * @param original Input data
 */
export function duplicate<T>(original: T): T {
  return JSON.parse(JSON.stringify(original));
}

///////////////////////////////////////////
// mergeObject
///////////////////////////////////////////

export interface MergeObjectOptions {
  insertKeys?: boolean;
  insertValues?: boolean;
  overwrite?: boolean;
  recursive?: boolean;
  inplace?: boolean;
  enforceTypes?: boolean;
  performDeletions?: boolean;
}

/**
 * Merge the contents of `other` into `original`, returning an updated object reference.
 *
 * - Supports nested merging if `recursive` is true
 * - Dot-notation keys in either object will be expanded first
 * - Includes optional type enforcement, partial insertion, or deletion keys.
 *
 * @param original The "target" object to be updated
 * @param other    The "source" object to read from
 * @param options  Merge behavior controls
 * @param depth    Recursion depth (internal)
 * @returns The merged object (== original if inplace)
 */
export function mergeObject<T extends object, U extends object = T>(
  original: T,
  other?: U,
  options?: MergeObjectOptions,
  depth?: number
): T & U;
export function mergeObject(
  original: object,
  other: object = {},
  {
    insertKeys = true,
    insertValues = true,
    overwrite = true,
    recursive = true,
    inplace = true,
    enforceTypes = false,
    performDeletions = false,
  }: MergeObjectOptions = {},
  depth = 0
): object {
  // Basic type check
  if (typeof original !== "object" || original === null) {
    throw new Error("mergeObject | 'original' must be a non-null object.");
  }
  if (typeof other !== "object" || other === null) {
    throw new Error("mergeObject | 'other' must be a non-null object.");
  }

  // Expand dotted keys at top-level
  if (depth === 0) {
    // Expand dot-notation in "other"
    if (Object.keys(other).some((k) => k.includes("."))) {
      other = expandObject(other);
    }
    // Expand dot-notation in "original"
    if (Object.keys(original).some((k) => k.includes("."))) {
      const expanded = expandObject(original);
      if (inplace) {
        // Clear old keys, replace with expanded
        for (const key of Object.keys(original)) {
          delete (original as Record<string, unknown>)[key];
        }
        Object.assign(original, expanded);
      } else {
        original = expanded;
      }
    } else if (!inplace) {
      // If not inplace, clone original
      original = deepClone(original);
    }
  }

  // Merge each key in "other"
  for (const key of Object.keys(other)) {
    const val = (other as Record<string, unknown>)[key];
    if (Object.hasOwn(original, key)) {
      _mergeUpdate(original, key, val, { insertKeys, insertValues, overwrite, recursive, enforceTypes, performDeletions }, depth + 1);
    } else {
      _mergeInsert(original, key, val, { insertKeys, insertValues, performDeletions }, depth + 1);
    }
  }
  return original;
}

function _mergeInsert(
  original: object,
  key: string,
  val: unknown,
  { insertKeys, insertValues, performDeletions }: Partial<MergeObjectOptions>,
  depth: number
): void {
  // Deletion key
  if (key.startsWith("-=") && performDeletions) {
    const realKey = key.slice(2);
    delete (original as Record<string, unknown>)[realKey];
    return;
  }

  // Decide if we can insert
  const canInsert = depth > 1 ? insertValues : insertKeys;
  if (!canInsert) return;

  // If value is plain object => we can recursively merge
  if (val && typeof val === "object" && val.constructor === Object) {
    (original as Record<string, unknown>)[key] = mergeObject({}, val, {
      insertKeys: true,
      inplace: true,
      performDeletions,
    });
    return;
  }

  // Otherwise set the new key directly
  (original as Record<string, unknown>)[key] = val;
}

function _mergeUpdate(
  original: object,
  key: string,
  newVal: unknown,
  { insertKeys, insertValues, overwrite, recursive, enforceTypes, performDeletions }: MergeObjectOptions,
  depth: number
): void {
  const oldVal = (original as Record<string, unknown>)[key];
  const tOld = getType(oldVal);
  const tNew = getType(newVal);

  // If both are objects and recursive => merge them
  if (tOld === "Object" && tNew === "Object" && recursive) {
    mergeObject(oldVal as object, newVal as object, {
      insertKeys,
      insertValues,
      overwrite,
      recursive,
      enforceTypes,
      performDeletions,
      inplace: true,
    }, depth);
    return;
  }

  // Overwrite existing value if matching types or no type enforcement
  if (overwrite) {
    if (tOld !== "undefined" && tOld !== tNew && enforceTypes) {
      throw new Error(`mergeObject type mismatch: key '${key}' has type ${tOld} vs. ${tNew}.`);
    }
    (original as Record<string, unknown>)[key] = newVal;
  }
}

///////////////////////////////////////////
// objectsEqual
///////////////////////////////////////////

/**
 * Compare two objects for deep equality of keys and values.
 * - If an inner property implements `equals()`, uses that for comparison.
 *
 * @param a The first object
 * @param b The second object
 * @returns Are the two objects deeply equal?
 */
export function objectsEqual(a: object | null, b: object | null): boolean {
  if (a === null || b === null) return a === b;
  if (getType(a) !== "Object" || getType(b) !== "Object") return a === b;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((k) => {
    const valA = (a as Record<string, unknown>)[k];
    const valB = (b as Record<string, unknown>)[k];
    const tA = getType(valA);
    const tB = getType(valB);
    if (tA !== tB) return false;

    // If custom equals
    if ((valA as any)?.equals instanceof Function) {
      return (valA as any).equals(valB);
    }
    // Recurse if object
    if (tA === "Object") return objectsEqual(valA as object, valB as object);
    // Direct comparison for primitives
    return valA === valB;
  });
}

///////////////////////////////////////////
// isEmpty
///////////////////////////////////////////

/**
 * Test if a value is "empty-like":
 *   - undefined or null
 *   - an empty array
 *   - an object with no own keys
 *   - a Set or Map with no entries
 *
 * @param value Any value
 */
export function isEmpty(value: unknown): boolean {
  const t = getType(value);
  switch (t) {
    case "undefined":
    case "null":
      return true;
    case "Array":
      return !(value as unknown[]).length;
    case "Object":
      return !Object.keys(value as object).length;
    case "Set":
    case "Map":
      return !(value as Map<unknown, unknown>).size;
    default:
      return false;
  }
}

///////////////////////////////////////////
// randomID
///////////////////////////////////////////

/**
 * Generate a random alphanumeric string of desired length.
 *
 * @param length The length of the resulting string (default=16)
 */
export function randomID(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const result = Array.from({ length }, () => {
    const idx = Math.floor(Math.random() * chars.length);
    return chars[idx];
  });
  return result.join("");
}

///////////////////////////////////////////
// diffObject
///////////////////////////////////////////

/**
 * Compare two objects, returning a new object containing only the keys/values that differ in `other`.
 *
 * @param original The baseline object
 * @param other    The object to compare
 * @param options  Additional config
 * @param options.inner=false        If true, only diff keys that exist in `original`.
 * @param options.deletionKeys=false If true, keep keys that start with "-=" if that key is in `original`.
 */
export function diffObject(
  original: object,
  other: object,
  { inner = false, deletionKeys = false } = {}
): object {
  /**
   * Returns a `[changed, newValue]` tuple
   */
  function _diff(valA: unknown, valB: unknown): [boolean, unknown] {
    const typeA = getType(valA);
    const typeB = getType(valB);

    if (typeA !== typeB) {
      return [true, valB];
    }

    // If custom equals
    if ((valA as any)?.equals instanceof Function) {
      return [(valA as any).equals(valB) === false, valB];
    }

    // If arrays, compare elements
    if (Array.isArray(valA)) {
      return [!_arrayEquals(valA, valB), valB];
    }

    // If objects, recursively diff
    if (typeA === "Object") {
      if (isEmpty(valB)) return [false, {}];
      if (isEmpty(valA)) return [true, valB];
      const d = diffObject(valA as object, valB as object, { inner, deletionKeys });
      return [!isEmpty(d), d];
    }

    // Primitives
    return [valA !== valB, valB];
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(other)) {
    const isDeletion = key.startsWith("-=");
    if (isDeletion && deletionKeys) {
      // Only keep if it can actually delete something from original
      const realKey = key.slice(2);
      if (Object.prototype.hasOwnProperty.call(original, realKey)) {
        result[key] = (other as Record<string, unknown>)[key];
      }
      continue;
    }
    if (inner && !(key in original)) {
      continue;
    }
    const [changed, difference] = _diff(
      (original as Record<string, unknown>)[key],
      (other as Record<string, unknown>)[key]
    );
    if (changed) {
      result[key] = difference;
    }
  }
  return result;
}

function _arrayEquals(arr: unknown[], other: unknown): boolean {
  if (!Array.isArray(other) || other.length !== arr.length) return false;
  return arr.every((valA, i) => {
    const valB = other[i];
    const typeA = getType(valA);
    const typeB = getType(valB);
    if (typeA !== typeB) return false;

    if ((valA as any)?.equals instanceof Function) {
      return (valA as any).equals(valB);
    }
    if (typeA === "Object") {
      return objectsEqual(valA as object, valB as object);
    }
    return valA === valB;
  });
}

///////////////////////////////////////////
// Final Export
///////////////////////////////////////////

/**
 * Abstract class example
 */
export abstract class AbstractFormInputElement {}

export const fu = {
  deepClone,
  setProperty,
  getType,
  expandObject,
  duplicate,
  mergeObject,
  objectsEqual,
  isEmpty,
  randomID,
  diffObject,
};

const foundry = {
  applications: {
    elements: { AbstractFormInputElement },
  },
  utils: fu,
};

// attach to global for usage
(globalThis as any).foundry = foundry;
(globalThis as any).fu = fu;
