/**
 * Get a template from the server by fetch request and caching the retrieved result
 * @param path  The web-accessible HTML template URL
 * @param id  An ID to register the partial with.
 * @returns A Promise which resolves to the compiled Handlebars template
 */
declare function getTemplate(path: string, id?: string): Promise<(context: object, options?: object) => string>;

/**
 * Load and cache a set of templates by providing an Array of paths
 * @param paths
 */
declare function loadTemplates(paths: string[]): Promise<void>;

/**
 * Get and render a template using provided data and handle the returned HTML
 * Support asynchronous file template file loading with a client-side caching layer
 *
 * @param path  The file path to the target HTML template
 * @param data  A data object against which to compile the template
 *
 * @return      Returns the rendered HTML
 */
declare function renderTemplate(path: string, data?: object): Promise<string>;
