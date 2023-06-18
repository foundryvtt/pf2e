import { ActorPF2e, CharacterPF2e } from "@actor";
import { CreatureSensePF2e } from "@actor/creature/sense.ts";
import { CreatureTrait } from "@actor/creature/types.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { AbilityString } from "@actor/types.ts";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { Size } from "@module/data.ts";
import { sluggify } from "@util";
import { AncestrySource, AncestrySystemData } from "./data.ts";

class AncestryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    get traits(): Set<CreatureTrait> {
        return new Set(this.system.traits.value);
    }

    get rarity(): string {
        return this.system.traits.rarity;
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
    get lockedBoosts(): AbilityString[] {
        return Object.values(this.system.boosts)
            .filter((boost) => boost.value.length === 1)
            .map((boost) => boost.selected)
            .filter((boost): boost is AbilityString => !!boost);
    }

    /** Returns all flaws enforced by this ancestry normally */
    get lockedFlaws(): AbilityString[] {
        return Object.values(this.system.flaws)
            .map((flaw) => flaw.selected)
            .filter((flaw): flaw is AbilityString => !!flaw);
    }

    /** Include all ancestry features in addition to any with the expected location ID */
    override getLinkedItems(): FeatPF2e<ActorPF2e>[] {
        if (!this.actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedItems(),
                ...this.actor.itemTypes.feat.filter((f) => f.category === "ancestryfeature"),
            ])
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
        if (!(actor instanceof CharacterPF2e)) {
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
            build.abilities.boosts.ancestry.push(...this.system.alternateAncestryBoosts);
        } else {
            // Add ability boosts and flaws
            for (const target of ["boosts", "flaws"] as const) {
                for (const ability of Object.values(this.system[target])) {
                    if (ability.selected) {
                        build.abilities[target].ancestry.push(ability.selected);
                    }
                }
            }
        }

        // Add voluntary boost and flaws (if they exist)
        if (this.system.voluntary) {
            const { boost, flaws } = this.system.voluntary;
            if (boost) build.abilities.boosts.ancestry.push(boost);
            build.abilities.flaws.ancestry.push(...flaws);
        }

        // Add languages
        const innateLanguages = this.system.languages.value;
        for (const language of innateLanguages) {
            if (!actor.system.traits.languages.value.includes(language)) {
                actor.system.traits.languages.value.push(language);
            }
        }

        // Add low-light vision or darkvision if the ancestry includes it
        const { senses } = actor.system.traits;
        const { vision } = this.system;
        if (!(vision === "normal" || senses.some((sense) => sense.type === vision))) {
            senses.push(new CreatureSensePF2e({ type: vision, value: "", source: this.name }));
            const senseRollOptions = (actor.rollOptions["sense"] ??= {});
            senseRollOptions[`self:${sluggify(vision)}:from-ancestry`] = true;
        }

        // Add traits from this item
        actor.system.traits.value.push(...this.traits);

        const slug = this.slug ?? sluggify(this.name);
        actor.system.details.ancestry = {
            name: this.name,
            trait: slug,
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
