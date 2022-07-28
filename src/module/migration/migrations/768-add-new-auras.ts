import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add the new Aura rule element to the Marshal Dedication feat */
export class Migration768AddNewAuras extends MigrationBase {
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

    #eternalBlessing = [
        {
            domain: "all",
            key: "RollOption",
            option: "eternal-blessing-active",
            toggleable: true,
            value: true,
        },
        {
            effects: [
                {
                    affects: "allies",
                    events: ["enter"],
                    uuid: "Compendium.pf2e.spell-effects.Spell Effect: Bless",
                },
            ],
            key: "Aura",
            predicate: {
                all: ["eternal-blessing-active"],
            },
            radius: 15,
            slug: "eternal-blessing",
            traits: ["enchantment", "mental"],
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || source.data.rules.length > 0) return;

        if (source.data.slug === "marshal-dedication") {
            source.data.rules = [deepClone(this.#marshalsAura)];
        } else if (source.data.slug === "eternal-blessing") {
            source.data.rules = deepClone(this.#eternalBlessing);
        }
    }
}
