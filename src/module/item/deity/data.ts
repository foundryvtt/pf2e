import { SkillAbbreviation } from "@actor/creature/data.ts";
import { AttributeString } from "@actor/types.ts";
import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { DeityDomain, Sanctification } from "./types.ts";

type DeitySource = BaseItemSourcePF2e<"deity", DeitySystemSource>;

type DeitySystemSource = ItemSystemSource & {
    category: "deity" | "pantheon" | "philosophy";
    sanctification: DeitySanctification | null;
    domains: {
        primary: DeityDomain[];
        alternate: DeityDomain[];
    };
    font: DivineFonts;
    attribute: AttributeString[];
    skill: SkillAbbreviation | null;
    weapons: BaseWeaponType[];
    spells: Record<number, ItemUUID>;
    level?: never;
    traits: OtherTagsOnly;
};

type DeitySanctification = { modal: "can" | "must"; what: Sanctification[] };

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"] | never[];

interface DeitySystemData extends Omit<DeitySystemSource, "description">, Omit<ItemSystemData, "level" | "traits"> {}

export type { DeitySanctification, DeitySource, DeitySystemData, DeitySystemSource };
