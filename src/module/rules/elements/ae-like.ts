import { ItemPF2e } from "@item";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementSource, RuleElementData, RuleValue } from "../rules-data-definitions";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
export class AELikeRuleElement extends RuleElementPF2e {
    static CHANGE_MODES = ["multiply", "add", "downgrade", "upgrade", "override"];

    constructor(data: AELikeConstructionData, item: Embedded<ItemPF2e>) {
        data.priority ??=
            typeof data.mode === "string" && AELikeRuleElement.CHANGE_MODES.includes(data.mode)
                ? AELikeRuleElement.CHANGE_MODES.indexOf(data.mode) * 10 + 10
                : NaN;
        data.phase ??= "applyAEs";

        super(data, item);

        if (Number.isNaN(this.priority)) {
            this.ignored = true;
            return;
        }

        // Validate data properties
        const actor = item.actor;
        const pathIsValid =
            typeof this.path === "string" &&
            [this.path, this.path.replace(/\.\w+$/, ""), this.path.replace(/\.?\w+\.\w+$/, "")].some(
                (path) => typeof getProperty(actor.data, path) !== undefined
            );
        if (!pathIsValid) this.warn("path");

        const valueIsValid = ["number", "string", "boolean", "object"].includes(typeof this.value);
        if (!valueIsValid) this.warn("value");

        if (!(pathIsValid && valueIsValid)) this.ignored = true;
    }

    get path(): string {
        return this.data.path;
    }

    get mode(): AELikeChangeMode {
        return this.data.mode;
    }

    get value(): RuleValue {
        return this.data.value;
    }

    /** Apply the modifications immediately after proper ActiveEffects are applied */
    override onApplyActiveEffects(): void {
        if (!this.ignored && this.data.phase === "applyAEs") this.applyAELike();
    }

    /** Apply the modifications near the beginning of the actor's derived-data preparation */
    override onBeforePrepareData(): void {
        if (!this.ignored && this.data.phase === "beforeDerived") this.applyAELike();
    }

    /** Apply the modifications at the conclusion of the actor's derived-data preparation */
    override onAfterPrepareData(): void {
        if (!this.ignored && this.data.phase === "afterDerived") this.applyAELike();
    }

    private applyAELike(): void {
        const change: unknown = this.resolveValue(this.data.value);
        const current: unknown = getProperty(this.actor.data, this.path);

        switch (this.mode) {
            case "multiply": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    return this.warn("path");
                }
                setProperty(this.actor.data, this.path, (current ?? 0) * change);
                break;
            }
            case "add": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    return this.warn("path");
                }
                setProperty(this.actor.data, this.path, (current ?? 0) + change);
                break;
            }
            case "downgrade": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    return this.warn("path");
                }
                setProperty(this.actor.data, this.path, Math.min(current ?? 0, change));
                break;
            }
            case "upgrade": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    return this.warn("path");
                }
                setProperty(this.actor.data, this.path, Math.max(current ?? 0, change));
                break;
            }
            case "override": {
                const currentValue = getProperty(this.actor.data, this.path);
                if (typeof change === typeof currentValue || currentValue === undefined) {
                    setProperty(this.actor.data, this.path, change);
                }
            }
        }
    }

    private warn(path: string): void {
        const item = this.item;
        console.warn(
            `PF2e System | "${path}" property on RuleElement from item ${item.name} (${item.uuid}) is invalid`
        );
    }
}

export interface AELikeRuleElement extends RuleElementPF2e {
    data: AELikeRuleElementData;
}

type AELikeChangeMode = "add" | "multiply" | "upgrade" | "downgrade" | "override";

interface AELikeRuleElementData extends RuleElementData {
    path: string;
    value: RuleValue;
    mode: AELikeChangeMode;
    priority: number;
    phase: "applyAEs" | "beforeDerived" | "afterDerived";
}

interface AELikeConstructionData extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: "applyAEs" | "beforeDerived" | "afterDerived";
}
