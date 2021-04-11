import { ConfigPF2e } from '@scripts/config';

export class TraitSelectorBase extends FormApplication {
    objectProperty = '';
    configTypes: string[] = [];

    constructor(options: FormApplicationOptions | undefined) {
        super(options);
    }

    /** @override */
    activateListeners($html: JQuery) {
        super.activateListeners($html);
        // Any universal trait selector listeners
    }

    /** Required by FromApplication
     *  @override */
    protected async _updateObject(_event: Event, _formData: FormData) {}

    /**
     * Builds an object of all keys of this.configTypes from CONFIG.PF2E
     * @returns An object of all key and translated value pairs sorted by key
     */
    protected getChoices(): Record<string, string> {
        const choices: Record<string, string> = {};
        for (const k of this.configTypes) {
            const key = k as keyof ConfigPF2e['PF2E'];
            if (CONFIG.PF2E[key] !== undefined) {
                mergeObject(choices, CONFIG.PF2E[key]);
            }
        }

        return this.sortChoices(choices);
    }

    protected sortChoices(choices: Record<string, string>): Record<string, string> {
        const sorted: Record<string, string> = {};
        Object.keys(choices)
            .sort((a, b) => {
                return choices[a].localeCompare(choices[b]);
            })
            .forEach((key) => {
                sorted[key] = choices[key];
            });

        return sorted;
    }
}
