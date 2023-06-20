import { TokenEffect } from "@actor/token-effect.ts";
import { RuleElementPF2e } from "./index.ts";
import { EffectPF2e } from "@item";

/**
 * Add an effect icon to an actor's token
 * @category RuleElement
 */
export class TokenEffectIconRuleElement extends RuleElementPF2e {
    override afterPrepareData(): void {
        if (!this.test()) return;

        const path =
            typeof this.data.value === "string" ? this.resolveInjectedProperties(this.data.value) : this.item.img;
        this.actor.system.tokenEffects.push(
            new TokenEffect(new EffectPF2e({ type: "effect", name: this.label, img: path.trim() as ImageFilePath }))
        );
    }
}
