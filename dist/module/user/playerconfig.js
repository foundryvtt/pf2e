/**
 * Extend the base PlayerConfig class to implement additional logic specialized for PF2e.
 */

// For users: game.user.update({flags: {PF2e:{ settings: {key:value} } } })
// For modules: await game.settings.set(MODULE_NAME, key, value);

export class PlayerConfigPF2e extends FormApplication {
    constructor() {
        super();
        // DEFAULT SETTINGS
        this.settings = PlayerConfigPF2e.DEFAULTS;
    }

    static get DEFAULTS() {
        return {
            color: 'blue',
            quickD20roll: true
        };
    }

    static init() {
        console.log('PF2e System | Initializing Player Config');
        PlayerConfigPF2e.hookOnRenderSettings();
    }

    static activateColorScheme() {
        console.log('PF2e System | Activating Player Configured color scheme');
        let color = getProperty(game.user.data.flags, 'PF2e.settings.color');
        if (color == undefined) color = PlayerConfigPF2e.DEFAULTS.color;

        const cssLink = `<link id="pf2e-color-scheme" href="systems/pf2e/module/user/color-scheme-${color}.css" rel="stylesheet" type="text/css">`;
        $('head').append(cssLink);
    }

    static hookOnRenderSettings() {
        Hooks.on("renderSettings", (app, html) => {
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
            </button>`
        );

        const setupButton = html.find("div[class='game-system']");
        setupButton.after(configButton);

        configButton.click(ev => {
            new PlayerConfigPF2e().render(true);
        });
    }
    
    static get defaultOptions() {
        console.log('PF2e System | Player Config retrieving default options');
        return mergeObject(super.defaultOptions, {
            id: "pf2e-player-config-panel",
            title: "PF2e Player Settings",
            template: "systems/pf2e/templates/user/player-config.html",
            classes: ["sheet"],
            width: 500,
            height: "auto",
            resizable: true
        });
    }

    /**
     * Take the new settings and write it back to game.user, overwriting existing
     * @param {Object} event 
     * @param {Object} formdata 
     */
    _updateObject(event, formdata) {
        console.log('PF2e System | Player Config updating settings');
        game.user.update({flags: { PF2e:{ settings:formdata } } })
        document.querySelector("link[id='pf2e-color-scheme']").href = `systems/pf2e/module/user/color-scheme-${formdata.color}.css`;
    }

    activateListeners(html) {
        console.log('PF2e System | Player Config activating listeners');
        super.activateListeners(html);
        
        //not currently needed
    }

    getData() {
        console.log('PF2e System | Player Config getting data');
        this.settings = getProperty(game.user.data.flags, 'PF2e.settings');
        if (this.settings == undefined) this.settings = PlayerConfigPF2e.DEFAULTS;

        return this.settings;
    }

}
