import { ItemSourcePF2e } from "@item/data/index.ts";
import { Size } from "@module/data.ts";
import { BracketedValue, RuleElementSource } from "@module/rules/rule-element/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Combine AE-likes altering creature size and TokenSize RuleElements into CreatureSize RuleElements */
export class Migration655CreatureTokenSizes extends MigrationBase {
    static override version = 0.655;

    #isTokenSizeRE(rule: MaybeAELike): boolean {
        return typeof rule.key === "string" && rule.key.endsWith("TokenSize");
    }

    #isActorSizeAELike(rule: MaybeAELike): boolean {
        return (
            typeof rule.key === "string" &&
            rule.key.endsWith("ActiveEffectLike") &&
            rule.path === "system.traits.size.value"
        );
    }

    #isBracketedValue(value: unknown): value is BracketedValue {
        return isObject<{ brackets?: unknown }>(value) && Array.isArray(value.brackets);
    }

    private dimensionToSize: Record<string, Size | undefined> = {
        0.5: "tiny",
        2: "lg",
        3: "huge",
        4: "grg",
    };

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.system.rules ??= [];
        const rules: MaybeAELike[] = itemSource.system.rules;
        const actorSizeAELike = rules.find(this.#isActorSizeAELike);
        const tokenSizeRE = rules.find(this.#isTokenSizeRE);

        if (actorSizeAELike) {
            actorSizeAELike.key = "CreatureSize";
            delete actorSizeAELike.path;
            delete actorSizeAELike.mode;
        } else if (tokenSizeRE && ["number", "string", "object"].includes(typeof tokenSizeRE.value)) {
            tokenSizeRE.key = "CreatureSize";
            if (this.#isBracketedValue(tokenSizeRE.value)) {
                for (const bracket of tokenSizeRE.value.brackets) {
                    if (typeof bracket.value === "number") {
                        bracket.value = this.dimensionToSize[bracket.value] ?? "med";
                    }
                }
            } else if (typeof tokenSizeRE.value === "number") {
                tokenSizeRE.value = this.dimensionToSize[tokenSizeRE.value] ?? "med";
            }
        }

        if (tokenSizeRE && tokenSizeRE.key !== "CreatureSize") {
            itemSource.system.rules.splice(itemSource.system.rules.indexOf(tokenSizeRE), 1);
        }
    }
}

type MaybeAELike = RuleElementSource & { path?: string; mode?: string };
