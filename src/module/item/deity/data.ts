import { SkillAbbreviation } from "@actor/creature/data";
import { Alignment } from "@actor/creature/types";
import { AbilityString } from "@actor/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base";
import { BaseWeaponType } from "@item/weapon/types";
import type { DeityPF2e } from "./document";
import { DeityDomain } from "./types";

type DeitySource = BaseItemSourcePF2e<"deity", DeitySystemSource>;

type DeityData = Omit<DeitySource, "effects" | "flags"> &
    BaseItemDataPF2e<DeityPF2e, "deity", DeitySystemData, DeitySource>;

interface DeitySystemSource extends ItemSystemSource {
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

type DeitySystemData = DeitySystemSource;

export { DeityData, DeitySource, DeitySystemData, DeitySystemSource };
