import { TokenDocumentPF2e } from "@scene/index.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e, RuleElementSchema, RuleElementSource } from "../index.ts";
import { MarkTargetPrompt } from "./prompt.ts";

/** Remember a token for later referencing */
class TokenMarkRuleElement extends RuleElementPF2e<TokenMarkSchema> {
    static override defineSchema(): TokenMarkSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            slug: new SlugField({ required: true, nullable: false, initial: undefined }),
            uuid: new fields.StringField({ required: false, nullable: true, initial: null }),
        };
    }

    override async preCreate({ ruleSource, itemSource, pendingItems }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (this.ignored) return;

        this.uuid &&= this.resolveInjectedProperties(this.uuid);

        if (this.actor.getActiveTokens().length === 0) {
            this.ignored = ruleSource.ignored = true;
            return;
        }

        const token =
            fromUuidSync(this.uuid ?? "") ??
            (game.user.targets.size === 1
                ? Array.from(game.user.targets)[0]!.document
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
            this.actor.synthetics.tokenMarks.set(this.uuid, this.slug);
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
    uuid: StringField<string, string, false, true, true>;
};

interface TokenMarkRuleElement extends RuleElementPF2e<TokenMarkSchema>, ModelPropsFromSchema<TokenMarkSchema> {
    slug: string;
}

interface MarkTokenSource extends RuleElementSource {
    slug?: JSONValue;
    uuid?: JSONValue;
}

export { TokenMarkRuleElement };
