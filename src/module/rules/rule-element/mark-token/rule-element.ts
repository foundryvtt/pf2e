import { ItemPF2e } from "@item";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e, sluggify } from "@util";
import { isTokenUUID } from "@util/from-uuids";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "..";
import { MarkTargetPrompt } from "./prompt";

/** Remember a token for later referencing */
class MarkTokenRuleElement extends RuleElementPF2e {
    /** A unique slug to identify the mark as a roll option */
    override slug;

    /** The uuid of the token */
    tokenUUID: string | null;

    constructor(data: MarkTokenSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.slug === "string" && data.slug.length > 0) {
            this.slug = sluggify(data.slug);
        } else {
            this.failValidation("slug must be a non-empty string");
            this.slug = "";
        }

        this.tokenUUID = typeof data.tokenUUID === "string" ? data.tokenUUID : null;
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
        if (isTokenUUID(this.tokenUUID) && this.test()) {
            this.actor.synthetics.targetMarks.set(this.tokenUUID, this.slug);
        }
    }

    #checkRuleSource(source: RuleElementSource): asserts source is MarkTokenSource {
        if (!(source.key === "MarkToken" && source.slug === this.slug)) {
            throw ErrorPF2e("Expected incorrect rule element passed");
        }
    }
}

interface MarkTokenSource extends RuleElementSource {
    slug?: unknown;
    tokenUUID?: unknown;
}

export { MarkTokenRuleElement };
