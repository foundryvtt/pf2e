class NotePF2e extends Note {
    override _drawControlIcon(): ControlIcon {
        const { texture, iconSize } = this.document;
        const systemIcon = this.page?.system?.getControlIcon?.({ size: iconSize, tint: texture.tint });
        if (!systemIcon) return super._drawControlIcon();
        systemIcon.x -= iconSize / 2;
        systemIcon.y -= iconSize / 2;
        return systemIcon;
    }
}

export { NotePF2e };
