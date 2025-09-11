import { iterateAllItems } from "@actor/helpers.ts";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { PickAThingPrompt, PickableThing, PromptTemplateData } from "@module/apps/pick-a-thing-prompt.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { StatisticRollParameters } from "@system/statistic/statistic.ts";
import { ErrorPF2e } from "@util";

/** A prompt for the user to select an item to receive an attachment */
class ItemAttacher<TItem extends PhysicalItemPF2e> extends PickAThingPrompt<TItem, PhysicalItemPF2e> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "item-attacher",
        window: {
            contentClasses: ["standard-form"],
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: "systems/pf2e/templates/items/item-attacher.hbs", root: true },
    };

    constructor({ item }: { item: TItem }) {
        if (!item.isAttachable) {
            throw ErrorPF2e("Not an attachable item");
        }
        const actor = item.actor;
        const collection: ItemPF2e[] = actor ? [...iterateAllItems(actor)] : game.items.contents;
        const choices = collection
            .filter((i): i is PhysicalItemPF2e => i.isOfType("physical"))
            .filter((i) => i.quantity > 0 && i.acceptsSubitem(item))
            .map((i) => ({ value: i, img: i.img, label: i.name }))
            .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        super({ item, choices });
    }

    override get title(): string {
        return game.i18n.format("PF2E.Item.Physical.Attach.PromptTitle", { item: this.item.name });
    }

    protected override getSelection(event: PointerEvent): PickableThing<PhysicalItemPF2e> | null {
        const selection = super.getSelection(event);
        if (selection) this.#attach(selection.value);
        return selection;
    }

    override async resolveSelection(): Promise<PickableThing<PhysicalItemPF2e> | null> {
        if (this.choices.length === 0) {
            const locKey = "PF2E.Item.Physical.Attach.NoEligibleItem";
            const message = game.i18n.format(locKey, { attachable: this.item.name });
            ui.notifications.warn(message);
            return null;
        }

        return super.resolveSelection();
    }

    override async _prepareContext(): Promise<ItemAttacherContext> {
        const data = await super._prepareContext();
        return {
            ...data,
            requiresCrafting: !!this.item.actor?.skills?.crafting && this.item.system.usage.type !== "installed",
        };
    }

    protected override async _onRender(context: object, options: fa.ApplicationRenderOptions): Promise<void> {
        await super._onRender(context, options);
        const html = this.element;

        const attachButton = html.querySelector<HTMLButtonElement>("button[data-action=pick]");
        const selectEl = html.querySelector<HTMLSelectElement>("select[data-choices]");
        if (!(attachButton && selectEl)) {
            throw ErrorPF2e("Unexpected error adding listeners to item attacher");
        }

        selectEl.addEventListener("change", () => {
            attachButton.value = selectEl.value;
        });
    }

    /**
     * Attach the attachment to the target item. If a crafting check is requesting, attempt it first and abort on
     * failure.
     */
    async #attach(attachmentTarget: PhysicalItemPF2e): Promise<boolean> {
        const checkRequested = !!this.element?.querySelector<HTMLInputElement>("input[data-crafting-check]")?.checked;
        if (checkRequested && !(await this.#craftingCheck(attachmentTarget))) return false;
        return attachmentTarget.attach(this.item);
    }

    async #craftingCheck(attachmentTarget: PhysicalItemPF2e): Promise<boolean> {
        const statistic = this.actor?.skills?.crafting;
        if (!statistic) throw ErrorPF2e("Item not owned by a creature");

        const dc = { value: 10, visible: true };
        const args: StatisticRollParameters = {
            dc,
            label: await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                glyph: null,
                subtitle: game.i18n.format("PF2E.ActionsCheck.x", { type: statistic.label }),
                title: this.title,
            }),
            extraRollNotes: [
                new RollNotePF2e({
                    outcome: ["failure", "criticalFailure"],
                    selector: "crafting-check",
                    text: game.i18n.format("PF2E.Item.Physical.Attach.Outcome.Failure", { attachable: this.item.name }),
                    title: "PF2E.Check.Result.Degree.Check.failure",
                }),
                new RollNotePF2e({
                    outcome: ["success", "criticalSuccess"],
                    selector: "crafting-check",
                    text: game.i18n.format("PF2E.Item.Physical.Attach.Outcome.Success", {
                        attachable: this.item.name,
                        target: attachmentTarget.name,
                    }),
                    title: "PF2E.Check.Result.Degree.Check.success",
                }),
            ],
        };
        const roll = await statistic.roll(args);

        return (roll?.total ?? 0) >= dc.value;
    }
}

interface ItemAttacherContext extends PromptTemplateData {
    requiresCrafting: boolean;
}

export { ItemAttacher };
