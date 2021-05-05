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
    static includes(trait: string): boolean {
        return this.mystifiedTraits.has(trait);
    }
}
