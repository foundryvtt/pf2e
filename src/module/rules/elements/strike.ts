import { ActorType } from "@actor/data";
import { WeaponPF2e } from "@item";
import {
    BaseWeaponType,
    WeaponCategory,
    WeaponDamage,
    WeaponGroup,
    WeaponSource,
    WeaponTrait,
    WEAPON_RANGES,
} from "@item/weapon/data";
import { tupleHasValue } from "@util";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class StrikeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData(_actorData: unknown, { strikes }: RuleElementSynthetics) {
        if (
            !(
                tupleHasValue(WEAPON_RANGES, this.data.range) ||
                this.data.range === null ||
                this.data.range === undefined
            )
        ) {
            return;
        }
        const source: PreCreate<WeaponSource> = {
            _id: this.item.id,
            name: this.label || this.item.name,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            data: {
                slug: this.data.slug ?? null,
                description: { value: "" },
                category: this.data.category || "unarmed",
                group: this.data.group || "brawling",
                baseItem: this.data.baseType ?? null,
                damage: this.data.damage?.base,
                range: this.data.range || null,
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
        category?: WeaponCategory;
        group?: WeaponGroup;
        baseType?: BaseWeaponType | null;
        damage?: { base?: WeaponDamage };
        range?: number | null;
        traits?: WeaponTrait[];
        options?: string[];
    };
}
