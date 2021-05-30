declare const CONFIG: ConfigPF2e;

export class MystifiedTraits {
    private static mystifiedTraits: Set<string> = new Set();

    static compile(): void {
        this.mystifiedTraits = new Set([
            ...Object.keys(CONFIG.PF2E.magicSchools),
            ...Object.keys(CONFIG.PF2E.spellTraditions),
            ...Object.keys(CONFIG.PF2E.consumableTraits).filter((trait) => trait !== 'consumable'),
            'extradimensional',
            'invested',
        ]);
    }

    /** Exclude any mystified traits from the provided trait list */
    static has(trait: string): boolean {
        return this.mystifiedTraits.has(trait);
    }
}

export const PHYSICAL_ITEM_TYPES = ['armor', 'backpack', 'consumable', 'equipment', 'treasure', 'weapon'] as const;
export const TRADITION_TRAITS = ['arcane', 'primal', 'divine', 'occult'] as const;
