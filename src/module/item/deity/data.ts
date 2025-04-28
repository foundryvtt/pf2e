import type { AttributeString, SkillSlug } from "@actor/types.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import type { BaseWeaponType } from "@item/weapon/types.ts";
import type { DeityDomain, Sanctification } from "./types.ts";

type DeitySource = BaseItemSourcePF2e<"deity", DeitySystemSource>;

type DeitySystemSource = ItemSystemSource & {
    category: DeityCategory;
    sanctification: DeitySanctification | null;
    domains: {
        primary: DeityDomain[];
        alternate: DeityDomain[];
    };
    font: DivineFonts;
    attribute: AttributeString[];
    skill: SkillSlug[] | null;
    weapons: BaseWeaponType[];
    spells: Record<number, ItemUUID>;
    level?: never;
    traits: OtherTagsOnly;
};

type DeityCategory = "deity" | "pantheon" | "covenant" | "philosophy";

type DeitySanctification = { modal: "can" | "must"; what: Sanctification[] };

type DivineFonts = ["harm"] | ["heal"] | ["harm", "heal"] | never[];

interface DeitySystemData extends Omit<DeitySystemSource, "description">, Omit<ItemSystemData, "level" | "traits"> {}

export type { DeityCategory, DeitySanctification, DeitySource, DeitySystemData, DeitySystemSource };
