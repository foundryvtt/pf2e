import { ObjectFieldOptions } from "@common/data/_module.mjs";
import * as fields from "../data/fields.mjs";

/**
 * A special `ObjectField` available to packages which configures any additional Document sub-types
 * provided by the package.
 */
export default class AdditionalTypesField extends fields.ObjectField<object, object, false, false, true> {
    static get _defaults(): ObjectFieldOptions<object, false, false, true>;

    protected override _validateType(value: unknown, options?: Record<string, unknown>): void;
}
