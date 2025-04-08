declare interface String {
    /** Capitalize a string, transforming its first character to a capital letter. */
    capitalize(): string;

    /** Convert a string to Title Case where the first letter of each word is capitalized. */
    titleCase(): string;

    /** Strip any <script> tags which were included within a provided string */
    stripScripts(): string;

    /**
     * Transform any string into a url-viable slug string
     * @param [options]                  Optional arguments which customize how the slugify operation is performed
     * @param [options.replacement="-"]  The replacement character to separate terms, default is '-'
     * @param [options.strict=false]     Replace all non-alphanumeric characters, or allow them? Default false
     * @param [options.lowercase=true]   Lowercase the string.
     * @return The slugified input string
     */
    slugify(options?: {
        replacement?: string;
        strict?: boolean;
        lowercase?: boolean;
    }): string;
}
