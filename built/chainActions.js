// @ts-ignore
import { web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { u32 } from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
import { waitFor } from "./util.js";
import { showStatus } from "./domActions.js";
export async function getBlockNumber(api) {
    let blockData = await api.rpc.chain.getBlock();
    return blockData.block.header.number.toNumber();
}
function parseChainEvent({ events = [], status }) {
    if (status.isInvalid) {
        showStatus("Invalid transaction");
        return;
    }
    else if (status.isFinalized) {
        showStatus(`Transaction is finalized in blockhash ${status.asFinalized.toHex()}`);
        events.forEach(({ event }) => {
            if (event.method === 'ExtrinsicSuccess') {
                showStatus('Transaction succeeded');
            }
            else if (event.method === 'ExtrinsicFailed') {
                showStatus('Transaction failed. See chain explorer for details.');
            }
        });
        return;
    }
    else if (status.isInBlock) {
        showStatus(`Transaction is included in blockHash ${status.asInBlock.toHex()}`);
    }
    else {
        if (!!status?.status) {
            showStatus(status.toHuman());
        }
    }
}
export async function submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey, onTxDone) {
    const injector = await web3FromSource(signingAccount.meta.source);
    let currentTxDone = false;
    try {
        function sendStatusCb({ events = [], status }) {
            if (status.isInvalid) {
                alert('Transaction is Invalid');
                currentTxDone = true;
            }
            else if (status.isReady) {
                showStatus("Transaction is Ready");
            }
            else if (status.isBroadcast) {
                showStatus("Transaction is Broadcast");
            }
            else if (status.isInBlock) {
                showStatus(`Transaction is included in blockHash ${status.asInBlock.toHex()}`);
            }
            else if (status.isFinalized) {
                showStatus(`Transaction is finalized in blockhash ${status.asFinalized.toHex()}`);
                events.forEach(({ event }) => {
                    if (event.method === 'ExtrinsicSuccess') {
                        showStatus('Transaction succeeded');
                    }
                    else if (event.method === 'ExtrinsicFailed') {
                        showStatus('Transaction failed. See chain explorer for details.');
                    }
                });
                currentTxDone = true;
            }
        }
        await extrinsic.signAndSend(signingKey, { signer: injector.signer, nonce: -1 }, sendStatusCb);
        await waitFor(() => currentTxDone);
    }
    catch (e) {
        showStatus(e.message);
        console.info("Timeout reached, transaction was invalid, or transaction was canceled by user. currentTxDone: ", currentTxDone);
    }
    finally {
        onTxDone();
    }
}
export async function submitExtrinsicWithKeyring(extrinsic, signingAccount, onTxDone) {
    try {
        await extrinsic.signAndSend(signingAccount, { nonce: -1 }, parseChainEvent);
    }
    catch (e) {
        alert(`There was a problem:  ${e.toString()}`);
    }
    finally {
        onTxDone();
    }
}
// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
export async function signPayloadWithExtension(signingAccount, signingKey, payload) {
    const injector = await web3FromSource(signingAccount.meta.source);
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed;
    if (signer && isFunction(signRaw)) {
        const payloadWrappedToU8a = wrapToU8a(payload);
        const signerPayloadRaw = {
            address: signingAccount.address, data: payloadWrappedToU8a, type: 'bytes'
        };
        try {
            signed = await signRaw(signerPayloadRaw);
            return signed?.signature;
        }
        catch (e) {
            alert(`Signing failed: ${e.message}`);
            return "ERROR " + e.message;
        }
    }
    return "Unknown error";
}
// returns a properly formatted signature to submit with an extrinsic
export function signPayloadWithKeyring(signingAccount, payload) {
    try {
        return u8aToHex(signingAccount.sign(wrapToU8a(payload)));
    }
    catch (e) {
        alert(`Signing failed: ${e.message}`);
        return "ERROR " + e.message;
    }
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
