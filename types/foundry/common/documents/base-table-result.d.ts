declare module foundry {
    module documents {
        /** The TableResult document model. */
        class BaseTableResult extends abstract.Document {
            static override get schema(): typeof data.RollTableData;

            static override get metadata(): TableResultMetadata;

            /** Is a user able to update an existing TableResult? */
            protected static _canUpdate(user: BaseUser, doc: BaseTableResult, data: data.TableResultData): boolean;

            override testUserPermission(
                user: BaseUser,
                permission: DocumentPermission | UserAction,
                { exact }?: { exact?: boolean },
            ): boolean;
        }

        interface BaseTableResult {
            readonly data: data.TableResultData<this>;

            readonly parent: BaseRollTable | null;
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
