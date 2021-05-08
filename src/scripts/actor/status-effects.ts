import { ActorPF2e, TokenPF2e } from '@actor/base';
import { ConditionManager } from '@module/conditions';
import { ConditionData } from '@item/data/types';
import { LocalizePF2e } from '@system/localize';
import { StatusEffectIconType } from '@scripts/config';

/**
 * Class StatusEffects, which is the module to handle the status effects
 * @category PF2
 */
export class StatusEffects {
    statusEffectChanged: any;
    static statusEffectChanged: boolean;

    static init() {
        if (CONFIG.PF2E.statusEffects.overruledByModule) return;

        console.log('PF2e System | Initializing Status Effects Module');
        this.hookIntoFoundry();

        const statusEffectType = game.settings.get('pf2e', 'statusEffectType');
        CONFIG.PF2E.statusEffects.lastIconType = statusEffectType;
        CONFIG.PF2E.statusEffects.effectsIconFolder =
            StatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFolder;
        CONFIG.PF2E.statusEffects.effectsIconFileType =
            StatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFileType;
        CONFIG.PF2E.statusEffects.foundryStatusEffects = CONFIG.statusEffects;
        /** Update FoundryVTT's CONFIG.statusEffects */
        this._updateStatusIcons();
    }

    static get conditions() {
        return LocalizePF2e.translations.PF2E.condition;
    }

