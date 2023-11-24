import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/**
 * Makes spells use the category for focus/ritual spells instead
 * of traditions and removes focus/ritual from the spell types.
 */
export class Migration626UpdateSpellCategory extends MigrationBase {
    static override version = 0.626;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const systemData: MaybeCategorie = source.system;
        const traditions = systemData.traditions;
        if (!isObject(traditions) || !Array.isArray(traditions.value)) {
            systemData.traditions = { value: [] };
            return;
        }

        const isFocus = traditions.value.includes("focus");
        const isRitual = traditions.value.includes("ritual");

        // Sometimes the traditions is a string instead of an array.
        // Convert those to an empty array.
        if (typeof traditions.value === "string") {
            traditions.value = [];
        }

        if (systemData.spellCategorie || systemData.spellCategory) {
            const currentCategory = systemData.spellCategorie?.value ?? systemData.spellCategory?.value ?? "";
            systemData.category = {
                value: isFocus ? "focus" : isRitual ? "ritual" : currentCategory === "" ? "spell" : currentCategory,
            };

            delete systemData["spellCategorie"];
            delete systemData["spellCategory"];
            // Foundry entity updates (if foundry is running)
            if ("game" in globalThis) {
                systemData["-=spellCategorie"] = null;
                systemData["-=spellCategory"] = null;
            }
        }

        if (
            "spellType" in source.system &&
            isObject<{ value: string }>(source.system.spellType) &&
            ["focus", "ritual"].includes(source.system.spellType.value ?? "")
        ) {
            source.system.spellType.value = "utility";
        }
        traditions.value = traditions.value.filter((tradition) => !["focus", "ritual"].includes(tradition));
    }
}

interface MaybeCategorie extends Omit<Partial<SpellSystemSource>, "traditions"> {
    traditions?: { value: string[] };
    spellCategorie?: { value: "spell" | "focus" | "ritual" | "" };
    spellCategory?: { value: "spell" | "focus" | "ritual" | "" };
    category?: object;
    "-=spellCategorie"?: unknown;
    "-=spellCategory"?: unknown;
}
