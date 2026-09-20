import type { ActorPF2e } from "@actor";
import type { SkillData } from "@actor/creature/data.ts";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import type { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import type { ZeroToFour } from "@module/data.ts";
import { sluggify } from "@util";

/** Sluggify a lore name or slug, appending `-lore` unless the word is already present */
function sluggifyLoreName(nameOrSlug: string): string {
    const rawLoreSlug = sluggify(nameOrSlug);
    return /\blore\b/.test(rawLoreSlug) ? rawLoreSlug : `${rawLoreSlug}-lore`;
}

class LorePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    override get slug(): string {
        return sluggifyLoreName(super.slug ?? this.name);
    }

    override prepareActorData(this: LorePF2e<ActorPF2e>): void {
        const actor = this.actor;
        if (!actor.isOfType("creature")) return;
        const skills: Record<string, Partial<SkillData> & { base?: number; rank?: number }> = actor.system.skills;
        skills[this.slug] = { attribute: "int", label: this.name, itemId: this.id };
        if (actor.isOfType("character")) skills[this.slug].rank = this.system.proficient.value;
        else if (actor.isOfType("npc")) skills[this.slug].base = this.system.mod.value;
    }
}

interface LorePF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: LoreSource;
    system: LoreSystemData;
}

type LoreSource = BaseItemSourcePF2e<"lore", LoreSystemSource>;

interface LoreSystemSource extends ItemSystemSource {
    traits: OtherTagsOnly;
    mod: { value: number };
    proficient: { value: ZeroToFour };
    variants?: Record<string, { label: string; options: string }>;
    level?: never;
}

interface LoreSystemData extends Omit<LoreSystemSource, "description">, ItemSystemData {
    level?: never;
    traits: OtherTagsOnly;
}

class LoreSheetPF2e extends ItemSheetPF2e<LorePF2e> {}

export { LorePF2e, LoreSheetPF2e, sluggifyLoreName };
export type { LoreSource, LoreSystemData };
