import { CreatureTrait } from '@actor/creature/data';
import { CharacterPF2e } from '@actor';
import { Size } from '@module/data';
import { ABCItemPF2e } from '../abc';
import { AncestryData } from './data';

export class AncestryPF2e extends ABCItemPF2e {
    static override get schema(): typeof AncestryData {
        return AncestryData;
    }

    get hitPoints(): number {
        return this.data.data.hp;
    }

    get speed(): number {
        return this.data.data.speed;
    }

    get size(): Size {
        return this.data.data.size;
    }

    /** Prepare a character's data derived from their ancestry */
    prepareActorData(this: Embedded<AncestryPF2e>): void {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error('Only a character can have an ancestry');
            return;
        }

        const actorData = this.actor.data;
        const systemData = actorData.data;
        systemData.attributes.speed.value = String(this.speed);
        systemData.traits.size.value = this.size;
        systemData.attributes.ancestryhp = this.hitPoints;

        // Add traits from ancestry and heritage
        const ancestryTraits: Set<string> = this?.traits ?? new Set();
        const heritageTraits: Set<string> = this.actor.heritage?.traits ?? new Set();
        const traits = Array.from(
            new Set(
                [...ancestryTraits, ...heritageTraits].filter(
                    (trait) => !['common', 'versatile heritage'].includes(trait),
                ),
            ),
        ).sort();
        actorData.data.traits.traits.value.push(...traits);
    }
}

export interface AncestryPF2e {
    readonly data: AncestryData;

    get traits(): Set<CreatureTrait>;
}
