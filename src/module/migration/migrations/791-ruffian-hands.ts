import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Add critical specialization effect to the Ruffian class feature, DamageDice REs to healing/harming hands */
export class Migration791RuffianHands extends MigrationBase {
    static override version = 0.791;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !source.system.slug) return;

        switch (source.system.slug) {
            case "ruffian": {
                if (!source.system.rules.some((r) => r.key === "CriticalSpecialization")) {
                    source.system.rules.push(this.#critSpec);
                }
                break;
            }
            case "healing-hands": {
                const hands = this.#hands;
                hands.predicate = { all: ["item:slug:heal"] };
                source.system.rules = [hands];
                break;
            }
            case "harming-hands": {
                const hands = this.#hands;
                hands.predicate = { all: ["item:slug:harm"] };
                source.system.rules = [hands];
                break;
            }
        }
    }

    get #critSpec(): RESourceWithOtherStuff {
        return {
            key: "CriticalSpecialization",
            predicate: {
                all: [
                    "target:condition:flat-footed",
                    "weapon:category:simple",
                    { lte: ["weapon:damage:die:faces", 8] },
                ],
            },
        };
    }

    get #hands(): RESourceWithOtherStuff {
        return {
            key: "DamageDice",
            override: { dieSize: "d10" },
            selector: "spell-damage",
        };
    }
}

type RESourceWithOtherStuff = RuleElementSource & Record<string, unknown>;
