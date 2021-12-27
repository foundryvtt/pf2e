import { CreatureTrait } from "@actor/creature/data";
import { CharacterPF2e } from "@actor";
import { Size } from "@module/data";
import { ABCItemPF2e } from "../abc";
import { AncestryData } from "./data";
import { sluggify } from "@util";
import { CreatureSensePF2e } from "@actor/creature/sense";

export class AncestryPF2e extends ABCItemPF2e {
    static override get schema(): typeof AncestryData {
        return AncestryData;
    }

    get traits(): Set<CreatureTrait> {
        return new Set(this.data.data.traits.value);
    }

    get hitPoints(): number {
        return this.data.data.hp;
    }

    get speed(): number {
        return this.data.data.speed;
    }

    get size(): Size {
        return this.data.data.size;
    }

    get reach(): number {
        return this.data.data.reach;
    }

    /** Prepare a character's data derived from their ancestry */
    override prepareActorData(this: Embedded<AncestryPF2e>): void {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error("PF2e System | Only a character can have an ancestry");
            return;
        }

        const actorData = this.actor.data;
        const systemData = actorData.data;

        systemData.attributes.ancestryhp = this.hitPoints;
        this.logAutoChange("data.attributes.ancestryhp", this.hitPoints);

        systemData.traits.size.value = this.size;
        this.logAutoChange("data.traits.size.value", this.size);

        systemData.attributes.speed.value = String(this.speed);
        systemData.attributes.reach = { value: this.reach, manipulate: this.reach };

        // Add languages
        const innateLanguages = this.data.data.languages.value;
        for (const language of innateLanguages) {
            if (!systemData.traits.languages.value.includes(language)) {
                systemData.traits.languages.value.push(language);
            }
        }

        // Add low-light vision or darkvision if the ancestry includes it
        const { senses } = systemData.traits;
        const { vision } = this.data.data;
        if (!(vision === "normal" || senses.some((sense) => sense.type === vision))) {
            senses.push(new CreatureSensePF2e({ type: vision, value: "", source: this.name }));
            const senseRollOptions = (this.actor.rollOptions["sense"] ??= {});
            senseRollOptions[`self:${sluggify(vision)}:from-ancestry`] = true;
        }

        // Add traits from ancestry and heritage
        const ancestryTraits: Set<string> = this.traits;
        const heritageTraits: Set<string> = this.actor.heritage?.traits ?? new Set();
        const traits = Array.from(
            new Set(
                [...ancestryTraits, ...heritageTraits].filter(
                    (trait) => !["common", "versatile heritage"].includes(trait)
                )
            )
        ).sort();
        systemData.traits.traits.value.push(...traits);

        const slug = this.slug ?? sluggify(this.name);
        systemData.details.ancestry = { name: this.name, trait: slug };

        // Set self: roll option for this ancestry and its associated traits
        this.actor.rollOptions.all[`self:ancestry:${slug}`] = true;
        for (const trait of this.traits) {
            this.actor.rollOptions.all[`self:${trait}`] = true;
            this.actor.rollOptions.all[`self:trait:${trait}`] = true;
        }
    }
}

export interface AncestryPF2e {
    readonly data: AncestryData;
}
