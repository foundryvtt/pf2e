/**
 * Class PF2eStatus which defines the data structure of a status effects
 * Gets populated into Actor.data.data.statusEffects[]
 */
class PF2eStatus {
    constructor(statusName, value=1, active=true) {
        this.status = statusName;
        this.active = active;
        this.type = (getProperty(PF2e.DB.condition, this.status) !== undefined)?'condition':((getProperty(PF2e.DB.status, this.status) !== undefined)?'status':undefined)
        if (this.type !== undefined && getProperty(PF2e.DB[this.type][this.status], 'hasValue') !== undefined) {
            this.value = value;
        }
    }
    get db() {
        if (this.type === undefined)
            return undefined;
        else
            return getProperty(PF2e.DB[this.type], this.status);
    }
}

/**
 * Class PF2eStatusEffects, which is the module to handle the status effects
 */
class PF2eStatusEffects {

    static init() {
        if(CONFIG.PF2E.PF2eStatusEffects.overruledByModule) return;
        
        console.log('PF2e System | Initializing Status Effects Module');
        this.hookIntoFoundry();

        if ( game.modules.get("combat-utility-belt") !== undefined 
             && game.modules.get("combat-utility-belt").active
             && game.settings.get('combat-utility-belt', 'enhanced-conditions(undefined)')
            )
            ui.notifications.info(`<strong>PF2e System & Combat Utility Belt</strong><div>You have the CUB module enabled. This may 
            cause unexpected side effects with the PF2e system at the moment, but this is expected to improve in future releases. If 
            you are experiencing problems with status effects, we recommend you disable CUB's Enhanced Conditions on the Module 
            settings.</div>`, {permanent: true});

        const statusEffectType = game.settings.get('pf2e', 'statusEffectType');
        CONFIG.PF2eStatusEffects.lastIconType = statusEffectType;
        CONFIG.PF2eStatusEffects.effectsIconFolder = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFolder;
        CONFIG.PF2eStatusEffects.effectsIconFileType = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFileType;
        CONFIG.PF2eStatusEffects.foundryStatusEffects = CONFIG.statusEffects;
        CONFIG.PF2eStatusEffects.keepFoundryStatusEffects = game.settings.get('pf2e', 'statusEffectKeepFoundry');
        /** Update FoundryVTT's CONFIG.statusEffects **/
        this._updateStatusIcons();
    }

