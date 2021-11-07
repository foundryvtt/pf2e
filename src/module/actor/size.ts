import { Size, SIZES } from "@module/data";

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

    static defaultSpaces: Record<Size, SizeDimensions> = {
        tiny: { length: 2.5, width: 2.5 },
        sm: { length: 5, width: 5 },
        med: { length: 5, width: 5 },
        lg: { length: 10, width: 10 },
        huge: { length: 15, width: 15 },
        grg: { length: 20, width: 20 },
    };

    constructor({ value, length, width }: { value: Size; length?: number; width?: number }) {
        this.value = value;
        const spaces = ActorSizePF2e.defaultSpaces[value];
        this.length = length ?? spaces.length;
        this.width = width ?? spaces.width;
    }

    /** Increase to the next larger size, skipping a size if `skipSmall` is specified and the current size is tiny */
    increment({ skipSmall = false } = {}): void {
        this.value =
            this.value === "tiny" && skipSmall
                ? "med"
                : this.value === "grg"
                ? "grg"
                : SIZES[SIZES.indexOf(this.value) + 1];
        const newSpace = ActorSizePF2e.defaultSpaces[this.value];
        this.length = newSpace.length;
        this.width = newSpace.width;
    }

    /** Decrease to the next smaller size, skipping a size if `skipSmall` is specified and the current size is medium */
    decrement({ skipSmall = false } = {}): void {
        this.value =
            (this.value === "med" && skipSmall) || this.value === "tiny"
                ? "tiny"
                : SIZES[SIZES.indexOf(this.value) + 1];
        const newSpace = ActorSizePF2e.defaultSpaces[this.value];
        this.length = newSpace.length;
        this.width = newSpace.width;
    }
}
