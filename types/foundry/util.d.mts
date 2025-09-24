import { DataSchema, DatabaseUpdateOperation, Document } from "@common/abstract/_module.mjs";
import Collection from "@common/utils/collection.mjs";
import type DataModel from "./common/abstract/data.mjs";

declare global {
    type Maybe<T> = T | null | undefined;

    type DeepPartial<T> = T extends Date | FileList | File | NestedValue | Document
        ? T
        : T extends (infer U)[]
          ? DeepPartial<U>[]
          : { [K in keyof T]?: ExtractObjects<T[K]> extends never ? T[K] : DeepPartial<T[K]> };

    type DeepReadonly<T> = {
        readonly [K in keyof T]: T[K] extends undefined | null | boolean | number | string | symbol | bigint | Function
            ? T[K]
            : T[K] extends Array<infer V>
              ? ReadonlyArray<DeepReadonly<V>>
              : T[K] extends Map<infer K_1, infer V>
                ? ReadonlyMap<DeepReadonly<K_1>, DeepReadonly<V>>
                : T[K] extends Set<infer V_1>
                  ? ReadonlySet<DeepReadonly<V_1>>
                  : DeepReadonly<T[K]>;
    };

    type CollectionValue<T> = T extends Collection<string, infer U> ? U : never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ConstructorOf<T> = new (...args: any[]) => T;

    type DocumentConstructorOf<T extends foundry.abstract.Document> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (...args: any[]): T;
        updateDocuments(updates?: object[], operation?: Partial<DatabaseUpdateOperation<T["parent"]>>): Promise<T[]>;
    };

    type ParentOf<TDataModel> = TDataModel extends DataModel<infer P extends DataModel | null> ? P : never;

    type SchemaOf<TDataModel> = TDataModel extends DataModel<infer _P, infer S extends DataSchema> ? S : never;

    type SetElement<TSet extends Set<unknown>> = TSet extends Set<infer TElement> ? TElement : never;

    type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;

    type ValueOf<T extends object> = T[keyof T];

    /** A JSON-compatible value, plus `undefined` */
    type JSONValue = string | number | boolean | object | null | undefined;
}

type ExtractObjects<T> = T extends infer U ? (U extends object ? U : never) : never;

declare const $NestedValue: unique symbol;

type NestedValue<TValue extends object = object> = { [$NestedValue]: never } & TValue;

export {};
