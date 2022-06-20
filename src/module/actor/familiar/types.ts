import { CharacterPF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { FamiliarPF2e } from ".";

interface FamiliarSheetData extends ActorSheetDataPF2e<FamiliarPF2e> {
    master: CharacterPF2e | null;
    masters: CharacterPF2e[];
    abilities: ConfigPF2e["PF2E"]["abilities"];
    size: string;
    familiarAbilities: { value: number };
}

export { FamiliarSheetData };
