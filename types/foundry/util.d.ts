import type DataModel from "./common/abstract/data.d.ts";
import type { DataSchema } from "./common/data/fields.d.ts";

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

    type CollectionValue<T> = T extends Collection<infer U> ? U : never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ConstructorOf<T> = new (...args: any[]) => T;

    type DocumentConstructorOf<T extends foundry.abstract.Document> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (...args: any[]): T;
        updateDocuments(updates?: object[], context?: DocumentModificationContext<T["parent"]>): Promise<T[]>;
    };

    type ParentOf<TDataModel> = TDataModel extends DataModel<infer P extends DataModel | null> ? P : never;

    type SchemaOf<TDataModel> = TDataModel extends DataModel<infer _P, infer S extends DataSchema> ? S : never;

    type SetElement<TSet extends Set<unknown>> = TSet extends Set<infer TElement> ? TElement : never;

    type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;

    type TypeParamOf<T> = T extends TypeWithGeneric<infer U> ? U : never;
}

type TypeWithGeneric<T> = T[];
