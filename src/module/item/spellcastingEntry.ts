/**
 * @category Other
 */
export class SpellcastingEntry {
    data: any;

    constructor(data) {
        this.data = data;
    }

    get ability() {
        return this.data.data.ability.value || 'int';
    }
}
