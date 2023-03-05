import { ItemSourcePF2e } from "@item/data";
import { AELikeChangeMode } from "./ae-like";
import { RuleElementPF2e } from "./base";
import { RuleElementSchema } from "./data";

/** A mixin for rule elements that allow item alterations */
abstract class WithItemAlterations<TSchema extends RuleElementSchema> {
    static apply<TSchema extends RuleElementSchema>(Class: typeof RuleElementPF2e<TSchema>): void {
        for (const methodName of [
            "itemCanBeAltered",
            "isValidItemAlteration",
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
    isValidItemAlteration(type: "array", data: unknown): data is ItemAlterationData[];
    isValidItemAlteration(type: "value", data: unknown): data is ItemAlterationValue;
    isValidItemAlteration(type: "array" | "value", data: unknown): data is ItemAlterationData[] | ItemAlterationValue {
        const isValid = (value: unknown): value is ItemAlterationValue => {
            return ["string", "number"].includes(typeof value) || value === null;
        };

        switch (type) {
            case "array":
                return (
                    Array.isArray(data) &&
                    data.every(
                        (d: unknown) =>
                            d instanceof Object &&
                            "mode" in d &&
                            d.mode === "override" &&
                            "property" in d &&
                            d.property === "badge-value" &&
                            "value" in d &&
                            isValid(d.value)
                    )
                );
            case "value":
                return isValid(data);
            default:
                return false;
        }
    }

    /** Is the item alteration valid for the item type? */
    itemCanBeAltered(this: RuleElementPF2e, source: ItemSourcePF2e, value: unknown): boolean | null {
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

    /** Apply one alteration to the item source */
    applyAlteration(
        this: WithItemAlterations<TSchema>,
        { alteration, itemSource, resolvedValue, resolvables }: ApplyAlterationParams
    ): void {
        const value = resolvedValue ?? this.resolveValue(alteration.value, { resolvables });
        if (!this.itemCanBeAltered(itemSource, value)) return;

        if (itemSource.type === "condition" && (typeof value === "number" || value === null)) {
            itemSource.system.value.value = value;
        } else if (itemSource.type === "effect" && typeof value === "number") {
            itemSource.system.badge!.value = value;
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

interface ApplyAlterationParams {
    alteration: ItemAlterationData;
    itemSource: ItemSourcePF2e;
    resolvedValue?: ItemAlterationValue;
    resolvables?: Record<string, unknown>;
}

interface WithItemAlterations<TSchema extends RuleElementSchema> extends RuleElementPF2e<TSchema> {
    alterations: ItemAlterationData[];
}

interface ItemAlterationData {
    mode: AELikeChangeMode;
    property: string;
    value: string | number | null;
}

type ItemAlterationValue = ItemAlterationData["value"];

export { ItemAlterationData, WithItemAlterations };
