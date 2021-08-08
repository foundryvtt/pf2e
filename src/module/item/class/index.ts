import { CharacterPF2e } from "@actor";
import { SAVE_TYPES } from "@actor/data/values";
import { ARMOR_CATEGORIES } from "@item/armor/data";
import { FeatPF2e } from "@item/feat";
import { WEAPON_CATEGORIES } from "@item/weapon/data";
import { ZeroToFour } from "@module/data";
import { ABCItemPF2e } from "../abc";
import { ClassData, ClassTrait } from "./data";

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
            console.error("Only a character can have a class");
            return;
        }

        const classDetails = this.data.data;
        const { attributes, details, martial, saves } = this.actor.data.data;
        attributes.classhp = this.hpPerLevel;

        attributes.perception.rank = Math.max(attributes.perception.rank, classDetails.perception) as ZeroToFour;
        attributes.classDC.rank = Math.max(attributes.classDC.rank, classDetails.classDC) as ZeroToFour;
        if (classDetails.keyAbility.value.length === 1) {
            details.keyability.value = classDetails.keyAbility.value[0];
        }

        for (const category of ARMOR_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, classDetails.defenses[category]) as ZeroToFour;
        }

        for (const category of WEAPON_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, classDetails.attacks[category]) as ZeroToFour;
        }

        for (const save of SAVE_TYPES) {
            saves[save].rank = Math.max(saves[save].rank, classDetails.savingThrows[save]) as ZeroToFour;
        }
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
