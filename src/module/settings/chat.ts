const metagameDcChoices = {
    none: 'PF2E.SETTINGS.Metagame.ShowDC.None',
    gm: 'PF2E.SETTINGS.Metagame.ShowDC.Gm',
    owner: 'PF2E.SETTINGS.Metagame.ShowDC.Owner',
    all: 'PF2E.SETTINGS.Metagame.ShowDC.All',
};

const metagameResultsChoices = {
    none: 'PF2E.SETTINGS.Metagame.ShowResults.None',
    gm: 'PF2E.SETTINGS.Metagame.ShowResults.Gm',
    owner: 'PF2E.SETTINGS.Metagame.ShowResults.Owner',
    all: 'PF2E.SETTINGS.Metagame.ShowResults.All',
};

const SETTINGS = {
    statusEffectShowCombatMessage: {
        name: 'PF2E.SETTINGS.statusEffectShowCombatMessage.name',
        hint: 'PF2E.SETTINGS.statusEffectShowCombatMessage.hint',
        scope: 'client',
        config: false,
        default: true,
        type: Boolean,
    },
    'metagame.secretDamage': {
        name: 'PF2E.SETTINGS.Metagame.SecretDamage.Name',
        hint: 'PF2E.SETTINGS.Metagame.SecretDamage.Hint',
        scope: 'world',
        config: true, //temp set to true until I can figure out what is causing initial value not to populate correctly
        default: false,
        type: Boolean,
    },
    'metagame.secretCondition': {
        name: 'PF2E.SETTINGS.Metagame.SecretCondition.Name',
        hint: 'PF2E.SETTINGS.Metagame.SecretCondition.Hint',
        scope: 'world',
        config: true, //temp set to true until I can figure out what is causing initial value not to populate correctly
        default: false,
        type: Boolean,
    },
    'metagame.showDC': {
        name: 'PF2E.SETTINGS.Metagame.ShowDC.Name',
        hint: 'PF2E.SETTINGS.Metagame.ShowDC.Hint',
        scope: 'world',
        config: true, //temp set to true until I can figure out what is causing initial value not to populate correctly
        default: 'gm',
        type: String,
        choices: metagameDcChoices,
    },
    'metagame.showResults': {
        name: 'PF2E.SETTINGS.Metagame.ShowResults.Name',
        hint: 'PF2E.SETTINGS.Metagame.ShowResults.Hint',
        scope: 'world',
        config: true, //temp set to true until I can figure out what is causing initial value not to populate correctly
        default: 'gm',
        type: String,
        choices: metagameResultsChoices,
    },
};

export class ChatSettings extends FormApplication {
    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: 'PF2E.SETTINGS.Chat.Title',
            id: 'chat-settings',
            template: 'systems/pf2e/templates/system/settings/chat.html',
            width: 550,
            height: 'auto',
            closeOnSubmit: true,
        });
    }

    override getData() {
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

    override activateListeners(html: JQuery) {
        super.activateListeners(html);
        html.find('button[name="reset"]').on('click', (event) => this.onResetDefaults(event));
    }

    /**
     * Handle button click to reset default settings
     * @param event The initial button click event
     */
    private async onResetDefaults(event: JQuery.ClickEvent): Promise<this> {
        event.preventDefault();
        for await (const [k, v] of Object.entries(SETTINGS)) {
            await game.settings.set('pf2e', k, v?.default);
        }
        return this.render();
    }

    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {},
    ): Promise<Record<string, unknown>> {
        event.preventDefault();
        return super._onSubmit(event, options);
    }

    protected override async _updateObject(_event: Event, data: Record<string, unknown>): Promise<void> {
        console.log(data);
        for await (const key of Object.keys(SETTINGS)) {
            game.settings.set('pf2e', key, data[key]);
        }
    }
}
