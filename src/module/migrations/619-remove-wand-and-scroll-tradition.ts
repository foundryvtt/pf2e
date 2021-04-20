import { ActorDataPF2e } from '@actor/data-definitions';
import { SpellcastingEntryData } from '@item/data-definitions';
import { tupleHasValue } from '@module/utils';
import { MigrationBase } from './base';

const LEGIT_TRADITIONS = ['arcane', 'divine', 'occult', 'primal', 'focus', 'ritual', 'halcyon'] as const;

interface HighestTradition {
    name: typeof LEGIT_TRADITIONS[number];
    value: number;
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
    static version = 0.619;

    async updateActor(actorData: ActorDataPF2e) {
        const allEntries = actorData.items.filter(
            (itemData) => itemData.type === 'spellcastingEntry',
        ) as SpellcastingEntryData[];

        // First Convert to lowercase
        for (const entry of allEntries) {
            entry.data.tradition.value = makeLowercase(entry.data.tradition.value);
        }

        const invalidEntries = allEntries.filter(
            (itemData) => !tupleHasValue(LEGIT_TRADITIONS, itemData.data.tradition.value),
        );

        if (invalidEntries.length === 0) {
            return;
        }

        const highestTradition = allEntries.reduce<HighestTradition>(
            (prev, current) => {
                if (tupleHasValue(LEGIT_TRADITIONS, current.data.tradition.value)) {
                    const value = current.data.spelldc.value ?? 0;
                    if (value > prev.value) {
                        const name = current.data.tradition.value;
                        return { name, value };
                    }
                }

                return prev;
            },
            { name: 'arcane', value: 0 },
        );

        for (const invalidEntry of invalidEntries) {
            invalidEntry.data.tradition.value = highestTradition.name;
        }
    }
}
