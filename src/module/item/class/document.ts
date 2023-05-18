import { ActorPF2e, CharacterPF2e } from "@actor";
import { ClassDCData } from "@actor/character/data.ts";
import { FeatSlotLevel } from "@actor/character/feats.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_ABBREVIATIONS } from "@actor/values.ts";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { ArmorCategory } from "@item/armor/index.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { ZeroToFour } from "@module/data.ts";
import { setHasElement, sluggify } from "@util";
import {
    ClassAttackProficiencies,
    ClassDefenseProficiencies,
    ClassSource,
    ClassSystemData,
    ClassTrait,
} from "./data.ts";

class ClassPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
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
                        !(f.flags.pf2e.grantedBy && actor.items.has(f.flags.pf2e.grantedBy.id))
                ),
            ])
        );
    }

    /** Pulls the features that should be granted by this class, sorted by level and choice set */
    override async createGrantedItems(options: { level?: number } = {}): Promise<FeatPF2e<null>[]> {
        const hasChoiceSet = (f: FeatPF2e<null>) => f.system.rules.some((re) => re.key === "ChoiceSet");
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
    override prepareActorData(this: ClassPF2e<CharacterPF2e>): void {
        if (!this.actor?.isOfType("character")) {
            console.error("Only a character can have a class");
            return;
        }

        this.actor.class = this;
        const { attributes, build, details, martial, proficiencies, saves, skills } = this.actor.system;
        const slug = this.slug ?? sluggify(this.name);

        // Add base key ability options

        build.abilities.keyOptions = [...this.system.keyAbility.value];
        build.abilities.boosts.class = this.system.keyAbility.selected;

        attributes.classhp = this.hpPerLevel;

        attributes.perception.rank = Math.max(attributes.perception.rank, this.perception) as ZeroToFour;
        this.logAutoChange("system.attributes.perception.rank", this.perception);

        // Override the actor's key ability score if it's set
        details.keyability.value =
            (build.abilities.manual ? details.keyability.value : build.abilities.boosts.class) ?? "str";

        // Set class DC
        type PartialClassDCs = Record<string, Pick<ClassDCData, "label" | "ability" | "rank" | "primary">>;
        const classDCs: PartialClassDCs = proficiencies.classDCs;
        classDCs[slug] = {
            label: this.name,
            rank: this.classDC,
            ability: details.keyability.value,
            primary: true,
        };

        this.logAutoChange(`system.proficiencies.classDCs.${slug}.rank`, this.classDC);

        const nonBarding = ARMOR_CATEGORIES.filter(
            (c): c is Exclude<ArmorCategory, "light-barding" | "heavy-barding" | "shield"> =>
                !["light-barding", "heavy-barding"].includes(c)
        );
        for (const category of nonBarding) {
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

interface ClassPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    readonly _source: ClassSource;
    system: ClassSystemData;

    get slug(): ClassTrait | null;
}

export { ClassPF2e };
