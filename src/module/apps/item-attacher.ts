import { iterateAllItems } from "@actor/helpers.ts";
import { ApplicationRenderContext } from "@client/applications/_module.mjs";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { RollNotePF2e } from "@module/notes.ts";
import { UserPF2e } from "@module/user/document.ts";
import { StatisticRollParameters } from "@system/statistic/statistic.ts";
import { ErrorPF2e } from "@util";

/** A prompt for the user to select an item to receive an attachment */
class ItemAttacher extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor({ item }: { item: PhysicalItemPF2e }) {
        super();
        if (!item.isAttachable) throw ErrorPF2e("Not an attachable item");
        const actor = item.actor;
        const collection: ItemPF2e[] = actor ? [...iterateAllItems(actor)] : game.items.contents;
        this.item = item;
        this.choices = collection
            .filter((i): i is PhysicalItemPF2e => i.isOfType("physical"))
            .filter((i) => i.quantity > 0 && i.acceptsSubitem(item))
            .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

        if (this.choices.length === 0) {
            const locKey = "PF2E.Item.Physical.Attach.NoEligibleItem";
            const message = game.i18n.format(locKey, { attachable: this.item.name });
            ui.notifications.warn(message);
            this.close();
        }
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "item-attacher",
        window: {
            icon: "fa-solid fa-paperclip",
            contentClasses: ["standard-form"],
            resizable: false,
        },
        position: {
            height: "auto",
            width: "auto",
        },
        actions: {
            attach: ItemAttacher.#onClickAttach,
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: `${SYSTEM_ROOT}/templates/items/item-attacher.hbs`, root: true },
    };

    item: PhysicalItemPF2e;

    choices: PhysicalItemPF2e[];

    override get title(): string {
        return game.i18n.format("PF2E.Item.Physical.Attach.PromptTitle", { item: this.item.name });
    }

    static #onClickAttach(this: ItemAttacher): void {
        const selectElement = this.element.querySelector<HTMLSelectElement>("select[data-choices]");
        const selection = selectElement ? this.choices.at(Number(selectElement.value)) : null;
        if (selection) this.#attach(selection);
        this.close();
    }

    protected override _canRender(options: fa.ApplicationRenderOptions): boolean | void {
        if (this.choices.length === 0) {
            const locKey = "PF2E.Item.Physical.Attach.NoEligibleItem";
            const message = game.i18n.format(locKey, { attachable: this.item.name });
            ui.notifications.warn(message);
            return false;
        }

        return super._canRender(options);
    }

    override async _prepareContext(): Promise<ItemAttacherContext> {
        return {
            item: this.item,
            choices: this.choices.map((i, index) => ({ label: i.name, value: index })),
            user: game.user,
            requiresCrafting: !!this.item.actor?.skills?.crafting && this.item.system.usage.type !== "installed",
        };
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
        const statistic = this.item.actor?.skills?.crafting;
        if (!statistic) throw ErrorPF2e("Item not owned by a creature");

        const dc = { value: 10, visible: true };
        const args: StatisticRollParameters = {
            dc,
            label: await fa.handlebars.renderTemplate(`${SYSTEM_ROOT}/templates/chat/action/header.hbs`, {
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

interface ItemAttacherContext extends ApplicationRenderContext {
    choices: { label: string; value: number }[];
    /** An item pertinent to the selection being made */
    item: ItemPF2e;
    user: UserPF2e;
    requiresCrafting: boolean;
}

export { ItemAttacher };
