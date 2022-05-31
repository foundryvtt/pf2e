import { CharacterPF2e } from "@actor";
import { SAVE_TYPES } from "@actor/data/values";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { ARMOR_CATEGORIES } from "@item/armor/data";
import { WEAPON_CATEGORIES } from "@item/weapon/values";
import { ZeroToFour } from "@module/data";
import { sluggify } from "@util";
import { ClassData, ClassTrait } from "./data";

class ClassPF2e extends ABCItemPF2e {
    get hpPerLevel(): number {
        return this.data.data.hp;
    }

    /** Include all class features in addition to any with the expected location ID */
    override getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedFeatures(),
                ...this.actor.itemTypes.feat.filter((f) => f.featType === "classfeature"),
            ])
        );
    }

    /** Prepare a character's data derived from their class */
    override prepareActorData(this: Embedded<ClassPF2e>): void {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error("Only a character can have a class");
            return;
        }

        this.actor.class = this;
        const classDetails = this.data.data;
        const { attributes, details, martial, saves } = this.actor.data.data;
        attributes.classhp = this.hpPerLevel;

        attributes.perception.rank = Math.max(attributes.perception.rank, classDetails.perception) as ZeroToFour;
        this.logAutoChange("data.attributes.perception.rank", classDetails.perception);

        attributes.classDC.rank = Math.max(attributes.classDC.rank, classDetails.classDC) as ZeroToFour;
        this.logAutoChange("data.attributes.classDC.rank", classDetails.classDC);

        if (classDetails.keyAbility.value.length === 1) {
            details.keyability.value = classDetails.keyAbility.value[0];
        }

        for (const category of ARMOR_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, classDetails.defenses[category]) as ZeroToFour;
            this.logAutoChange(`data.martial.${category}.rank`, classDetails.defenses[category]);
        }

        for (const category of WEAPON_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, classDetails.attacks[category]) as ZeroToFour;
            this.logAutoChange(`data.martial.${category}.rank`, classDetails.attacks[category]);
        }

        for (const saveType of SAVE_TYPES) {
            saves[saveType].rank = Math.max(saves[saveType].rank, classDetails.savingThrows[saveType]) as ZeroToFour;
            this.logAutoChange(`data.saves.${saveType}.rank`, classDetails.savingThrows[saveType]);
        }

        const slug = this.slug ?? sluggify(this.name);
        details.class = { name: this.name, trait: slug };
        this.actor.rollOptions.all[`class:${slug}`] = true;
    }
}

interface ClassPF2e {
    readonly data: ClassData;

    get slug(): ClassTrait | null;
}

export { ClassPF2e };
