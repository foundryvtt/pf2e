import { CreatureTrait } from "@actor/creature/data";
import { CharacterPF2e } from "@actor";
import { Size } from "@module/data";
import { ABCItemPF2e, FeatPF2e } from "@item";
import { AncestryData } from "./data";
import { sluggify } from "@util";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { SIZE_TO_REACH } from "@actor/creature/values";
import { AbilityString } from "@actor/types";

class AncestryPF2e extends ABCItemPF2e {
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

    get lockedBoosts(): AbilityString[] {
        return Object.values(this.system.boosts)
            .filter((boost) => boost.value.length === 1)
            .map((boost) => boost.selected)
            .filter((boost): boost is AbilityString => !!boost);
    }

    /** Include all ancestry features in addition to any with the expected location ID */
    override getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];

        return Array.from(
            new Set([
                ...super.getLinkedFeatures(),
                ...this.actor.itemTypes.feat.filter((f) => f.featType === "ancestryfeature"),
            ])
        );
    }

    /** Toggle between voluntary flaws being on or off */
    async toggleVoluntaryFlaw(): Promise<void> {
        if (this.data._source.data.voluntary) {
            await this.update({ "data.-=voluntary": null });
        } else {
            await this.update({ "data.voluntary": { boost: null, flaws: [] } });
        }
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
    override prepareActorData(this: Embedded<AncestryPF2e>): void {
        const { actor } = this;
        if (!(actor instanceof CharacterPF2e)) {
            console.error("PF2e System | Only a character can have an ancestry");
            return;
        }

        actor.ancestry = this;
        const actorData = actor.data;
        const systemData = actorData.data;

        systemData.attributes.ancestryhp = this.hitPoints;
        this.logAutoChange("data.attributes.ancestryhp", this.hitPoints);

        systemData.traits.size.value = this.size;
        this.logAutoChange("data.traits.size.value", this.size);

        const reach = SIZE_TO_REACH[this.size];
        systemData.attributes.reach = { general: reach, manipulate: reach };

        systemData.attributes.speed.value = String(this.speed);

        // Add ability boosts and flaws
        const { build } = actor.system;
        for (const target of ["boosts", "flaws"] as const) {
            for (const ability of Object.values(this.system[target])) {
                if (ability.selected) {
                    build.abilities[target].ancestry.push(ability.selected);
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
            if (!systemData.traits.languages.value.includes(language)) {
                systemData.traits.languages.value.push(language);
            }
        }

        // Add low-light vision or darkvision if the ancestry includes it
        const { senses } = systemData.traits;
        const { vision } = this.system;
        if (!(vision === "normal" || senses.some((sense) => sense.type === vision))) {
            senses.push(new CreatureSensePF2e({ type: vision, value: "", source: this.name }));
            const senseRollOptions = (actor.rollOptions["sense"] ??= {});
            senseRollOptions[`self:${sluggify(vision)}:from-ancestry`] = true;
        }

        // Add traits from this item
        systemData.traits.traits.value.push(...this.traits);

        const slug = this.slug ?? sluggify(this.name);
        systemData.details.ancestry = { name: this.name, trait: slug };

        // Set self: roll option for this ancestry and its associated traits
        actor.rollOptions.all[`self:ancestry:${slug}`] = true;
        for (const trait of this.traits) {
            actor.rollOptions.all[`self:trait:${trait}`] = true;
        }
    }
}

interface AncestryPF2e {
    readonly data: AncestryData;
}

export { AncestryPF2e };
