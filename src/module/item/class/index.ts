import { CharacterPF2e } from '@actor';
import { FeatPF2e } from '@item/feat';
import { ABCItemPF2e } from '../abc';
import { ClassData, ClassTrait } from './data';

export class ClassPF2e extends ABCItemPF2e {
    static override get schema(): typeof ClassData {
        return ClassData;
    }

    get hpPerLevel(): number {
        return this.data.data.hp;
    }

    /** Prepare a character's data derived from their class */
    prepareActorData(this: Embedded<ClassPF2e>) {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error('Only a character can have aa class');
            return;
        }

        this.actor.data.data.attributes.classhp = this.hpPerLevel;
    }

    /** In addition to automatically granted features, retrieve feats with a class trait of this class */
    override getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];
        const features = super.getLinkedFeatures();
        const feats = this.actor.itemTypes.feat.filter((feat) => this.slug && feat.traits.has(this.slug));
        return [...new Set([...features, ...feats])];
    }
}

export interface ClassPF2e {
    readonly data: ClassData;

    get slug(): ClassTrait | null;
}
