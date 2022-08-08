import { RuleElementPF2e } from "./";

/**
 * Change the image representing an actor's token
 * @category RuleElement
 */
export class TokenImageRuleElement extends RuleElementPF2e {
    override afterPrepareData(): void {
        const src = this.resolveValue();
        if (typeof src !== "string") return this.failValidation("Missing value field");

        if (!this.test()) return;

        this.actor.overrides = mergeObject(this.actor.overrides, { prototypeToken: { texture: { src } } });
    }
}