    static get SETTINGOPTIONS() {
        // switching to other icons need to migrate all tokens
        return {
            iconTypes: {
                default: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions/',
                    effectsIconFileType: 'webp',
                },
                blackWhite: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions-2/',
                    effectsIconFileType: 'webp',
                },
                legacy: {
                    effectsIconFolder: 'systems/pf2e/icons/conditions-3/',
                    effectsIconFileType: 'webp',
                },
            },
        };
    }

    /**
     * Hook PF2e's status effects into FoundryVTT
     */
    static hookIntoFoundry() {
        /** Create hooks onto FoundryVTT */
        Hooks.on('renderTokenHUD', (app, html, data) => {
            console.log('PF2e System | Rendering PF2e customized status effects');
            StatusEffects._hookOnRenderTokenHUD(app, html, data);
        });
        Hooks.on('onTokenHUDClear', (tokenHUD, token) => {
            // Foundry 0.5.7 bug? token parameter is null
            // Workaround: set tokenHUD.token in _hookOnRenderTokenHUD
            token = tokenHUD.token;

            if (tokenHUD._state === tokenHUD?.constructor?.RENDER_STATES?.NONE) {
                // Closing the token HUD
                if (token?.statusEffectChanged === true) {
                    console.log('PF2e System | StatusEffects were updated - Message to chat');
                    token.statusEffectChanged = false;
                    StatusEffects._createChatMessage(token);
                }
            }
        });

        if (game.user.isGM && game.settings.get('pf2e', 'statusEffectShowCombatMessage')) {
            let lastTokenId = '';
            Hooks.on('updateCombat', (combat) => {
                const combatant = combat?.combatant;
                const tokenId = combatant?.tokenId;
                if (
                    tokenId !== lastTokenId &&
                    combat?.started &&
                    combatant?.initiative != null &&
                    !combatant?.defeated
                ) {
                    const token = canvas.tokens.get(tokenId);
                    lastTokenId = tokenId;
                    this._createChatMessage(token, combatant.hidden);
                }
                if (!combat?.started && lastTokenId !== '') lastTokenId = '';
            });
        }
    }

    static setPF2eStatusEffectControls(html, token) {
        // Status Effects Controls
        const effects = html.find('.status-effects');
        effects
            .on('click', '.pf2e-effect-control', this._setStatusValue.bind(token))
            .on('contextmenu', '.pf2e-effect-control', this._setStatusValue.bind(token))
            .on('mouseover mouseout', '.pf2e-effect-control', this._showStatusDescr);

        effects.off('click', '.effect-control').on('click', '.effect-control', this._toggleStatus.bind(token));
        effects
            .off('contextmenu', '.effect-control')
            .on('contextmenu', '.effect-control', this._toggleStatus.bind(token))
            .on('mouseover mouseout', '.effect-control', this._showStatusDescr);
    }

    /**
     * Updates the core CONFIG.statusEffects with the new icons
     */
    static _updateStatusIcons() {
        const effects: string[] = [];
        const conditions = Array.from(ConditionManager.conditions.values()).filter(
            (c) => c.data.group !== 'detection' && c.data.group !== 'attitudes',
        );
        conditions
            .sort((a, b) => {
                return a.name.localeCompare(b.name);
            })
            .forEach((c) => {
                effects.push(
                    c.data.hud.img.useStatusName
                        ? `${CONFIG.PF2E.statusEffects.effectsIconFolder}${c.data.hud.statusName}.${CONFIG.PF2E.statusEffects.effectsIconFileType}`
                        : c.data.hud.img.value,
                );
            });

        CONFIG.statusEffects = effects;
    }

    static async _hookOnRenderTokenHUD(app, html, tokenData) {
        const token = canvas.tokens.get(tokenData._id);

        if (!token) {
            throw Error(`PF2E | StatusEffects | Could not find token with id: ${tokenData._id}`);
        }

        const statusIcons = html.find('img.effect-control');

        const affectingConditions =
            (token.actor?.data.items.filter(
                (i) => i.flags.pf2e?.condition && i.type === 'condition' && i.data.active && i.data.sources.hud,
            ) as ConditionData[]) ?? [];

        html.find('div.status-effects').append('<div class="status-effect-summary"></div>');
        this.setPF2eStatusEffectControls(html, token);

        // Foundry 0.5.7 bug? Setting tokenHUD.token temporarily until onTokenHUDClear passes token again in its 2nd parameter
        app.token = token;

        for (let i of statusIcons) {
            i = $(i);
            const src = i.attr('src');

            if (src.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
                const statusName = this._getStatusFromImg(src);
                const condition = ConditionManager.getConditionByStatusName(statusName);
                if (condition === undefined) {
                    continue;
                }

                i.attr('data-effect', statusName);
                i.attr('data-condition', condition.name);

                const effect = affectingConditions.find((e) => e.data.hud.statusName === statusName);

                if (condition.data.value.isValued) {
                    i.removeClass('effect-control').addClass('pf2e-effect-control');
                    // retrieve actor and the current effect value

                    i.wrap("<div class='pf2e-effect-img-container'></div>");
                    const v = $("<div class='pf2e-effect-value' style='display:none'>0</div>");
                    i.parent().append(v);

                    if (effect !== undefined) {
                        i.attr('data-value', effect.data.value.value);

                        if (effect.data.value.value > 0) {
                            $(v).removeAttr('style').text(effect.data.value.value);
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
        const statusIcons = html.find('img.effect-control, img.pf2e-effect-control');
        const appliedConditions = token.actor.data.items.filter(
            (i) => i.flags.pf2e?.condition && i.type === 'condition' && i.data.active && i.data.sources.hud,
        );

        for (const i of statusIcons) {
            const $i = $(i);
            const status = $i.attr('data-effect');
            const conditionName = $i.attr('data-condition');

            if (conditionName && status) {
                // Icon is a condition

                const condition: ConditionData = appliedConditions.find((e) => e.name === conditionName);
                const conditionBase = ConditionManager.getConditionByStatusName(status);

                if (conditionBase?.data.value.isValued) {
                    // Valued condition

                    const v = $i.siblings('div.pf2e-effect-value').first();

                    if ($i.hasClass('active')) {
                        // icon is active.
                        if (
                            condition === undefined ||
                            (condition !== undefined && !condition.data.active) ||
                            (condition !== undefined && condition.data.value.value < 1)
                        ) {
                            $i.removeClass('active');
                            v.attr('style', 'display:none').text('0');
                        } else if (condition !== undefined && condition.data.value.value > 0) {
                            // Update the value

                            v.text(condition.data.value.value);
                        }
                    } else if (condition !== undefined && condition.data.active && condition.data.value.value > 0) {
                        $i.addClass('active');
                        v.removeAttr('style').text(condition.data.value.value);
                    }
                } else if ($i.hasClass('active')) {
                    // Toggle condition

                    // icon is active.
                    if (condition === undefined || (condition !== undefined && !condition.data.active)) {
                        // Remove active if no effect was found
                        // Or effect was found, but not active.

                        $i.removeClass('active');
                    }
                } else if (condition !== undefined && condition.data.active) {
                    $i.addClass('active');
                }
            }
        }
    }

    /**
     * Show the Status Effect name and summary on mouseover of the token HUD
     */
    static _showStatusDescr(event: JQuery.TriggeredEvent) {
        const f = $(event.currentTarget);
        const statusDescr = $('div.status-effect-summary');
        type ConditionKey = keyof typeof StatusEffects.conditions;
        if (f.attr('src')?.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
            const statusName = f.attr('data-effect') ?? ('undefined' as ConditionKey);
            const conditions = StatusEffects.conditions;
            const conditionKeys = Object.keys(conditions);
            if (typeof statusName === 'string' && conditionKeys.includes(statusName)) {
                const conditionInfo = conditions[statusName as ConditionKey];
                statusDescr.text('name' in conditionInfo ? conditionInfo.name : '').toggleClass('active');
            }
        }
    }

    /**
     * A click event handler to increment or decrement valued conditions.
     *
     * @param event    The window click event
     */
    static async _setStatusValue(
        this: TokenPF2e & { statusEffectChanged: boolean },
        event: JQuery.ClickEvent | JQuery.ContextMenuEvent,
    ): Promise<void> {
        event.preventDefault();

        if (event.shiftKey) {
            StatusEffects._onToggleOverlay(event, this);
            return;
        }

        const f = $(event.currentTarget);
        const status = f.attr('data-condition') ?? 'undefined';

        if (!(this.actor instanceof ActorPF2e)) {
            return;
        }

        const condition = this.actor.data.items.find(
            (i): i is ConditionData =>
                i.flags.pf2e?.condition &&
                i.type === 'condition' &&
                i.name === status &&
                i.data.sources.hud &&
                i.data.references.parent === undefined,
        );

        if (event.type === 'contextmenu') {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.

                const conditionIds: string[] = [];

                this.statusEffectChanged = true;

                this.actor.data.items
                    .filter(
                        (i): i is ConditionData =>
                            i.flags.pf2e?.condition && i.type === 'condition' && i.data.base === status,
                    )
                    .forEach((i) => conditionIds.push(i._id));

                await ConditionManager.removeConditionFromToken(conditionIds, this);
            } else if (condition) {
                this.statusEffectChanged = true;
                await ConditionManager.updateConditionValue(condition._id, this, condition.data.value.value - 1);
                if (this.data.actorLink) {
                    StatusEffects._updateHUD(f.parent().parent(), this);
                }
            }
        } else if (event.type === 'click') {
            this.statusEffectChanged = true;
            if (condition) {
                await ConditionManager.updateConditionValue(condition._id, this, condition.data.value.value + 1);

                if (this.data.actorLink) {
                    StatusEffects._updateHUD(f.parent().parent(), this);
                }
            } else {
                const newCondition = ConditionManager.getCondition(status);
                newCondition.data.sources.hud = true;

                await ConditionManager.addConditionToToken(newCondition, this);
            }
        }
    }

    static async _toggleStatus(event: JQuery.ClickEvent | JQuery.ContextMenuEvent) {
        event.preventDefault();
        const token = this as any;
        if (event.shiftKey) {
            StatusEffects._onToggleOverlay(event, token);
            return;
        }

        const f = $(event.currentTarget);
        const status = f.attr('data-condition');
        const src = f.attr('src');

        const condition: ConditionData = token.actor.data.items.find(
            (i: ConditionData) =>
                i.flags.pf2e?.condition &&
                i.type === 'condition' &&
                i.name === status &&
                i.data.sources.hud &&
                i.data.references.parent === undefined,
        ) as ConditionData;

        const conditionIds: string[] = [];
        if (event.type === 'contextmenu') {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.
                token.actor.data.items
                    .filter(
                        (i: ConditionData) =>
                            i.flags.pf2e?.condition && i.type === 'condition' && i.data.base === status,
                    )
                    .forEach((i: ConditionData) => conditionIds.push(i._id));
            } else if (condition) {
                conditionIds.push(condition._id);
            }

            if (conditionIds.length > 0) {
                token.statusEffectChanged = true;
                await ConditionManager.removeConditionFromToken(conditionIds, token);
            } else if (token.data.effects.includes(src)) {
                await token.toggleEffect(src);
            }
        } else if (event.type === 'click') {
            if (!condition && status) {
                const newCondition = ConditionManager.getCondition(status);
                newCondition.data.sources.hud = true;
                token.statusEffectChanged = true;

                await ConditionManager.addConditionToToken(newCondition, token);
            }
        }
    }

    /**
     * Recreating TokenHUD._onToggleOverlay. Handle assigning a status effect icon as the overlay effect
     */
    static _onToggleOverlay(event, token) {
        event.preventDefault();
        const f = $(event.currentTarget);
        token.toggleOverlay(f.attr('src'));
        f.siblings().removeClass('overlay');
        f.toggleClass('overlay');
    }

    /**
     * Creates a ChatMessage with the Actors current status effects.
     */
    static _createChatMessage(token, whisper = false) {
        let statusEffectList = '';

        // Get the active applied conditions.
        // Iterate the list to create the chat and bubble chat dialog.

        for (const condition of token.actor.data.items.filter(
            (i: ConditionData) => i.flags.pf2e?.condition && i.data.active && i.type === 'condition',
        )) {
            type ConditionKey = keyof typeof StatusEffects.conditions;
            const conditionInfo = StatusEffects.conditions[condition.data.hud.statusName as ConditionKey];
            const summary = 'summary' in conditionInfo ? conditionInfo.summary : '';
            statusEffectList += `
                <li><img src="${`${CONFIG.PF2E.statusEffects.effectsIconFolder + condition.data.hud.statusName}.${
                    CONFIG.PF2E.statusEffects.effectsIconFileType
                }`}" title="${summary}">
                    <span class="statuseffect-li">
                        <span class="statuseffect-li-text">${condition.name} ${
                condition.data.value.isValued ? condition.data.value.value : ''
            }</span>
                        <div class="statuseffect-rules"><h2>${condition.name}</h2>${
                condition.data.description.value
            }</div>
                    </span>
                </li>`;
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
            speaker: { alias: game.i18n.format('PF2E.StatusEffects', { name: token.name }) },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            whisper: ChatMessage.getWhisperRecipients('GM'),
        };
        if (!(whisper || game.settings.get('pf2e', 'metagame.secretCondition'))) {
            delete (chatData as { whisper?: unknown }).whisper;
        }
        ChatMessage.create(chatData);
    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG
     * And migrate all statusEffect URLs of all Tokens
     */
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconType) {
        if (CONFIG.PF2E.statusEffects.overruledByModule) {
            console.log('PF2e System | The PF2eStatusEffect icons are overruled by a module');
            ui.notifications.error(
                'Changing this setting has no effect, as the icon types are overruled by a module.',
                { permanent: true },
            );
            return;
        }
        console.debug('PF2e System | Changing status effect icon types');
        const iconType = StatusEffects.SETTINGOPTIONS.iconTypes[chosenSetting];
        const lastIconType = StatusEffects.SETTINGOPTIONS.iconTypes[CONFIG.PF2E.statusEffects.lastIconType];

        const promises: Promise<TokenData | TokenData[]>[] = [];
        for (const scene of game.scenes.values()) {
            const tokenUpdates: any[] = [];

            for (const tokenData of scene.data.tokens) {
                const update = duplicate(tokenData);
                for (const url of tokenData.effects) {
                    if (url.includes(lastIconType.effectsIconFolder)) {
                        const statusName = this._getStatusFromImg(url);
                        const newUrl = `${iconType.effectsIconFolder + statusName}.${iconType.effectsIconFileType}`;
                        console.log(
                            `PF2e System | Migrating effect ${statusName} of Token ${tokenData.name} on scene ${scene.data.name} | '${url}' to '${newUrl}'`,
                        );
                        const index = update.effects.indexOf(url);
                        if (index > -1) {
                            update.effects.splice(index, 1, newUrl);
                        }
                    }
                }
                tokenUpdates.push(update);
            }
            promises.push(scene.updateEmbeddedEntity('Token', tokenUpdates));
        }
        await Promise.all(promises);

        CONFIG.PF2E.statusEffects.effectsIconFolder = iconType.effectsIconFolder;
        CONFIG.PF2E.statusEffects.effectsIconFileType = iconType.effectsIconFileType;
        CONFIG.PF2E.statusEffects.lastIconType = chosenSetting;
        StatusEffects._updateStatusIcons();
    }

    /**
     * Helper to change condition summary info from YOU to I
     */
    static _changeYouToI(content) {
        content = content.replace(/you're/g, "I'm");
        content = content.replace(/You're/g, "I'm");
        content = content.replace(/Your/g, 'My');
        content = content.replace(/your/g, 'my');
        content = content.replace(/You are/g, 'I am');
        content = content.replace(/you are/g, 'I am');
        content = content.replace(/You can't/g, "I can't");
        content = content.replace(/you can't/g, "I can't");
        content = content.replace(/You can/g, 'I can');
        content = content.replace(/you can/g, 'I can');
        content = content.replace(/You have/g, 'I have');
        content = content.replace(/you have/g, 'I have');
        content = content.replace(/You/g, 'I');
        content = content.replace(/you/g, 'me');
        return content;
    }

    /**
     * Helper to get status effect name from image url
     */
    static _getStatusFromImg(url) {
        return url.substring(
            url.lastIndexOf('/') + 1,
            url.length - CONFIG.PF2E.statusEffects.effectsIconFileType.length - 1,
        );
    }

    /**
     * Add status effects to a token
     * Legacy function
     */
    static async setStatus(token, effects: any[] = []) {
        for (const status of Object.values(effects)) {
            const statusName = status.name;
            const value = status.value;
            const source = status.source ? status.source : 'PF2eStatusEffects.setStatus';

            const condition = ConditionManager.getConditionByStatusName(statusName);

            if (!condition) {
                console.log(`PF2e System | '${statusName}' is not a vaild condition!`);
                continue;
            }

            const effect = token.actor.data.items.find(
                (i: ConditionData) =>
                    i.data.source.value === source && i.type === 'condition' && i.data.hud.statusName === statusName,
            ) as ConditionData;

            if (typeof value === 'string' && condition.data.value.isValued) {
                if (effect) {
                    // Has value with type string
                    let newValue = 0;

                    if (value.startsWith('+') || value.startsWith('-')) {
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

                    await ConditionManager.updateConditionValue(effect._id, token, newValue); // eslint-disable-line no-await-in-loop
                } else if (Number(value) > 0) {
                    // No effect, but value is a number and is greater than 0.
                    // Add a new condition with the value.

                    condition.data.source.value = source;
                    condition.data.value.value = Number(value);
                    await ConditionManager.addConditionToToken(condition, token); // eslint-disable-line no-await-in-loop
                }
            } else if (!value) {
                // Value was not provided.

                if (condition.data.value.isValued) {
                    console.log(`PF2e System | '${statusName}' must have a value.`);
                    continue;
                }

                if (effect !== undefined && status.toggle) {
                    // Condition exists and toggle was true
                    // Remove it.
                    await ConditionManager.removeConditionFromToken([effect._id], token); // eslint-disable-line no-await-in-loop
                } else if (effect === undefined) {
                    // Effect does not exist.  Create it.

                    // Set the source to this function.
                    condition.data.source.value = source;
                    await ConditionManager.addConditionToToken(condition, token); // eslint-disable-line no-await-in-loop
                }
            }
        }
        this._createChatMessage(token);
    }
}
