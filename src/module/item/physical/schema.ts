import * as R from "remeda";
import { Coins } from "./coins.ts";
import type { Price } from "./index.ts";
import { DENOMINATIONS } from "./values.ts";
import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        const denominationField = (): fields.NumberField<number, number, false, false, false> =>
            new fields.NumberField({ required: false, nullable: false, initial: undefined });
        super(
            {
                value: new fields.SchemaField(
                    R.mapToObj(DENOMINATIONS.toReversed(), (d) => [d, denominationField()]),
                    { required: true, nullable: false },
                ),
                per: new fields.NumberField({
                    required: true,
                    nullable: false,
                    positive: true,
                    integer: true,
                    initial: 1,
                }),
                sizeSensitive: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            },
            { required: true, nullable: false },
        );
    }

    override initialize(source: fields.SourceFromSchema<PriceSchema>): Price {
        const initialized = super.initialize(source);
        initialized.value = new Coins(initialized.value);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

type CoinsField = fields.SchemaField<CoinsSchema, fields.SourceFromSchema<CoinsSchema>, Coins, true, false, true>;

type CoinsSchema = {
    cp: fields.NumberField<number, number, false, false, false>;
    sp: fields.NumberField<number, number, false, false, false>;
    gp: fields.NumberField<number, number, false, false, false>;
    pp: fields.NumberField<number, number, false, false, false>;
};

type PriceSchema = {
    value: CoinsField;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};

export { PriceField };
