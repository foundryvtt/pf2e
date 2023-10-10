import type * as fields from "../data/fields.d.ts";

/**
 * A special `ObjectField` available to packages which configures any additional Document sub-types
 * provided by the package.
 */
export default class AdditionalTypesField extends fields.ObjectField<object, false, false, true> {
    static get _defaults(): fields.ObjectFieldOptions<object, false, false, true>;

    protected override _validateType(value: unknown, options?: Record<string, unknown>): void;
}
