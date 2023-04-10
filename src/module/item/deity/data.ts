import { SkillAbbreviation } from "@actor/creature/data.ts";
import { Alignment } from "@actor/creature/types.ts";
import { AbilityString } from "@actor/types.ts";
import { BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base.ts";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { DeityDomain } from "./types.ts";

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
