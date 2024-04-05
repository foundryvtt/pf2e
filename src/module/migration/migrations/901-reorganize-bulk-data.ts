import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PhysicalSystemSource } from "@item/physical/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Reorganize bulk data on physical items into single object */
export class Migration901ReorganizeBulkData extends MigrationBase {
    static override version = 0.901;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        this.#migrateRules(source);
        if (!itemIsOfType(source, "physical")) return;

        const system: MaybeWithOldBulkData = source.system;
        system.bulk ??= { value: 0 };

        if ("equippedBulk" in system) {
            if (["armor", "backpack"].includes(source.type)) {
                system.bulk.value = this.#bulkStringToNumber(system.equippedBulk);
            }
            system["-=equippedBulk"] = null;

            // Special case: fix data errors
            if (system.slug === "sack") {
                system.usage = { value: "held-in-one-hand" };
                system.bulk.value = 0.1;
            } else if (/bag-of-(?:devouring|holding|weasels)|spacious-pouch/.test(system.slug ?? "")) {
                system.bulk.value = 1;
            } else if (system.slug === "sleeves-of-storage") {
                system.bulk.value = 0.1;
            }
        }

        if ("weight" in system) {
            if (source.type === "backpack") {
                const usage = system.usage?.value ?? "";
                source.system.bulk.heldOrStowed = ["held-in-one-hand", "held-in-two-hands"].includes(usage)
                    ? Math.max(system.bulk.value, this.#bulkStringToNumber(system.weight))
                    : this.#bulkStringToNumber(system.weight);
            } else if (source.type !== "armor") {
                source.system.bulk.value = this.#bulkStringToNumber(system.weight);
            }
            system["-=weight"] = null;
        }

        if ("bulkCapacity" in system) {
            if (source.type === "backpack") {
                source.system.bulk.capacity = R.isObject(system.bulkCapacity)
                    ? Math.floor(Math.abs(Number(system.bulkCapacity.value))) || 0
                    : 0;
            }
            system["-=bulkCapacity"] = null;
        }

        if ("negateBulk" in system) {
            if (source.type === "backpack") {
                source.system.bulk.ignored = R.isObject(system.negateBulk)
                    ? Math.floor(Math.abs(Number(system.negateBulk.value))) || 0
                    : 0;
            }
            system["-=negateBulk"] = null;
        }
    }

    #migrateRules(source: ItemSourcePF2e): void {
        const itemAlterations = source.system.rules.filter(
            (r: MaybeItemAlteration): r is DefinitelyItemAlteration =>
                r.key === "ItemAlteration" && typeof r.property === "string",
        );
        for (const rule of itemAlterations) {
            if (rule.itemType === "armor" && rule.property === "bulk-worn") {
                rule.property = "bulk";
            } else if (rule.itemType !== "armor" && rule.property === "bulk-value") {
                rule.property = "bulk";
            }
        }
        source.system.rules = source.system.rules.filter((r: MaybeItemAlteration) =>
            r.key === "ItemAlteration" && typeof r.property === "string"
                ? !["bulk-worn", "bulk-value"].includes(r.property)
                : true,
        );
    }

    #bulkStringToNumber(bulkObject: unknown): number {
        if (!R.isObject(bulkObject)) return 0;
        const bulkString = String(bulkObject["value"] || "-").toLocaleUpperCase("en");

        switch (bulkString) {
            case "-":
                return 0;
            case "L":
                return 0.1;
            default: {
                const numericValue = Number(bulkString);
                return Number.isInteger(numericValue) ? Math.abs(numericValue) : 0;
            }
        }
    }
}

type MaybeItemAlteration = RuleElementSource & {
    property?: JSONValue;
};

type DefinitelyItemAlteration = RuleElementSource & {
    key: string;
    predicate: JSONValue[];
    itemType?: string;
    property: string;
};

type MaybeWithOldBulkData = PhysicalSystemSource & {
    "-=equippedBulk"?: null;
    "-=weight"?: null;
    "-=bulkCapacity"?: null;
    "-=negateBulk"?: unknown;
};
