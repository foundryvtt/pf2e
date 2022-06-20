import { CharacterPF2e } from "@actor";
import { CreatureSheetData } from "@actor/creature/types";
import { FamiliarPF2e } from ".";

interface FamiliarSheetData extends CreatureSheetData<FamiliarPF2e> {
    master: CharacterPF2e | null;
    masters: CharacterPF2e[];
    abilities: ConfigPF2e["PF2E"]["abilities"];
    size: string;
    familiarAbilities: { value: number };
}

export { FamiliarSheetData };
