interface FakeUserData {
    name: string;
    _id: string;
    flags: {
        PF2e?: {
            settings?: {
                quickD20roll?: boolean;
            };
        };
    };
}

export class FakeUser {
    _data: FakeUserData;
    constructor(data: FakeUserData) {
        this._data = duplicate(data);
    }

    get data(): FakeUserData {
        return this._data;
    }

    get name(): string {
        return this._data.name;
    }

    async update(changes: Record<string, unknown>): Promise<this> {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
        return this;
    }
}
