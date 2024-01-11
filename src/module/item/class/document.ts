import type { ActorPF2e, CharacterPF2e } from "@actor";
import { ClassDCData } from "@actor/character/data.ts";
import { FeatSlotCreationData } from "@actor/character/feats.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_ABBREVIATIONS } from "@actor/values.ts";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { ArmorCategory } from "@item/armor/index.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { ZeroToFour } from "@module/data.ts";
import { sluggify } from "@util";
import { ClassAttackProficiencies, ClassDefenseProficiencies, ClassSource, ClassSystemData } from "./data.ts";
import { ClassTrait } from "./types.ts";

class ClassPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    get attacks(): ClassAttackProficiencies {
        return this.system.attacks;
    }

    get defenses(): ClassDefenseProficiencies {
        return this.system.defenses;
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

    get grantedFeatSlots(): Record<"ancestry" | "class" | "skill" | "general", (number | FeatSlotCreationData)[]> {
        const system = this.system;

        return {
            ancestry: fu.deepClone(system.ancestryFeatLevels.value),
            class: [...system.classFeatLevels.value],
            skill: [...system.skillFeatLevels.value],
            general: [...system.generalFeatLevels.value],
        };
    }

    /** Include all top-level class features in addition to any with the expected location ID */
    override getLinkedItems(): FeatPF2e<ActorPF2e>[] {
        const { actor } = this;
        if (!actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedItems(),
                ...actor.itemTypes.feat.filter(
                    (f) =>
                        f.category === "classfeature" &&
                        !(f.flags.pf2e.grantedBy && actor.items.has(f.flags.pf2e.grantedBy.id)),
                ),
            ]),
        );
    }

    /** Pulls the features that should be granted by this class, sorted by level */
    override async createGrantedItems(options: { level?: number } = {}): Promise<FeatPF2e<null>[]> {
        return (await super.createGrantedItems(options)).sort((a, b) => a.system.level.value - b.system.level.value);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const { keyAbility } = this.system;
        keyAbility.selected ??= keyAbility.value.length === 1 ? keyAbility.value[0] : null;
    }

    /** Prepare a character's data derived from their class */
    override prepareActorData(this: ClassPF2e<CharacterPF2e>): void {
        const actor = this.actor;
        if (!actor.isOfType("character")) {
            console.error("Only a character can have a class");
            return;
        }

        actor.class = this;
        const { attributes, build, details, proficiencies, saves, skills } = actor.system;
        const slug = this.slug ?? sluggify(this.name);

        // Add base key ability options

        build.attributes.keyOptions = [...this.system.keyAbility.value];
        build.attributes.boosts.class = this.system.keyAbility.selected;

        attributes.classhp = this.hpPerLevel;

        actor.system.perception.rank = Math.max(actor.system.perception.rank, this.perception) as ZeroToFour;
        this.logAutoChange("system.perception.rank", this.perception);

        // Override the actor's key ability score if it's set
        details.keyability.value =
            (build.attributes.manual ? details.keyability.value : build.attributes.boosts.class) ?? "str";

        // Set class DC
        type PartialClassDCs = Record<string, Pick<ClassDCData, "attribute" | "label" | "primary" | "rank">>;
        const classDCs: PartialClassDCs = proficiencies.classDCs;
        classDCs[slug] = {
            label: this.name,
            rank: 1,
            attribute: details.keyability.value,
            primary: true,
        };

        this.logAutoChange(`system.proficiencies.classDCs.${slug}.rank`, 1);

        const { attacks, defenses } = proficiencies;

        for (const category of WEAPON_CATEGORIES) {
            attacks[category].rank = Math.max(attacks[category].rank, this.attacks[category]) as ZeroToFour;
            this.logAutoChange(`system.proficiencies.attacks.${category}.rank`, this.attacks[category]);
        }

        const nonBarding = Array.from(ARMOR_CATEGORIES).filter(
            (c): c is Exclude<ArmorCategory, "light-barding" | "heavy-barding" | "shield"> =>
                !["light-barding", "heavy-barding"].includes(c),
        );
        for (const category of nonBarding) {
            defenses[category].rank = Math.max(defenses[category].rank, this.defenses[category]) as ZeroToFour;
            this.logAutoChange(`system.proficiencies.defenses.${category}.rank`, this.defenses[category]);
        }

        for (const saveType of SAVE_TYPES) {
            saves[saveType].rank = Math.max(saves[saveType].rank, this.savingThrows[saveType]) as ZeroToFour;
            this.logAutoChange(`system.saves.${saveType}.rank`, this.savingThrows[saveType]);
        }

        for (const trainedSkill of this.system.trainedSkills.value) {
            if (SKILL_ABBREVIATIONS.includes(trainedSkill)) {
                skills[trainedSkill].rank = Math.max(skills[trainedSkill].rank, 1) as ZeroToFour;
            }
        }

        proficiencies.spellcasting.rank = Math.max(
            proficiencies.spellcasting.rank,
            this.system.spellcasting,
        ) as ZeroToFour;
        this.logAutoChange("system.proficiencies.spellcasting.rank", this.system.spellcasting);

        details.class = { name: this.name, trait: slug };
        this.actor.rollOptions.all[`class:${slug}`] = true;
    }
}

interface ClassPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    readonly _source: ClassSource;
    system: ClassSystemData;

    get slug(): ClassTrait | null;
}

export { ClassPF2e };
