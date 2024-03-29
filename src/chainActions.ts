// @ts-ignore
import { web3FromSource } from "https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm";
// @ts-ignore
import { ApiPromise } from "https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm";
/// this may not work
// @ts-ignore
import { SubmittableExtrinsic } from "https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm/promise/types";
// @ts-ignore
import {
  EventRecord,
  ExtrinsicStatus,
  Signer,
  SignerResult,
  SignerPayloadRaw,
  Sr25519Signature,
  u16,
  u32,
} from "https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm";
// @ts-ignore
import { Keyring, KeyringPair } from "https://cdn.jsdelivr.net/npm/@polkadot/keyring@12.1.2/+esm";
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes } from "https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm";
// @ts-ignore
import { PageId, PaginatedStorageResponse } from "@frequency-chain/api-augment/interfaces";
// @ts-ignore
import { InjectedAccountWithMeta } from "https://cdn.jsdelivr.net/npm/@polkadot/extension-inject@0.46.3/+esm";

import { waitFor } from "./util.js";
import { showExtrinsicStatus } from "./domActions.js";

export async function getBlockNumber(api: ApiPromise): Promise<number> {
  let blockData = await api.rpc.chain.getBlock();
  return blockData.block.header.number.toNumber();
}

function parseChainEvent({ events = [], status }: { events?: EventRecord[]; status: ExtrinsicStatus }): void {
  if (status.isInvalid) {
    showExtrinsicStatus("Invalid transaction");
    return;
  } else if (status.isFinalized) {
    showExtrinsicStatus(`Transaction is finalized in blockhash ${status.asFinalized.toHex()}`);
    events.forEach(({ event }) => {
      if (event.method === "ExtrinsicSuccess") {
        showExtrinsicStatus("Transaction succeeded");
      } else if (event.method === "ExtrinsicFailed") {
        showExtrinsicStatus("Transaction failed. See chain explorer for details.");
      }
    });
    return;
  } else if (status.isInBlock) {
    showExtrinsicStatus(`Transaction is included in blockHash ${status.asInBlock.toHex()}`);
  } else {
    if (!!status?.status) {
      showExtrinsicStatus(status.toHuman());
    }
  }
}

export async function submitExtrinsicWithExtension(
  extrinsic: any,
  signingAccount: any,
  signingKey: string,
  onTxDone: () => void,
): Promise<void> {
  const injector = await web3FromSource(signingAccount.meta.source);
  let currentTxDone = false;
  try {
    function sendStatusCb({ events = [], status }: { events?: EventRecord[]; status: ExtrinsicStatus }) {
      if (status.isInvalid) {
        alert("Transaction is Invalid");
        currentTxDone = true;
      } else if (status.isReady) {
        showExtrinsicStatus("Transaction is Ready");
      } else if (status.isBroadcast) {
        showExtrinsicStatus("Transaction is Broadcast");
      } else if (status.isInBlock) {
        showExtrinsicStatus(`Transaction is included in blockHash ${status.asInBlock.toHex()}`);
      } else if (status.isFinalized) {
        showExtrinsicStatus(`Transaction is finalized in blockhash ${status.asFinalized.toHex()}`);
        events.forEach(({ event }) => {
          if (event.method === "ExtrinsicSuccess") {
            showExtrinsicStatus("Transaction succeeded");
          } else if (event.method === "ExtrinsicFailed") {
            showExtrinsicStatus("Transaction failed. See chain explorer for details.");
          }
        });
        currentTxDone = true;
      }
    }

    await extrinsic.signAndSend(signingKey, { signer: injector.signer, nonce: -1 }, sendStatusCb);
    await waitFor(() => currentTxDone);
  } catch (e) {
    showExtrinsicStatus((e as Error).message);
    console.info(
      "Timeout reached, transaction was invalid, or transaction was canceled by user. currentTxDone: ",
      currentTxDone,
    );
  } finally {
    onTxDone();
  }
}

export async function submitExtrinsicWithKeyring(
  extrinsic: SubmittableExtrinsic,
  signingAccount: KeyringPair,
  onTxDone: () => void,
): Promise<void> {
  try {
    await extrinsic.signAndSend(signingAccount, { nonce: -1 }, parseChainEvent);
  } catch (e: any) {
    alert(`There was a problem:  ${e.toString()}`);
  } finally {
    onTxDone();
  }
}

// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
export async function signPayloadWithExtension(
  signingAccount: InjectedAccountWithMeta,
  signingKey: string,
  payload: any,
): Promise<string> {
  const injector = await web3FromSource(signingAccount.meta.source);
  const signer = injector?.signer;
  const signRaw = signer?.signRaw;
  let signed: SignerResult;
  if (signer && isFunction(signRaw)) {
    const payloadWrappedToU8a = wrapToU8a(payload);
    const signerPayloadRaw = {
      address: signingAccount.address,
      data: payloadWrappedToU8a,
      type: "bytes",
    };
    try {
      signed = await signRaw(signerPayloadRaw);
      return signed?.signature;
    } catch (e: any) {
      alert(`Signing failed: ${e.message}`);
      return "ERROR " + e.message;
    }
  }
  return "Unknown error";
}

// returns a properly formatted signature to submit with an extrinsic
export function signPayloadWithKeyring(signingAccount: KeyringPair, payload: any): string {
  try {
    return u8aToHex(signingAccount.sign(wrapToU8a(payload)));
  } catch (e: any) {
    alert(`Signing failed: ${e.message}`);
    return "ERROR " + e.message;
  }
}

export async function getCurrentPaginatedHash(
  api: ApiPromise,
  msaId: number,
  schemaId: number,
  page_id: number,
): Promise<u32> {
  const result = await api.rpc.statefulStorage.getPaginatedStorage(msaId, schemaId);
  const page_response = result.filter((page) => page.page_id.toNumber() === page_id);
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
  } catch (e) {
    alert(`getCurrentItemizedHash failed: ${JSON.stringify((e as Error).message)}`);
    return 0;
  }
}

export function wrapToU8a(payload: any): Uint8Array {
  return u8aWrapBytes(payload.toU8a());
}
