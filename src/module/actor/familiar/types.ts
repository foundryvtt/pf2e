import { CharacterPF2e } from "@actor";
import { CreatureSheetData } from "@actor/creature/types.ts";
import { FamiliarPF2e } from "./document.ts";

interface FamiliarSheetData<TActor extends FamiliarPF2e> extends CreatureSheetData<TActor> {
    master: CharacterPF2e | null;
    masters: CharacterPF2e[];
    abilities: ConfigPF2e["PF2E"]["abilities"];
    size: string;
    familiarAbilities: { value: number };
}

export { FamiliarSheetData };
