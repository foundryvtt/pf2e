import { PF2EItem } from './item';

/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 * @extends {MeasuredTemplate}
 */
export class AbilityTemplate extends MeasuredTemplate {
    /**
     * A factory method to create an AbilityTemplate instance using provided data from a Spell instance
     * @param {Spell} item               The Item object for which to construct the template
     * @return {AbilityTemplate|null}     The template object, or null if the item does not produce a template
     */
    static async fromItem(item: PF2EItem): Promise<AbilityTemplate|null> {
        const templateShape = item.data.data.area?.areaType ?? null;
        const templateSize = item.data.data.area?.value ?? null;
        let actualShape: string;
        if (!templateSize) return null;
        if (templateShape === 'burst' || templateShape === 'Burst') {
            actualShape = 'circle';
        } else if (templateShape === 'cone' || templateShape === 'Cone') {
            actualShape = 'cone';
        } else if (templateShape === 'emanation' || templateShape === 'Emanation') {
            actualShape = 'circle';
        } else if (templateShape === 'line' || templateShape === 'Line') {
            actualShape = 'ray';
        } else {
            return null;
        }

        // Prepare template data
        const templateData: Partial<MeasuredTemplateData> = {
            t: actualShape,
            user: game.user._id,
            distance: templateSize,
            direction: 0,
            x: 0,
            y: 0,
            fillColor: game.user.data.color,
        };

        // Return the template constructed from the item data
        const template = await MeasuredTemplate.create(templateData);
        const abilityTemplateData: MeasuredTemplateData = template.data;
        template.destroy();
        const abilityTemplate = new this(abilityTemplateData, canvas.scene);
        return abilityTemplate;
    }

    /* -------------------------------------------- */

    /**
     * Creates a preview of the spell template
     */
    drawPreview() {
        // ToDO:
        //const initialLayer = canvas.activeLayer;

        // Draw the template and switch to the template layer
        this.draw();
        this.layer.activate();
        this.layer.preview.addChild(this);

        // Activate interactivity
        this.activatePreviewListeners();
    }

    /* -------------------------------------------- */

    /**
     * Activate listeners for the template preview
     * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
     */
    activatePreviewListeners() {
        const handlers = {
            mm: (event) => {},
            mw: (event) => {},
            rc: (event) => {},
            lc: (event) => {},
        };
        let moveTime = 0;

        // Update placement (mouse-move)
        handlers.mm = (event) => {
            event.stopPropagation();
            const now = Date.now(); // Apply a 20ms throttle
            if (now - moveTime <= 20) return;
            const center = event.data.getLocalPosition(this.layer);
            const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
            this.data.x = snapped.x;
            this.data.y = snapped.y;
            this.refresh();
            moveTime = now;
        };

        // Cancel the workflow (right-click)
        handlers.rc = (event) => {
            this.layer.preview.removeChildren();
            canvas.stage.off('mousemove', handlers.mm);
            canvas.stage.off('mousedown', handlers.lc);
            canvas.app.view.oncontextmenu = null;
            canvas.app.view.onwheel = null;
        };

        // Confirm the workflow (left-click)
        handlers.lc = (event) => {
            handlers.rc(event);

            // Confirm final snapped position
            const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
            this.data.x = destination.x;
            this.data.y = destination.y;

            // Create the template
            canvas.scene.createEmbeddedEntity('MeasuredTemplate', this.data);
        };

        // Rotate the template by 3 degree increments (mouse-wheel)
        handlers.mw = (event) => {
            if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
            event.stopPropagation();
            const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            const snap = event.shiftKey ? delta : 5;
            this.data.direction += snap * Math.sign(event.deltaY);
            this.refresh();
        };

        // Activate listeners
        canvas.stage.on('mousemove', handlers.mm);
        canvas.stage.on('mousedown', handlers.lc);
        canvas.app.view.oncontextmenu = handlers.rc;
        canvas.app.view.onwheel = handlers.mw;
    }
}
