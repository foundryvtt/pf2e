import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { Size, SIZES, ValueAndMax } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

/** Flatten several physical-item properties, remove others no longer in use */
export class Migration728FlattenPhysicalProperties extends MigrationBase {
    static override version = 0.728;

    private booleanKeys = ["temporary", "collapsed"] as const;
    private numericKeys = ["quantity", "hardness"] as const;
    private stringKeys = ["stackGroup", "containerId"] as const;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(source)) return;

        const systemSource: MaybeOldSystemSource = source.system;

        if (systemSource.currency) {
            delete systemSource.currency;
            systemSource["-=currency"] = null;
        }

        if (systemSource.hands) {
            delete systemSource.hands;
            systemSource["-=hands"] = null;
        }

        if (systemSource.equipped && systemSource.invested instanceof Object) {
            const value = systemSource.invested.value;
            if (typeof value === "boolean" || value === null) {
                const traits: string[] = source.system.traits.value;
                const shouldBeBoolean =
                    traits.includes("invested") ||
                    (source.type === "armor" && (source.system.potencyRune.value ?? 0) > 0);

                systemSource.equipped.invested = shouldBeBoolean ? Boolean(value) : null;
            }
        }
        delete systemSource.invested;
        systemSource["-=invested"] = null;

        if (systemSource.capacity && source.type !== "book") {
            delete systemSource.capacity;
            systemSource["-=capacity"] = null;
        }

        if (source.type !== "backpack") {
            delete systemSource.bulkCapacity;
            systemSource["-=bulkCapacity"] = null;
            delete systemSource.collapsed;
            systemSource["-=collapsed"] = null;
        }

        if (systemSource.size instanceof Object) {
            const size = SIZES.includes(systemSource.size.value) ? systemSource.size.value : "med";
            systemSource.size = size;
        }

        if ("brokenThreshold" in systemSource) {
            if (systemSource.brokenThreshold instanceof Object) {
                systemSource.hp.brokenThreshold = Number(systemSource.brokenThreshold.value);
            }

            delete systemSource.brokenThreshold;
            systemSource["-=brokenThreshold"] = null;
        }

        systemSource.hp.value = Number(systemSource.hp.value);
        if (systemSource.maxHp instanceof Object) {
            systemSource.hp.max = Number(systemSource.maxHp.value) || 0;
            delete systemSource.maxHp;
            systemSource["-=maxHp"] = null;
        }

        for (const key of this.booleanKeys) {
            const value = systemSource[key];
            if (value instanceof Object) {
                systemSource[key] = value.value as boolean;
            }
        }

        for (const key of this.numericKeys) {
            const value = systemSource[key];
            if (value instanceof Object) {
                systemSource[key] = Number(value.value) || 0;
            }
        }

        for (const key of this.stringKeys) {
            const value = systemSource[key];
            if (value instanceof Object) {
                systemSource[key] = String(value.value) || null;
            }
        }
    }
}

type MaybeOldSystemSource = {
    equipped: {
        carryType: string;
        invested?: boolean | null;
    };
    hp: ValueAndMax & { brokenThreshold: number };
    quantity: number | { value: number };
    hardness: number | { value: number };
    stackGroup: string | null | { value: string | null };
    containerId: string | null | { value: string | null };
    size: Size | { value: Size };
    temporary?: boolean | { value: boolean };

    brokenThreshold?: { value: number };
    "-=brokenThreshold"?: null;

    invested?: { value: boolean | null };
    "-=invested"?: null;

    bulkCapacity?: string | null | { value: string | null };
    "-=bulkCapacity"?: null;

    capacity?: number | { value: string };
    "-=capacity"?: null;

    collapsed?: boolean | { value: boolean };
    "-=collapsed"?: null;

    currency?: { value: string | null };
    "-=currency"?: null;

    hands?: unknown;
    "-=hands"?: unknown;

    maxHp?: { value: number };
    "-=maxHp"?: null;
};
