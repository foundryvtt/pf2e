import { ActorPF2e } from "@actor";
import { setHasElement } from "@util";
import { ItemType } from "./base/data/index.ts";
import { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import { ItemInstances } from "./types.ts";

/** Determine in a type-safe way whether an `ItemPF2e` or `ItemSourcePF2e` is among certain types */
function itemIsOfType<TParent extends ActorPF2e | null, TType extends ItemType>(
    item: { type: string; effects: Collection<object> | object[]; flags: DocumentFlags },
    ...types: TType[]
): item is ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"];
function itemIsOfType<TParent extends ActorPF2e | null>(
    item: { type: string; effects: Collection<object> | object[]; flags: DocumentFlags },
    type: "physical",
): item is PhysicalItemPF2e<TParent> | PhysicalItemPF2e["_source"];
function itemIsOfType<TParent extends ActorPF2e | null, TType extends "physical" | ItemType>(
    item: { type: string; effects: Collection<object> | object[]; flags: DocumentFlags },
    ...types: TType[]
): item is TType extends "physical"
    ? PhysicalItemPF2e<TParent> | PhysicalItemPF2e<TParent>["_source"]
    : TType extends ItemType
    ? ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"]
    : never;
function itemIsOfType(
    item: { type: string; effects: Collection<object> | object[]; flags: DocumentFlags },
    ...types: string[]
): boolean {
    return types.some((t) => (t === "physical" ? setHasElement(PHYSICAL_ITEM_TYPES, item.type) : item.type === t));
}

/** Create a "reduced" item name; that is, one without an "Effect:" or similar prefix */
function reduceItemName(label: string): string {
    return label.includes(":") ? label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : label;
}

export { itemIsOfType, reduceItemName };
