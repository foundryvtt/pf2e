import { Size, SIZES } from "@module/data.ts";
import { applyNTimes, Optional } from "@util";

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
export const stackDefinitions: StackDefinitions = {
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
    rations: {
        size: 7,
        lightBulk: 1,
    },
    sacks: {
        size: 5,
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

export class Bulk {
    normal: number;

    light: number;

    constructor({ normal = 0, light = 0 }: { normal?: number; light?: number } = {}) {
        this.normal = normal + Math.floor(light / 10);
        this.light = light % 10;
    }

    get isNegligible(): boolean {
        return this.normal === 0 && this.light === 0;
    }

    get isLight(): boolean {
        return this.toLightBulk() < 10 && !this.isNegligible;
    }

    toLightBulk(): number {
        return this.normal * 10 + this.light;
    }

    plus(bulk: Bulk): Bulk {
        return new Bulk({
            normal: this.normal + bulk.normal,
            light: this.light + bulk.light,
        });
    }

    minus(bulk: Bulk): Bulk {
        // 1 bulk is 10 light bulk
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        const result = thisBulk - otherBulk;

        // bulk can't get negative
        if (result < 0) {
            return new Bulk();
        }
        return new Bulk({
            normal: Math.floor(result / 10),
            light: result % 10,
        });
    }

    _toSingleNumber(bulk: Bulk): [number, number] {
        return [this.normal * 10 + this.light, bulk.normal * 10 + bulk.light];
    }

    times(factor: number): Bulk {
        // An item that would have its Bulk reduced below 1 has light Bulk.
        const normal = this.normal * factor;
        const lightCarryOver = normal < 1 && normal > 0 ? 1 : 0;
        const light = Math.floor(this.light * factor) + lightCarryOver;
        return new Bulk({
            normal: Math.floor(normal),
            light,
        });
    }

    isSmallerThan(bulk: Bulk): boolean {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk < otherBulk;
    }

    isBiggerThan(bulk: Bulk): boolean {
        const [thisBulk, otherBulk] = this._toSingleNumber(bulk);
        return thisBulk > otherBulk;
    }

    isEqualTo(bulk: Bulk): boolean {
        return this.normal === bulk.normal && this.light === bulk.light;
    }

    isPositive(): boolean {
        return this.normal > 0 || this.light > 0;
    }

    /** Produces strings like: "-", "L", "2L", "3", "3; L", "4; 3L" to display bulk in the frontend bulk column */
    toString(): string {
        const { light, normal } = this;
        if (normal === 0 && light === 0) {
            return game.i18n.localize("PF2E.Item.Physical.Bulk.Negligible");
        }
        if (normal > 0 && light === 0) {
            return normal.toString();
        }
        if (light === 1 && normal === 0) {
            return game.i18n.localize("PF2E.Item.Physical.Bulk.Light");
        }
        if (light > 0 && normal === 0) {
            return game.i18n.format("PF2E.Item.Physical.Bulk.NLight", { light });
        }
        return game.i18n.format("PF2E.Item.Physical.Bulk.WithLight", { bulk: normal, light });
    }

    double(): Bulk {
        if (this.isNegligible) {
            return new Bulk({ light: 1 });
        } else if (this.isLight) {
            return this.times(10);
        } else {
            return this.times(2);
        }
    }

    halve(): Bulk {
        if (this.isNegligible) {
            return new Bulk();
        } else if (this.isLight) {
            return new Bulk();
        } else if (this.normal === 1) {
            return new Bulk({ light: 1 });
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

        if (itemSizeIndex === actorSizeIndex) {
            return this;
        } else if (itemSizeIndex > actorSizeIndex) {
            return applyNTimes((bulk) => bulk.double(), itemSizeIndex - actorSizeIndex, this as Bulk);
        } else {
            return applyNTimes((bulk) => bulk.halve(), actorSizeIndex - itemSizeIndex, this as Bulk);
        }
    }
}

const lightBulkRegex = /^(\d*)l$/i;
const complexBulkRegex = /^(\d+);\s*(\d*)l$/i;

/**
 * Accepted formats:
 * "l", "1", "L", "1; L", "2; 3L", "2;3L"
 * @param weight if not parseable will return null or undefined
 */
export function weightToBulk(weight: Optional<string | number>): Bulk | null {
    if (typeof weight !== "string" && typeof weight !== "number") {
        return null;
    }
    const trimmed = String(weight).trim();
    if (/^\d+$/.test(trimmed)) {
        return new Bulk({ normal: parseInt(trimmed, 10) });
    }
    const lightMatch = trimmed.match(lightBulkRegex);
    if (lightMatch) {
        return new Bulk({ light: parseInt(lightMatch[1] || "1", 10) });
    }
    const complexMatch = trimmed.match(complexBulkRegex);
    if (complexMatch) {
        const [, normal, light] = complexMatch;
        return new Bulk({
            normal: Number(normal) || 0,
            light: Number(light || 1) || 0,
        });
    }
    return null;
}
