import { TokenDocumentPF2e } from "@scene";
import { SlugField } from "@system/schema-data-fields.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { RuleElement } from "../base.ts";
import { ModelPropsFromRESchema, RuleElementSchema, RuleElementSource } from "../data.ts";
import { MarkTargetPrompt } from "./prompt.ts";
import fields = foundry.data.fields;

/** Remember a token for later referencing */
class TokenMarkRuleElement extends RuleElement<TokenMarkSchema> {
    static override autogenForms = true;

    static override defineSchema(): TokenMarkSchema {
        return {
            ...super.defineSchema(),
            slug: new SlugField({ required: true, nullable: false, initial: undefined }),
            uuid: new fields.StringField({ required: false, nullable: true, initial: null }),
        };
    }

    static override LOCALIZATION_PREFIXES = super.LOCALIZATION_PREFIXES.concat("PF2E.RULES.TokenMark");

    override async preCreate({ ruleSource, itemSource, pendingItems }: RuleElement.PreCreateParams): Promise<void> {
        if (this.ignored) return;

        this.uuid &&= this.resolveInjectedProperties(this.uuid);

        if (this.actor.getActiveTokens().length === 0) {
            this.ignored = ruleSource.ignored = true;
            return;
        }

        const loneTarget = game.user.targets.size === 1 ? game.user.targets.first() : null;
        const token =
            fromUuidSync(this.uuid ?? "") ??
            (loneTarget?.actor && loneTarget.actor.uuid !== this.actor.uuid
                ? loneTarget.document
                : await new MarkTargetPrompt({ prompt: null, requirements: null }).resolveTarget());
        if (!(token instanceof TokenDocumentPF2e)) {
            // No token was targeted: abort creating item
            pendingItems.splice(pendingItems.indexOf(itemSource), 1);
            return;
        }

        this.#checkRuleSource(ruleSource);
        this.uuid = ruleSource.uuid = token.uuid;
    }

    override beforePrepareData(): void {
        if (UUIDUtils.isTokenUUID(this.uuid) && this.test()) {
            const tokenMarks = this.actor.synthetics.tokenMarks;
            const slugs = tokenMarks.get(this.uuid) ?? [];
            slugs.push(this.slug);
            tokenMarks.set(this.uuid, slugs);
        }
    }

    #checkRuleSource(source: RuleElementSource): asserts source is MarkTokenSource {
        if (!(source.key === "TokenMark" && source.slug === this.slug)) {
            throw ErrorPF2e("Unexpected rule element passed");
        }
    }
}

type TokenMarkSchema = Omit<RuleElementSchema, "slug"> & {
    slug: SlugField<true, false, false>;
    uuid: fields.StringField<string, string, false, true, true>;
};

interface TokenMarkRuleElement extends RuleElement<TokenMarkSchema>, ModelPropsFromRESchema<TokenMarkSchema> {
    slug: string;
}

interface MarkTokenSource extends RuleElementSource {
    slug?: string | null;
    uuid?: JSONValue;
}

export { TokenMarkRuleElement };
