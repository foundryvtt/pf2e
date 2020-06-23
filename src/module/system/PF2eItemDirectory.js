export default class extends ItemDirectory {
    constructor(options) {
        super(options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: './systems/pf2e/templates/system/item-directory.html',
            baseApplication: 'SidebarTab'
        });
    }
    
}