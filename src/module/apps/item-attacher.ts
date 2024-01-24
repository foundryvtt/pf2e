import type { PhysicalItemPF2e } from "@item";
import { PickAThingPrompt, PickableThing } from "@module/apps/pick-a-thing-prompt.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { StatisticRollParameters } from "@system/statistic/statistic.ts";
import { ErrorPF2e } from "@util";

/** A prompt for the user to select an item to receive an attachment */
class ItemAttacher<TItem extends PhysicalItemPF2e> extends PickAThingPrompt<TItem, PhysicalItemPF2e> {
    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/items/item-attacher.hbs",
        };
    }

    constructor({ item }: { item: TItem }) {
        if (!item.isAttachable) {
            throw ErrorPF2e("Not an attachable item");
        }
        const collection =
            item.actor?.inventory.contents ??
            game.items.filter((i): i is PhysicalItemPF2e<null> => i.isOfType("physical"));
        const choices = collection
            .filter((i) => i.quantity > 0 && i.acceptsSubitem(item))
            .map((i) => ({ value: i, img: i.img, label: i.name }))
            .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        super({ item, choices });
    }

    /** Only allow one of these dialogs to be open. */
    override get id(): string {
        return "item-attacher";
    }

    override get title(): string {
        return game.i18n.format("PF2E.Item.Physical.Attach.PromptTitle", { item: this.item.name });
    }

    protected override getSelection(event: MouseEvent): PickableThing<PhysicalItemPF2e> | null {
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

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        const attachButton = html.querySelector<HTMLButtonElement>("button[data-action=pick]");
        const selectEl = html.querySelector<HTMLSelectElement>("select[data-choices]");
        if (!(attachButton && selectEl)) {
            throw ErrorPF2e("Unexpected error adding listeners to item attacher");
        }

        selectEl.addEventListener("change", () => {
            attachButton.dataset.choice = selectEl.value;
        });
    }

    /**
     * Attach the attachment to the target item. If a crafting check is requesting, attempt it first and abort on
     * failure.
     */
    async #attach(attachmentTarget: PhysicalItemPF2e): Promise<boolean> {
        const checkRequested =
            !!this.element[0]?.querySelector<HTMLInputElement>("input[data-crafting-check]")?.checked;
        if (checkRequested && !(await this.#craftingCheck(attachmentTarget))) return false;

        const targetSource = attachmentTarget.toObject();
        if (!targetSource.system.subitems) {
            throw ErrorPF2e("This item does not accept attachments");
        }
        const subitems = targetSource.system.subitems;
        const attachmentSource = this.item.toObject();
        attachmentSource._id = fu.randomID();
        attachmentSource.system.quantity = 1;
        attachmentSource.system.equipped = { carryType: "attached", handsHeld: 0 };
        subitems.push(attachmentSource);

        const newQuantity = this.item.quantity - 1;
        const updated = await Promise.all([
            newQuantity <= 0 ? this.item.delete() : this.item.update({ "system.quantity": newQuantity }),
            attachmentTarget.update({ "system.subitems": subitems }),
        ]);

        return updated.every((u) => !!u);
    }

    async #craftingCheck(attachmentTarget: PhysicalItemPF2e): Promise<boolean> {
        const statistic = this.actor?.skills?.crafting;
        if (!statistic) throw ErrorPF2e("Item not owned by a creature");

        const dc = { value: 10, visible: true };
        const args: StatisticRollParameters = {
            dc,
            label: await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
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

export { ItemAttacher };
