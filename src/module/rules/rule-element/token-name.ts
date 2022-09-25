import { RuleElementPF2e } from "./";

/**
 * Change the name representing an actor's token
 * @category RuleElement
 */
export class TokenNameRuleElement extends RuleElementPF2e {
    override afterPrepareData(): void {
        const name = this.resolveValue();
        if (typeof name !== "string") return this.failValidation("Missing value field");

        if (!this.test()) return;

        this.actor.synthetics.tokenOverrides.name = name;
    }
}
