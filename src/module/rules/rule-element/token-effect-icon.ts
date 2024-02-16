import { TokenEffect } from "@actor/token-effect.ts";
import { EffectPF2e } from "@item";
import { isImageFilePath } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";

/**
 * Add an effect icon to an actor's token
 * @category RuleElement
 */
class TokenEffectIconRuleElement extends RuleElementPF2e<TokenEffectIconSchema> {
    static override defineSchema(): TokenEffectIconSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            value: new fields.StringField({ required: false, blank: false, initial: undefined }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const path = this.value ? this.resolveInjectedProperties(this.value).trim() : this.item.img;
        if (!isImageFilePath(path)) {
            return this.failValidation("value: must resolve to an image file path");
        }
        this.actor.synthetics.tokenEffectIcons.push(
            new TokenEffect(new EffectPF2e({ type: "effect", name: this.label, img: path })),
        );
    }
}

interface TokenEffectIconRuleElement
    extends RuleElementPF2e<TokenEffectIconSchema>,
        ModelPropsFromRESchema<TokenEffectIconSchema> {}

type TokenEffectIconSchema = RuleElementSchema & {
    value: StringField<string, string, false, false, false>;
};

export { TokenEffectIconRuleElement };
