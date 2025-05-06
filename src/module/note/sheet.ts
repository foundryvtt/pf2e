export class NoteConfigPF2e extends NoteConfig {
    static override get defaultOptions(): FormApplicationOptions {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/scene/note-config.html",
        });
    }

    override getData(options?: Partial<FormApplicationOptions>): object {
        const data = super.getData(options);
        data.icons.splice(1, 0, { label: game.i18n.localize("NOTE.CustomLabel"), src: "code" });
        const code = this.object.flags.pf2e.code ?? "";
        const customIcon = data.icon.custom && data.icon.custom !== "code";
        const icon = {
            selected: customIcon ? "" : code ? "code" : this.document.texture.src,
            custom: customIcon && !code ? this.document.texture.src : "",
        };
        return foundry.utils.mergeObject(data, {
            icon,
            code,
        });
    }

    override _updateCustomIcon(): void {
        const selected = this.form["icon.selected"];
        const pageId = this.form["pageId"];
        this.form["icon.custom"].disabled = selected.value.length;
        selected.querySelector("option[value='code']").disabled = !pageId.value;
        this.form["flags.pf2e.code"].disabled = !pageId.value || selected.value !== "code";
    }

    /** @inheritdoc */
    override _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown> {
        const data = super._getSubmitData(updateData);
        if (data["texture.src"] === "code") data["texture.src"] = "";
        else data["flags.pf2e.code"] = "";
        return data;
    }
}
