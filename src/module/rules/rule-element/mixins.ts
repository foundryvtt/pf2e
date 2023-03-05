import { ItemSourcePF2e } from "@item/data";
import { tupleHasValue } from "@util";
import { AELikeChangeMode } from "./ae-like";
import { RuleElementPF2e } from "./base";
import { RuleElementSchema } from "./data";

/** A mixin for rule elements that allow item alterations */
abstract class WithItemAlterations<TSchema extends RuleElementSchema> {
    /** Every class using the mixin must define its allowed alterations here */
    allowedAlterations: AllowedItemAlteration[] = [];

    static apply<TSchema extends RuleElementSchema>(Class: typeof RuleElementPF2e<TSchema>): void {
        for (const methodName of [
            "itemCanBeAltered",
            "isValidItemAlteration",
            "isValidItemAlterationValue",
            "applyAlteration",
            "applyAlterations",
        ] as const) {
            Object.defineProperty(Class.prototype, methodName, {
                enumerable: false,
                writable: false,
                value: WithItemAlterations.prototype[methodName],
            });
        }
    }

    /** Is the item-alteration data structurally sound? Currently only overrides are supported. */
    isValidItemAlteration(data: {}): data is ItemAlterationData[] {
        return (
            Array.isArray(data) &&
            data.every(
                (d: unknown) =>
                    d instanceof Object &&
                    "mode" in d &&
                    d.mode === "override" &&
                    "property" in d &&
                    tupleHasValue(this.allowedAlterations, d.property) &&
                    "value" in d &&
                    (["string", "number"].includes(typeof d.value) || d.value === null)
            )
        );
    }

    isValidItemAlterationValue(value: unknown): value is string | number | null {
        const valid = typeof value === "string" || typeof value === "number" || value === null;
        if (!valid) {
            this.failValidation(`alteration value "${value}" has wrong type "${typeof value}"`);
        }
        return valid;
    }

    /** Is the item alteration valid for the item type? */
    itemCanBeAltered(
        this: WithItemAlterations<TSchema>,
        source: ItemSourcePF2e,
        property: AllowedItemAlteration,
        value: unknown
    ): boolean | null {
        const sourceId = source.flags.core?.sourceId ? ` (${source.flags.core.sourceId})` : "";
        if (source.type !== "condition" && source.type !== "effect") {
            this.failValidation(`unable to alter "${source.name}"${sourceId}: must be condition or effect`);
            return false;
        }
        if (!this.isValidItemAlterationValue(value)) {
            return false;
        }

        switch (property) {
            case "badge-value": {
                const hasBadge =
                    source.type === "condition"
                        ? typeof source.system.value.value === "number"
                        : source.type === "effect"
                        ? source.system.badge?.type === "counter"
                        : false;
                if (!hasBadge) {
                    this.failValidation(`unable to alter "${source.name}"${sourceId}: effect lacks a badge`);
                    return false;
                }
                const positiveInteger = typeof value === "number" && Number.isInteger(value) && value > 0;
                // Hard-coded until condition data can indicate that it can operate valueless
                const nullValuedStun = value === null && source.system.slug === "stunned";
                if (!(positiveInteger || nullValuedStun)) {
                    this.failValidation("badge-value alteration not applicable to item");
                    return false;
                }
                return true;
            }
            default:
                this.failValidation(`"${property}" is not a valid item alteration`);
                return false;
        }
    }

    /** Apply one alteration to the item source */
    applyAlteration(
        this: WithItemAlterations<TSchema>,
        { alteration, itemSource, resolvedValue, resolvables }: ApplyAlterationParams
    ): void {
        const value = resolvedValue ?? this.resolveValue(alteration.value, { resolvables });
        if (!this.itemCanBeAltered(itemSource, alteration.property, value)) return;

        switch (alteration.property) {
            case "badge-value": {
                if (itemSource.type === "condition" && (typeof value === "number" || value === null)) {
                    itemSource.system.value.value = value;
                } else if (itemSource.type === "effect" && typeof value === "number") {
                    itemSource.system.badge!.value = value;
                }
                break;
            }
        }
    }

    /** Apply all alterations to the item source */
    applyAlterations(
        this: WithItemAlterations<TSchema>,
        itemSource: ItemSourcePF2e,
        resolvables?: Record<string, unknown>
    ): void {
        for (const alteration of this.alterations) {
            this.applyAlteration({ itemSource, alteration, resolvables });
        }
    }
}

type AllowedItemAlteration = "badge-value";

interface ApplyAlterationParams {
    alteration: ItemAlterationData;
    itemSource: ItemSourcePF2e;
    resolvedValue?: ItemAlterationData["value"];
    resolvables?: Record<string, unknown>;
}

interface WithItemAlterations<TSchema extends RuleElementSchema> extends RuleElementPF2e<TSchema> {
    alterations: ItemAlterationData[];
    allowedAlterations: AllowedItemAlteration[];
}

interface ItemAlterationData {
    mode: AELikeChangeMode;
    property: AllowedItemAlteration;
    value: string | number | null;
}

export { AllowedItemAlteration, ItemAlterationData, WithItemAlterations };
