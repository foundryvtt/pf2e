export class LegalNotice extends fa.api.DialogV2 {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DialogV2Configuration> = {
        id: "license-viewer",
        window: { title: "PF2E.LegalNotice.Title" },
        position: { width: 560 },
        buttons: [{ action: "ok", label: "PF2E.OK", icon: "fa-solid fa-check", default: true }],
    };

    override _initializeApplicationOptions(
        options: DeepPartial<fa.api.DialogV2Configuration>,
    ): fa.api.DialogV2Configuration {
        options.content = `<p>${game.i18n.localize("PF2E.LegalNotice.Text")}</p>`;
        return super._initializeApplicationOptions(options);
    }
}
