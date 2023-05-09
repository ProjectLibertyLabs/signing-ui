async function getBlockNumber(api) {
    let blockData = await api.rpc.chain.getBlock();
    return (await blockData.block.header.number.toNumber());
}
export { getBlockNumber, };
