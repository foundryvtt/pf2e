import { CharacterPF2e } from "@actor";
import { CreatureTrait } from "@actor/creature/data";
import { ItemPF2e } from "@item";
import { Rarity } from "@module/data";
import { sluggify } from "@util";
import { HeritageData } from "./data";

class HeritagePF2e extends ItemPF2e {
    get traits(): Set<CreatureTrait> {
        return new Set(this.data.data.traits.value);
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
    }

    /** Prepare a character's data derived from their heritage */
    override prepareActorData(this: Embedded<HeritagePF2e>): void {
        this.actor.heritage = this;
        const systemData = this.actor.data.data;
        // Add and remove traits as specified
        systemData.traits.traits.value.push(...this.traits);

        const slug = this.slug ?? sluggify(this.name);
        systemData.details.heritage = {
            name: this.name,
            trait: slug in CONFIG.PF2E.ancestryTraits ? slug : null,
        };

        // Add a self: roll option for this heritage
        this.actor.rollOptions.all[`self:heritage:${slug}`] = true;
    }
}

interface HeritagePF2e extends ItemPF2e {
    readonly parent: CharacterPF2e | null;

    readonly data: HeritageData;
}

export { HeritagePF2e };
