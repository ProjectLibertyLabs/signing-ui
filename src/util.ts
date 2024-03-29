export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WaitOptions = { interval?: number; timeout?: number };

export async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  { interval = 500, timeout = 36000 }: WaitOptions = {},
): Promise<boolean> {
  const asyncPredicate = () => Promise.resolve(predicate());
  let elapsed = 0;
  while (!(await asyncPredicate())) {
    if (elapsed > timeout) {
      throw Error("Timeout");
    }
    await sleep(interval);
    elapsed += interval;
  }
  return true;
}
