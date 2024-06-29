import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { Size, SIZES, ValueAndMax } from "@module/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Flatten several physical-item properties, remove others no longer in use */
export class Migration728FlattenPhysicalProperties extends MigrationBase {
    static override version = 0.728;

    private booleanKeys = ["temporary", "collapsed"] as const;
    private numericKeys = ["quantity", "hardness"] as const;
    private stringKeys = ["stackGroup", "containerId"] as const;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical")) return;

        const system: MaybeOldSystemSource = source.system;

        if (system.currency) {
            delete system.currency;
            system["-=currency"] = null;
        }

        if (system.hands) {
            delete system.hands;
            system["-=hands"] = null;
        }

        if (system.equipped && R.isPlainObject(system.invested)) {
            const value = system.invested.value;
            if (typeof value === "boolean" || value === null) {
                const traits: string[] = source.system.traits.value;
                const shouldBeBoolean =
                    traits.includes("invested") || (source.type === "armor" && (system.potencyRune?.value ?? 0) > 0);

                system.equipped.invested = shouldBeBoolean ? Boolean(value) : null;
            }
        }
        delete system.invested;
        system["-=invested"] = null;

        if (system.capacity && source.type !== "book") {
            delete system.capacity;
            system["-=capacity"] = null;
        }

        if (source.type !== "backpack") {
            delete system.bulkCapacity;
            system["-=bulkCapacity"] = null;
            delete system.collapsed;
            system["-=collapsed"] = null;
        }

        if (system.size instanceof Object) {
            const size = SIZES.includes(system.size.value) ? system.size.value : "med";
            system.size = size;
        }

        if ("brokenThreshold" in system) {
            if (system.brokenThreshold instanceof Object) {
                system.hp.brokenThreshold = Number(system.brokenThreshold.value);
            }

            delete system.brokenThreshold;
            system["-=brokenThreshold"] = null;
        }

        system.hp.value = Number(system.hp.value);
        if (system.maxHp instanceof Object) {
            system.hp.max = Number(system.maxHp.value) || 0;
            delete system.maxHp;
            system["-=maxHp"] = null;
        }

        for (const key of this.booleanKeys) {
            const value = system[key];
            if (value instanceof Object) {
                system[key] = value.value as boolean;
            }
        }

        for (const key of this.numericKeys) {
            const value = system[key];
            if (value instanceof Object) {
                system[key] = Number(value.value) || 0;
            }
        }

        for (const key of this.stringKeys) {
            const value = system[key];
            if (value instanceof Object) {
                system[key] = String(value.value) || null;
            }
        }
    }
}

type MaybeOldSystemSource = {
    equipped: {
        carryType: string;
        invested?: boolean | null;
    };
    hp: ValueAndMax & { brokenThreshold?: number };
    quantity: number | { value: number };
    hardness: number | { value: number };
    stackGroup?: string | null | { value: string | null };
    containerId: string | null | { value: string | null };
    size: Size | { value: Size };
    temporary?: boolean | { value: boolean };
    potencyRune?: { value?: Maybe<number> };

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
