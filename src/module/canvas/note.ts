class NotePF2e extends Note {
    override _drawControlIcon(): ControlIcon {
        const { flags, texture, iconSize } = this.document;
        const systemIcon = this.page?.getControlIcon?.({ size: iconSize, tint: texture.tint });
        if (systemIcon && flags?.pf2e?.code) systemIcon.text._text = flags.pf2e.code;
        else return super._drawControlIcon();
        systemIcon.x -= iconSize / 2;
        systemIcon.y -= iconSize / 2;
        return systemIcon;
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: Partial<DatabaseUpdateOperation<TDocument["parent"]>>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        if (!!changed?.flags?.pf2e && "code" in changed.flags.pf2e) {
            this.page?.update({ "system.code": changed.flags.pf2e.code });
            this.renderFlags.set({ redraw: true });
        }
    }
}

export { NotePF2e };
