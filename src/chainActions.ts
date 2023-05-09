// @ts-ignore
import { ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';

async function getBlockNumber(api: ApiPromise): Promise<number> {
    let blockData = await api.rpc.chain.getBlock();
    return (await blockData.block.header.number.toNumber())
}

export {
    getBlockNumber,
}

