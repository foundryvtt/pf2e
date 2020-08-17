/* global getProperty, ui, CONST, ChatMessage, TokenHUD, BasePlaceableHUD */
import { PF2eConditionManager } from "../../module/conditions";
import { ConditionData } from '../../module/item/dataDefinitions'

declare let PF2e: any;

/**
 * Class PF2eStatus which defines the data structure of a status effects
 * Gets populated into Actor.data.data.statusEffects[]
 */
export class PF2eStatus {
    status: string;
    active: boolean;
    type: string;
    value: number;
    source: string;

    constructor(statusName, source, value=1, active=true) {
        this.status = statusName;
        this.active = active;
        this.source = source;
        if (getProperty(PF2e.DB.condition, this.status) !== undefined) {
            this.type = 'condition';
        } else if (getProperty(PF2e.DB.status, this.status) !== undefined) {
            this.type = 'status';
        }
        if (this.type !== undefined && getProperty(PF2e.DB[this.type][this.status], 'hasValue') !== undefined) {
            this.value = value;
        }
    }

    get db() {
        if (this.type === undefined)
            return undefined;
        return getProperty(PF2e.DB[this.type], this.status);
    }
}

/**
 * Class PF2eStatusEffects, which is the module to handle the status effects
 */
export class PF2eStatusEffects {

    statusEffectChanged: any;
    static statusEffectChanged: boolean;

    static init() {
        if(CONFIG.PF2E.PF2eStatusEffects.overruledByModule) return;
        
        console.log('PF2e System | Initializing Status Effects Module');
        this.hookIntoFoundry();
        try {
            if ( game.modules.get("combat-utility-belt") !== undefined
                    && game.modules.get("combat-utility-belt").active
                    && game.settings.get('combat-utility-belt', 'enableEnhancedConditions')
                )
                ui.notifications.info(`<strong>PF2e System & Combat Utility Belt</strong><div>You have the CUB module enabled. This may
                cause unexpected side effects with the PF2e system at the moment, but this is expected to improve in future releases. If
                you are experiencing problems with status effects, we recommend you disable CUB's Enhanced Conditions on the Module
                settings.</div>`, {permanent: true});
        } catch {
            ui.notifications.error("The Combat Utility Belt installation check failed. This may cause unexptected side effects with the PF2e system conditions.", {permanent: true});
        }

        const statusEffectType = game.settings.get('pf2e', 'statusEffectType');
        CONFIG.PF2eStatusEffects.lastIconType = statusEffectType;
        CONFIG.PF2eStatusEffects.effectsIconFolder = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFolder;
        CONFIG.PF2eStatusEffects.effectsIconFileType = PF2eStatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFileType;
        CONFIG.PF2eStatusEffects.foundryStatusEffects = CONFIG.statusEffects;
        CONFIG.PF2eStatusEffects.keepFoundryStatusEffects = game.settings.get('pf2e', 'statusEffectKeepFoundry');
        /** Update FoundryVTT's CONFIG.statusEffects */
        this._updateStatusIcons();
    }

