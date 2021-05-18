declare module foundry {
    module data {
        interface MacroSource extends foundry.abstract.DocumentSource {
            type: 'chat' | 'script';
            img: string;
            actorIds: string[];
            author: string;
            command: string;
            scope: string;
            folder?: string | null;
            sort: number;
        }
        class MacroData extends foundry.abstract.DocumentData {}
        interface MacroData extends foundry.abstract.DocumentData, Omit<MacroSource, '_id'> {
            _source: MacroSource;
        }
    }
}
