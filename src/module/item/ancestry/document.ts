import type { ActorPF2e, CharacterPF2e } from "@actor";
import { SenseData } from "@actor/creature/index.ts";
import { CreatureTrait } from "@actor/creature/types.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { AttributeString } from "@actor/types.ts";
import type { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import { ABCItemPF2e, type FeatPF2e } from "@item";
import { Size } from "@module/data.ts";
import { sluggify } from "@util";
import { AncestrySource, AncestrySystemData } from "./data.ts";

class AncestryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    static override get validTraits(): Record<CreatureTrait, string> {
        return CONFIG.PF2E.creatureTraits;
    }

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
        const actor = this.actor;
        if (!actor.isOfType("character")) {
            console.error("PF2e System | Only a character can have an ancestry");
            return;
        }

        actor.ancestry = this;
        actor.system.attributes.ancestryhp = this.hitPoints;
        this.logAutoChange("system.attributes.ancestryhp", this.hitPoints);
        actor.system.traits.size = new ActorSizePF2e({ value: this.size });
        this.logAutoChange("system.traits.size.value", this.size);
        const reach = SIZE_TO_REACH[this.size];
        actor.system.attributes.reach = { base: reach, manipulate: reach };

        // Set base land speed
        const speed = actor.system.movement.speeds.land;
        speed.base = speed.value = this.speed;
        speed.source = this.name;

        // Set at actor level for use by early-running REs
        const actorLevelSpeeds: Record<"land", { value: number; base: number }> = actor.movement.speeds;
        actorLevelSpeeds.land = { value: speed.base, base: speed.base };

        const build = actor.system.build;
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

        // Set "self:" roll option for this ancestry and its associated traits
        actor.rollOptions.all[`self:ancestry:${slug}`] = true;
        for (const trait of this.traits) {
            actor.rollOptions.all[`self:trait:${trait}`] = true;
        }
    }

    /** Ensure certain fields are positive integers. */
    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        const additionalLanguages = changed.system.additionalLanguages;
        if (additionalLanguages?.count !== undefined) {
            additionalLanguages.count = Math.floor(Math.clamp(Number(additionalLanguages.count) || 0, 0, 99));
        }

        for (const fieldName of ["hp", "speed", "reach"] as const) {
            if (changed.system[fieldName] !== undefined) {
                const minimum = fieldName === "speed" ? 5 : 1;
                const value = Math.floor(Math.clamp(Number(changed.system[fieldName]) || 0, minimum, 99));
                changed.system[fieldName] = fieldName === "hp" ? value : Math.ceil(value / 5) * 5;
            }
        }

        return super._preUpdate(changed, options, user);
    }
}

interface AncestryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ABCItemPF2e<TParent> {
    readonly _source: AncestrySource;
    system: AncestrySystemData;
}

export { AncestryPF2e };
