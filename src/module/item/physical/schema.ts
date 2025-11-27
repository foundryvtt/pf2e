import type { Price } from "./index.ts";
import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        super({
            value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0 }),
            per: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: 1,
            }),
            sizeSensitive: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        });
    }

    override initialize(source: fields.SourceFromSchema<PriceSchema>): Price {
        const initialized = super.initialize(source);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

type PriceSchema = {
    value: fields.NumberField<number, number, true, false, false>;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};

export { PriceField };
