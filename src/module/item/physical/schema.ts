import type { NumberFieldOptions } from "@common/data/_types.d.mts";
import { PrunedSchemaField } from "@system/schema-data-fields.ts";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import { Coins } from "./coins.ts";
import type { Price } from "./index.ts";
import { COIN_DENOMINATIONS } from "./values.ts";

import fields = foundry.data.fields;

class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor() {
        const denominationField = (): fields.NumberField<number, number, false, false, false> =>
            new fields.NumberField({ required: false, nullable: false, integer: true, min: 0 });
        super({
            value: new PrunedSchemaField(
                R.mapToObj(COIN_DENOMINATIONS.toReversed(), (d) => [d, denominationField()]),
                { required: true, nullable: false },
            ),
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
        initialized.value = new Coins(initialized.value);
        initialized.sizeSensitive ??= false;
        return initialized;
    }
}

/** A currency value stored as a discrete quantity of copper pieces  */
class CoppersField extends fields.NumberField<number, Coins, true, false, true> {
    protected static override get _defaults(): NumberFieldOptions<number, boolean, boolean, boolean> {
        return { ...super._defaults, required: true, nullable: false, integer: true, min: 0, initial: 0 };
    }

    override initialize(value: unknown): Coins {
        if (typeof value !== "number") throw ErrorPF2e("Unexpected coins value");
        return new Coins({ cp: value }).normalized();
    }
}

type CoinsSchema = {
    cp: fields.NumberField<number, number, false, false, false>;
    sp: fields.NumberField<number, number, false, false, false>;
    gp: fields.NumberField<number, number, false, false, false>;
    pp: fields.NumberField<number, number, false, false, false>;
};

type PriceSchema = {
    value: PrunedSchemaField<CoinsSchema>;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};

export { CoppersField, PriceField };
