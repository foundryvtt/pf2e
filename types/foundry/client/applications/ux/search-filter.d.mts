export interface SearchFilterCallback {
    (event: KeyboardEvent, query: string, rgx?: RegExp, content?: HTMLElement | null): void;
}

/** Options which customize the behavior of the filter */
export interface SearchFilterConfiguration {
    /** The CSS selector used to target the text input element. */
    inputSelector: string;
    /** The CSS selector used to target the content container for these tabs. */
    contentSelector: string;
    /** A callback function which executes when the filter changes. */
    callback?: SearchFilterCallback;
    /** The initial value of the search query. */
    initial?: string;
    /**
     * The number of milliseconds to wait for text input before processing.
     * @default 200
     */
    delay?: number;
}

interface FieldFilter {
    /** The dot-delimited path to the field being filtered */
    field: string;
    /** The search operator, from CONST.OPERATORS */
    operator?: string;
    /** Negate the filter, returning results which do NOT match the filter criteria */
    negate: boolean;
    /** The value against which to test */
    value: unknown;
}

export default class SearchFilter {
    /**
     * @param config Configuration object for initializing the SearchFilter.
     */
    constructor(config?: SearchFilterConfiguration);

    /** The value of the current query string */
    query: string;

    /** A callback function to trigger when the tab is changed */
    callback: SearchFilterCallback | null;

    /** The CSS selector used to target the tab navigation element */
    protected _inputSelector: string;

    /** The CSS selector used to target the tab content element */
    protected _contentSelector: string;

    /**
     * A debounced function which applies the search filtering.
     * Average typing speed is 167 ms per character, per https://stackoverflow.com/a/4098779
     */
    protected _filter: SearchFilterCallback;

    /** The regular expression corresponding to the query that should be matched against */
    rgx: RegExp;

    /** A reference to the HTML navigation element the tab controller is bound to */
    _input: HTMLElement | null;

    /** A reference to the HTML container element of the tab content */
    _content: HTMLElement | null;

    /** The allowed Filter Operators which can be used to define a search filter */
    static OPERATORS: Readonly<{
        EQUALS: "equals";
        CONTAINS: "contains";
        STARTS_WITH: "starts_with";
        ENDS_WITH: "ends_with";
        LESS_THAN: "lt";
        LESS_THAN_EQUAL: "lte";
        GREATER_THAN: "gt";
        GREATER_THAN_EQUAL: "gte";
        BETWEEN: "between";
        IS_EMPTY: "is_empty";
    }>;

    /**
     * Bind the SearchFilter controller to an HTML application
     */
    bind(html: HTMLElement): void;

    /**
     * Release all bound HTML elements and reset the query.
     */
    unbind(): void;
    /**
     * Perform a filtering of the content by invoking the callback function
     * @param event The triggering keyboard event
     * @param query The input search string
     */
    filter(event: KeyboardEvent, query: string): void;

    /**
     * Clean a query term to standardize it for matching.
     * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
     * @param query An input string which may contain leading/trailing spaces or diacritics
     * @returns A cleaned string of ASCII characters for comparison
     */
    static cleanQuery(query: string): string;

    /**
     * A helper method to test a value against a precomposed regex pattern.
     * @param rgx   The regular expression to test
     * @param value The value to test against
     * @returns Does the query match?
     */
    static testQuery(rgx: RegExp, value: string): boolean;

    /**
     * Test whether a given object matches a provided filter
     * @param obj    An object to test against
     * @param filter The filter to test
     * @returns Whether the object matches the filter
     */
    static evaluateFilter(obj: object, filter: FieldFilter): boolean;
}
