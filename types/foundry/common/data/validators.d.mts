import { HexColorString } from "@common/constants.mjs";

/**
 * Test whether a string is a valid 16 character UID
 * @param id
 */
export function isValidId(id: string): boolean;

/**
 * Test whether a file path has an extension in a list of provided extensions
 * @param path
 * @param extensions
 */
export function hasFileExtension(path: string, extensions: string[]): path is `${string}.${string}`;

/**
 * Test whether a string data blob contains base64 data, optionally of a specific type or types
 * @param data   The candidate string data
 * @param [types] An array of allowed mime types to test
 */
export function isBase64Data(data: string, types?: string[]): boolean;

/**
 * Test whether an input represents a valid 6-character color string
 * @param color The input string to test
 * @return Is the string a valid color?
 */
export function isColorString(color: string): color is HexColorString;

/**
 * Assert that the given value parses as a valid JSON string
 * @param val The value to test
 * @return Is the String valid JSON?
 */
export function isJSON(val: string): boolean;
