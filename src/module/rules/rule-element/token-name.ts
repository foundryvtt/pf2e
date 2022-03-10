import { RuleElementPF2e } from "./";

/**
 * Change the name of an actor's unlinked token
 * @category RuleElement
 */
export class TokenNameRuleElement extends RuleElementPF2e {
    override async preCreate(): Promise<void> {
        await this.actor.token?.setFlag("pf2e", "tokenName", <string>this.actor.token?.name);
    }

    override beforePrepareData(): void {
        if (typeof this.data.value !== "string") return this.failValidation("Missing value field");

        if (!this.test()) return;

        this?.actor?.token?.update({ name: this.data.value });
    }

    override onDelete(_actorUpdates: Record<string, unknown>): void {
        this.actor.token?.update({ name: this.actor.token?.getFlag("pf2e", "tokenName") });
    }
}
