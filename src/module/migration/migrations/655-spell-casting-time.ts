import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

interface CastingTimeOld {
    type?: "actions" | "time";
    value: string;
}

const actionKeys = ["free", "reaction", "1", "2", "3", "1 to 3", "1 or 2", "2 or 3"];

/** Set a type for the casting time */
export class Migration655SpellCastingTime extends MigrationBase {
    static override version = 0.642;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        // Recursively apply to embedded spells
        if (itemData.type === "consumable" && itemData.data.spell.data) {
            return this.updateItem(itemData.data.spell.data);
        }

        if (itemData.type !== "spell") return;
        if ("type" in itemData.data.time) return;

        const time: CastingTimeOld = itemData.data.time;
        time.value = time.value?.trim() ?? "";

        // Some spells in old actors have weird casting times, convert those to something we can deal with
        // Example: Ghost mage"s prestidigiation is "2 Actions"
        const match = time.value?.match(/(.*) Action(s?)/i);
        if (match) {
            time.value = match[1].trim();
        }

        if (actionKeys.includes(time.value)) {
            time.type = "actions";
        } else {
            time.type = "time";
        }
    }
}
