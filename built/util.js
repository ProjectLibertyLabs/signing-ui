export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function waitFor(predicate, { interval = 500, timeout = 12000 } = {}) {
    const asyncPredicate = () => Promise.resolve(predicate());
    let elapsed = 0;
    while (!(await asyncPredicate())) {
        if (elapsed > timeout) {
            throw Error('Timeout');
        }
        await sleep(interval);
        elapsed += interval;
    }
    return true;
}
