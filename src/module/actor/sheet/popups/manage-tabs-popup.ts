import { ActorPF2e } from "@actor/base";

interface ManageTabsFormData {
    characterTab: boolean;
    actionsTab: boolean;
    inventoryTab: boolean;
    spellsTab: boolean;
    craftingTab: boolean;
    proficienciesTab: boolean;
    featsTab: boolean;
    effectsTab: boolean;
    biographyTab: boolean;
}

/**
 * @category Other
 */
export class ManageTabsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "manage-tabs";
        options.classes = [];
        options.title = game.i18n.localize("PF2E.TabManageTabsLabel");
        options.template = "systems/pf2e/templates/actors/manage-tabs.html";
        options.width = "auto";
        return options;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & ManageTabsFormData): Promise<void> {
        const actor = this.object;
        await actor.setFlag("pf2e", "hiddenTabs", formData);
    }

    /** Prepare data to be sent to HTML. */
    override getData() {
        const result: ManageTabsFormData = this.object.getFlag("pf2e", "hiddenTabs");
        return { ...super.getData(), result };
    }
}
