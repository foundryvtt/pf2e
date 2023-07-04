import { TokenDocumentPF2e } from "@scene/index.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "../index.ts";
import { MarkTargetPrompt } from "./prompt.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";

/** Remember a token for later referencing */
class MarkTokenRuleElement extends RuleElementPF2e<MarkTokenRuleSchema> {
    /** A unique slug to identify the mark as a roll option */
    declare slug: string;

    static override defineSchema(): MarkTokenRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            tokenUUID: new fields.StringField({ required: false, nullable: true, initial: null }),
        };
    }

    constructor(data: MarkTokenSource, options: RuleElementOptions) {
        super(data, options);

        if (!this.slug) {
            this.failValidation("slug must be a non-empty string");
        }
    }

    override async preCreate({ ruleSource, itemSource, pendingItems }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (this.ignored) return;

        this.tokenUUID &&= this.resolveInjectedProperties(this.tokenUUID);

        const token =
            fromUuidSync(this.tokenUUID ?? "") ??
            (game.user.targets.size === 1
                ? Array.from(game.user.targets)[0]!.document
                : await new MarkTargetPrompt({ prompt: null, requirements: null }).resolveTarget());
        if (!(token instanceof TokenDocumentPF2e)) {
            // No token was targeted: abort creating item
            pendingItems.splice(pendingItems.indexOf(itemSource), 1);
            return;
        }

        this.#checkRuleSource(ruleSource);
        this.tokenUUID = ruleSource.tokenUUID = token.uuid;
        itemSource.name = `${itemSource.name} (${token.name})`;
    }

    override beforePrepareData(): void {
        if (UUIDUtils.isTokenUUID(this.tokenUUID) && this.test()) {
            this.actor.synthetics.targetMarks.set(this.tokenUUID, this.slug);
        }
    }

    #checkRuleSource(source: RuleElementSource): asserts source is MarkTokenSource {
        if (!(source.key === "MarkToken" && source.slug === this.slug)) {
            throw ErrorPF2e("Expected incorrect rule element passed");
        }
    }
}

type MarkTokenRuleSchema = RuleElementSchema & {
    tokenUUID: StringField<string, string, false, true, true>;
};

interface MarkTokenRuleElement
    extends RuleElementPF2e<MarkTokenRuleSchema>,
        ModelPropsFromSchema<MarkTokenRuleSchema> {}

interface MarkTokenSource extends RuleElementSource {
    slug?: unknown;
    tokenUUID?: unknown;
}

export { MarkTokenRuleElement };
