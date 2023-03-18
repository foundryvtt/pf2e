import { ItemPF2e } from "@item";
import { EffectContextData } from "@item/abstract-effect";

export type DropCanvasItemDataPF2e = DropCanvasData<"Item", ItemPF2e> & {
    value?: number;
    level?: number;
    context?: EffectContextData;
};

export type DropCanvasDataPF2e<T extends string = string, D extends object = object> = T extends "Item"
    ? DropCanvasItemDataPF2e
    : DropCanvasData<T, D>;
