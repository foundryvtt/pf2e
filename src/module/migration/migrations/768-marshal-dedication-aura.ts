import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add the new Aura rule element to the Marshal Dedication feat */
export class Migration768MarshalDedicationAura extends MigrationBase {
    static override version = 0.768;

    #marshalsAura = {
        effects: [
            {
                affects: "allies",
                events: ["enter"],
                uuid: "Compendium.pf2e.feat-effects.Ru4BNABCZ0hUbX7S",
            },
        ],
        key: "Aura",
        radius: 10,
        slug: "marshals-aura",
        traits: ["emotion", "mental", "visual"],
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.data.slug === "marshal-dedication" && source.data.rules.length === 0) {
            source.data.rules = [deepClone(this.#marshalsAura)];
        }
    }
}
