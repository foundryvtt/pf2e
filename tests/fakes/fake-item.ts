import { ItemDataPF2e } from "@item/data";

export class FakeItem {
    _data: Partial<ItemDataPF2e>;
    constructor(data: Partial<ItemDataPF2e>) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._data.name;
    }

    get level(): number | null {
        return "level" in this.data.data! ? this.data.data.level.value : null;
    }

    get traits(): Set<string> {
        return new Set(this.data.data!.traits.value);
    }

    get isMagical(): boolean {
        return ["magical", "arcane", "primal", "divine", "occult"].some((trait) => this.traits.has(trait));
    }

    get isAlchemical(): boolean {
        return this.traits.has("alchemical");
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    toObject(source = true) {
        return source ? duplicate(this._data) : duplicate(this.data);
    }
}