    static get SETTINGOPTIONS() {
        //switching to other icons need to migrate all tokens
        return {
            iconTypes: {
                default: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions/',
                    effectsIconFileType: 'png'
                },
                blackWhite: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions-2/',
                    effectsIconFileType: 'png'
                },
                legacy: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions-3/',
                    effectsIconFileType: 'png'
                }
            }
        };
    }

    /**
     * Hook PF2e's status effects into FoundryVTT
     */
    static hookIntoFoundry() {
        /** Register PF2e System setting into FoundryVTT **/
        const statusEffectTypeChoices = {}
        for (let type in PF2eStatusEffects.SETTINGOPTIONS.iconTypes) {
          statusEffectTypeChoices[type] = PF2e.DB.SETTINGS.statusEffectType[type];
        }
        game.settings.register('pf2e', 'statusEffectType', {
          name: PF2e.DB.SETTINGS.statusEffectType.name,
          hint: PF2e.DB.SETTINGS.statusEffectType.hint,
          scope: 'world',
          config: true,
          default: 'blackWhite',
          type: String,
          choices: statusEffectTypeChoices,
          onChange: s => {
            PF2eStatusEffects._migrateStatusEffectUrls(s);
          }
        });
        game.settings.register('pf2e', 'statusEffectKeepFoundry', {
          name: PF2e.DB.SETTINGS.statusEffectKeepFoundry.name,
          hint: PF2e.DB.SETTINGS.statusEffectKeepFoundry.hint,
          scope: 'world',
          config: true,
          default: false,
          type: Boolean,
          onChange: () => {
            window.location.reload(false);
          }
        });

        /** Create hooks onto FoundryVTT **/
        Hooks.on("renderTokenHUD", (app, html, data) => {
            console.log('PF2e System | Rendering PF2e customized status effects');
            PF2eStatusEffects._hookOnRenderTokenHUD(app, html, data);
        });
        Hooks.on("onTokenHUDClear", (tokenHUD, token) => {
            // Foundry 0.5.7 bug? token parameter is null
            // Workaround: set tokenHUD.token in _hookOnRenderTokenHUD
            token = tokenHUD.token;

            if (tokenHUD._state === tokenHUD?.constructor?.RENDER_STATES?.NONE) {
                // Closing the token HUD
                if (token?.statusEffectChanged === true) {
                    console.log('PF2e System | StatusEffects were updated - Message to chat');
                    token.statusEffectChanged = false;
                    PF2eStatusEffects._createChatMessage(token);
                }
            }
        });

        Hooks.on("createToken", (scene, token, options, someId) => {
            console.log('PF2e System | Updating the new token with the actors status effects');
            PF2eStatusEffects._hookOnCreateToken(scene, token);

        });
        Hooks.on("canvasReady", (canvas) => {
            console.log('PF2e System | Updating the scenes token with the actors status effects');
            PF2eStatusEffects._hookOnCanvasReady(canvas);
        });
    }

    static setPF2eStatusEffectControls(html, token) {
        // Status Effects Controls
        let effects = html.find(".status-effects");
        effects.on("click", ".pf2e-effect-control", this._increaseStatus.bind(token))
               .on("contextmenu", ".pf2e-effect-control", this._decreaseStatus.bind(token))
               .on("mouseover mouseout", ".pf2e-effect-control", this._showStatusDescr);

        effects.off("click", ".effect-control")
               .on("click", ".effect-control", this._toggleStatus.bind(token));
        effects.off("contextmenu", ".effect-control")
               .on("contextmenu", ".effect-control", this._toggleStatus.bind(token))
               .on("mouseover mouseout", ".effect-control", this._showStatusDescr);
       
    }

    /**
     * Updates the core CONFIG.statusEffects with the new icons
     */
    static _updateStatusIcons() {
        var sortableConditions = [];
        let statusEffects = [];
        let socialEffects = [];
        let imgUrl = '';
        for (const condition in PF2e.DB.condition) {
            sortableConditions.push(condition);
        }
        sortableConditions.sort();
        for (const condition of sortableConditions) {
            if (condition.charAt(0) !== '_' && PF2e.DB.condition._groups.death.find(element => element == condition) === undefined) {
                imgUrl = CONFIG.PF2eStatusEffects.effectsIconFolder + condition +'.'+ CONFIG.PF2eStatusEffects.effectsIconFileType;
                if (PF2e.DB.condition._groups.attitudes.find(element => element == condition) !== undefined) {
                    socialEffects.push( imgUrl );
                } else {
                    statusEffects.push( imgUrl );
                }
            }
        }
        socialEffects.sort(function(a, b){
            a = PF2eStatusEffects._getStatusFromImg(a);
            b = PF2eStatusEffects._getStatusFromImg(b);
            return PF2e.DB.condition._groups.attitudes.indexOf(a) - PF2e.DB.condition._groups.attitudes.indexOf(b);
          });
        statusEffects = statusEffects.concat(socialEffects);
        if (CONFIG.PF2eStatusEffects.keepFoundryStatusEffects) {
            CONFIG.statusEffects = statusEffects.concat(CONFIG.PF2eStatusEffects.foundryStatusEffects);
        } else {
            CONFIG.statusEffects = statusEffects;
        }

    }

    /**
     * Adds a title/tooltip with the matched Condition name
     */
    static _hookOnRenderTokenHUD(app, html, tokenData) {
        const token = canvas.tokens.get(tokenData._id);
        const actor = getProperty(token, "actor");
        const statusIcons = html.find("img.effect-control");
        const statusEffects = getProperty(actor.data.data, 'statusEffects');
        html.find("div.status-effects").append('<div class="status-effect-summary"></div>');
        this.setPF2eStatusEffectControls(html, token);

        // Foundry 0.5.7 bug? Setting tokenHUD.token temporarily until onTokenHUDClear passes token again in its 2nd parameter
        app.token = token;

        for (let i of statusIcons) {
            i = $(i);
            const src = i.attr('src');
            if(src.includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
                const statusName = this._getStatusFromImg(src);
                i.attr("data-effect", statusName);
                i.attr("title", PF2e.DB.condition[statusName].name);
                if(PF2e.DB.condition[statusName].hasValue) {
                    i.removeClass('effect-control').addClass('pf2e-effect-control');
                    //retrieve actor and the current effect value
                    let effect = undefined;
                    if (statusEffects !== undefined) {
                        effect = statusEffects.find( ({ status }) => status === statusName ); //returns undefined if not in here
                    }
                    if (effect !== undefined && getProperty(effect, 'value')) {
                        i.attr("data-value", effect.value);
                        i.wrap("<div class='pf2e-effect-img-container'></div>");
                        i.parent().append("<div class='pf2e-effect-value'>"+ effect.value +"</div>");
                    }
                }
            }
        }
    }

    /**
     * Show the Status Effect name and summary on mouseover of the token HUD
     */
    static _showStatusDescr(event) {
        const f = $(event.currentTarget);
        const statusDescr = $("div.status-effect-summary")
        if (f.attr("src").includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
            const statusName = PF2eStatusEffects._getStatusFromImg(f.attr("src"));
            statusDescr.text( PF2e.DB.condition[statusName].name ).toggleClass("active");
        }
    }

    /**
     * Adding the Actors statuseffects to the newly created token.
     */
    static _hookOnCreateToken(scene, tokenData) {
            const update = PF2eStatusEffects._updateTokenDataWithActorEffects(tokenData);
            scene.updateEmbeddedEntity("Token", update);
    }

    /**
     * Updating all tokens on the canvas with the actors status effects.
     */
    static _hookOnCanvasReady(canvas) {
        const scene = canvas.scene;      
        const tokenUpdates = [];
        for (let tokenData of scene.data.tokens) {
            // Only do this for tokens that are linked to their Actors
            if (tokenData.actorLink) {
                // const token = (scene === scene._id) ? canvas.tokens.get(tokenData._id) : new Token(tokenData);
                const update = PF2eStatusEffects._updateTokenDataWithActorEffects(tokenData);
                tokenUpdates.push(update);
            }
        }
        scene.updateEmbeddedEntity("Token", tokenUpdates);
    }

    /**
     * Token update helper
     */
    static _updateTokenDataWithActorEffects(tokenData) {
        const actor = game.actors.get(tokenData.actorId);
        const statusEffects = actor.data.data.statusEffects;
        const update = duplicate(tokenData);
        if (statusEffects !== undefined) {
            update.effects = [];
            console.log('PF2e System | Updating the token '+tokenData.name+' with its actors status effects');
            for (let statusEffect of statusEffects) {
                if (statusEffect.type == 'condition') {
                    const url = CONFIG.PF2eStatusEffects.effectsIconFolder + statusEffect.status +'.'+ CONFIG.PF2eStatusEffects.effectsIconFileType;
                    update.effects.push(url);
                }
            }
        }
        return update;
    }

    /**
     * Increases the value of status effects that can have a value
     */
    static _increaseStatus(event) {
        event.preventDefault();
        if (event.shiftKey){ PF2eStatusEffects._onToggleOverlay(event, this); return; }
        const f = $(event.currentTarget);
        if (f.attr("src").includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
            const status = PF2eStatusEffects._getStatusFromImg(f.attr("src"));
            const actor = getProperty(this, "actor");
            let value = (f[0].hasAttribute("data-value")) ? Number(f.attr("data-value")) : 0;
            this.statusEffectChanged = true;

            value++;
            if ( !f.hasClass("active") ) {
                this.toggleEffect(f.attr("src"));
                f.toggleClass("active");
                f.wrap("<div class='pf2e-effect-img-container'></div>");
                f.parent().append("<div class='pf2e-effect-value'>"+ value +"</div>");
            }
            f.attr("data-value", value);
            f.next(".pf2e-effect-value").text(value);
            PF2eStatusEffects._updateActorStatus(actor, status, value);
        }        
    }

    /**
     * Decreases the value of status effects that can have a value
     */
    static _decreaseStatus(event) {
        event.preventDefault();
        if (event.shiftKey){ PF2eStatusEffects._onToggleOverlay(event, this); return; }
        const f = $(event.currentTarget);
        if (f.attr("src").includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
            const status = PF2eStatusEffects._getStatusFromImg(f.attr("src"));
            const actor = getProperty(this, "actor");
            let value = (f[0].hasAttribute("data-value")) ? Number(f.attr("data-value")) : 0;

            if (value>0) {
                value--;
                f.next(".pf2e-effect-value").text(value);
                f.attr("data-value", value);
                this.statusEffectChanged = true;
            } 
            if (f.hasClass("active") && value==0) {
                this.toggleEffect(f.attr("src"));
                f.toggleClass("active");
                f.next(".pf2e-effect-value").remove();
                f.unwrap(".pf2e-effect-img-container");
                this.statusEffectChanged = true;
            }
            PF2eStatusEffects._updateActorStatus(actor, status, value);
        }
    }

    /**
     * Toggles the status effect of a status that can't have a value
     */
    static _toggleStatus(event) {
        event.preventDefault();
        if (event.shiftKey){ PF2eStatusEffects._onToggleOverlay(event, this); return; }
        const f = $(event.currentTarget);
        const status = PF2eStatusEffects._getStatusFromImg(f.attr("src"));
        const actor = getProperty(this, "actor");

        if (f.hasClass("active") && event.type == 'contextmenu') {
            if (f.attr("src").includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
                console.log('PF2e System | Toggling and removing status effect from actor');
                PF2eStatusEffects._updateActorStatus(actor, status, 0);
                this.statusEffectChanged = true;
            }
            PF2eStatusEffects._onToggleEffect(event, this);
        } else if (!f.hasClass("active") && event.type == 'click') {
            if (f.attr("src").includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
                console.log('PF2e System | Toggling and adding status effect from actor');
                PF2eStatusEffects._updateActorStatus(actor, status, 1);
                this.statusEffectChanged = true;
            }
            PF2eStatusEffects._onToggleEffect(event, this);
        }
    }

    /**
     * Recreating TokenHUD._onToggleEffect. Handle toggling a token status effect icon
     */
    static _onToggleEffect(event, token) {
        event.preventDefault();
        if (event.shiftKey){ return; }
        let f = $(event.currentTarget);
        token.toggleEffect(f.attr("src"));
        f.toggleClass("active");
    }

    /**
     * Recreating TokenHUD._onToggleOverlay. Handle assigning a status effect icon as the overlay effect
     */
    static _onToggleOverlay(event, token) {
        event.preventDefault();
        let f = $(event.currentTarget);
        token.toggleOverlay(f.attr("src"));
        f.siblings().removeClass("overlay");
        f.toggleClass("overlay");
    }

    /**
     * Updates Actor with the new status
     */
    static async _updateActorStatus(actor, statusName, value=null) {
        let statusEffects = [];
        if (getProperty(actor.data.data, 'statusEffects') !== undefined) {
            statusEffects = duplicate(actor.data.data.statusEffects);
        }

        let effect = statusEffects.find( ({ status }) => status === statusName ); //returns undefined if not in here
        if (effect !== undefined && value == 0) {
            console.log('PF2e System | Removing status effect from actor');
            statusEffects.splice( statusEffects.findIndex( effect => effect.status == statusName ), 1 );
        } else if (effect !== undefined && getProperty(effect, 'status') == statusName && value > 0) {
            console.log('PF2e System | Updating status effect to new value');
            effect.value = value;
        } else if (value > 0) {
            console.log('PF2e System | Adding a new status effect to actor');
            statusEffects.push(new PF2eStatus(statusName, value));
        }
        await actor.update({[`data.statusEffects`]: statusEffects});
    }

    /**
     * Creates a ChatMessage with the Actors current status effects.
     */
    static _createChatMessage(token) {
        const actor = getProperty(token, "actor");
        const statusEffects = actor.data.data.statusEffects;
        if (statusEffects.length == 0) return;
        statusEffects.sort( (a, b) => a.status.localeCompare(b.status) )
        let statusEffectList = ''
        let bubbleContent = ''
        for (let status of statusEffects) {
            let statusInfo = PF2e.DB[status.type][status.status];
            let imageUrl = CONFIG.PF2eStatusEffects.effectsIconFolder + status.status +'.'+ CONFIG.PF2eStatusEffects.effectsIconFileType;
            let statusValue = (status.value !== undefined) ? status.value : '';
            let statusRules = `<div class="statuseffect-rules"><h2>${statusInfo.name}</h2>${statusInfo.rules}</div>`;
            statusEffectList = statusEffectList + `
                <li><img src="${imageUrl}" title="${statusInfo.summary}">
                    <span class="statuseffect-li"><span class="statuseffect-li-text">
                        ${statusInfo.name} ${statusValue}
                    </span>${statusRules}</span>
                </li>`;
            bubbleContent = bubbleContent + statusInfo.summary + ".<br>";
        }

        const message = `
            <div class="dice-roll">
            <div class="dice-result">
                <div class="dice-total statuseffect-message">
                    <ul>${statusEffectList}</ul>
                </div>
            </div>
            </div>
        `;
        ChatMessage.create({
            user: game.user._id,
            speaker: { alias: token.name+`'s status effects:` },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });

        bubbleContent = PF2eStatusEffects._changeYouToI(bubbleContent);
        const panToSpeaker = game.settings.get("core", "chatBubblesPan");
        canvas.hud.bubbles.say(token, bubbleContent, {
            emote: true
        });

    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG 
     * And migrate all statusEffect URLs of all Tokens
     */
    static async _migrateStatusEffectUrls(chosenSetting) {
        if(CONFIG.PF2E.PF2eStatusEffects.overruledByModule) {
            console.log('PF2e System | The PF2eStatusEffect icons are overruled by a module');
            ui.notifications.error("Changing this setting has no effect, as the icon types are overruled by a module.", {permanent: true});
            return;
        }
        console.log('PF2e System | Changing status effect icon types');
        const iconType = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[chosenSetting];
        const lastIconType = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[CONFIG.PF2eStatusEffects.lastIconType];

        for (let scene of game.scenes.values()) {
            const tokenUpdates = [];

            for (let tokenData of scene.data.tokens) {
                const update = duplicate(tokenData);
                for (let url of tokenData.effects) {
                    if(url.includes(lastIconType.effectsIconFolder)) {
                        const statusName = this._getStatusFromImg(url);
                        const newUrl = iconType.effectsIconFolder + statusName +'.'+ iconType.effectsIconFileType;
                        console.log("PF2e System | Migrating effect "+statusName+" of Token "+tokenData.name+" on scene "
                                    +scene.data.name+" | '"+url+"' to '"+newUrl+"'");
                        const index = update.effects.indexOf(url);
                        if (index > -1) {
                            update.effects.splice(index, 1, newUrl);
                        }
                    }
                }
                tokenUpdates.push(update);
            }
            await scene.updateEmbeddedEntity("Token", tokenUpdates);
        }

        CONFIG.PF2eStatusEffects.effectsIconFolder = iconType.effectsIconFolder;
        CONFIG.PF2eStatusEffects.effectsIconFileType = iconType.effectsIconFileType;
        CONFIG.PF2eStatusEffects.lastIconType = chosenSetting;
        PF2eStatusEffects._updateStatusIcons();
    }

    /**
     * Helper to change condition summary info from YOU to I
     */
    static _changeYouToI(content) {
        content = content.replace(/you’re/g,"I’m");
        content = content.replace(/You’re/g,"I’m");
        // content = content.replace(/’re/g,"’m");
        content = content.replace(/Your/g,"My");
        content = content.replace(/your/g,"my");
        content = content.replace(/You are/g,"I am");
        content = content.replace(/you are/g,"I am");
        content = content.replace(/You can’t/g,"I can’t");
        content = content.replace(/you can’t/g,"I can’t");
        content = content.replace(/You can/g,"I can");
        content = content.replace(/you can/g,"I can");
        content = content.replace(/You have/g,"I have");
        content = content.replace(/you have/g,"I have");
        content = content.replace(/You/g,"I");
        content = content.replace(/you/g,"me");
        return content;
    }

    /**
     * Helper to get status effect name from image url
     */
    static _getStatusFromImg(url) {
        return url.substring(url.lastIndexOf('/')+1, (url.length - CONFIG.PF2eStatusEffects.effectsIconFileType.length-1) )
    }

}

/**
* Setting a hook on TokenHUD.clear(), which clears the HUD by fading out it's active HTML and recording the new display state.
* The hook call passes the TokenHUD and Token objects.
*/
TokenHUD.prototype.clear = function() {
    BasePlaceableHUD.prototype.clear.call(this);
    Hooks.call("onTokenHUDClear", this, this.object);
}

Hooks.once("ready", function() { //or init?
    PF2eStatusEffects.init();
});