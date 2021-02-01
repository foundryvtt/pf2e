/**
 * Extend the base PlayerConfig class to implement additional logic specialized for PF2e.
 */

// For users: game.user.update({flags: {PF2e:{ settings: {key:value} } } })
// For modules: await game.settings.set(MODULE_NAME, key, value);

/**
 * @category Other
 */
export class PlayerConfigPF2e extends FormApplication {
    settings: any;

    static highlightDataUri: boolean = false;

    constructor() {
        super({});
        this.settings = getProperty(game.user.data.flags, 'PF2e.settings');
    }

    static get DEFAULTS() {
        return {
            color: 'blue',
            quickD20roll: true,
        };
    }

    static init() {
        console.log('PF2e System | Initializing Player Config');
        let settings = getProperty(game.user.data.flags, 'PF2e.settings');
        let newDefaults = false;

        // Always set DEFAULT SETTINGS to the flags if they don't exist. This will prevent the need to always validate if these settings have been set.
        if (settings === undefined) {
            console.log('PF2e System | New player without saved PF2e Player Settings | Setting defaults');
            settings = PlayerConfigPF2e.DEFAULTS;
            game.user.update({ flags: { PF2e: { settings } } });
        } else {
            for (const defaultSetting in PlayerConfigPF2e.DEFAULTS) {
                if (settings[defaultSetting] === undefined) {
                    settings[defaultSetting] = PlayerConfigPF2e.DEFAULTS[defaultSetting];
                    newDefaults = true;
                }
            }
            if (newDefaults) {
                console.log('PF2e System | Saving new default settings to the PF2e Player Settings');
                game.user.update({ flags: { PF2e: { settings } } });
            }
        }
    }

    static activateColorScheme() {
        console.log('PF2e System | Activating Player Configured color scheme');
        let color = getProperty(game.user.data.flags, 'PF2e.settings.color');
        if (color === undefined) color = PlayerConfigPF2e.DEFAULTS.color;

        const cssLink = `<link id="pf2e-color-scheme" href="systems/pf2e/styles/user/color-scheme-${color}.css" rel="stylesheet" type="text/css">`;
        $('head').append(cssLink);
    }

    static hookOnRenderSettings() {
        Hooks.on('renderSettings', (app, html) => {
            console.log('PF2e System | Player Config hooked on settings tab');
            PlayerConfigPF2e._createSidebarButton(html);
        });
    }

    /**
     * Creates a div for the module and button for the Player Configuration
     * @param {Object} html the html element where the button will be created
     */
    static _createSidebarButton(html) {
        console.log('PF2e System | Player Config creation sidebar button');
        const configButton = $(
            `<button id="pf2e-player-config" data-action="pf2e-player-config">
                <i class="fas fa-cogs"></i> ${PlayerConfigPF2e.defaultOptions.title}
            </button>`,
        );

        // 0.6.6 Refactored the sidebar. Try to find the button for either location
        const setupButton = html.find('.game-system, #settings-game').first();
        setupButton.prepend(configButton);

        configButton.click((ev) => {
            new PlayerConfigPF2e().render(true);
        });
    }

    static get defaultOptions() {
        console.log('PF2e System | Player Config retrieving default options');
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-player-config-panel',
            title: 'PF2e Player Settings',
            template: 'systems/pf2e/templates/user/player-config.html',
            classes: ['sheet'],
            width: 500,
            height: 'auto',
            resizable: true,
        });
    }

    /**
     * Take the new settings and write it back to game.user, overwriting existing
     * @param {Object} event
     * @param {Object} formdata
     */
    async _updateObject(event, formdata) {
        console.log('PF2e System | Player Config updating settings');
        PlayerConfigPF2e.highlightDataUri = formdata.highlightDataUri ?? false;
        this.addRemoveHighlight(PlayerConfigPF2e.highlightDataUri);
        game.user.update({ flags: { PF2e: { settings: formdata } } });
        (<HTMLLinkElement>(
            document.getElementById('pf2e-color-scheme')
        )).href = `systems/pf2e/styles/user/color-scheme-${formdata.color}.css`;
    }

    addRemoveHighlight(add: boolean) {
        if (add) {
            if (!$('style.pf2e-data-highlight').length) {
                $('<style></style>', { class: 'pf2e-data-highlight' })
                    .text('[src^="data:"], [style*="data:"] { border: 3px solid red !important; }')
                    .appendTo('head');
            }
        } else {
            $('style.pf2e-data-highlight').remove();
        }
    }

    activateListeners(html) {
        console.log('PF2e System | Player Config activating listeners');
        super.activateListeners(html);

        // not currently needed
    }

    getData() {
        console.log('PF2e System | Player Config getting data');
        this.settings = getProperty(game.user.data.flags, 'PF2e.settings');
        return mergeObject(this.settings, {
            highlightDataUri: PlayerConfigPF2e.highlightDataUri,
        });
    }
}
