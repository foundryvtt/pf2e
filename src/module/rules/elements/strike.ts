import { AbilityString, ActorType } from "@actor/data";
import { WeaponPF2e } from "@item";
import {
    BaseWeaponType,
    WeaponCategory,
    WeaponDamage,
    WeaponGroup,
    WeaponSource,
    WeaponTrait,
} from "@item/weapon/data";
import { murmur3 } from "murmurhash-js";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class StrikeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData(_actorData: unknown, { strikes }: RuleElementSynthetics) {
        const category = this.data.category || "unarmed";
        const group = this.data.group || "brawling";
        const baseType = this.data.baseType ?? "";

        // Generate a stable ID for this strike so that it can be used via macro after removal and readdition of the
        // originating item
        const stableId = btoa(String(murmur3([this.item.name, this.label, category, group, baseType].join("")))).slice(
            0,
            16
        );

        const source: PreCreate<WeaponSource> = {
            _id: stableId,
            name: this.label,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            data: {
                slug: this.data.slug ?? null,
                description: { value: "" },
                baseItem: baseType || null,
                ability: { value: this.data.ability || "str" },
                weaponType: { value: category },
                group: { value: group },
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
        baseType?: BaseWeaponType;
        damage?: { base?: WeaponDamage };
        range?: string;
        traits?: WeaponTrait[];
        options?: string[];
    };
}
