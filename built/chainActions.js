// @ts-ignore
import { web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
async function getBlockNumber(api) {
    let blockData = await api.rpc.chain.getBlock();
    return (await blockData.block.header.number.toNumber());
}
function parseChainEvent({ events = [], status }) {
    if (status.isError) {
        console.error("isError");
    }
    else if (status.isFinalized || status.isInBlock) {
        events.forEach((eventRecord) => {
            if (eventRecord.event.section === 'system') {
                const chainEvent = eventRecord.event.toHuman();
                if (chainEvent.method === 'ExtrinsicSuccess') {
                    alert('Transaction succeeded');
                }
                else if (chainEvent.method === 'ExtrinsicFailed') {
                    alert(`Transaction failed with error: ${chainEvent.data.dispatchError.Module.error}`);
                }
            }
        });
    }
}
async function submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey) {
    const injector = await web3FromSource(signingAccount.meta.source);
    await extrinsic.signAndSend(signingKey, { signer: injector.signer }, parseChainEvent);
}
async function submitExtrinsicWithKeyring(extrinsic, signingAccount) {
    await extrinsic.signAndSend(signingAccount, parseChainEvent);
}
// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
async function signPayloadWithExtension(signingAccount, signingKey, payload) {
    // TODO: allow signing account and MSA Owner Key to be different
    const injector = await web3FromSource(signingAccount.meta.source);
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed;
    if (signer && isFunction(signRaw)) {
        let payloadWrappedToU8a = u8aWrapBytes(payload.toU8a());
        signed = await signRaw({
            address: signer,
            data: payloadWrappedToU8a,
            type: 'bytes'
        });
    }
    return signed?.signature;
}
// returns a properly formatted signature to submit with an extrinsic
function signPayloadWithKeyring(signingAccount, payload) {
    return u8aToHex(signingAccount.sign(wrapToU8a(payload)));
}
function wrapToU8a(payload) {
    return u8aWrapBytes(payload.toU8a());
}
export { getBlockNumber, signPayloadWithExtension, signPayloadWithKeyring, submitExtrinsicWithKeyring, submitExtrinsicWithExtension, wrapToU8a, };
