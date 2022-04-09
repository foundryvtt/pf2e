import { RuleElementPF2e } from "./";

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
export class TokenImageRuleElement extends RuleElementPF2e {
    override afterPrepareData(): void {
        const img = this.resolveValue();
        if (typeof img !== "string") return this.failValidation("Missing value field");

        if (!this.test()) return;

        mergeObject(this.actor.overrides, { token: { img } });
    }
}
