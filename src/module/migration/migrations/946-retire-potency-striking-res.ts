import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Retire Striking and WeaponPotency rule elements, migrating them to item alterations. */
export class Migration946RetirePotencyStrikingREs extends MigrationBase {
    static override version = 0.946;

    #migrateProperty(rule: { key: string; property?: JSONValue }): void {
        switch (rule.property) {
            case "potency":
                rule.property = "runes-potency";
                break;
            case "resilient":
                rule.property = "runes-resilient";
                break;
            case "striking":
                rule.property = "runes-striking";
                break;
        }
    }

    #migratePredicate(rule: { key: string; [K: string]: JSONValue }, itemId: string | undefined): void {
        const predicate = Array.isArray(rule.predicate) ? rule.predicate : (rule.predicate = []);
        if (
            itemId === undefined &&
            typeof rule.selector === "string" &&
            !predicate.some((p) => typeof p === "string" && p.startsWith("item:"))
        ) {
            predicate.push(`item:slug:${rule.selector.replace(/-(?:attack|damage|attack-roll)$/, "")}`);
        }
        const unarmedIndex = predicate.findIndex((p) => p === "unarmed");
        if (unarmedIndex !== undefined && unarmedIndex >= 0) {
            predicate.splice(unarmedIndex, 1, "item:category:unarmed");
        } else if (/^unarmed-/.test(String(rule.selector)) && !predicate?.some((p) => p === "item:category:unarmed")) {
            predicate?.unshift("item:category:unarmed");
        }
        if (predicate.length === 0) delete rule.predicate;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: { key: string; [K: string]: JSONValue }[] = source.system.rules;
        for (const rule of rules) {
            if (rule.key === "ItemAlteration") {
                this.#migrateProperty(rule);
            } else if (["Striking", "WeaponPotency"].includes(rule.key)) {
                const itemId =
                    "selector" in rule && typeof rule.selector === "string"
                        ? /\{.+\}/.test(rule.selector)
                            ? rule.selector.replace(/(?<=\}).+$/, "")
                            : undefined
                        : "{item|id}";
                const itemType = itemId ? undefined : "weapon";
                const property = rule.key === "Striking" ? "runes-striking" : "runes-potency";
                Object.assign(rule, { key: "ItemAlteration", itemId, itemType, mode: "upgrade", property });
                this.#migratePredicate(rule, itemId);
                delete rule.label;
                delete rule.selector;
            }
        }
    }
}
