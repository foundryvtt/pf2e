import { SkillAbbreviation } from "@actor/creature/data";
import { Alignment } from "@actor/creature/types";
import { AbilityString } from "@actor/types";
import { BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base";
import { BaseWeaponType } from "@item/weapon/types";
import { DeityDomain } from "./types";

type DeitySource = BaseItemSourcePF2e<"deity", DeitySystemSource>;

interface DeitySystemSource extends ItemSystemSource {
    category: "deity" | "pantheon" | "philosophy";
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
    level?: never;
    traits?: never;
}

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"] | never[];

type DeitySystemData = DeitySystemSource;

export { DeitySource, DeitySystemData, DeitySystemSource };
