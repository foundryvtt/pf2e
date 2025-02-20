/**
 * A simple Semaphore implementation which provides a limited queue for ensuring proper concurrency.
 *
 * @example Using a Semaphore
 * ```js
 * // Some async function that takes time to execute
 * function fn(x) {
 *   return new Promise(resolve => {
 *     setTimeout(() => {
 *       console.log(x);
 *       resolve(x);
 *     }, 1000));
 *   }
 * };
 *
 * // Create a Semaphore and add many concurrent tasks
 * const semaphore = new Semaphore(1);
 * for ( let i of Array.fromRange(100) ) {
 *   semaphore.add(fn, i);
 * }
 * ```
 */
export default class Semaphore {
    /**
     * @param max The maximum number of tasks which can be simultaneously attempted.
     */
    constructor(max: number);

    /**
     * The number of pending tasks remaining in the queue
     */
    get remaining(): number;

    /**
     * The number of actively executing tasks
     */
    get active(): number;

    /**
     * Add a new task to the managed queue
     * @param fn A callable function
     * @param args Function arguments
     * @returns A promise that resolves once the added function is executed
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(fn: (...args: any[]) => any, ...args: any[]): Promise<void>;

    /**
     * Abandon any tasks which have not yet concluded
     */
    clear(): void;

    /**
     * Attempt to perform a task from the queue.
     * If all workers are busy, do nothing.
     * If successful, try again.
     */
    protected _try(): Promise<void>;
}
