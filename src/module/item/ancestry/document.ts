import type { ActorPF2e, CharacterPF2e } from "@actor";
import { SenseData } from "@actor/creature/index.ts";
import { CreatureTrait } from "@actor/creature/types.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { AttributeString } from "@actor/types.ts";
import { ABCItemPF2e, type FeatPF2e } from "@item";
import { Size } from "@module/data.ts";
import { sluggify } from "@util";
import { AncestrySource, AncestrySystemData } from "./data.ts";

class AncestryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    get traits(): Set<CreatureTrait> {
        return new Set(this.system.traits.value);
    }

    get hitPoints(): number {
        return this.system.hp;
    }

    get speed(): number {
        return this.system.speed;
    }

    get size(): Size {
        return this.system.size;
    }

    /** Returns all boosts enforced by this ancestry normally */
    get lockedBoosts(): AttributeString[] {
        return Object.values(this.system.boosts)
            .filter((b) => b.value.length === 1)
            .flatMap((b) => b.selected ?? []);
    }

    /** Returns all flaws enforced by this ancestry normally */
    get lockedFlaws(): AttributeString[] {
        return Object.values(this.system.flaws).flatMap((f) => f.selected ?? []);
    }

    /** Include all ancestry features in addition to any with the expected location ID */
    override getLinkedItems(): FeatPF2e<ActorPF2e>[] {
        if (!this.actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedItems(),
                ...this.actor.itemTypes.feat.filter((f) => f.category === "ancestryfeature"),
            ]),
        );
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        for (const boost of Object.values(this.system.boosts)) {
            if (boost.value.length === 1) {
                boost.selected = boost.value[0];
            }
        }

        for (const flaw of Object.values(this.system.flaws)) {
            if (flaw.value.length === 1) {
                flaw.selected = flaw.value[0];
            }
        }
    }

    /** Prepare a character's data derived from their ancestry */
    override prepareActorData(this: AncestryPF2e<CharacterPF2e>): void {
        const { actor } = this;
        if (!actor.isOfType("character")) {
            console.error("PF2e System | Only a character can have an ancestry");
            return;
        }

        actor.ancestry = this;

        actor.system.attributes.ancestryhp = this.hitPoints;
        this.logAutoChange("system.attributes.ancestryhp", this.hitPoints);

        actor.system.traits.size.value = this.size;
        this.logAutoChange("system.traits.size.value", this.size);

        const reach = SIZE_TO_REACH[this.size];
        actor.system.attributes.reach = { base: reach, manipulate: reach };

        actor.system.attributes.speed.value = this.speed;

        const { build } = actor.system;
        if (this.system.alternateAncestryBoosts) {
            build.attributes.boosts.ancestry.push(...this.system.alternateAncestryBoosts);
        } else {
            // Add ability boosts and flaws
            for (const target of ["boosts", "flaws"] as const) {
                for (const ability of Object.values(this.system[target])) {
                    if (ability.selected) {
                        build.attributes[target].ancestry.push(ability.selected);
                    }
                }
            }
        }

        // Add voluntary boost and flaws (if they exist)
        if (this.system.voluntary) {
            const { boost, flaws } = this.system.voluntary;
            if (boost) build.attributes.boosts.ancestry.push(boost);
            build.attributes.flaws.ancestry.push(...flaws);
        }

        // Add languages
        build.languages.max += this.system.additionalLanguages.count;
        const freeLanguages = this.system.languages.value;
        for (const language of freeLanguages) {
            const alreadyHasLanguage = build.languages.granted.some((l) => l.slug === language);
            if (language in CONFIG.PF2E.languages && !alreadyHasLanguage) {
                build.languages.granted.push({ slug: language, source: this.name });
            }
        }

        // Add low-light vision or darkvision if the ancestry includes it
        const senseData: SenseData[] = actor.system.perception.senses;
        const vision = this.system.vision;
        if (vision !== "normal" && !senseData.some((s) => s.type === vision)) {
            senseData.push({ type: vision, acuity: "precise", range: Infinity, source: this.name });
            const senseRollOptions = (actor.rollOptions["sense"] ??= {});
            senseRollOptions[`self:${sluggify(vision)}:from-ancestry`] = true;
        }

        // Add traits from this item
        actor.system.traits.value.push(...this.traits);

        const slug = this.slug ?? sluggify(this.name);
        actor.system.details.ancestry = {
            name: this.name,
            trait: slug,
            adopted: null,
            versatile: null,
            countsAs: [slug],
        };

        // Set self: roll option for this ancestry and its associated traits
        actor.rollOptions.all[`self:ancestry:${slug}`] = true;
        for (const trait of this.traits) {
            actor.rollOptions.all[`self:trait:${trait}`] = true;
        }
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type): string[] {
        return [...super.getRollOptions(prefix), `${prefix}:rarity:${this.rarity}`];
    }
}

interface AncestryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    readonly _source: AncestrySource;
    system: AncestrySystemData;
}

export { AncestryPF2e };
