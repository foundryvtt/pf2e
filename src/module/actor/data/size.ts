import { Size, SIZES, ZeroToFive } from "@module/data.ts";

interface SizeDimensions {
    length: number;
    width: number;
}

export class ActorSizePF2e {
    /** The size category of this category */
    value: Size;
    /** The length dimension of this actor's space */
    length: number;
    /** The width dimension of this actor's space */
    width: number;

    /** The default space (in a Pathfinder 2e rules context) of each size */
    private static defaultSpaces: Record<Size, SizeDimensions> = {
        tiny: { length: 2.5, width: 2.5 },
        sm: { length: 5, width: 5 },
        med: { length: 5, width: 5 },
        lg: { length: 10, width: 10 },
        huge: { length: 15, width: 15 },
        grg: { length: 20, width: 20 },
    };

    /** A ranked ordering of sizes */
    private static sizeRanks: Record<Size, ZeroToFive> = {
        grg: 5,
        huge: 4,
        lg: 3,
        med: 2,
        sm: 1,
        tiny: 0,
    };

    /**
     * @param value A size category
     * @param [length] A length of a Pathfinder "space"
     * @param [width]  A width of a Pathfinder "space"
     * @param [smallIsMedium] Treat small as medium
     */
    constructor(params: { value?: Size; length?: number; width?: number; smallIsMedium?: boolean }) {
        if (typeof params.value !== "string" || (params.smallIsMedium && params.value === "sm")) {
            params.value = "med";
        }

        this.value = params.value;
        const spaces = ActorSizePF2e.defaultSpaces[params.value] ?? ActorSizePF2e.defaultSpaces.med;
        this.length = params.length ?? spaces.length;
        this.width = params.width ?? spaces.width;
    }

    /**
     * Test for equality between this and another size, falling back to comparing areas in case of a category tie
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Treat small as medium for both sizes
     */
    equals(size: ActorSizePF2e, { smallIsMedium = false } = {}): boolean {
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(size.value, { smallIsMedium });
        return thisSize === otherSize;
    }

    /**
     * Test whether this size is larger than another, falling back to comparing areas in case of a category tie
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Treat small as medium for both sizes
     */
    isLargerThan(size: ActorSizePF2e | Size, { smallIsMedium = false } = {}): boolean {
        const other = size instanceof ActorSizePF2e ? size : new ActorSizePF2e({ value: size });
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(other.value, { smallIsMedium });
        return ActorSizePF2e.sizeRanks[thisSize] > ActorSizePF2e.sizeRanks[otherSize];
    }

    /**
     * Test whether this size is smaller than another, falling back to comparing areas in case of a category tie
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Treat small as medium for both sizes
     */
    isSmallerThan(size: ActorSizePF2e | Size, { smallIsMedium = false } = {}): boolean {
        const other = size instanceof ActorSizePF2e ? size : new ActorSizePF2e({ value: size });
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(other.value, { smallIsMedium });
        return ActorSizePF2e.sizeRanks[thisSize] < ActorSizePF2e.sizeRanks[otherSize];
    }

    /**
     * Get the difference in number of size categories between this and another size
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Ignore the difference between small and medium
     */
    difference(size: ActorSizePF2e, { smallIsMedium = false } = {}): number {
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(size.value, { smallIsMedium });
        return ActorSizePF2e.sizeRanks[thisSize] - ActorSizePF2e.sizeRanks[otherSize];
    }

    /**
     * Get the "effective" size of a size category in case the `smallIsMedium` option was passed
     * @param size The size used for comparison in the calling method
     * @param [smallIsMedium] Return this size if both this and `size` are small or medium
     */
    private getEffectiveSize(size: Size, { smallIsMedium }: { smallIsMedium: boolean }): Size {
        return smallIsMedium && size === "sm" ? "med" : size;
    }

    /**
     * Increase this size the next larger category
     * @param [skipSmall] Skip a size if the current size is tiny or small
     */
    increment({ skipSmall = false } = {}): void {
        this.value =
            this.value === "tiny" && skipSmall
                ? "med"
                : this.value === "sm" && skipSmall
                ? "lg"
                : this.value === "grg"
                ? "grg"
                : SIZES[SIZES.indexOf(this.value) + 1];

        const newSpace = ActorSizePF2e.defaultSpaces[this.value];
        this.length = newSpace.length;
        this.width = newSpace.width;
    }

    /**
     * Increase this size the next smaller category
     * @param [skipSmall] Skip a size if the current size is tiny or small
     */
    decrement({ skipSmall = false } = {}): void {
        const toTiny = (this.value === "med" && skipSmall) || this.value === "tiny";
        this.value = toTiny ? "tiny" : SIZES[SIZES.indexOf(this.value) - 1];

        const newSpace = ActorSizePF2e.defaultSpaces[this.value];
        this.length = newSpace.length;
        this.width = newSpace.width;
    }

    toString(): string {
        return game.i18n.localize(CONFIG.PF2E.actorSizes[this.value]);
    }
}
