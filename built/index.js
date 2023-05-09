// @ts-ignore
import { WsProvider, ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
// @ts-ignore
import { web3Accounts, web3Enable, web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { Bytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import { isFunction, u8aToHex, u8aWrapBytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
// @ts-ignore
import { Keyring } from 'https://cdn.jsdelivr.net/npm/@polkadot/keyring@12.1.2/+esm';
import { setVisibility } from "./domActions.js";
// const Hash = interfaces.Hash;
let PREFIX = 42;
let UNIT = "UNIT";
let singletonApi;
let singletonProvider;
let providerName;
let validAccounts = {};
let registeredEvents = {};
const GENESIS_HASHES = {
    rococo: "0x0c33dfffa907de5683ae21cc6b4af899b5c4de83f3794ed75b2dc74e1b088e72",
    frequency: "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1",
};
async function loadApi(providerUri) {
    // Singleton
    if (!providerUri && singletonApi)
        return singletonApi;
    if (!providerUri) {
        // they didn't select anything
        return null;
    }
    // Handle disconnects
    if (providerUri) {
        if (singletonApi) {
            await singletonApi.disconnect();
        }
        else if (singletonProvider) {
            await singletonProvider.disconnect();
        }
    }
    // Singleton Provider because it starts trying to connect here.
    singletonProvider = new WsProvider(providerUri);
    singletonApi = await ApiPromise.create({ provider: singletonProvider });
    await singletonApi.isReady;
    const chain = await singletonApi.rpc.system.properties();
    PREFIX = Number(chain.ss58Format.toString());
    UNIT = chain.tokenSymbol.toHuman();
    document.getElementById("unit").innerText = UNIT;
    let blockNumber = await getBlockNumber();
    console.log({ blockNumber });
}
function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    if (!registeredEvents["extrinsics"]) {
        document.getElementById("extrinsics").addEventListener("change", showExtrinsicForm);
        document.getElementById('signed_payload').value = '';
        registeredEvents["extrinsics"] = true;
    }
    return;
}
function registerExtrinsicsButtonHandlers() {
    if (!registeredEvents['createMsaButton']) {
        document.getElementById('createMsaButton').addEventListener("click", createMsa);
        document.getElementById('handles_claim_handle_sign_button').addEventListener("click", signClaimHandle);
        document.getElementById('handles_claim_handle_submit_button').addEventListener("click", submitClaimHandle);
        document.getElementById('add_public_key_to_msa_sign_button').addEventListener("click", addPublicKeyToMsaSignPayload);
        // document.getElementById('add_public_key_to_msa_submit_button').addEventListener("click", addPublicKeyToMsaSubmitExtrinsic);
        // TODO: change to fn ptr and use a general click handler that routes to the right place
        registeredEvents['createMsaButton'] = true;
        registeredEvents['handles_claim_handle_sign_button'] = true;
        registeredEvents['add_public_key_to_msa_sign_button'] = true;
    }
}
// assumes only 1 item is selected.
function getSelectedOption(elementId) {
    let select = document.getElementById(elementId);
    return select.selectedOptions[0];
}
// Gets the raw value from HTMLInputElement
function getHTMLInputValue(elementId) {
    let input = document.getElementById(elementId);
    return input.value;
}
// Connect to the wallet and blockchain
async function connect(event) {
    event.preventDefault();
    let selectedProvider = getSelectedOption('provider-list');
    providerName = selectedProvider.getAttribute("name");
    await loadApi(selectedProvider.getAttribute("value"));
    await loadAccounts();
    resetForms();
    document.getElementById("setupExtrinsic").setAttribute("class", "ready");
    listenForExtrinsicsChange();
    registerExtrinsicsButtonHandlers();
    setVisibility('createMsaForm', true);
    return;
}
async function loadAccounts() {
    // meta.source contains the name of the extension that provides this account
    const extensions = await web3Enable('Frequency parachain signer helper');
    if (!extensions.length) {
        alert("Polkadot{.js} extension not found; please install it first.");
        return;
    }
    validAccounts = {};
    let allAccounts = await web3Accounts();
    // clear options
    document.getElementById("signing-address").innerHTML = "";
    // populating for localhost and for a parachain are different since with localhost, there is
    // access to the Alice/Bob/Charlie accounts etc., and so won't use the extension.
    if (providerName === "localhost") {
        const keyring = new Keyring({ type: 'sr25519' });
        // Add Alice to our keyring with a hard-derivation path (empty phrase, so uses dev)
        ['//Alice', '//Bob', '//Charlie', '//Dave'].forEach(accountName => {
            let account = keyring.addFromUri(accountName);
            account.meta.name = accountName;
            validAccounts[account.address] = account;
        });
    }
    else {
        allAccounts.forEach(a => {
            // display only the accounts allowed for this chain
            // TODO: add Alice..Ferdie accounts if localhost. add everything for localhost for now
            if (!a.meta.genesisHash
                || GENESIS_HASHES[providerName] === a.meta.genesisHash) {
                validAccounts[a.address] = a;
            }
        });
    }
    // set options in the account dropdown.
    let accountsSelect = document.getElementById("signing-address");
    Object.keys(validAccounts).forEach(key => {
        const el = document.createElement("option");
        const a = validAccounts[key];
        el.setAttribute("value", a.address);
        el.setAttribute("name", a.address);
        el.innerText = `${a.meta.name}: ${a.address}`;
        accountsSelect.add(el);
    });
}
// resetForms puts the form state back to initial setup with first extrinsic selected and first form showing
function resetForms() {
    setVisibility("handles_claim_handle", true);
    const selectedExtrinsic = getSelectedOption("extrinsics");
    const toBeCleared = document.getElementsByClassName('clear_on_reset');
    for (let i = 0; i < toBeCleared.length; i++) {
        toBeCleared.item(i).value = '';
    }
    const toBeDisabled = document.getElementsByClassName('disable_on_reset');
    for (let i = 0; i < toBeDisabled.length; i++) {
        toBeDisabled.item(i).disabled = false;
    }
    if (selectedExtrinsic.value !== "handles_claim_handle") {
        setVisibility(selectedExtrinsic.value, false);
        selectedExtrinsic.selected = false;
    }
}
function showExtrinsicForm(event) {
    event.preventDefault();
    const selectedEl = event.target.selectedOptions[0];
    const formToShow = selectedEl.value;
    // hide all the forms but the selected ones.
    const forms = document.getElementsByClassName("extrinsic-form");
    for (let i = 0; i < forms.length; i++) {
        let form_id = forms.item(i).id;
        setVisibility(form_id, form_id === formToShow);
    }
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
// createMSA
async function createMsa(event) {
    event.preventDefault();
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const extrinsic = singletonApi.tx.msa.create();
    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount) :
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}
// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
async function signPayloadWithExtension(signingAccount, signingKey, payloadWrappedToU8a) {
    // TODO: allow signing account and MSA Owner Key to be different
    const injector = await web3FromSource(signingAccount.meta.source);
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed;
    if (signer && isFunction(signRaw)) {
        signed = await signRaw({
            address: signingKey,
            data: payloadWrappedToU8a,
            type: 'bytes'
        });
    }
    return signed?.signature;
}
// ------------------- signClaimHandle
async function signClaimHandle(_event) {
    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const handle_vec = new Bytes(singletonApi.registry, getHTMLInputValue('claim_handle_handle'));
    const expiration = parseInt(getHTMLInputValue('claim_handle_expiration'), 10);
    const rawPayload = { baseHandle: handle_vec, expiration: expiration };
    const payload = singletonApi.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", rawPayload);
    let payloadWrappedToU8a = u8aWrapBytes(payload.toU8a());
    const signature = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount, signingKey, payloadWrappedToU8a) :
        [null, u8aToHex(signingAccount.sign(payloadWrappedToU8a))];
    if (!signature) {
        alert("blank signature");
        return;
    }
    let signatureEl = document.getElementById('signed_payload');
    signatureEl.value = signature[1];
}
async function submitClaimHandle(_event) {
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const signature = getHTMLInputValue('signed_payload');
    const proof = { Sr25519: signature };
    const handle_vec = new Bytes(singletonApi.registry, getHTMLInputValue('claim_handle_handle'));
    const expiration = parseInt(getHTMLInputValue('claim_handle_expiration'), 10);
    const rawPayload = { baseHandle: handle_vec, expiration: expiration };
    const payload = singletonApi.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", rawPayload);
    const extrinsic = singletonApi.tx.handles.claimHandle(signingKey, proof, payload);
    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount) :
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}
// TODO: populate new MSA Owner key with a dropdown from available accounts
async function addPublicKeyToMsaSignPayload(event) {
    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const newKey = getHTMLInputValue('add_public_key_to_msa_new_key');
    const newAccount = validAccounts[newKey];
    let currentBlock = await getBlockNumber();
    const expiration = currentBlock + parseInt(getHTMLInputValue('add_public_key_to_msa_expiration'));
    let rawPayload = {
        msaId: getHTMLInputValue('add_public_key_to_msa_msa_id'),
        expiration: expiration,
        newPublicKey: newKey,
    };
    const payload = singletonApi.registry.createType("PalletMsaAddKeyData", rawPayload);
    const payloadWrappedToU8a = u8aWrapBytes(payload.toU8a());
    let signer;
    let ownerKeySignature;
    let newKeySignature;
    [signer, ownerKeySignature] = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount, signingKey, payloadWrappedToU8a) :
        [null, u8aToHex(signingAccount.sign(payloadWrappedToU8a))];
    [signer, newKeySignature] = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount, signingKey, payloadWrappedToU8a) :
        [null, u8aToHex(signingAccount.sign(payloadWrappedToU8a))];
    const ownerKeyProof = { Sr25519: ownerKeySignature };
    const newKeyProof = { Sr25519: newKeySignature };
    const extrinsic = singletonApi.tx.msa.addPublicKeyToMsa(signingAccount.publicKey, ownerKeyProof, newKeyProof, payload);
    const [chainEvent] = signer ?
        await extrinsic.signAndSend(signingAccount, { signer }) :
        await extrinsic.signAndSend(signingAccount);
    console.log({ chainEvent });
}
export async function getBlockNumber() {
    let blockData = await singletonApi.rpc.chain.getBlock();
    return (await blockData.block.header.number.toNumber());
}
function init() {
    document.getElementById("connectButton").addEventListener("click", connect);
}
init();
