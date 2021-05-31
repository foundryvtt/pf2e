export class FakeRollTable {
    data: foundry.data.RollTableData;

    constructor(data: foundry.data.RollTableSource) {
        this.data = duplicate(data) as unknown as foundry.data.RollTableData;
    }
}
