import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellcastingEntrySource } from "@item/spellcasting-entry/data.ts";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

const LEGIT_TRADITIONS = ["arcane", "divine", "occult", "primal", "focus", "ritual", "halcyon", ""] as const;

interface HighestTradition {
    name: (typeof LEGIT_TRADITIONS)[number];
    value: number;
}

interface Tradition {
    value: (typeof LEGIT_TRADITIONS)[number];
}

/**
 * Make something lowercase in a type safe way. At the time of writing,
 * the string class does not properly handle toLowerCase().
 *
 * This could also be solved by declaration merging the string class, but that
 * would pollute all typings in the codebase.
 * @param value
 * @returns
 */
function makeLowercase<T extends string>(value: T): Lowercase<T> {
    return value.toLowerCase() as Lowercase<T>;
}

export class Migration619TraditionLowercaseAndRemoveWandScroll extends MigrationBase {
    static override version = 0.619;

    override async updateItem(item: ItemSourcePF2e, actorData?: ActorSourcePF2e): Promise<void> {
        if (!actorData || item.type !== "spellcastingEntry") {
            return;
        }

        // Convert to lowercase
        const tradition: Tradition = item.system.tradition;
        tradition.value = makeLowercase(tradition.value);

        // Do not change regular spellcasting entries any further
        if (tupleHasValue(LEGIT_TRADITIONS, item.system.tradition.value)) {
            return;
        }

        // Calculate the highest tradition in the actor
        const allEntries = actorData.items.filter(
            (itemData): itemData is SpellcastingEntrySource => itemData.type === "spellcastingEntry"
        );
        const highestTradition = allEntries.reduce<HighestTradition>(
            (prev, current) => {
                if (tupleHasValue(LEGIT_TRADITIONS, current.system.tradition.value)) {
                    const value = current.system.spelldc.value ?? 0;
                    if (value > prev.value) {
                        const name = current.system.tradition.value;
                        return { name, value };
                    }
                }

                return prev;
            },
            { name: "arcane", value: 0 }
        );

        tradition.value = highestTradition.name;
    }
}
