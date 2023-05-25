import { ActorPF2e, CharacterPF2e } from "@actor";
import { CreatureTrait } from "@actor/creature/index.ts";
import { ItemPF2e } from "@item";
import { Rarity } from "@module/data.ts";
import { ErrorPF2e, sluggify } from "@util";
import { HeritageSource, HeritageSystemData } from "./data.ts";

class HeritagePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    get traits(): Set<CreatureTrait> {
        return new Set(this.system.traits.value);
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get isVersatile(): boolean {
        return !this.system.ancestry;
    }

    /** Prepare a character's data derived from their heritage */
    override prepareActorData(this: HeritagePF2e<ActorPF2e>): void {
        if (!this.actor.isOfType("character")) throw ErrorPF2e("heritage embedded on non-character");
        // Some abilities allow for a second heritage. If the PC has more than one, set this heritage as the actor's
        // main one only if it wasn't granted by another item.
        if (this.actor.itemTypes.heritage.length === 1 || !this.grantedBy) {
            this.actor.heritage = this as HeritagePF2e<CharacterPF2e>;
        }

        // Add and remove traits as specified
        this.actor.system.traits.value.push(...this.traits);

        const slug = this.slug ?? sluggify(this.name);
        this.actor.system.details.heritage = {
            name: this.name,
            trait: slug in CONFIG.PF2E.ancestryTraits ? slug : null,
        };

        // If this heritage is versatile, add to the "countsAs" array
        // (serves as a list of traits of eligible ancestry feats)
        if (this.isVersatile) {
            this.actor.system.details.ancestry?.countsAs.push(slug);
        }

        // Add a roll option for this heritage
        this.actor.rollOptions.all[`heritage:${slug}`] = true;
        // Backward compatibility until migration
        this.actor.rollOptions.all[`self:heritage:${slug}`] = true;
    }

    override getRollOptions(prefix = this.type): string[] {
        const ancestryOrVersatile = this.system.ancestry ? `ancestry:${this.system.ancestry.slug}` : "versatile";

        return [...super.getRollOptions(prefix), `${prefix}:${ancestryOrVersatile}`];
    }
}

interface HeritagePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: HeritageSource;
    system: HeritageSystemData;
}

export { HeritagePF2e };
