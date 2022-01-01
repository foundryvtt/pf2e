import { ItemPF2e } from "@item";
import { AELikeConstructionData, AELikeRuleElement } from "./ae-like";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class RollOptionRuleElement extends AELikeRuleElement {
    constructor(data: RollOptionConstructionData, item: Embedded<ItemPF2e>) {
        data.mode = "override";
        data.value ??= true;
        data.path = `flags.pf2e.rollOptions.${data.domain}.${data.option}`;
        super(data, item);

        this.validate(data, "domain");
        this.validate(data, "option");
    }

    private validate(data: RollOptionConstructionData, key: "domain" | "option") {
        const paramValue = this.resolveInjectedProperties(String(data[key]));
        if (!(typeof paramValue === "string" && /^[-:a-z0-9]+$/.test(paramValue) && /[a-z]/.test(paramValue))) {
            const item = this.item;
            console.warn(
                `PF2e System | "${key}" property on RuleElement from item ${item.name} (${item.uuid}) must be a `,
                `string consisting of only lowercase letters, numbers, and hyphens`
            );
            this.ignored = true;
        }
    }
}

interface RollOptionConstructionData extends AELikeConstructionData {
    mode?: "override";
    path?: string;
    domain?: unknown;
    option?: unknown;
}

export { RollOptionRuleElement };
