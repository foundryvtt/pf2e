export interface AllowedAttributeConfiguration {
    /** The set of exactly-matching attribute names. */
    attrs: Set<string>;
    /**A list of wildcard allowed prefixes for attributes. */
    wildcards: string[];
}

export interface ManagedAttributesSpec {
    /** A list of managed attributes. */
    attributes: string[];
    /** A list of CSS property names that are managed as inline styles. */
    styles: string[];
    /** A list of managed class names. */
    classes: string[];
}
