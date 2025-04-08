/** Custom control icon used to display Map Location journal pages when pinned to the map. */
class MapLocationControlIcon extends PIXI.Container {
    constructor({ code, size = 40, ...style }: MapLocationControlIconParams & MapLocationStyle = {}) {
        super();

        this.code = code;
        this.size = size;
        this.style = style;

        this.radius = size / 2;
        this.circle = [this.radius, this.radius, this.radius];
        this.backgroundColor = this.style.backgroundColor;
        this.borderColor = this.style.borderHoverColor;

        // Define hit area
        this.eventMode = "static";
        this.interactiveChildren = false;
        this.hitArea = new PIXI.Circle(...this.circle);
        this.cursor = "pointer";

        // Text
        this.text = new PreciseText(this.code, this._getTextStyle(this.code.length, this.size));
        this.text.anchor.set(0.5, 0.5);
        this.text.position.set(this.radius, this.radius);
        this.addChild(this.text);

        // Border
        this.border = this.addChild(new PIXI.Graphics());
        this.border.visible = false;

        this.refresh();
    }

    /* -------------------------------------------- */

    backgroundColor: number;

    border: PIXI.Graphics;

    borderColor: string | number;

    circle: number[];

    code: string | undefined;

    radius: number;

    size: number;

    style: MapLocationStyle;

    text: PreciseText;

    /* -------------------------------------------- */

    refresh({ visible, borderColor, borderVisible }: MapLocationControlIconRefreshParams = {}): this {
        if (borderColor) this.borderColor = borderColor;
        this.border
            .clear()
            .lineStyle(2, this.borderColor, 1.0)
            .drawCircle(...this.circle)
            .endFill();
        if (borderVisible !== undefined) this.border.visible = borderVisible;
        if (visible !== undefined) this.visible = visible;
        return this;
    }

    /* -------------------------------------------- */

    /**
     * Define PIXI TestStyle object for rendering the map location code.
     * @param {number} characterCount  Number of characters in the code.
     * @param {number} size            Size of the icon in the Scene.
     */
    _getTextStyle(characterCount: number, size: number): PIXI.TextStyle {
        const style = CONFIG.canvasTextStyle.clone();
        style.dropShadow = false;
        style.fill = Color.from(this.style.textColor) as number;
        style.strokeThickness = 2;
        style.fontFamily = ["Signika"];
        if (this.style.fontFamily) style.fontFamily.unshift(this.style.fontFamily);
        style.fontSize = characterCount > 2 ? size * 0.5 : size * 0.6;
        style.lineJoin = "round";
        return style;
    }
}

interface MapLocationStyle {
    backgroundColor: number;
    borderColor: string | number;
    borderHoverColor: string | number;
    fontFamily?: string;
    shadowColor: number;
    textColor: number | string;
    tint: number;
}

interface MapLocationControlIconParams {
    code: string;
    size: number;
    // style: MapLocationStyle;
}

interface MapLocationControlIconRefreshParams {
    visible?: boolean;
    borderColor?: string | number;
    borderVisible?: boolean;
}

export { MapLocationControlIcon };
