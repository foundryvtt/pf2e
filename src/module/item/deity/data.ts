import { SkillAbbreviation } from "@actor/creature/data.ts";
import { AttributeString } from "@actor/types.ts";
import { BaseItemSourcePF2e, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { DeityDomain, Sanctification } from "./types.ts";

type DeitySource = BaseItemSourcePF2e<"deity", DeitySystemSource>;

interface DeitySystemSource extends ItemSystemSource {
    category: "deity" | "pantheon" | "philosophy";
    sanctification: DeitySanctification | null;
    domains: {
        primary: DeityDomain[];
        alternate: DeityDomain[];
    };
    font: DivineFonts;
    attributes: AttributeString[];
    skill: SkillAbbreviation | null;
    weapons: BaseWeaponType[];
    spells: Record<number, ItemUUID>;
    level?: never;
    traits: OtherTagsOnly;
}

type DeitySanctification = { modal: "can" | "must"; what: Sanctification[] };

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"] | never[];

type DeitySystemData = DeitySystemSource;

export type { DeitySanctification, DeitySource, DeitySystemData, DeitySystemSource };
