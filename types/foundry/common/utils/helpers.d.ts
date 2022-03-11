export {};

declare global {
    module foundry {
        module utils {
            /**
             * Wrap a callback in a debounced timeout.
             * Delay execution of the callback function until the function has not been called for delay milliseconds
             * @param callback A function to execute once the debounced threshold has been passed
             * @param delay An amount of time in milliseconds to delay
             * @return A wrapped function which can be called to debounce execution
             */
            function debounce<T extends (...args: any[]) => unknown>(
                callback: T,
                delay: number
            ): (...args: Parameters<T>) => void;

            /**
             * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
             * This method DOES support recursive data structures containing inner objects or arrays.
             * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
             * @param original Some sort of data
             * @return The clone of that data
             */
            function deepClone<T>(original: T): T;

            /**
             * A cheap data duplication trick which is relatively robust.
             * For a subset of cases the deepClone function will offer better performance.
             * @param original Some sort of data
             */
            function duplicate<T extends foundry.abstract.Document>(original: T): T["data"];
            function duplicate<T extends foundry.abstract.DocumentData>(original: T): RawObject<T>;
            function duplicate<T>(original: T): T;

            /**
             * Update a source object by replacing its keys and values with those from a target object.
             *
             * @param original     The initial object which should be updated with values from the target
             * @param [other={}]   A new object whose values should replace those in the source
             * @param [options={}] Additional options which configure the merge
             * @param [options.insertKeys=true]     Control whether to insert new top-level objects into the resulting structure which do not previously exist in the original object.
             * @param [options.insertValues=true]   Control whether to insert new nested values into child objects in the resulting structure which did not previously exist in the original object.
             * @param [options.overwrite=true]      Control whether to replace existing values in the source, or only merge values which do not already exist in the original object.
             * @param [options.recursive=true]      Control whether to merge inner-objects recursively (if true), or whether to simply replace inner objects with a provided new value.
             * @param [options.inplace=true]        Control whether to apply updates to the original object in-place (if true), otherwise the original object is duplicated and the copy is merged.
             * @param [options.enforceTypes=false]  Control whether strict type checking requires that the value of a key in the other object must match the data type in the original data to be merged.
             * @param [_d=0]         A privately used parameter to track recursion depth.
             * @returns The original source object including updated, inserted, or overwritten records.
             *
             * @example <caption>Control how new keys and values are added</caption>
             * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: false}); // {k1: "v1"}
             * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: true});  // {k1: "v1", k2: "v2"}
             * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: false}); // {k1: {i1: "v1"}}
             * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: true}); // {k1: {i1: "v1", i2: "v2"}}
             *
             * @example <caption>Control how existing data is overwritten</caption>
             * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: true}); // {k1: "v2"}
             * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: false}); // {k1: "v1"}
             *
             * @example <caption>Control whether merges are performed recursively</caption>
             * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: false}); // {k1: {i1: "v2"}}
             * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: true}); // {k1: {i1: "v1", i2: "v2"}}
             *
             * @example <caption>Deleting an existing object key</caption>
             * mergeObject({k1: "v1", k2: "v2"}, {"-=k1": null});   // {k2: "v2"}
             */
            function mergeObject<T, U = T>(
                original: T,
                other?: U,
                { insertKeys, insertValues, overwrite, inplace, enforceTypes }?: MergeObjectOptions,
                _d?: number
            ): T & U;

            /**
             * Learn the named type of a token - extending the functionality of typeof to recognize some core Object types
             * @param token Some passed token
             * @return      The named type of the token
             */
            function getType(token: any): string;

            /**
             * A temporary shim to invert an object, flipping keys and values
             * @param obj    Some object where the values are unique
             * @return       An inverted object where the values of the original object are the keys of the new object
             */
            function invertObject(obj: object): object;

            /**
             * Filter the contents of some source object using the structure of a template object.
             * Only keys which exist in the template are preserved in the source object.
             *
             * @param source           An object which contains the data you wish to filter
             * @param template         An object which contains the structure you wish to preserve
             * @param keepSpecial      Whether to keep special tokens like deletion keys
             * @param templateValues   Instead of keeping values from the source, instead draw values from the template
             *
             * @example
             * const source = {foo: {number: 1, name: "Tim", topping: "olives"}, bar: "baz"};
             * const template = {foo: {number: 0, name: "Mit", style: "bold"}, other: 72};
             * filterObject(source, template); // {foo: {number: 1, name: "Tim"}};
             * filterObject(source, template, {templateValues: true}); // {foo: {number: 0, name: "Mit"}};
             */
            function filterObject(
                source: object,
                template: object,
                keepSpecial?: boolean,
                templateValues?: boolean
            ): object;

            /**
             * Flatten a possibly multi-dimensional object to a one-dimensional one by converting all nested keys to dot notation
             * @param obj  The object to flatten
             * @param _d   Recursion depth, to prevent overflow
             * @return     A flattened object
             */
            function flattenObject(obj: {}, _d?: number): Record<string, unknown>;

            /**
             * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
             * inner objects.
             *
             * @param obj  The object to expand
             * @param _d   Recursion depth, to prevent overflow
             * @return     An expanded object
             */
            function expandObject<T extends object>(obj: object, _d?: number): T;

            /**
             * A simple function to test whether or not an Object is empty
             * @param obj    The object to test
             * @return       Is the object empty?
             */
            function isObjectEmpty(obj: object): boolean;

            /**
             * Deeply difference an object against some other, returning the update keys and values
             * @param original
             * @param other
             * @return
             */
            function diffObject<T extends Record<string, unknown> = Record<string, unknown>>(
                original: object,
                other: object
            ): T;

            /**
             * A helper function which tests whether an object has a property or nested property given a string key.
             * The string key supports the notation a.b.c which would return true if object[a][b][c] exists
             * @param object   The object to traverse
             * @param key      An object property with notation a.b.c
             *
             * @return         An indicator for whether the property exists
             */
            function hasProperty(object: object, key: string): boolean;

            /**
             * A helper function which searches through an object to retrieve a value by a string key.
             * The string key supports the notation a.b.c which would return object[a][b][c]
             * @param object   The object to traverse
             * @param key      An object property with notation a.b.c
             *
             * @return         The value of the found property
             */
            function getProperty(object: object, key: string): any;

            /**
             * A helper function which searches through an object to assign a value using a string key
             * This string key supports the notation a.b.c which would target object[a][b][c]
             *
             * @param object   The object to update
             * @param key      The string key
             * @param value    The value to be assigned
             *
             * @return {Boolean}        A flag for whether or not the object was updated
             */
            function setProperty(object: object, key: string, value: any): boolean;

            /**
             * Encode a url-like string by replacing any characters which need encoding
             * @param path     A fully-qualified URL or url component (like a relative path)
             * @return         An encoded URL string
             */
            function encodeURL(path: string): string;

            /**
             * Express a timestamp as a relative string
             * @param timeStamp
             * @return
             */
            function timeSince(timeStamp: Date): string;

            /**
             * Converts an RGB color value to HSV. Conversion formula
             * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
             * Assumes r, g, and b are contained in the set [0, 1] and
             * returns h, s, and v in the set [0, 1].
             *
             * @param  r       The red color value
             * @param  g       The green color value
             * @param  b       The blue color value
             * @return         The HSV representation
             */
            function rgbToHsv(r: number, g: number, b: number): Array<number>;

            /**
             * Converts an HSV color value to RGB. Conversion formula
             * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
             * Assumes h, s, and v are contained in the set [0, 1] and
             * returns r, g, and b in the set [0, 1].
             *
             * @param  h       The hue
             * @param  s       The saturation
             * @param  v       The value
             * @return         The RGB representation
             */
            function hsvToRgb(h: number, s: number, v: number): [number, number, number];

            /**
             * Converts a color as an [R, G, B] array of normalized floats to a hexadecimal number.
             * @param rgb - Array of numbers where all values are normalized floats from 0.0 to 1.0.
             * @return      Number in hexadecimal.
             */
            function rgbToHex(rgb: [number, number, number]): number;

            /**
             * Convert a hex color code to an RGB array
             * @param hex    A hex color number
             * @return       An array of [r,g,b] colors normalized on the range of [0,1]
             */
            function hexToRGB(hex: number): [number, number, number];

            /**
             * Convert a hex color code to an RGBA color string which can be used for CSS styling
             * @param hex    A hex color number
             * @param alpha  A level of transparency
             * @return       An rgba style string
             */
            function hexToRGBAString(hex: number, alpha?: number): string;

            /**
             * Convert a string color to a hex integer
             * @param color    The string color
             * @return         The hexidecimal color code
             */
            function colorStringToHex(color: string): number;

            /**
             * Return whether or not a version (v1) is more advanced than some other version (v0)
             * Supports numeric or string version numbers
             * @param v0
             * @param v1
             * @return
             */
            function isNewerVersion(v1: number | string | null, v0: number | string): boolean;

            /**
             * Generate a random ID
             * Generate random number and convert it to base 36 and remove the '0.' at the beginning
             * As long as the string is not long enough, generate more random data into it
             * Use substring in case we generated a string with a length higher than the requested length
             *
             * @param length    The length of the random ID to generate
             * @return          Return a string containing random letters and numbers
             */
            function randomID(length?: number): string;
        }
    }

    interface MergeObjectOptions {
        insertKeys?: boolean;
        insertValues?: boolean;
        overwrite?: boolean;
        inplace?: boolean;
        enforceTypes?: boolean;
    }

    namespace globalThis {
        /* eslint-disable no-var */
        var deepClone: typeof foundry.utils.deepClone;
        var diffObject: typeof foundry.utils.diffObject;
        var duplicate: typeof foundry.utils.duplicate;
        var expandObject: typeof foundry.utils.expandObject;
        var flattenObject: typeof foundry.utils.flattenObject;
        var getType: typeof foundry.utils.getType;
        var getProperty: typeof foundry.utils.getProperty;
        var isObjectEmpty: typeof foundry.utils.isObjectEmpty;
        var mergeObject: typeof foundry.utils.mergeObject;
        var setProperty: typeof foundry.utils.setProperty;
        var randomID: typeof foundry.utils.randomID;

        /**
         * Load a single texture and return a Promise which resolves once the texture is ready to use
         * @param src       The requested texture source
         * @param fallback  A fallback texture to use if the requested source is unavailable or invalid
         */
        function loadTexture(src: string, { fallback }?: { fallback?: ImagePath }): Promise<PIXI.Texture>;

        /* eslint-enable no-var */
    }
}
