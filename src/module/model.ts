import type { Rarity } from "./data.ts";

class RarityField extends foundry.data.fields.StringField<Rarity, Rarity, true, false, true> {
    constructor() {
        const rarityChoices: Record<Rarity, string> = CONFIG.PF2E.rarityTraits;
        super({ required: true, nullable: false, choices: rarityChoices, initial: "common" });
    }
}

export { RarityField };
