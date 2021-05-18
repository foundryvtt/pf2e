declare module foundry {
    module data {
        interface RollTableSource extends foundry.abstract.DocumentSource {
            img: string;
            displayRoll: boolean;
            formula: boolean;
            replacement: true;
            results: RollTableResult[];
            folder?: string | null;
            sort: number;
        }

        class RollTableData extends foundry.abstract.DocumentData {}
        interface RollTableData extends foundry.abstract.DocumentData, Omit<RollTableSource, '_id'> {
            _source: RollTableSource;
        }
    }
}
