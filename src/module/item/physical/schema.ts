import type { NumberField, SchemaField } from "types/foundry/common/data/fields.d.ts";
import { CoinsPF2e } from "./coins.ts";

const fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema> {
    constructor() {
        const denominationField = (): NumberField<number, number, false, false, false> =>
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
                }),
            },
        );
    }

    override initialize(source: SourceFromSchema<PriceSchema>): PriceData {
        const initialized = super.initialize(source);
        initialized.value = new CoinsPF2e(initialized.value);
        return initialized;
    }
}

type CoinsField = SchemaField<CoinsSchema, SourceFromSchema<CoinsSchema>, CoinsPF2e, true, false, true>;

type CoinsSchema = {
    cp: NumberField<number, number, false, false, false>;
    sp: NumberField<number, number, false, false, false>;
    gp: NumberField<number, number, false, false, false>;
    pp: NumberField<number, number, false, false, false>;
};

type PriceSchema = {
    value: CoinsField;
    per: NumberField<number, number, true, false, true>;
};

type PriceData = {
    value: CoinsPF2e;
    per: number;
};

export { PriceField };
