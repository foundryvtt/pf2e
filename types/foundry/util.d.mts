import { DataSchema, DatabaseUpdateOperation } from "@common/abstract/_module.mjs";
import Collection from "@common/utils/collection.mjs";
import type DataModel from "./common/abstract/data.mjs";

declare global {
    type Maybe<T> = T | null | undefined;

    type Builtin = Date | Function | Uint8Array | string | number | boolean | symbol | null | undefined;

    type DeepPartial<T> = T extends Builtin
        ? T
        : T extends Array<infer U>
          ? Array<DeepPartial<U>>
          : T extends ReadonlyArray<infer U>
            ? ReadonlyArray<DeepPartial<U>>
            : T extends {}
              ? { [K in keyof T]?: DeepPartial<T[K]> }
              : Partial<T>;

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
