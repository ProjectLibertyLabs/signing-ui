// @ts-ignore
import { web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { u32 } from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
export async function getBlockNumber(api) {
    let blockData = await api.rpc.chain.getBlock();
    return blockData.block.header.number.toNumber();
}
export function parseChainEvent({ events = [], status }) {
    if (status.isInvalid) {
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
                    alert(`Transaction failed with error: ${chainEvent.toString()}`);
                }
            }
        });
    }
}
export async function submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey) {
    const injector = await web3FromSource(signingAccount.meta.source);
    await extrinsic.signAndSend(signingKey, { signer: injector.signer }, { nonce: -1 }, parseChainEvent);
}
export async function submitExtrinsicWithKeyring(extrinsic, signingAccount) {
    await extrinsic.signAndSend(signingAccount, { nonce: -1 }, parseChainEvent);
}
// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
export async function signPayloadWithExtension(signingAccount, signingKey, payload) {
    // TODO: allow signing account and MSA Owner Key to be different
    const injector = await web3FromSource(signingAccount.meta.source);
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed;
    if (signer && isFunction(signRaw)) {
        const signerPayloadRaw = {
            address: signingAccount.address, data: payload, type: 'bytes'
        };
        signed = await signRaw(signerPayloadRaw);
        return signed?.signature;
    }
    return "";
}
// returns a properly formatted signature to submit with an extrinsic
export function signPayloadWithKeyring(signingAccount, payload) {
    return u8aToHex(signingAccount.sign(wrapToU8a(payload)));
}
export async function getCurrentPaginatedHash(api, msaId, schemaId, page_id) {
    const result = await api.rpc.statefulStorage.getPaginatedStorage(msaId, schemaId);
    const page_response = result.filter((page) => page.page_id.toNumber() === page_id);
    if (page_response.length <= 0) {
        return new u32(api.registry, 0);
    }
    return new u32(api.registry, page_response[0].content_hash);
}
export async function getCurrentItemizedHash(api, msaId, schemaId) {
    try {
        // @ts-ignore
        const result = await api.rpc.statefulStorage.getItemizedStorage(msaId, schemaId);
        return result.content_hash;
    }
    catch (e) {
        alert(`getCurrentItemizedHash failed: ${JSON.stringify(e.message)}`);
        return 0;
    }
}
export function wrapToU8a(payload) {
    return u8aWrapBytes(payload.toU8a());
}
