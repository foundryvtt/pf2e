import { SkillAbbreviation } from "@actor/creature/data";
import { Alignment } from "@actor/creature/types";
import { AbilityString } from "@actor/data";
import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { BaseWeaponType } from "@item/weapon/data";
import type { DeityPF2e } from "./document";
import { DeityDomain } from "./types";

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
        own: Alignment | null;
        follower: Alignment[];
    };
    domains: {
        primary: DeityDomain[];
        alternate: DeityDomain[];
    };
    font: DivineFonts;
    ability: AbilityString[];
    skill: SkillAbbreviation | null;
    weapons: BaseWeaponType[];
    spells: Record<number, ItemUUID>;
    traits?: never;
}

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"];

export type DeitySystemData = DeitySystemSource;
