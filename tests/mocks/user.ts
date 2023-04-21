import { UserSourcePF2e } from "@module/user/data.js";

export class MockUser {
    readonly _source: UserSourcePF2e;

    constructor(data: UserSourcePF2e) {
        this._source = duplicate(data);
    }

    get name(): string {
        return this._source.name;
    }

    async update(changes: Record<string, unknown>): Promise<this> {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._source, k, v);
        }
        return this;
    }
}
