import { Size, SIZES, ZeroToFive } from "@module/data.ts";

interface SizeDimensions {
    long: number;
    wide: number;
}

export class ActorSizePF2e {
    /** The size category of this category */
    value: Size;

    /** The length dimension of this actor's space in feet: corresponds with token `height` */
    long: number;

    /** The width dimension of this actor's space in feet */
    wide: number;

    /** The actor dimensions as canvas square-grid values */
    get tokenDimensions(): { width: number; height: number } {
        return { width: this.wide / 5, height: this.long / 5 };
    }

    /** The default space (in a Pathfinder 2e rules context) of each size */
    static #defaultSpaces: Record<Size, SizeDimensions> = {
        tiny: { long: 2.5, wide: 2.5 },
        sm: { long: 5, wide: 5 },
        med: { long: 5, wide: 5 },
        lg: { long: 10, wide: 10 },
        huge: { long: 15, wide: 15 },
        grg: { long: 20, wide: 20 },
    };

    /** A ranked ordering of sizes */
    static #sizeRanks: Record<Size, ZeroToFive> = {
        grg: 5,
        huge: 4,
        lg: 3,
        med: 2,
        sm: 1,
        tiny: 0,
    };

    /**
     * @param params
     * @param params.value A size category
     * @param params.long A length of a Pathfinder "space"
     * @param params.wide A width of a Pathfinder "space"
     * @param params.smallIsMedium Treat small as medium
     */
    constructor(params: { value?: Size; long?: number; wide?: number; smallIsMedium?: boolean }) {
        if (typeof params.value !== "string" || (params.smallIsMedium && params.value === "sm")) {
            params.value = "med";
        }
        this.value = params.value;
        const spaces = ActorSizePF2e.#defaultSpaces[params.value] ?? ActorSizePF2e.#defaultSpaces.med;
        this.long = params.long ?? spaces.long;
        this.wide = params.wide ?? spaces.wide;
    }

    /**
     * Test for equality between this and another size, falling back to comparing areas in case of a category tie
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Treat small as medium for both sizes
     */
    equals(size: ActorSizePF2e | Size, { smallIsMedium = false } = {}): boolean {
        const other = size instanceof ActorSizePF2e ? size : new ActorSizePF2e({ value: size });
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(other.value, { smallIsMedium });
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
        return ActorSizePF2e.#sizeRanks[thisSize] > ActorSizePF2e.#sizeRanks[otherSize];
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
        return ActorSizePF2e.#sizeRanks[thisSize] < ActorSizePF2e.#sizeRanks[otherSize];
    }

    /**
     * Get the difference in number of size categories between this and another size
     * @param size The size to which this size is being compared
     * @param [smallIsMedium] Ignore the difference between small and medium
     */
    difference(size: ActorSizePF2e, { smallIsMedium = false } = {}): number {
        const thisSize = this.getEffectiveSize(this.value, { smallIsMedium });
        const otherSize = this.getEffectiveSize(size.value, { smallIsMedium });
        return ActorSizePF2e.#sizeRanks[thisSize] - ActorSizePF2e.#sizeRanks[otherSize];
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

        const newSpace = ActorSizePF2e.#defaultSpaces[this.value];
        this.long = newSpace.long;
        this.wide = newSpace.wide;
    }

    /**
     * Increase this size the next smaller category
     * @param [skipSmall] Skip a size if the current size is tiny or small
     */
    decrement({ skipSmall = false } = {}): void {
        const toTiny = (this.value === "med" && skipSmall) || this.value === "tiny";
        this.value = toTiny ? "tiny" : SIZES[SIZES.indexOf(this.value) - 1];

        const newSpace = ActorSizePF2e.#defaultSpaces[this.value];
        this.long = newSpace.long;
        this.wide = newSpace.wide;
    }

    toString(): string {
        return game.i18n.localize(CONFIG.PF2E.actorSizes[this.value]);
    }
}
