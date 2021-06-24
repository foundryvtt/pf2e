declare module foundry {
    module data {
        interface MacroSource extends abstract.DocumentSource {
            _id: string;
            name: string;
            type: 'chat' | 'script';
            img: string;
            actorIds: string[];
            author: string;
            command: string;
            scope: string;
            folder?: string | null;
            sort: number;
            permission: Record<string, PermissionLevel>;
            flags: Record<string, unknown>;
        }

        class MacroData<
            TDocument extends documents.BaseMacro = documents.BaseMacro,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface MacroData extends MacroSource {
            readonly _source: MacroSource;
        }
    }
}
