import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { RARITIES } from "@module/data";
import { tupleHasValue } from "@util";
import { ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { AELikeChangeMode } from "./ae-like";
import { RuleElementPF2e } from "./base";
import { RuleElementSchema } from "./data";

const { fields } = foundry.data;

/** A mixin for rule elements that allow item alterations */
abstract class WithItemAlterations<TSchema extends RuleElementSchema> {
    static mixIn<TSchema extends RuleElementSchema>(Class: typeof RuleElementPF2e<TSchema>): void {
        for (const methodName of ["itemCanBeAltered", "applyAlterations"] as const) {
            Object.defineProperty(Class.prototype, methodName, {
                enumerable: false,
                writable: false,
                value: WithItemAlterations.prototype[methodName],
            });
        }
    }

    /** Is the item alteration valid for the item type? */
    itemCanBeAltered(this: RuleElementPF2e, source: ItemSourcePF2e, value: unknown): boolean | null {
        if (isPhysicalData(source) && tupleHasValue(RARITIES, value)) {
            return true;
        }

        const sourceId = source.flags.core?.sourceId ? ` (${source.flags.core.sourceId})` : "";
        if (source.type !== "condition" && source.type !== "effect") {
            this.failValidation(`unable to alter "${source.name}"${sourceId}: must be condition or effect`);
            return false;
        }

        const hasBadge =
            source.type === "condition"
                ? typeof source.system.value.value === "number"
                : source.type === "effect"
                ? source.system.badge?.type === "counter"
                : false;
        if (!hasBadge) {
            this.failValidation(`unable to alter "${source.name}"${sourceId}: effect lacks a badge`);
        }

        const positiveInteger = typeof value === "number" && Number.isInteger(value) && value > 0;
        // Hard-coded until condition data can indicate that it can operate valueless
        const nullValuedStun = value === null && source.system.slug === "stunned";
        if (!(positiveInteger || nullValuedStun)) {
            this.failValidation("badge-value alteration not applicable to item");
            return false;
        }

        return hasBadge;
    }

    /** Set the badge value of a condition or effect */
    applyAlterations(this: WithItemAlterations<TSchema>, itemSource: ItemSourcePF2e): void {
        for (const alteration of this.alterations) {
            const value: unknown = this.resolveValue(alteration.value);
            if (!this.itemCanBeAltered(itemSource, value)) continue;

            if (itemSource.type === "condition" && (typeof value === "number" || value === null)) {
                itemSource.system.value.value = value;
            } else if (itemSource.type === "effect" && typeof value === "number") {
                itemSource.system.badge!.value = value;
            } else if (isPhysicalData(itemSource) && tupleHasValue(RARITIES, value)) {
                itemSource.system.traits.rarity = value;
            }
        }
    }
}

interface WithItemAlterations<TSchema extends RuleElementSchema> extends RuleElementPF2e<TSchema> {
    alterations: ModelPropsFromSchema<ItemAlterationData>[];
}

class ItemAlterationField extends fields.SchemaField<
    ItemAlterationData,
    SourceFromSchema<ItemAlterationData>,
    ModelPropsFromSchema<ItemAlterationData>,
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
    string | number | null,
    string | number | null,
    true,
    false,
    false
> {
    constructor() {
        super({ required: true, nullable: false, initial: undefined });
    }

    protected _cast(value: unknown): unknown {
        return value;
    }

    protected override _validateType(value: unknown): boolean {
        return ["string", "number"].includes(typeof value) || value === null;
    }
}

type AddOverrideUpgrade = Extract<AELikeChangeMode, "add" | "override" | "upgrade">;
type ItemAlterationData = {
    mode: StringField<AddOverrideUpgrade, AddOverrideUpgrade, true, false, false>;
    property: StringField<"badge-value" | "rarity", "badge-value" | "rarity", true, false, false>;
    value: ItemAlterationValueField;
};

export { ItemAlterationData, ItemAlterationField, WithItemAlterations };
