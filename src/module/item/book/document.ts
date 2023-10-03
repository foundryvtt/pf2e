import { ActorPF2e } from "@actor";
import { PhysicalItemPF2e } from "@item";
import { BookSource, BookSystemData } from "./data.ts";

class BookPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {}

interface BookPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: BookSource;
    system: BookSystemData;
}

export { BookPF2e };
