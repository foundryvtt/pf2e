import type { ActorPF2e } from "@actor";
import type { SpellPF2e } from "@item";
import { ErrorPF2e } from "@util";
import { SpellCollection } from "./collection.ts";
import { BaseSpellcastingEntry, CastOptions, SpellcastingSheetData } from "./types.ts";

/** An in-memory spellcasting entry for rituals */
export class RitualSpellcasting<TActor extends ActorPF2e> implements BaseSpellcastingEntry<TActor> {
    actor: TActor;

    spells: SpellCollection<TActor>;

    constructor(actor: TActor) {
        this.actor = actor;
        this.spells = new SpellCollection(this, this.name);
        for (const ritual of this.actor.itemTypes.spell.filter((s) => s.isRitual)) {
            this.spells.set(ritual.id, ritual);
        }
    }

    get id(): string {
        return "rituals";
    }

    get name(): string {
        return game.i18n.localize("PF2E.Actor.Creature.Spellcasting.Rituals");
    }

    get sort(): number {
        return Math.max(0, ...this.actor.itemTypes.spellcastingEntry.map((e) => e.sort)) + 20;
    }

    get category(): "ritual" {
        return "ritual";
    }

    get tradition(): null {
        return null;
    }

    get isFlexible(): false {
        return false;
    }

    get isFocusPool(): false {
        return false;
    }

    get isInnate(): false {
        return false;
    }

    get isPrepared(): false {
        return false;
    }

    get isRitual(): true {
        return true;
    }

    get isSpontaneous(): false {
        return false;
    }

    get isEphemeral(): true {
        return true;
    }

    canCast(spell: SpellPF2e): boolean {
        return spell.isRitual;
    }

    async cast(spell: SpellPF2e, options: CastOptions = {}): Promise<void> {
        if (!spell.isRitual) throw ErrorPF2e("Attempted to cast non-ritual from `RitualSpellcasting`");
        await spell.toMessage(undefined, { rollMode: options.rollMode });
    }

    async getSheetData(): Promise<SpellcastingSheetData> {
        const collectionData = await this.spells.getSpellData();
        return fu.mergeObject(collectionData, {
            id: this.id,
            name: this.name,
            statistic: null,
            tradition: null,
            category: this.category,
            isRitual: true,
            isEphemeral: true,
            hasCollection: true,
            sort: this.sort,
            usesSpellProficiency: false,
        });
    }
}
