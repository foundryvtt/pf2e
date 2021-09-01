import { AbilityString } from "@actor/data";
import { WeaponPF2e } from "@item";
import { WeaponCategory, WeaponDamage, WeaponGroup, WeaponSource, WeaponTrait } from "@item/weapon/data";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class StrikeRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(_actorData: unknown, { strikes }: RuleElementSynthetics) {
        const source: PreCreate<WeaponSource> = {
            _id: this.item.id,
            name: this.label || this.item.name,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            data: {
                slug: this.data.slug ?? null,
                description: { value: "" },
                ability: { value: this.data.ability || "str" },
                weaponType: { value: this.data.category || "unarmed" },
                group: { value: this.data.group || "brawling" },
                damage: this.data.damage?.base,
                range: { value: this.data.range || "melee" },
                traits: { value: this.data.traits ?? [], rarity: { value: "common" }, custom: "" },
                options: { value: this.data.options ?? [] },
                equipped: { value: true },
            },
        };
        strikes.push(new WeaponPF2e(source, { parent: this.actor }) as Embedded<WeaponPF2e>);
    }
}

export interface StrikeRuleElement {
    data: RuleElementData & {
        slug?: string | null;
        img?: ImagePath;
        ability?: AbilityString;
        category?: WeaponCategory;
        group?: WeaponGroup;
        damage?: { base?: WeaponDamage };
        range?: string;
        traits?: WeaponTrait[];
        options?: string[];
    };
}
