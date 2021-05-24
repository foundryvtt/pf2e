declare module foundry {
    module documents {
        /**
         * The TableResult document model.
         *
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseTableResult extends abstract.Document {
            /** @override */
            static get schema(): new (...args: any[]) => data.RollTableData;

            /** @override */
            static get metadata(): TableResultMetadata;

            /** Is a user able to update an existing TableResult? */
            protected static _canUpdate(user: BaseUser, doc: BaseTableResult, data: data.TableResultData): boolean;

            /** @override */
            testUserPermission(
                user: BaseUser,
                permission: DocumentPermission | UserAction,
                { exact }?: { exact?: boolean },
            ): boolean;
        }

        interface BaseTableResult {
            readonly data: data.TableResultData<BaseTableResult>;
        }

        interface TableResultMetadata extends abstract.DocumentMetadata {
            name: 'TableResult';
            collection: 'results';
            label: 'DOCUMENT.TableResult';
            types: typeof CONST.TABLE_RESULT_TYPES;
            permissions: Omit<foundry.abstract.DocumentMetadata['permissions'], 'update'> & {
                update: typeof BaseTableResult['_canUpdate'];
            };
        }
    }
}
