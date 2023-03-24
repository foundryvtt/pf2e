import { ActorPF2e } from "@actor";
import * as ItemInstance from "@item";

interface ItemInstances<TParent extends ActorPF2e | null> {
    action: ItemInstance.ActionItemPF2e<TParent>;
    affliction: ItemInstance.AfflictionPF2e<TParent>;
    ancestry: ItemInstance.AncestryPF2e<TParent>;
    armor: ItemInstance.ArmorPF2e<TParent>;
    background: ItemInstance.BackgroundPF2e<TParent>;
    backpack: ItemInstance.ContainerPF2e<TParent>;
    book: ItemInstance.BookPF2e<TParent>;
    class: ItemInstance.ClassPF2e<TParent>;
    condition: ItemInstance.ConditionPF2e<TParent>;
    consumable: ItemInstance.ConsumablePF2e<TParent>;
    deity: ItemInstance.DeityPF2e<TParent>;
    effect: ItemInstance.EffectPF2e<TParent>;
    equipment: ItemInstance.EquipmentPF2e<TParent>;
    feat: ItemInstance.FeatPF2e<TParent>;
    heritage: ItemInstance.HeritagePF2e<TParent>;
    kit: ItemInstance.KitPF2e<TParent>;
    lore: ItemInstance.LorePF2e<TParent>;
    melee: ItemInstance.MeleePF2e<TParent>;
    spell: ItemInstance.SpellPF2e<TParent>;
    spellcastingEntry: ItemInstance.SpellcastingEntryPF2e<TParent>;
    treasure: ItemInstance.TreasurePF2e<TParent>;
    weapon: ItemInstance.WeaponPF2e<TParent>;
}

export { ItemInstances };
