// @ts-ignore
import { web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
/// this may not work
// @ts-ignore
import {SubmittableExtrinsic} from "https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm/promise/types";
// @ts-ignore
import { EventRecord, ExtrinsicStatus, Signer, SignerResult, SignerPayloadRaw, Sr25519Signature, u16, u32 } from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import { Keyring, KeyringPair } from 'https://cdn.jsdelivr.net/npm/@polkadot/keyring@12.1.2/+esm'
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes} from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
// @ts-ignore
import { PageId, PaginatedStorageResponse } from "@frequency-chain/api-augment/interfaces";
// @ts-ignore
import {InjectedAccountWithMeta} from "https://cdn.jsdelivr.net/npm/@polkadot/extension-inject@0.46.3/+esm";


async function getBlockNumber(api: ApiPromise): Promise<number> {
    let blockData = await api.rpc.chain.getBlock();
    return blockData.block.header.number.toNumber()
}

function parseChainEvent({ events = [], status }: { events?: EventRecord[], status: ExtrinsicStatus; }) {
    if (status.isInvalid) {
        console.error("isError")
    }  else if ( status.isFinalized || status.isInBlock ) {
        events.forEach((eventRecord: EventRecord) => {
            if (eventRecord.event.section === 'system') {
                const chainEvent = eventRecord.event.toHuman();
                if (chainEvent.method === 'ExtrinsicSuccess') {
                    alert('Transaction succeeded');
                } else if (chainEvent.method === 'ExtrinsicFailed') {
                    alert(`Transaction failed with error: ${chainEvent.toString()}`);
                }
            }
        })
    }
}

async function submitExtrinsicWithExtension(extrinsic: any, signingAccount: any, signingKey: string): Promise<void> {
    const injector = await web3FromSource(signingAccount.meta.source);
    await extrinsic.signAndSend(signingKey, {signer: injector.signer}, parseChainEvent );
}

async function submitExtrinsicWithKeyring(extrinsic: SubmittableExtrinsic, signingAccount: KeyringPair): Promise<void> {
    await extrinsic.signAndSend(signingAccount, parseChainEvent );
}

// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
async function signPayloadWithExtension(signingAccount: InjectedAccountWithMeta, signingKey: string, payload: any): Promise<string>{
    // TODO: allow signing account and MSA Owner Key to be different
    const injector = await web3FromSource(signingAccount.meta.source);
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed: SignerResult;
    if (signer && isFunction(signRaw)) {
        const signerPayloadRaw: SignerPayloadRaw = {
            address: signingAccount.address, data: payload, type: 'bytes'

        }
        signed = await signRaw(signerPayloadRaw)
        return signed?.signature;
    }
    return ""
}

// returns a properly formatted signature to submit with an extrinsic
function signPayloadWithKeyring(signingAccount: KeyringPair, payload: any): string {
    return u8aToHex(signingAccount.sign(wrapToU8a(payload)));
}

async function getPaginatedStorage(api: ApiPromise, msaId: number, schemaId: number): Promise<Array<PaginatedStorageResponse>> {
    // @ts-ignore
    let result: Array<PaginatedStorageResponse> = await api.rpc.statefulStorage.getPaginatedStorage(msaId, schemaId);
    console.log({result});
    return result;
}

export async function getCurrentPaginatedHash(api: ApiPromise, msaId: number, schemaId: number, page_id: number): Promise<u32> {
    const result = await getPaginatedStorage(api, msaId, schemaId);
    let realPageId = new u16(api.registry, page_id);
    const page_response = result.filter((page) => page.page_id === realPageId);
    if (page_response.length <= 0) {
        return new u32(api.registry, 0);
    }

    return new u32(api.registry, page_response[0].content_hash);
}

export async function getCurrentItemizedHash(api: ApiPromise, msaId: number, schemaId: number): Promise<number> {
    try {
        // @ts-ignore
        const result = await api.rpc.statefulStorage.getItemizedStorage(msaId, schemaId);
        return result.content_hash;
    } catch(e) {
        alert(`getCurrentItemizedHash failed: ${JSON.stringify((e as Error).message)}`);
        return 0;
    }
}

function wrapToU8a(payload: any): Uint8Array {
    return u8aWrapBytes(payload.toU8a())
}

export {
    getBlockNumber,
    signPayloadWithExtension,
    signPayloadWithKeyring,
    submitExtrinsicWithKeyring,
    submitExtrinsicWithExtension,
    wrapToU8a,
}

