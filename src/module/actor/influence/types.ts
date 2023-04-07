import { CreaturePF2e } from "@actor";

interface InfluenceSheetData<T extends CreaturePF2e = CreaturePF2e> extends ActorSheetData<T> {
    actor: T;
    label: {
        rarity: typeof CONFIG.PF2E.rarityTraits;
        size: typeof CONFIG.PF2E.actorSizes;
        statistic: { perception: string } & typeof CONFIG.PF2E.skillList;
        trait: typeof CONFIG.PF2E.monsterTraits;
    };
}

export { InfluenceSheetData };
