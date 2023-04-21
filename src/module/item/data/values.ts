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
            ].sort()
        );
    }

    /** Exclude any mystified traits from the provided trait list */
    static has(trait: string): boolean {
        return this.mystifiedTraits.has(trait);
    }
}

const ITEM_CARRY_TYPES = new Set(["held", "worn", "stowed", "dropped"] as const);

const RANGE_TRAITS = [
    "range-5",
    "range-10",
    "range-15",
    "range-20",
    "range-25",
    "range-30",
    "range-40",
    "range-50",
    "range-60",
    "range-70",
    "range-80",
    "range-90",
    "range-100",
    "range-110",
    "range-120",
    "range-140",
    "range-150",
    "range-160",
    "range-170",
    "range-180",
    "range-190",
    "range-200",
    "range-210",
    "range-220",
    "range-230",
    "range-240",
    "range-250",
    "range-260",
    "range-270",
    "range-280",
    "range-290",
    "range-300",
    "range-310",
    "range-320",
    "range-500",
    "range-increment-5",
    "range-increment-10",
    "range-increment-15",
    "range-increment-20",
    "range-increment-25",
    "range-increment-30",
    "range-increment-40",
    "range-increment-50",
    "range-increment-60",
    "range-increment-70",
    "range-increment-75",
    "range-increment-80",
    "range-increment-90",
    "range-increment-100",
    "range-increment-110",
    "range-increment-120",
    "range-increment-130",
    "range-increment-140",
    "range-increment-150",
    "range-increment-160",
    "range-increment-170",
    "range-increment-180",
    "range-increment-190",
    "range-increment-200",
    "range-increment-210",
    "range-increment-220",
    "range-increment-230",
    "range-increment-240",
    "range-increment-250",
    "range-increment-260",
    "range-increment-270",
    "range-increment-280",
    "range-increment-290",
    "range-increment-300",
    "range-increment-310",
    "range-increment-320",
] as const;

export { ITEM_CARRY_TYPES, MystifiedTraits, RANGE_TRAITS };
