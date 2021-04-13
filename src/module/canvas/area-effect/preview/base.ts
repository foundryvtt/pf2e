import { ActorPF2e } from '@actor/base';
import { AreaEffectTemplate } from '@module/canvas/area-effect/template';
import { LocalizePF2e } from '@module/system/localize';

export abstract class AreaEffectPreview {
    /** The starting coordinates of the preview template */
    protected abstract get startPosition(): Point;

    /** The layer the user had active upon casting the spell or invoking the action */
    private initialLayer: CanvasLayer;

    /** Send placement confirmation to the caller */
    private resolvePromise!: (value: boolean) => void;

    /** A promise resolving whether the user placed the template or cancelled */
    templatePlaced: Promise<boolean>;

    // Saved mouse-event callbacks
    private mouseMoveListener!: AreaEffectPreview['onMouseMove'];
    private leftClickListener!: AreaEffectPreview['onLeftClick'];

    constructor(protected template: AreaEffectTemplate, protected actor: ActorPF2e, protected token: Token) {
        this.initialLayer = canvas.activeLayer!;
        this.templatePlaced = new Promise((resolve: (value: boolean) => void) => {
            this.resolvePromise = resolve;
        });

        this.draw();

        // Move actor sheet out of the way for the user
        if (actor.sheet.element.length > 0) {
            actor.sheet.minimize();
        }

        // Activate listeners
        this.activatePreviewListeners();
    }

    /**
     * Draw the preview template
     */
    protected draw() {
        const template = this.template;
        template.data.x = this.startPosition.x;
        template.data.y = this.startPosition.y;
        template.draw();
        template.layer.activate();
        template.layer.preview.addChild(template);

        const message = LocalizePF2e.translations.PF2E.AreaTemplateConfirmation;
        const areaShape = CONFIG.PF2E.areaTypes[template.effectArea.areaType].toLocaleLowerCase();
        ui.notifications.info(game.i18n.format(message, { areaShape }));
    }

    /**
     * Activate listeners for the template preview
     * @param initialLayer The initially active CanvasLayer to re-activate after the workflow is complete
     */
    private activatePreviewListeners() {
        this.mouseMoveListener = this.onMouseMove;
        this.leftClickListener = this.onLeftClick;
        canvas.stage.on('mousemove', this.mouseMoveListener);
        canvas.stage.on('mousedown', this.leftClickListener);
        canvas.app.view.oncontextmenu = this.onRightClick;
        canvas.app.view.onwheel = this.onMouseWheel;
    }

    // Rotate the template by 45 degree increments (mouse-wheel)
    protected get onMouseWheel() {
        return (event: WheelEvent) => {
            if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
            event.stopPropagation();
        };
    }

    // Update placement (mouse-move)
    protected get onMouseMove() {
        return (event: PIXI.interaction.InteractionEvent) => {
            event.stopPropagation();
        };
    }

    private async endPlacement() {
        canvas.stage.off('mousemove', this.mouseMoveListener);
        canvas.stage.off('mousedown', this.leftClickListener);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;

        // Remove the grid highlight
        const highlightId = `Template.${this.template.id}`;
        canvas.grid.highlightLayers[highlightId].destroy();
        delete canvas.grid.highlightLayers[highlightId];

        // Preview the preview control icon

        // Remove the preview template
        this.template.layer.preview.removeChildren();

        this.initialLayer.activate();
        this.token.control();
        this.actor.sheet?.maximize();
    }

    // Cancel the workflow (right-click)
    private get onRightClick() {
        return async (): Promise<void> => {
            this.endPlacement();
            this.resolvePromise(false);
        };
    }

    // Confirm the workflow (left-click)
    private get onLeftClick() {
        return async (): Promise<void> => {
            // Confirm final snapped position
            const template = this.template;
            const destination = canvas.grid.getSnappedPosition(template.x, template.y, 2);
            template.data.x = destination.x;
            template.data.y = destination.y;
            template.data.fillColor = template.data.borderColor;
            await canvas.scene!.createEmbeddedEntity('MeasuredTemplate', this.template.data);

            await this.endPlacement();
            this.resolvePromise(true);
        };
    }
}
