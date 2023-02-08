import { DataModel } from "./common/abstract/data.mjs";
import { DataSchema } from "./common/data/fields.mjs";

declare global {
    interface ElementDragEvent extends DragEvent {
        target: HTMLElement;
        currentTarget: HTMLElement;
        readonly dataTransfer: DataTransfer;
    }

    type Maybe<T> = T | null | undefined;

    type DeepPartial<T> = {
        [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
    };

    type CollectionValue<T> = T extends foundry.utils.Collection<infer U> ? U : never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ConstructorOf<T> = new (...args: any[]) => T;

    type ParentOf<TDataModel> = TDataModel extends DataModel<infer P extends DataModel | null> ? P : never;

    type SchemaOf<TDataModel> = TDataModel extends DataModel<infer _P, infer S extends DataSchema> ? S : never;

    type SetElement<TSet extends Set<unknown>> = TSet extends Set<infer TElement> ? TElement : never;

    type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;
}