    static get SETTINGOPTIONS() {
        // switching to other icons need to migrate all tokens
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
        /** Register PF2e System setting into FoundryVTT */
        const statusEffectTypeChoices = {}
        for (const type of Object.keys(PF2eStatusEffects.SETTINGOPTIONS.iconTypes)) {
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

        if (game.user.isGM) {
            game.settings.register('pf2e', 'statusEffectShowCombatMessage', {
              name: PF2e.DB.SETTINGS.statusEffectShowCombatMessage.name,
              hint: PF2e.DB.SETTINGS.statusEffectShowCombatMessage.hint,
              scope: 'client',
              config: true,
              default: true,
              type: Boolean,
              onChange: () => {
                  window.location.reload(false);
              }
            });
        }
        /** Create hooks onto FoundryVTT */
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



        Hooks.on("updateToken", (scene, tokenData) => {
            // For unlinked token updates.
            const token = canvas.tokens.get(tokenData._id);

            if (token.owner) {
                token.setFlag('pf2e', 'forceHudUpdate', false);

                PF2eStatusEffects._updateHUD(canvas.tokens.hud.element, token);
            }
        });

        if ( game.user.isGM && game.settings.get('pf2e', 'statusEffectShowCombatMessage')) {
            let lastTokenId = "";
            Hooks.on("updateCombat", (combat) => {
                const combatant = combat?.combatant;
                const tokenId = combatant?.tokenId;
                if (tokenId !== lastTokenId && combat?.started && combatant?.hasRolled && !combatant?.defeated) {
                    const token = canvas.tokens.get(tokenId);
                    lastTokenId = tokenId;
                    this._createChatMessage(token, combatant.hidden);
                }
                if (!combat?.started && lastTokenId !== "") lastTokenId = "";
            });
        }

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
        const effects = html.find(".status-effects");
        effects.on("click", ".pf2e-effect-control", this._setStatusValue.bind(token))
               .on("contextmenu", ".pf2e-effect-control", this._setStatusValue.bind(token))
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
        const sortableConditions = [];
        let statusEffects = [];
        const socialEffects = [];
        let imgUrl = '';
        for (const condition of Object.keys(PF2e.DB.condition)) {
            sortableConditions.push(condition);
        }
        sortableConditions.sort();
        for (const condition of sortableConditions) {
            if (condition.charAt(0) !== '_' && PF2e.DB.condition._groups.death.find(element => element === condition) === undefined) {
                imgUrl = `${CONFIG.PF2eStatusEffects.effectsIconFolder + condition }.${ CONFIG.PF2eStatusEffects.effectsIconFileType}`;
                if (PF2e.DB.condition._groups.attitudes.find(element => element === condition) !== undefined) {
                    socialEffects.push( imgUrl );
                } else {
                    statusEffects.push( imgUrl );
                }
            }
        }
        socialEffects.sort((a, b) => {
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

    static async _hookOnRenderTokenHUD(app, html, tokenData) {
        const token = canvas.tokens.get(tokenData._id);
        const statusIcons = html.find("img.effect-control");

        const affectingConditions = token.actor.data.items.filter(i => i.type === 'condition' && i.data.sources.hud)

        html.find("div.status-effects").append('<div class="status-effect-summary"></div>');
        this.setPF2eStatusEffectControls(html, token);

        // Foundry 0.5.7 bug? Setting tokenHUD.token temporarily until onTokenHUDClear passes token again in its 2nd parameter
        app.token = token;

        for (let i of statusIcons) {
            i = $(i);
            const src = i.attr('src');

            if(src.includes(CONFIG.PF2eStatusEffects.effectsIconFolder)) {
                const statusName = this._getStatusFromImg(src);
                const condition = PF2eConditionManager.getConditionByStatusName(statusName);
                
                i.attr("data-effect", statusName);
                i.attr("data-condition", condition.name);

                const effect = affectingConditions.find(e => e.data.hud.statusName === statusName);

                if(condition.data.value.isValued) {
                    i.removeClass('effect-control').addClass('pf2e-effect-control');
                    // retrieve actor and the current effect value
                    
                    i.wrap("<div class='pf2e-effect-img-container'></div>");
                    const v = $("<div class='pf2e-effect-value' style='display:none'>0</div>");
                    i.parent().append(v);
                    
                    if (effect !== undefined) {
                        i.attr("data-value", effect.data.value.value);
                        
                        if (effect.data.value.value > 0) {
                            $(v)
                            .removeAttr('style')
                            .text(effect.data.value.value);
                        }
                    }
                }

                if (i.hasClass('active') && effect === undefined) {
                    i.removeClass('active');
                } else if (!i.hasClass('active') && effect !== undefined) {
                    i.addClass('active');
                }
            }
        }
    }

    static async _updateHUD(html, token) {
        const statusIcons = html.find("img.effect-control, img.pf2e-effect-control");
        const appliedConditions = token.actor.data.items.filter(i => i.type === 'condition' && i.data.sources.hud)

        for (let i of statusIcons) {
            i = $(i);
            const status = i.attr('data-effect');
            const conditionName = i.attr('data-condition');

            if(conditionName) {
                // Icon is a condition

                const condition:ConditionData = appliedConditions.find(e => e.name === conditionName);
                const conditionBase = PF2eConditionManager.getConditionByStatusName(status);

                if(conditionBase?.data.value.isValued) {
                    // Valued condition

                    const v = $(i).siblings('div.pf2e-effect-value').first();

                    if ($(i).hasClass('active')) {
                        // icon is active.
                        if (condition === undefined ||
                            (condition !== undefined && !condition.data.active) ||
                            (condition !== undefined && condition.data.value.value < 1)) {

                                i.removeClass('active');
                                v.attr('style', 'display:none')
                                    .text('0');

                        } else if (condition !== undefined && condition.data.value.value > 0) {
                            // Update the value

                            v.text(condition.data.value.value);
                        }
                    } else if (condition !== undefined && (
                        condition.data.active && condition.data.value.value > 0)) {

                        i.addClass('active');
                        v.removeAttr('style')
                            .text(condition.data.value.value);
                    }
                } else if (i.hasClass('active')) {
                    // Toggle condition

                    // icon is active.
                    if (condition === undefined ||
                        (condition !== undefined && !condition.data.active)) {
                        // Remove active if no effect was found
                        // Or effect was found, but not active.

                        i.removeClass('active');
                    }
                } else if (condition !== undefined && (
                    condition.data.active)) {

                    i.addClass('active');
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
        const token = canvas.tokens.get(tokenData._id) as Token;

        if (token.owner) {
            PF2eConditionManager.renderEffects(canvas.tokens.get(tokenData._id));
        }
    }

    /**
     * Updating all tokens on the canvas with the actors status effects.
     */
    static _hookOnCanvasReady(canvas) {
        const scene = canvas.scene;      
        
        for (const tokenData of scene.data.tokens) {
            const token = canvas.tokens.get(tokenData._id);

            if (token.owner) {
                PF2eConditionManager.renderEffects(canvas.tokens.get(tokenData._id));
            }
        }
    }


    /**
     * A click event handler to increment or decrement valued conditions.
     *
     * @param event    The window click event
     */
    static async _setStatusValue(event) {
        event.preventDefault();
        const token : any = this;
        
        if (event.shiftKey) {
            PF2eStatusEffects._onToggleOverlay(event, token);
            return;
        }

        const f = $(event.currentTarget);
        const status = f.attr('data-condition');

        const condition:ConditionData = token.actor.data.items.find((i:ConditionData) => i.type === 'condition' && i.name === status && i.data.sources.hud && i.data.sources.values.length < 1) as ConditionData;        

        if (event.type === 'contextmenu') {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.

                const conditionIds = [];
                
                token.statusEffectChanged = true;

                token.actor.data.items.filter((i:ConditionData) => i.type === 'condition' && i.data.base === status).forEach((i:ConditionData) => conditionIds.push(i._id));

                await PF2eConditionManager.removeConditionFromToken(conditionIds, token);
            } else if (condition) {
                token.statusEffectChanged = true;
                await PF2eConditionManager.updateConditionValue(condition._id, token, condition.data.value.value - 1);
                if (token.data.actorLink) {
                    PF2eStatusEffects._updateHUD(f.parent().parent(), token); 
                }
            }
        } else if (event.type === 'click') {
            token.statusEffectChanged = true;
            if (condition) {
                await PF2eConditionManager.updateConditionValue(condition._id, token, condition.data.value.value + 1);

                if (token.data.actorLink) {
                    PF2eStatusEffects._updateHUD(f.parent().parent(), token); 
                }
            } else {
                const newCondition = PF2eConditionManager.getCondition(status);
                newCondition.data.sources.hud = true;

                await PF2eConditionManager._addConditionEntity(newCondition, token);
            }
        }
    }

    

    static async _toggleStatus(event) {
        event.preventDefault();
        const token = this as any;
        if (event.shiftKey){
            PF2eStatusEffects._onToggleOverlay(event, token);
            return;
        }

        const f = $(event.currentTarget);
        const status = f.attr('data-condition');

        const condition:ConditionData = token.actor.data.items.find((i:ConditionData) => i.type === 'condition' && i.name === status && i.data.sources.hud && i.data.sources.values.length < 1) as ConditionData;

        const conditionIds = [];
        if (event.type === 'contextmenu') {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.
                token.actor.data.items.filter((i:ConditionData) => i.type === 'condition' && i.data.base === status).forEach((i:ConditionData) => conditionIds.push(i._id));

            } else if (condition) {
                conditionIds.push(condition._id);
            }

            if (conditionIds.length > 0) {
                token.statusEffectChanged = true;
                await PF2eConditionManager.removeConditionFromToken(conditionIds, token);
            }
            
        } else if (event.type === 'click') {
            if (!condition) {
                const newCondition = PF2eConditionManager.getCondition(status);
                newCondition.data.sources.hud = true;
                token.statusEffectChanged = true;
                
                await PF2eConditionManager._addConditionEntity(newCondition, token);
            }
        }
    }

    /**
     * Recreating TokenHUD._onToggleOverlay. Handle assigning a status effect icon as the overlay effect
     */
    static _onToggleOverlay(event, token) {
        event.preventDefault();
        const f = $(event.currentTarget);
        token.toggleOverlay(f.attr("src"));
        f.siblings().removeClass("overlay");
        f.toggleClass("overlay");
    }

    /**
     * Creates a ChatMessage with the Actors current status effects.
     */
    static _createChatMessage(token, whisper = false) {
        let statusEffectList = ''
        let bubbleContent = ''

        // Get the active applied conditions.
        // Iterate the list to create the chat and bubble chat dialog.

        for (const condition of PF2eConditionManager.getAppliedConditions(token.actor.data.items.filter((i:ConditionData) => i.data.active && i.type === 'condition'))) {
            statusEffectList += `
                <li><img src="${`${CONFIG.PF2eStatusEffects.effectsIconFolder + condition.data.hud.statusName }.${ CONFIG.PF2eStatusEffects.effectsIconFileType}`}" title="${PF2e.DB.condition[condition.data.hud.statusName].summary}">
                    <span class="statuseffect-li">
                        <span class="statuseffect-li-text">${condition.name} ${(condition.data.value.isValued) ? condition.data.value.value : ''}</span>
                        <div class="statuseffect-rules"><h2>${condition.name}</h2>${condition.data.description.value}</div>
                    </span>
                </li>`;
            bubbleContent = `${bubbleContent + PF2e.DB.condition[condition.data.hud.statusName].summary  }.<br>`;
        }

        if (statusEffectList === '') {
            // No updates
            return;
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

        const chatData: any = {
            user: game.user._id,
            speaker: { alias: `${token.name}'s status effects:` },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        }
        if (whisper) chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        ChatMessage.create(chatData);

        if (!token.data.hidden) {
            bubbleContent = PF2eStatusEffects._changeYouToI(bubbleContent);
            canvas.hud.bubbles.say(token, bubbleContent, {
                emote: true
            });
        }
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

        const promises = []
        for (const scene of game.scenes.values()) {
            const tokenUpdates = [];

            for (const tokenData of scene.data.tokens) {
                const update = duplicate(tokenData);
                for (const url of tokenData.effects) {
                    if(url.includes(lastIconType.effectsIconFolder)) {
                        const statusName = this._getStatusFromImg(url);
                        const newUrl = `${iconType.effectsIconFolder + statusName }.${ iconType.effectsIconFileType}`;
                        console.log(`PF2e System | Migrating effect ${statusName} of Token ${tokenData.name} on scene ${
                                    scene.data.name} | '${url}' to '${newUrl}'`);
                        const index = update.effects.indexOf(url);
                        if (index > -1) {
                            update.effects.splice(index, 1, newUrl);
                        }
                    }
                }
                tokenUpdates.push(update);
            }
            promises.push(scene.updateEmbeddedEntity("Token", tokenUpdates));
        }
        await Promise.all(promises);

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
        return url.substring(url.lastIndexOf('/')+1, (url.length - CONFIG.PF2eStatusEffects.effectsIconFileType.length-1) );
    }


    /**
     * Add status effects to a token
     * Legacy function
     */
    static async setStatus(token, effects = []) {
        for (const status of Object.values(effects)) {
            const statusName = status.name;
            const value = status.value;
            const source = (status.source) ? status.source : "PF2eStatusEffects.setStatus";

            const condition = PF2eConditionManager.getConditionByStatusName(statusName);

            if (!condition) {
                console.log(`PF2e System | '${statusName}' is not a vaild condition!`);
                continue;
            }

            const effect = token.actor.data.items.find((i:ConditionData) => i.data.source.value === source && i.type === "condition" && i.data.hud.statusName === statusName) as ConditionData;

            if (typeof(value) === "string" && condition.data.value.isValued) {
                if (effect) {
                    // Has value with type string
                    let newValue = 0;

                    if (value.startsWith("+") || value.startsWith("-")) {
                        // Increment/decrement value
                        newValue = Number(effect.data.value.value) + Number(value);
                    } else {
                        // Set value
                        newValue = Number(value);
                    }

                    if (Number.isNaN(newValue)) {
                        console.log(`PF2e System | '${value}' is not a number!`);
                        continue;
                    } 

                    await PF2eConditionManager.updateConditionValue(effect._id, token, newValue);  // eslint-disable-line no-await-in-loop
                } else if (Number(value) > 0) {
                    // No effect, but value is a number and is greater than 0.
                    // Add a new condition with the value.

                    condition.data.source.value = source;
                    condition.data.value.value = Number(value);
                    await PF2eConditionManager._addConditionEntity(condition, token);  // eslint-disable-line no-await-in-loop
                }
            } else if (!value) {
                // Value was not provided.

                if (condition.data.value.isValued) {
                    console.log(`PF2e System | '${statusName}' must have a value.`);
                    continue;
                }

                if (effect !== undefined && status.toggle){
                    // Condition exists and toggle was true
                    // Remove it.
                    await PF2eConditionManager.removeConditionFromToken([effect._id], token);  // eslint-disable-line no-await-in-loop
                } else if (effect === undefined) {
                    // Effect does not exist.  Create it.

                    // Set the source to this function.
                    condition.data.source.value = source;
                    await PF2eConditionManager._addConditionEntity(condition, token);  // eslint-disable-line no-await-in-loop
                }
            }
        }
        this._createChatMessage(token);
    }
}

/**
* Setting a hook on TokenHUD.clear(), which clears the HUD by fading out it's active HTML and recording the new display state.
* The hook call passes the TokenHUD and Token objects.
*/
TokenHUD.prototype.clear = function clear() {
    BasePlaceableHUD.prototype.clear.call(this);
    Hooks.call("onTokenHUDClear", this, this.object);
}

Hooks.once("ready", () => { // or init?
    PF2eStatusEffects.init();
});