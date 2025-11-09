import { Size, SIZES } from "@module/data.ts";
import { applyNTimes } from "@util";

interface StackDefinition {
    size: number;
    lightBulk: number;
}

type StackDefinitions = Record<string, StackDefinition | undefined>;

/**
 * hard coded for now but could be made configurable later on.
 * Describes each stack group by how much items belong in a stack
 * and how much bulk a single stack produces. Bulk type has to be
 * included because coins don't add light bulk below 1000, just 1
 * bulk per 1000 coins
 */
const STACK_DEFINITIONS: StackDefinitions = {
    bolts: {
        size: 10,
        lightBulk: 1,
    },
    arrows: {
        size: 10,
        lightBulk: 1,
    },
    slingBullets: {
        size: 10,
        lightBulk: 1,
    },
    blowgunDarts: {
        size: 10,
        lightBulk: 1,
    },
    woodenTaws: {
        size: 10,
        lightBulk: 1,
    },
    rounds5: {
        size: 5,
        lightBulk: 1,
    },
    rounds10: {
        size: 10,
        lightBulk: 1,
    },
    coins: {
        size: 1000,
        lightBulk: 10,
    },
    gems: {
        size: 2000,
        lightBulk: 10,
    },
};

class Bulk {
    /** The bulk value as a number, with negligible being 0, light being 0.1, and bulk (the unit) as an integer */
    readonly value: number;

    constructor(value = 0) {
        this.value = Math.round(Math.max(value, 0) * 10) / 10;
    }

    get normal(): number {
        return Math.floor(this.value);
    }

    get light(): number {
        return Math.round((this.value - this.normal) * 10);
    }

    get isNegligible(): boolean {
        return this.value === 0;
    }

    get isLight(): boolean {
        return this.value > 0 && this.value < 1;
    }

    toLightUnits(): number {
        return this.normal * 10 + this.light;
    }

    /** Increase the bulk by one step: negligible becomes light, light becomes 1 bulk, and 1+ bulk increases by 1 */
    increment(): Bulk {
        if (this.isNegligible) return new Bulk(0.1);
        if (this.isLight) return new Bulk(1);
        return new Bulk(this.value + 1);
    }

    plus(other: number | Bulk): Bulk {
        const otherValue = typeof other === "number" ? other : other.value;
        return new Bulk(this.value + otherValue);
    }

    minus(other: number | Bulk): Bulk {
        const otherValue = typeof other === "number" ? other : other.value;
        return new Bulk(this.value - otherValue);
    }

    times(factor: number): Bulk {
        return new Bulk(Math.round(this.value * factor * 10) / 10);
    }

    /** Produce strings like "—", "L", "2L", "3", "3; L", "4; 3L" to display bulk in the frontend bulk column */
    toString(): string {
        const { light, normal } = this;
        if (this.isNegligible) {
            return game.i18n.localize("PF2E.Item.Physical.Bulk.Negligible.ShortLabel");
        }
        if (this.value === normal) return normal.toString();
        if (normal === 0 && light === 1) {
            return game.i18n.localize("PF2E.Item.Physical.Bulk.Light.ShortLabel");
        }
        if (light > 0 && normal === 0) {
            return game.i18n.format("PF2E.Item.Physical.Bulk.NLight", { light: light });
        }
        return game.i18n.format("PF2E.Item.Physical.Bulk.WithLight", { bulk: normal, light: light });
    }

    double(): Bulk {
        if (this.isNegligible) {
            return new Bulk(0.1);
        } else if (this.isLight) {
            return new Bulk(1);
        } else {
            return this.times(2);
        }
    }

    halve(): Bulk {
        if (this.isNegligible || this.isLight) {
            return new Bulk();
        } else if (this.normal === 1) {
            return new Bulk(0.1);
        } else {
            return this.times(0.5);
        }
    }

    /**
     * See https://2e.aonprd.com/Rules.aspx?ID=258 and https://2e.aonprd.com/Rules.aspx?ID=257 are fundamentally
     * at odds with each other and there is no way to implement this RAW
     *
     * RAI:
     * "Because the way that a creature treats Bulk and the Bulk of gear sized for it scale the same way,
     * Tiny or Large (or larger) creatures can usually wear and carry about the same amount of appropriately
     * sized gear as a Medium creature."
     *
     * Looking at table 6-20 the following rules can be deduced:
     * if item size < creature size:
     * for each step until you reach the target size halve bulk
     * 1 bulk halved becomes L bulk
     * L bulk halved becomes negligible bulk
     *
     * if item size > creature size:
     * for each step until you reach the target size double bulk
     * L bulk doubled becomes 1 bulk
     * negligible bulk doubled becomes L bulk unless it's a tiny item, then it stays at negligible bulk
     *
     * ignore everything else
     *
     * @param bulk
     * @param itemSize
     * @param actorSize
     */
    convertToSize(itemSize: Size, actorSize: Size): Bulk {
        const sizes = Array.from(SIZES).filter((size) => size !== "sm");
        const itemSizeIndex = sizes.indexOf(itemSize === "sm" ? "med" : itemSize);
        const actorSizeIndex = sizes.indexOf(actorSize === "sm" ? "med" : actorSize);

        if (itemSizeIndex > actorSizeIndex) {
            return applyNTimes((b): Bulk => b.double(), itemSizeIndex - actorSizeIndex, this);
        }
        if (itemSizeIndex < actorSizeIndex) {
            return applyNTimes(
                (b): Bulk =>
                    b.value <= 0.1
                        ? new Bulk()
                        : b.value <= 1
                          ? new Bulk(0.1)
                          : new Bulk(Math.max(0.1, Math.floor(0.1 * this.value))),
                actorSizeIndex - itemSizeIndex,
                this,
            );
        }
        return new Bulk(this.value);
    }
}

export { Bulk, STACK_DEFINITIONS };
