import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add the new Aura rule element to the Marshal Dedication feat */
export class Migration768AddNewAuras extends MigrationBase {
    static override version = 0.768;

    #auraOfLife = {
        effects: [
            {
                affects: "allies",
                events: ["enter"],
                uuid: "Compendium.pf2e.feat-effects.FPuICuxBLiDaEbDX",
            },
        ],
        key: "Aura",
        radius: 15,
        slug: "aura-of-life",
    };

    #enlightenedPresence = {
        effects: [
            {
                affects: "allies",
                events: ["enter"],
                uuid: "Compendium.pf2e.feat-effects.XM1AA8z5cHm8sJXM",
            },
        ],
        key: "Aura",
        radius: 15,
        slug: "enlightened-presence",
        traits: ["emotion", "mental"],
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
                    uuid: "Compendium.pf2e.spell-effects.Gqy7K6FnbLtwGpud",
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
        if (source.type !== "feat" || source.system.rules.length > 0) return;

        switch (source.system.slug) {
            case "aura-of-life":
                source.system.rules = [deepClone(this.#auraOfLife)];
                break;
            case "enlightened-presence":
                source.system.rules = [deepClone(this.#enlightenedPresence)];
                break;
            case "eternal-blessing":
                source.system.rules = deepClone(this.#eternalBlessing);
                break;
            case "marshal-dedication":
                source.system.rules = [deepClone(this.#marshalsAura)];
                break;
        }
    }
}
