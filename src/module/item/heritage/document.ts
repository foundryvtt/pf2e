import { CharacterPF2e } from "@actor";
import { CreatureTrait } from "@actor/creature/data";
import { ItemPF2e } from "@item";
import { Rarity } from "@module/data";
import { sluggify } from "@util";
import { HeritageData } from "./data";

class HeritagePF2e extends ItemPF2e {
    static override get schema(): typeof HeritageData {
        return HeritageData;
    }

    get traits(): Set<CreatureTrait> {
        return new Set(this.data.data.traits.value);
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
    }

    /** Prepare a character's data derived from their heritage */
    override prepareActorData(this: Embedded<HeritagePF2e>): void {
        // Add and remove traits as specified
        this.actor.data.data.traits.traits.value.push(...this.traits);

        // Add a self: roll option for this heritage
        const slug = this.slug ?? sluggify(this.name);
        this.actor.rollOptions.all[`self:heritage:${slug}`] = true;
    }
}

interface HeritagePF2e extends ItemPF2e {
    readonly parent: CharacterPF2e | null;

    readonly data: HeritageData;
}

export { HeritagePF2e };
