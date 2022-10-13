import { ItemPF2e, ItemConstructionContextPF2e } from "./base";
import { PhysicalItemPF2e } from "./physical";
import { ABCItemPF2e } from "./abc";
import { AbstractEffectPF2e } from "./abstract-effect";
import { ActionItemPF2e } from "./action";
import { AncestryPF2e } from "./ancestry";
import { ArmorPF2e } from "./armor";
import { BackgroundPF2e } from "./background";
import { BookPF2e } from "./book/document";
import { ClassPF2e } from "./class";
import { ConditionPF2e } from "./condition";
import { ConsumablePF2e } from "./consumable";
import { ContainerPF2e } from "./container";
import { DeityPF2e } from "./deity";
import { EffectPF2e } from "./effect";
import { EquipmentPF2e } from "./equipment";
import { FeatPF2e } from "./feat";
import { HeritagePF2e } from "./heritage";
import { KitPF2e } from "./kit";
import { LorePF2e } from "./lore";
import { MeleePF2e } from "./melee";
import { SpellPF2e } from "./spell";
import { SpellcastingEntryPF2e } from "./spellcasting-entry";
import { TreasurePF2e } from "./treasure";
import { WeaponPF2e } from "./weapon";

type EffectSubclass = ConditionPF2e | EffectPF2e;
type ABCItemSubclass = AncestryPF2e | BackgroundPF2e | ClassPF2e;
type PhysicalItemSubclass =
    | ArmorPF2e
    | BookPF2e
    | ConsumablePF2e
    | ContainerPF2e
    | EquipmentPF2e
    | TreasurePF2e
    | WeaponPF2e;

type ItemUnionPF2e =
    | ABCItemSubclass
    | EffectSubclass
    | PhysicalItemSubclass
    | ActionItemPF2e
    | DeityPF2e
    | FeatPF2e
    | HeritagePF2e
    | KitPF2e
    | LorePF2e
    | MeleePF2e
    | SpellPF2e
    | SpellcastingEntryPF2e;

export {
    ABCItemPF2e,
    ABCItemSubclass,
    AbstractEffectPF2e,
    ActionItemPF2e,
    AncestryPF2e,
    ArmorPF2e,
    BackgroundPF2e,
    BookPF2e,
    ClassPF2e,
    ConditionPF2e,
    ConsumablePF2e,
    ContainerPF2e,
    DeityPF2e,
    EffectPF2e,
    EffectSubclass,
    EquipmentPF2e,
    FeatPF2e,
    HeritagePF2e,
    ItemConstructionContextPF2e,
    ItemPF2e,
    ItemUnionPF2e,
    KitPF2e,
    LorePF2e,
    MeleePF2e,
    PhysicalItemPF2e,
    PhysicalItemSubclass,
    SpellPF2e,
    SpellcastingEntryPF2e,
    TreasurePF2e,
    WeaponPF2e,
};
