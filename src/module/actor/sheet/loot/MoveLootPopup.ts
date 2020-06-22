
export class MoveLootPopup extends FormApplication {
    
    constructor(object, options, callback) {
        super(object, options);
        
        this.onSubmitCallback = callback;
    }
    
    static get defaultOptions() {
        const options = super.defaultOptions;
        
        options.id = 'MoveLootPopup';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.loot.MoveLootPopupTitle');
        options.template = 'systems/pf2e/templates/popups/loot/move-loot-popup.html';
        options.width = 'auto';
        
        return options;
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        
        // Subscribe to events
    }
    
    getData() {
        return 
        {
            
        }
    }
    
    async _updateObject(event, formData) {
        if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.quantity);
        }        
    }
}