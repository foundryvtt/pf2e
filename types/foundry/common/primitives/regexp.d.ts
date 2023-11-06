declare interface RegExpConstructor {
    /**
     * Escape a given input string, prefacing special characters with backslashes for use in a regular expression
     * @param string The un-escaped input string
     * @returns The escaped string, suitable for use in regular expression
     */
    escape(string: string): string;
}
