import { ClassDCData } from "@actor/character/data";
import { FeatSlotLevel } from "@actor/character/feats";
import { SaveType } from "@actor/types";
import { SAVE_TYPES, SKILL_ABBREVIATIONS } from "@actor/values";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { ARMOR_CATEGORIES } from "@item/armor/values";
import { WEAPON_CATEGORIES } from "@item/weapon/values";
import { ZeroToFour } from "@module/data";
import { setHasElement, sluggify } from "@util";
import { ClassAttackProficiencies, ClassData, ClassDefenseProficiencies, ClassTrait } from "./data";

class ClassPF2e extends ABCItemPF2e {
    get attacks(): ClassAttackProficiencies {
        return this.system.attacks;
    }

    get defenses(): ClassDefenseProficiencies {
        return this.system.defenses;
    }

    get classDC(): ZeroToFour {
        return this.system.classDC;
    }

    get hpPerLevel(): number {
        return this.system.hp;
    }

    get perception(): ZeroToFour {
        return this.system.perception;
    }

    get savingThrows(): Record<SaveType, ZeroToFour> {
        return this.system.savingThrows;
    }

    get grantedFeatSlots(): { ancestry: FeatSlotLevel[]; class: number[]; skill: number[]; general: number[] } {
        const actorLevel = this.actor?.level ?? 0;
        const system = this.system;

        const ancestryLevels: FeatSlotLevel[] = system.ancestryFeatLevels.value;
        if (game.settings.get("pf2e", "ancestryParagonVariant")) {
            ancestryLevels.unshift({ id: "ancestry-bonus", label: "1" });
            for (let level = 3; level <= actorLevel; level += 4) {
                const index = (level + 1) / 2;
                ancestryLevels.splice(index, 0, level);
            }
        }

        return {
            ancestry: ancestryLevels,
            class: system.classFeatLevels.value,
            skill: system.skillFeatLevels.value,
            general: system.generalFeatLevels.value,
        };
    }

    /** Include all class features in addition to any with the expected location ID */
    override getLinkedItems(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedItems(),
                ...this.actor.itemTypes.feat.filter((f) => f.featType === "classfeature"),
            ])
        );
    }

    /** Pulls the features that should be granted by this class, sorted by level and choice set */
    override async createGrantedItems(options: { level?: number } = {}): Promise<FeatPF2e[]> {
        const hasChoiceSet = (f: FeatPF2e) => f.system.rules.some((re) => re.key === "ChoiceSet");
        return (await super.createGrantedItems(options)).sort((a, b) => {
            const [aLevel, bLevel] = [a.system.level.value, b.system.level.value];
            if (aLevel !== bLevel) return aLevel - bLevel;
            const [aHasSet, bHasSet] = [hasChoiceSet(a), hasChoiceSet(b)];
            if (aHasSet !== bHasSet) return aHasSet ? -1 : 1;
            return a.name.localeCompare(b.name, game.i18n.lang);
        });
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const { keyAbility } = this.system;
        keyAbility.selected ??= keyAbility.value.length === 1 ? keyAbility.value[0]! : null;
    }

    /** Prepare a character's data derived from their class */
    override prepareActorData(this: Embedded<ClassPF2e>): void {
        if (!this.actor.isOfType("character")) {
            console.error("Only a character can have a class");
            return;
        }

        this.actor.class = this;
        const { attributes, build, details, martial, proficiencies, saves, skills } = this.actor.system;
        const slug = this.slug ?? sluggify(this.name);

        // Add base key ability options

        const { keyAbility } = this.system;
        build.abilities.keyOptions = [...keyAbility.value];
        build.abilities.boosts.class = keyAbility.selected;

        attributes.classhp = this.hpPerLevel;

        attributes.perception.rank = Math.max(attributes.perception.rank, this.perception) as ZeroToFour;
        this.logAutoChange("system.attributes.perception.rank", this.perception);

        // Set class DC if trained
        if (this.classDC > 0) {
            type PartialClassDCs = Record<string, Pick<ClassDCData, "label" | "ability" | "rank" | "primary">>;
            const classDCs: PartialClassDCs = proficiencies.classDCs;
            classDCs[slug] = {
                label: this.name,
                rank: this.classDC,
                ability: this.system.keyAbility.selected ?? "str",
                primary: true,
            };

            this.logAutoChange(`system.proficiencies.classDCs.${slug}.rank`, this.classDC);
        }

        for (const category of ARMOR_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, this.defenses[category]) as ZeroToFour;
            this.logAutoChange(`system.martial.${category}.rank`, this.defenses[category]);
        }

        for (const category of WEAPON_CATEGORIES) {
            martial[category].rank = Math.max(martial[category].rank, this.attacks[category]) as ZeroToFour;
            this.logAutoChange(`system.martial.${category}.rank`, this.attacks[category]);
        }

        for (const saveType of SAVE_TYPES) {
            saves[saveType].rank = Math.max(saves[saveType].rank, this.savingThrows[saveType]) as ZeroToFour;
            this.logAutoChange(`system.saves.${saveType}.rank`, this.savingThrows[saveType]);
        }

        for (const trainedSkill of this.system.trainedSkills.value) {
            if (setHasElement(SKILL_ABBREVIATIONS, trainedSkill)) {
                skills[trainedSkill].rank = Math.max(skills[trainedSkill].rank, 1) as ZeroToFour;
            }
        }

        details.class = { name: this.name, trait: slug };
        this.actor.rollOptions.all[`class:${slug}`] = true;
    }
}

interface ClassPF2e {
    readonly data: ClassData;

    get slug(): ClassTrait | null;
}

export { ClassPF2e };
