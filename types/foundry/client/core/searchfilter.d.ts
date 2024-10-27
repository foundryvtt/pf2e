declare class SearchFilter {
    /** The allowed Filter Operators which can be used to define a search filter */
    static OPERATORS: {
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
    };

    constructor(config: SearchFilterConfiguration);

    /** The value of the current query string */
    query: string;

    /** A callback function to trigger when the tab is changed */
    callback: SearchFilterCallback | null;

    /** The regular expression corresponding to the query that should be matched against */
    rgx: RegExp;

    /** The CSS selector used to target the tab navigation element */
    _inputSelector: string;

    /** A reference to the HTML navigation element the tab controller is bound to */
    _input: HTMLElement | null;

    /** The CSS selector used to target the tab content element */
    _contentSelector: string;

    /** A reference to the HTML container element of the tab content */
    _content: HTMLElement | null;

    /** A debounced function which applies the search filtering */
    protected _filter: SearchFilterCallback | null;

    /**
     * Test whether a given object matches a provided filter
     * @param obj    An object to test against
     * @param filter The filter to test
     * @returns Whether the object matches the filter
     */
    static evaluateFilter(obj: object, filter: FieldFilter): boolean;

    /** Bind the SearchFilter controller to an HTML application */
    bind(html: HTMLElement): void;

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
