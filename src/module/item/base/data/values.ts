class MystifiedTraits {
    private static mystifiedTraits: Set<string> = new Set();

    static compile(): void {
        this.mystifiedTraits = new Set(
            [
                "artifact",
                "extradimensional",
                "invested",
                "shadow",
                // Includes of magical schools, traditions, "clockwork," "cursed," "magical," etc.:
                ...Object.keys(CONFIG.PF2E.consumableTraits).filter((t) => !["consumable", "nonlethal"].includes(t)),
            ].sort(),
        );
    }

    /** Exclude any mystified traits from the provided trait list */
    static has(trait: string): boolean {
        return this.mystifiedTraits.has(trait);
    }
}

const ITEM_CARRY_TYPES = Object.freeze([
    "attached",
    "dropped",
    "held",
    "implanted",
    "installed",
    "stowed",
    "worn",
] as const);

export { ITEM_CARRY_TYPES, MystifiedTraits };
