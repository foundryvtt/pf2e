import { NPCPF2e } from '@actor/index';
import { ActorSheetPF2e } from '@actor/sheet/base';
import { ActorDataPF2e } from '@actor/data';

export class ActorSheetPF2eDataEntryNPC extends ActorSheetPF2e<NPCPF2e> {
    private readonly CUSTOM_TRAIT_SEPARATOR = new RegExp(/[,;|]+/g);
    private readonly CREATURE_TRAITS = CONFIG.PF2E.monsterTraits; // might need to expand this list later

    static override get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            classes: options.classes.concat(['npc', 'data-entry']),
        });
    }

    override get template() {
        return 'systems/pf2e/templates/actors/npc/data-entry-sheet.html';
    }

    protected prepareItems(_sheetData: { actor: ActorDataPF2e }): void {}

    override getData() {
        return {
            ...super.getData(),
            app: {
                id: this.id,
            },
            dataset: {
                alignment: CONFIG.PF2E.alignment,
                rarity: CONFIG.PF2E.rarityTraits,
                size: CONFIG.PF2E.actorSizes,
                traits: {
                    creature: this.CREATURE_TRAITS,
                },
            },
        };
    }

    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // add creature trait when pressing enter in the trait text box
        html.on('keydown', `#${this.id}-actor-trait`, (event) => {
            if (event && event.key && event.key.toLowerCase() === 'enter') {
                const target = event.target as HTMLInputElement;
                const actor = this.token?.actor ?? this.actor;
                const trait = target.value.trim();
                if (trait in this.CREATURE_TRAITS) {
                    // built-in trait - ignore duplicates
                    const builtin = actor.data.data.traits.traits.value
                        // the rarity trait is added to the actor as part of data preparation - filter it out to prevent
                        // multiple rarity traits
                        .filter((token) => !(token in CONFIG.PF2E.rarityTraits));
                    if (!builtin.includes(trait)) {
                        actor.update({ 'data.traits.traits.value': builtin.concat(trait) });
                    }
                } else {
                    // custom trait - ignore duplicates
                    const custom = actor.data.data.traits.traits.custom
                        .split(this.CUSTOM_TRAIT_SEPARATOR)
                        .map((token) => token.trim())
                        .filter((token) => !!token);
                    if (!custom.includes(trait)) {
                        actor.update({ 'data.traits.traits.custom': custom.concat(trait).join(',') });
                    }
                }
                target.value = '';
                target.focus();
            }
        });

        // remove creature trait when clicking the tag
        html.on('click', '.actor-traits.tags [data-trait]:not([data-trait=""]).tag', (event) => {
            const actor = this.token?.actor ?? this.actor;
            const trait = event.target.dataset.trait.trim() as string;
            // built-in trait
            const builtin = actor.data.data.traits.traits.value.filter((t) => t.toLowerCase() !== trait.toLowerCase());
            // custom trait
            const custom = actor.data.data.traits.traits.custom
                .split(this.CUSTOM_TRAIT_SEPARATOR)
                .map((token) => token.trim())
                .filter((token) => !!token)
                .filter((token) => token.toLowerCase() !== trait.toLowerCase())
                .join(',');
            actor.update({
                'data.traits.traits.value': builtin,
                'data.traits.traits.custom': custom,
            });
        });
    }

    protected override async _render(force?: boolean, options?: RenderOptions) {
        // find the first input element in focus that has an "id" attribute but no "name" attribute, as these are not
        // handle by the Foundry's built-in FormApplication#_render method
        const focus = this.element
            .find(':focus')
            .toArray()
            .filter((element) => element instanceof HTMLInputElement)
            .map((element) => element as HTMLInputElement)
            .filter((element) => !element.hasAttribute('name'))
            .find((_element) => true);

        await super._render(force, options);

        // restore focus to previously located input element, if any
        if (focus && focus.id) {
            this.element.find(`#${focus.id}`).toArray()[0]?.focus();
        }
    }
}
