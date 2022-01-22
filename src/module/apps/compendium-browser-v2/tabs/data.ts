import { SortDirection } from "../data";

export type CheckBoxOptions = Record<string, { label: string; selected: boolean }>;

export interface Filters {
    checkboxes: Record<
        string,
        {
            isExpanded: boolean;
            label: string;
            options: CheckBoxOptions;
            selected: string[];
        }
    >;
    dropdowns: Record<
        string,
        {
            label: string;
            options: Record<string, string>;
            selected: string;
        }
    >;
    order: {
        by: string;
        direction: SortDirection;
        /** The key must be present as an index key in the database */
        options: Record<string, string>;
    };
    ranges: Record<
        string,
        {
            isExpanded: boolean;
            values: {
                min: number;
                max: number;
            };
            label: string;
        }
    >;
    search: {
        text: string;
    };
}
