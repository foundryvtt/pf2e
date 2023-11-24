declare interface String {
    /** Capitalize a string, transforming its first character to a capital letter. */
    capitalize(): string;

    /** Convert a string to Title Case where the first letter of each word is capitalized. */
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
