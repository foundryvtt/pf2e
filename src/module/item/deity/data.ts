import { Alignment, SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data";
import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { BaseWeaponType } from "@item/weapon/data";
import type { DeityPF2e } from "./document";

export type DeitySource = BaseNonPhysicalItemSource<"deity", DeitySystemSource>;

export class DeityData extends BaseNonPhysicalItemData<DeityPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/deity.svg";
}

export interface DeityData extends Omit<DeitySource, "effects" | "flags"> {
    type: DeitySource["type"];
    data: DeitySystemData;
    readonly _source: DeitySource;
}

export interface DeitySystemSource extends ItemSystemData {
    alignment: {
        own: Alignment;
        follower: Alignment[];
    };
    domains: {
        primary: ItemUUID[];
        alternate: ItemUUID[];
    };
    font: DivineFonts;
    ability: AbilityString[];
    skill: SkillAbbreviation;
    weapon: BaseWeaponType[];
    spells: Record<number, ItemUUID>;
    edicts: string;
    anathema: string;
    areasOfConcern: string;
    traits?: never;
}

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"];

export type DeitySystemData = DeitySystemSource;
