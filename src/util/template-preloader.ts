// eslint-disable-next-line import/no-unresolved
import "../../static/templates/**/*.html";

export class TemplatePreloader {
    /**
     * Preload a set of templates to compile and cache them for fast access during rendering
     */
    static async preloadHandlebarsTemplates() {
        const templatePaths = ["__ALL_TEMPLATES__"];
        return loadTemplates(templatePaths);
    }

    static watch(): void {
        if (BUILD_MODE === "development" && module.hot) {
            module.hot.accept();

            if (module.hot.status() === "apply") {
                for (const template in _templateCache) {
                    delete _templateCache[template];
                }

                this.preloadHandlebarsTemplates().then(() => {
                    for (const appId in ui.windows) {
                        ui.windows[Number(appId)].render(true);
                    }
                });
            }
        }
    }
}
