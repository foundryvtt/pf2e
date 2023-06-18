import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeChangeMode } from "../ae-like.ts";

const { fields } = foundry.data;

class ItemAlterationField extends fields.SchemaField<
    ItemAlterationSchema,
    SourceFromSchema<ItemAlterationSchema>,
    ModelPropsFromSchema<ItemAlterationSchema>,
    true,
    false,
    false
> {
    constructor() {
        super(
            {
                mode: new fields.StringField({ required: true, choices: ["override"], initial: undefined }),
                property: new fields.StringField({
                    required: true,
                    choices: ["badge-value", "rarity"],
                    initial: undefined,
                }),
                value: new ItemAlterationValueField(),
            },
            { required: true, nullable: false, initial: undefined }
        );
    }
}

class ItemAlterationValueField extends fields.DataField<
    string | number | boolean | object | null,
    string | number | boolean | object | null,
    true,
    true,
    false
> {
    constructor() {
        super({ required: true, nullable: true, initial: undefined });
    }

    protected _cast(value: unknown): unknown {
        return value;
    }

    protected override _validateType(value: unknown): boolean {
        return ["boolean", "number", "object", "string"].includes(typeof value);
    }
}

type AddOverrideUpgrade = Extract<AELikeChangeMode, "add" | "override" | "upgrade">;

type ItemAlterationSchema = {
    mode: StringField<AddOverrideUpgrade, AddOverrideUpgrade, true, false, false>;
    property: StringField<"badge-value" | "rarity", "badge-value" | "rarity", true, false, false>;
    value: ItemAlterationValueField;
};

type ItemAlterationData = ModelPropsFromSchema<ItemAlterationSchema>;

export { ItemAlterationData, ItemAlterationField, ItemAlterationValueField };
