import { ActorPF2e } from "@actor";
import { SpellPF2e } from "@item/spell/document.ts";
import { ErrorPF2e } from "@util";
import { SpellCollection } from "./collection.ts";
import { BaseSpellcastingEntry, CastOptions, SpellcastingSheetData } from "./types.ts";

/** An in-memory spellcasting entry for rituals */
export class RitualSpellcasting<TActor extends ActorPF2e> implements BaseSpellcastingEntry<TActor> {
    actor: TActor;

    spells: SpellCollection<TActor, this>;

    constructor(actor: TActor, rituals: SpellPF2e<TActor>[]) {
        this.actor = actor;
        this.spells = new SpellCollection(this);
        for (const ritual of rituals) {
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
        return Math.max(0, ...this.actor.itemTypes.spellcastingEntry.map((e) => e.sort)) + 10;
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

    canCast(spell: SpellPF2e): boolean {
        return spell.isRitual;
    }

    async cast(spell: SpellPF2e, options: CastOptions = {}): Promise<void> {
        if (!spell.isRitual) throw ErrorPF2e("Attempted to cast non-ritual from `RitualSpellcasting`");
        await spell.toMessage(undefined, { rollMode: options.rollMode });
    }

    async getSheetData(): Promise<SpellcastingSheetData> {
        return {
            id: this.id,
            name: this.name,
            statistic: null,
            tradition: null,
            category: this.category,
            isRitual: true,
            hasCollection: true,
            sort: this.sort,
            ...(await this.spells.getSpellData()),
        };
    }
}
