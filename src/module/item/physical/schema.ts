import { CoinsPF2e } from "./coins.ts";
import type { Price } from "./index.ts";
import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        const denominationField = (): fields.NumberField<number, number, false, false, false> =>
            new fields.NumberField({ required: false, nullable: false, initial: undefined });
        super(
            {
                value: new fields.SchemaField(
                    {
                        cp: denominationField(),
                        sp: denominationField(),
                        gp: denominationField(),
                        pp: denominationField(),
                    },
                    {
                        required: true,
                        nullable: false,
                    },
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
            {
                required: true,
                nullable: false,
                initial: () => ({
                    value: {
                        cp: undefined,
                        sp: undefined,
                        gp: undefined,
                        pp: undefined,
                    },
                    per: 1,
                    sizeSensitive: undefined,
                }),
            },
        );
    }

    override initialize(source: SourceFromSchema<PriceSchema>): Price {
        const initialized = super.initialize(source);
        initialized.value = new CoinsPF2e(initialized.value);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

type CoinsField = fields.SchemaField<CoinsSchema, SourceFromSchema<CoinsSchema>, CoinsPF2e, true, false, true>;

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
