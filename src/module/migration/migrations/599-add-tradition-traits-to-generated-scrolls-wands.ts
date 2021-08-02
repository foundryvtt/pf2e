import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration599AddTraditionTraits extends MigrationBase {
    static override version = 0.599;

    override async updateItem(item: ItemSourcePF2e) {
        if (item.type !== "consumable" || !item.data.spell?.data) return;
        const traditions = duplicate(item.data.spell.data.data.traditions.value);
        for (const tradition of traditions) {
            if (!item.data.traits.value.includes(tradition)) item.data.traits.value.push(tradition);
        }
    }
}
