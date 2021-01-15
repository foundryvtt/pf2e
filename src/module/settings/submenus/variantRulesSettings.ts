/* global game */
const SETTINGS: any = {
    staminaVariant: {
        name: 'Stamina Variant Rules',
        hint: 'Play with the stamina variant from Gamemastery Guide pg 200',
        scope: 'world',
        config: false,
        default: 0,
        type: Number,
        choices: {
            0: 'Do not use Stamina',
            1: 'Use Stamina', // I plan to expand this, hence the dropdown.
        },
    },
    proficiencyVariant: {
        name: 'Proficiency without Level Variant Rules',
        hint: 'Play with the proficiency without level variant from Gamemastery Guide pg 198.',
        scope: 'world',
        config: false,
        default: 'ProficiencyWithLevel',
        type: String,
        choices: {
            ProficiencyWithLevel: 'Use Default rules',
            ProficiencyWithoutLevel: 'Use Variant rules',
        },
    },
    proficiencyUntrainedModifier: {
        name: 'Untrained proficiency modifier',
        hint:
            'Adjust to your liking to compliment the proficiency without level variant rules, recommended with variant rules is -2. Requires recalculation by reload or modifying a value per actor.',
        scope: 'world',
        config: false,
        default: 0,
        type: Number,
    },
    proficiencyTrainedModifier: {
        name: 'Trained proficiency modifier',
        hint:
            'Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.',
        scope: 'world',
        config: false,
        default: 2,
        type: Number,
    },
    proficiencyExpertModifier: {
        name: 'Expert proficiency modifier',
        hint:
            'Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.',
        scope: 'world',
        config: false,
        default: 4,
        type: Number,
    },
    proficiencyMasterModifier: {
        name: 'Master proficiency modifier',
        hint:
            'Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.',
        scope: 'world',
        config: false,
        default: 6,
        type: Number,
    },
    proficiencyLegendaryModifier: {
        name: 'Legendary proficiency modifier',
        hint:
            'Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.',
        scope: 'world',
        config: false,
        default: 8,
        type: Number,
    },
};

export class variantRulesSettings extends FormApplication {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: 'Variant Rules Settings',
            id: 'variant-rules-settings',
            template: 'systems/pf2e/templates/system/settings/variant-rules-settings.html',
            width: 550,
            height: 'auto',
            closeOnSubmit: true,
        });
    }
    /* -------------------------------------------- */

    /** @override */
    async getData(options: any) {
        const data: any = {};
        for (const [k, v] of Object.entries(SETTINGS)) {
            data[k] = {
                value: game.settings.get('pf2e', k),
                setting: v,
            };
        }
        return data;
    }

    static registerSettings() {
        for (const [k, v] of Object.entries(SETTINGS)) {
            game.settings.register('pf2e', k, v);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** @override */
    activateListeners(html: JQuery) {
        super.activateListeners(html);
        html.find('button[name="reset"]').on('click', this._onResetDefaults.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Handle button click to reset default settings
     * @param event {Event}   The initial button click event
     * @private
     */
    async _onResetDefaults(event: Event) {
        event.preventDefault();
        const updates = [];
        for (const [k, v] of Object.entries(SETTINGS)) {
            updates.push(game.settings.set('pf2e', k, (v as any).default));
        }
        await Promise.all(updates);
        return this.render();
    }

    /* -------------------------------------------- */

    /** @override */
    async _onSubmit(event: Event, options: any) {
        event.preventDefault();
        super._onSubmit(event, options);
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event: Event, formData: any) {
        const updates = [];
        for (const k of Object.keys(SETTINGS)) {
            updates.push(game.settings.set('pf2e', k, formData[k]));
        }
        await Promise.all(updates);
    }
}
