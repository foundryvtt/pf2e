import { DataFieldOptions } from "@common/data/_types.mjs";
import * as fields from "@common/data/fields.mjs";

/**
 * A special subclass of DataField used to reference an AbstractBaseShader definition. Client only.
 */
export class ShaderField extends fields.DataField<unknown, unknown, false, true, false> {
    static override get _defaults(): DataFieldOptions<unknown, false, true, false>;

    protected override _cast(value: unknown): unknown;
}

export * from "@common/data/fields.mjs";
