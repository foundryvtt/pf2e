import { ItemSourcePF2e } from "@item/data";
import { Size } from "@module/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { MigrationBase } from "../base";

/** Combine AE-likes altering creature size and TokenSize RuleElements into CreatureSize RuleElements */
export class Migration655CreatureTokenSizes extends MigrationBase {
    static override version = 0.655;

    private isTokenSizeRE(rule: MaybeAELike): boolean {
        return !!rule.key?.endsWith("TokenSize");
    }

    private isActorSizeAELike(rule: MaybeAELike): boolean {
        return !!rule.key?.endsWith("ActiveEffectLike") && rule.path === "data.traits.size.value";
    }

    private dimensionToSize: Record<string, Size | undefined> = {
        0.5: "tiny",
        2: "lg",
        3: "huge",
        4: "grg",
    };

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.data.rules ??= [];
        const rules: MaybeAELike[] = itemSource.data.rules;
        const actorSizeAELike = rules.find(this.isActorSizeAELike);
        const tokenSizeRE = rules.find(this.isTokenSizeRE);

        if (actorSizeAELike) {
            actorSizeAELike.key = "CreatureSize";
            delete actorSizeAELike.path;
            delete actorSizeAELike.mode;
        } else if (tokenSizeRE && ["number", "string", "object"].includes(typeof tokenSizeRE.value)) {
            tokenSizeRE.key = "CreatureSize";
            if (tokenSizeRE.value instanceof Object) {
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
            itemSource.data.rules.splice(itemSource.data.rules.indexOf(tokenSizeRE), 1);
        }
    }
}

type MaybeAELike = RuleElementSource & { path?: string; mode?: string };
