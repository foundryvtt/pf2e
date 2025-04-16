interface WorkerTask {
    /** An incrementing task ID used to reference task progress */
    taskId?: number;
    /** The task action being performed, from WorkerManager.WORKER_TASK_ACTIONS */
    action: (typeof WorkerManager.WORKER_TASK_ACTIONS)[keyof typeof WorkerManager.WORKER_TASK_ACTIONS];
}

interface AsyncWorkerOptions extends WorkerOptions {
    /** Should the worker run in debug mode? */
    debug?: boolean;
    /** Should the worker automatically load the primitives library? */
    loadPrimitives?: boolean;
    /** Should the worker operates in script modes? Optional scripts. */
    scripts?: string[];
}

/**
 * An asynchronous web Worker which can load user-defined functions and await execution using Promises.
 */
export class AsyncWorker extends Worker {
    /**
     * @param name    The worker name to be initialized
     * @param options Worker initialization options
     */
    constructor(name: string, options?: AsyncWorkerOptions);

    /**
     * A path reference to the JavaScript file which provides companion worker-side functionality.
     */
    static WORKER_HARNESS_JS: string;

    /**
     * A Promise which resolves once the Worker is ready to accept tasks
     */
    get ready(): Promise<void>;

    /* -------------------------------------------- */
    /*  Task Management                             */
    /* -------------------------------------------- */

    /**
     * Load a function onto a given Worker.
     * The function must be a pure function with no external dependencies or requirements on global scope.
     * @param functionName The name of the function to load
     * @param functionRef  A reference to the function that should be loaded
     * @returns A Promise which resolves once the Worker has loaded the function.
     */
    loadFunction(functionName: string, functionRef: Function): Promise<unknown>;

    /**
     * Execute a task on a specific Worker.
     * @param functionName The named function to execute on the worker. This function must first have been loaded.
     * @param args An array of parameters with which to call the requested function
     * @param transfer An array of transferable objects which are transferred to the worker thread.
     *                 See https://developer.mozilla.org/en-US/docs/Glossary/Transferable_objects
     * @returns A Promise which resolves with the returned result of the function once complete.
     */
    executeFunction(functionName: string, args?: unknown[], transfer?: object[]): Promise<unknown>;
}

/**
 * A client-side class responsible for managing a set of web workers.
 * This interface is accessed as a singleton instance via game.workers.
 * @see Game#workers
 */
export class WorkerManager extends Map<string, AsyncWorker> {
    constructor();

    /**
     * Supported worker task actions
     */
    static WORKER_TASK_ACTIONS: Readonly<{ INIT: "init"; LOAD: "load"; EXECUTE: "execute" }>;

    /* -------------------------------------------- */
    /*  Worker Management                           */
    /* -------------------------------------------- */

    /**
     * Create a new named Worker.
     * @param name   The named Worker to create
     * @param config Worker configuration parameters passed to the AsyncWorker constructor
     * @returns The created AsyncWorker which is ready to accept tasks
     */
    createWorker(name: string, config?: AsyncWorkerOptions): Promise<AsyncWorker>;

    /**
     * Retire a current Worker, terminating it immediately.
     * @see Worker#terminate
     * @param name The named worker to terminate
     */
    retireWorker(name: string): void;
}
