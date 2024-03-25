import type { CreaturePF2e } from "@actor";
import { AttributeString } from "@actor/types.ts";
import type { PhysicalItemPF2e, SpellPF2e } from "@item";
import { MagicTradition } from "@item/spell/types.ts";
import type { PredicatePF2e } from "@system/predication.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import * as R from "remeda";
import { SpellCollection, SpellCollectionData } from "./collection.ts";
import { createCounteractStatistic } from "./helpers.ts";
import type { CastOptions, SpellcastingEntry, SpellcastingSheetData } from "./types.ts";

/** An in-memory spellcasting entry for items-only spellcasting */
class ItemSpellcasting<TActor extends CreaturePF2e = CreaturePF2e> implements SpellcastingEntry<TActor> {
    id: string;

    name: string;

    actor: TActor;

    statistic: Statistic;

    tradition: MagicTradition | null;

    /** A predicate to test against a physical item to determine whether its contained spell can be cast */
    castPredicate: PredicatePF2e;

    constructor({ id, name, actor, statistic, tradition, castPredicate }: ItemsSpellcastingConstructorParams<TActor>) {
        this.id = id;
        this.name = name;
        this.actor = actor;
        this.statistic = statistic;
        this.tradition = tradition ?? null;
        this.castPredicate = castPredicate;
    }

    get counteraction(): Statistic {
        return createCounteractStatistic(this);
    }

    get attribute(): AttributeString {
        return this.statistic.attribute ?? "cha";
    }

    get category(): "items" {
        return "items";
    }

    get sort(): number {
        return Math.max(0, ...this.actor.itemTypes.spellcastingEntry.map((e) => e.sort)) + 10;
    }

    get spells(): null {
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

    get isSpontaneous(): false {
        return false;
    }

    get isRitual(): false {
        return false;
    }

    get isEphemeral(): true {
        return true;
    }

    canCast(spell: SpellPF2e, { origin }: { origin?: Maybe<PhysicalItemPF2e> } = {}): boolean {
        if (!origin || !spell.actor?.isOfType("creature")) return false;
        const rollOptions = new Set([
            ...this.actor.getRollOptions(),
            ...origin.getRollOptions("item"),
            ...spell.getRollOptions("spell", { includeVariants: true }),
        ]);
        return this.castPredicate.test(rollOptions);
    }

    async cast(spell: SpellPF2e, options: CastOptions = {}): Promise<void> {
        const message = options.message ?? true;
        if (message && this.canCast(spell, { origin: spell.parentItem })) {
            spell.system.location.value = this.id;
            await spell.toMessage(null, { rollMode: options.rollMode, data: { castRank: spell.rank } });
        }
    }

    async getSheetData({ spells }: { spells?: SpellCollection<TActor> } = {}): Promise<SpellcastingSheetData> {
        const collectionData: SpellCollectionData = (await spells?.getSpellData()) ?? { groups: [], prepList: null };

        return {
            ...R.pick(this, [
                "category",
                "tradition",
                "sort",
                "isFlexible",
                "isFocusPool",
                "isInnate",
                "isPrepared",
                "isRitual",
                "isSpontaneous",
                "isEphemeral",
            ]),
            ...collectionData,
            id: spells?.id ?? this.id,
            name: spells?.name ?? this.name,
            statistic: this.statistic.getChatData(),
            attribute: this.statistic.attribute,
            hasCollection: !!spells?.size,
            usesSpellProficiency: false,
        };
    }
}

interface ItemsSpellcastingConstructorParams<TActor extends CreaturePF2e> {
    id: string;
    name: string;
    actor: TActor;
    statistic: Statistic;
    tradition?: Maybe<MagicTradition>;
    castPredicate: PredicatePF2e;
}

export { ItemSpellcasting };
