import { CharacterPF2e } from '@actor';
import { FeatPF2e } from '@item/feat';
import { ModifierPF2e, MODIFIER_TYPE } from '@module/modifiers';
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
            console.error('Only a character can have an ancestry');
            return;
        }

        const hitPoints: { modifiers: readonly ModifierPF2e[] } = this.actor.attributes.hp;
        const classHP = game.settings.get('pf2e', 'staminaVariant')
            ? Math.floor((this.hpPerLevel * this.actor.level) / 2)
            : this.hpPerLevel * this.actor.level;
        hitPoints.modifiers = [
            ...hitPoints.modifiers,
            new ModifierPF2e('PF2E.ClassHP', classHP, MODIFIER_TYPE.UNTYPED),
        ];
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
