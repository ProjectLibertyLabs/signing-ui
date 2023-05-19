// @ts-ignore
import {ApiPromise, WsProvider} from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
// @ts-ignore
import {web3Accounts, web3Enable} from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import {Bytes, Signer, Sr25519Signature, u16, u64} from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import {Keyring, KeyringPair} from 'https://cdn.jsdelivr.net/npm/@polkadot/keyring@12.1.2/+esm'
// @ts-ignore
import {InjectedAccountWithMeta} from "https://cdn.jsdelivr.net/npm/@polkadot/extension-inject@0.46.3/+esm";
import {
    clearFormInvalid,
    getHTMLInputValue,
    getSelectedOption,
    listenForExtrinsicsChange,
    setVisibility,
    validateForm,
} from "./domActions.js";

import {
    getBlockNumber,
    getCurrentItemizedHash,
    signPayloadWithExtension,
    signPayloadWithKeyring,
    submitExtrinsicWithExtension,
    submitExtrinsicWithKeyring,
} from "./chainActions.js";
import {ItemizedSignaturePayload} from "./types.js";

// @ts-ignore
import {options} from "https://cdn.jsdelivr.net/npm/@frequency-chain/api-augment@1.6.1/+esm";

// const Hash = interfaces.Hash;

let PREFIX = 42;
let UNIT = "UNIT";

type AnySigner = KeyringPair | InjectedAccountWithMeta;

let singletonApi: ApiPromise;
let singletonProvider: WsProvider;
let providerName: string;
let validAccounts: Record<string, AnySigner> = {};
let registeredEvents: Record<string, any> = {};

type EventHandler = (e: Event) => Promise<void>;

//  map of form submit button ids to event handlers.
let formListeners: Record<string, EventHandler> = {
    'create_msa_button': createMsa,
    'handles_claim_handle_sign_button': signClaimHandle,
    'handles_claim_handle_submit_button': submitClaimHandle,
    'msa_create_sponsored_account_with_delegation_sign_button': signCreateSponsoredAccountWithDelegation,
    'msa_create_sponsored_account_with_delegation_submit_button': submitCreateSponsoredAccountWithDelegation,
    'msa_grant_delegation_sign_button': signGrantDelegation,
    'msa_grant_delegation_submit_button': submitGrantDelegation,
    'add_public_key_to_msa_sign_button': signAddPublicKeyToMsa,
    'add_public_key_to_msa_submit_button': submitAddPublicKeyToMsa,
    'apply_item_actions_with_signature_sign_button': signApplyItemActionsWithSignature,
    'apply_item_actions_with_signature_submit_button': submitApplyItemActionsWithSignature,
    'upsert_page_with_signature_sign_button': signUpsertPageWithSignature,
    'upsert_page_with_signature_submit_button': submitUpsertPageWithSignature,
    'delete_page_with_signature_sign_button': signDeletePageWithSignature,
    'delete_page_with_signature_submit_button': submitDeletePageWithSignature,

};

const GENESIS_HASHES: Record<string, string> = {
    rococo: "0x0c33dfffa907de5683ae21cc6b4af899b5c4de83f3794ed75b2dc74e1b088e72",
    frequency: "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1",
}

async function getApi(providerUri: string) {
    // Singleton
    if (!providerUri && singletonApi) return singletonApi;
    if (!providerUri) {
        // they didn't select anything
        return null;
    }
    // Handle disconnects
    if (providerUri) {
        if (singletonApi) {
            await singletonApi.disconnect();
        } else if (singletonProvider) {
            await singletonProvider.disconnect();
        }
    }

    // Singleton Provider because it starts trying to connect here.
    singletonProvider = new WsProvider(providerUri);
    singletonApi = await ApiPromise.create({
        provider: singletonProvider,
        ...options,
    });

    await singletonApi.isReady;
    return singletonApi;
}

function registerExtrinsicsButtonHandlers() {
    if (!registeredEvents['extrinsicsButtons']) {
        Object.keys(formListeners).forEach(elementId => {
            (document.getElementById(elementId) as HTMLElement).addEventListener('click', formListeners[elementId]);
        })
        registeredEvents['extrinsicsButtons'] = true;
    }
}

// Connect to the wallet and blockchain
async function connect(event: Event) {
    event.preventDefault();
    let selectedProvider = getSelectedOption('provider-list');
    providerName = selectedProvider.getAttribute("name") || "";
    const api = await getApi(selectedProvider.value);

    if (api) {
        const chain = await api.rpc.system.properties();
        PREFIX = Number(chain.ss58Format.toString());
        UNIT = chain.tokenSymbol.toString();
        (document.getElementById("unit") as HTMLElement).innerText = UNIT;
        let blockNumber = await getBlockNumber(singletonApi);
        (document.getElementById("current-block") as HTMLElement).innerHTML = blockNumber.toString();

        await loadAccounts();
        (document.getElementById("setupExtrinsic") as HTMLElement).setAttribute("class", "ready");
        setVisibility('create_msa_form', true);
        setVisibility('extrinsics_forms', true);
        setVisibility('payload', true)
        resetForms()
        listenForExtrinsicsChange();
        registerExtrinsicsButtonHandlers();
    } else {
        alert(`could not connect to ${providerName}`)
    }
    return;
}

function populateDropdownWithAccounts(elementId: string) {
    let accountsSelect = document.getElementById(elementId) as HTMLSelectElement;
    Object.keys(validAccounts).forEach( key => {
        const el = document.createElement("option") as HTMLOptionElement;
        const a =  validAccounts[key];
        el.setAttribute("value", a.address);
        el.setAttribute("name", a.address);
        el.innerText = `${a.meta.name}: ${a.address}`;
        accountsSelect.add(el);
    })


}

async function loadAccounts() {
    // clear options
    (document.getElementById("signing-address") as HTMLElement).innerHTML = "";

    // populating for localhost and for a parachain are different since with localhost, there is
    // access to the Alice/Bob/Charlie accounts etc., and so won't use the extension.
    if (providerName === "localhost") {
        const keyring = new Keyring({ type: 'sr25519' });

        // Add Alice to our keyring with a hard-derivation path (empty phrase, so uses dev)
        ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'].forEach(accountName => {
            let account = keyring.addFromUri(accountName);
            account.meta.name = accountName;
            validAccounts[account.address] = account;
        })
    } else {
        // meta.source contains the name of the extension that provides this account
        const extensions = await web3Enable('Frequency parachain signer helper');
        if (!extensions.length) {
            alert("Polkadot{.js} extension not found; please install it first.");
            return;
        }
        validAccounts = {};
        let allAccounts = await web3Accounts();
        allAccounts.forEach(a => {
            // display only the accounts allowed for this chain
            if (!a.meta.genesisHash
                || GENESIS_HASHES[providerName] === a.meta.genesisHash) {
                validAccounts[a.address] = a;
            }
        });
    }

    // set options in the account dropdown.
    [
        'signing-address',
        'claim_handle_msaOwnerKey',
        'add_public_key_to_msa_new_key',
        'create_sponsored_account_with_delegation_delegator_key',
        'grant_delegation_delegator_key',
        'apply_item_actions_with_signature_delegator_key'
    ].forEach(selectId => populateDropdownWithAccounts(selectId))
}

// resetForms puts the form state back to initial setup with first extrinsic selected and first form showing
function resetForms() {
    setVisibility("handles_claim_handle", true);
    const selectedExtrinsic: HTMLOptionElement = getSelectedOption("extrinsics");

    const toBeCleared  = document.getElementsByClassName('clear_on_reset') as HTMLCollectionOf<HTMLInputElement>;
    for (let i=0; i<toBeCleared.length; i++) {
        const item = toBeCleared.item(i) as HTMLInputElement
        item.value = ''; 
    }

    const toBeDisabled = document.getElementsByClassName('disable_on_reset') as HTMLCollectionOf<HTMLInputElement>;
    for (let i=0; i<toBeDisabled.length; i++) {
        const item = toBeCleared.item(i) as HTMLInputElement
        item.disabled = false; 
    }

    if (selectedExtrinsic.value !== "handles_claim_handle") {
        setVisibility(selectedExtrinsic.value, false);
        selectedExtrinsic.selected = false;
    }
}

// createMSA
async function createMsa(event: Event) {
    event.preventDefault();
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const extrinsic = singletonApi.tx.msa.create();

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair) :
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}


// ------------------- signClaimHandle
async function signClaimHandle(event: Event) {
    event.preventDefault();
    const formId = 'handles_claim_handle';
    if (!validateForm(formId)) {
        return;
    }
    clearFormInvalid(formId);
    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    // TODO: allow to claim handle by other account
    // const msaOwnerKey = getSelectedOption('claim_handle_msaOwnerKey').value;
    // const msaOwnerAccount = validAccounts[msaOwnerKey];

    const handle_vec = new Bytes(singletonApi.registry, getHTMLInputValue('claim_handle_handle'));
    const expiration = parseInt(getHTMLInputValue('claim_handle_expiration'), 10);

    const rawPayload = { baseHandle: handle_vec,  expiration: expiration }
    const payload = singletonApi.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", rawPayload);

    const signature = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount as InjectedAccountWithMeta, signingKey, payload) :
        signPayloadWithKeyring(signingAccount as KeyringPair, payload);

    let signatureEl = document.getElementById('signed_payload') as HTMLTextAreaElement;
    signatureEl.value = signature;
}

async function submitClaimHandle(event: Event) {
    event.preventDefault();
    const formId = 'handles_claim_handle';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const signature = getHTMLInputValue('signed_payload');
    const proof = { Sr25519: signature };

    const handle_vec = new Bytes(singletonApi.registry, getHTMLInputValue('claim_handle_handle'));
    const expiration = parseInt(getHTMLInputValue('claim_handle_expiration'), 10);
    const rawPayload = { baseHandle: handle_vec,  expiration: expiration}
    const payload = singletonApi.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", rawPayload);
    const extrinsic = singletonApi.tx.handles.claimHandle(signingKey, proof, payload.toU8a());

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair):
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}


type AddKeyData = { msaId?: number; expiration?: any; newPublicKey?: any; }
// TODO: populate new MSA Owner key with a dropdown from available accounts
async function signAddPublicKeyToMsa(event: Event) {
    event.preventDefault();
    const formId = 'msa_add_public_key_to_msa';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    const newKey = getHTMLInputValue('add_public_key_to_msa_new_key');
    const newAccount = validAccounts[newKey];

    const expiration = parseInt(getHTMLInputValue('add_public_key_to_msa_expiration'));

    let rawPayload: AddKeyData = {
        msaId: parseInt(getHTMLInputValue('add_public_key_to_msa_msa_id')),
        expiration: expiration,
        newPublicKey: newKey,
    }
    const payload = singletonApi.registry.createType("PalletMsaAddKeyData", rawPayload);
    let ownerKeySignature: string;
    let newKeySignature: string;

    ownerKeySignature = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount as InjectedAccountWithMeta, signingKey, payload) :
        signPayloadWithKeyring(signingAccount as KeyringPair, payload);
    (document.getElementById('signed_payload') as HTMLTextAreaElement).value = ownerKeySignature;

    newKeySignature = providerName !== 'localhost' ?
        await signPayloadWithExtension(signingAccount as InjectedAccountWithMeta, signingKey, payload) :
        signPayloadWithKeyring(newAccount as KeyringPair, payload);
    (document.getElementById('signed_payload2') as HTMLTextAreaElement).value = newKeySignature;

}

async function submitAddPublicKeyToMsa(event: Event) {
    event.preventDefault();
    const formId = 'msa_add_public_key_to_msa';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    const newKey = getHTMLInputValue('add_public_key_to_msa_new_key');

    const expiration = parseInt(getHTMLInputValue('add_public_key_to_msa_expiration'));

    let rawPayload: AddKeyData = {
        msaId: parseInt(getHTMLInputValue('add_public_key_to_msa_msa_id')),
        expiration: expiration,
        newPublicKey: newKey,
    }
    const payload = singletonApi.registry.createType("PalletMsaAddKeyData", rawPayload);

    const ownerKeyProof = { Sr25519: getHTMLInputValue('signed_payload') }
    const newKeyProof = { Sr25519: getHTMLInputValue('signed_payload2') }
    const extrinsic = singletonApi.tx.msa.addPublicKeyToMsa(signingAccount.address, ownerKeyProof, newKeyProof, payload.toU8a());

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair):
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);

}

type AddProviderPayload = { authorizedMsaId: number; schemaIds: number[], expiration: number; }
async function signCreateSponsoredAccountWithDelegation(event: Event) {
    event.preventDefault();
    const formId = 'msa_create_sponsored_account_with_delegation';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    const delegatorKey = getHTMLInputValue('create_sponsored_account_with_delegation_delegator_key');
    const delegatorAccount = validAccounts[delegatorKey];

    const authorizedMsaId = parseInt(getHTMLInputValue('create_sponsored_account_with_delegation_provider'));
    const expiration = parseInt(getHTMLInputValue('create_sponsored_account_with_delegation_expiration'));
    const schemaIds = getHTMLInputValue('create_sponsored_account_with_delegation_schema_ids')
        .split(/,\s+?/)
        .map(item => parseInt(item));

    const rawPayload = { authorizedMsaId, expiration, schemaIds }
    const payload = singletonApi.registry.createType("PalletMsaAddProvider", rawPayload);

    const signature = providerName == 'localhost' ?
        signPayloadWithKeyring(delegatorAccount as KeyringPair, payload) :
        await signPayloadWithExtension(delegatorAccount as InjectedAccountWithMeta, delegatorKey, payload)

    let signatureEl = document.getElementById('signed_payload') as HTMLTextAreaElement;
    signatureEl.value = signature;
}
async function submitCreateSponsoredAccountWithDelegation(event: Event) {
    event.preventDefault();
    const formId = 'msa_create_sponsored_account_with_delegation';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const delegatorKey = getHTMLInputValue('create_sponsored_account_with_delegation_delegator_key');
    const authorizedMsaId = parseInt(getHTMLInputValue('create_sponsored_account_with_delegation_provider'));
    const expiration = parseInt(getHTMLInputValue('create_sponsored_account_with_delegation_expiration'));
    const schemaIds = getHTMLInputValue('create_sponsored_account_with_delegation_schema_ids')
        .split(/,\s+?/)
        .map(item => parseInt(item));

    const proof = { Sr25519: getHTMLInputValue('signed_payload') };
    const rawPayload: AddProviderPayload = { authorizedMsaId, expiration, schemaIds }
    const payload = singletonApi.registry.createType("PalletMsaAddProvider", rawPayload);

    const extrinsic = singletonApi.tx.msa.createSponsoredAccountWithDelegation(delegatorKey, proof, payload.toU8a())

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair):
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}

async function signGrantDelegation(event: Event) {
    event.preventDefault()
    const formId = 'msa_grant_delegation';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    const delegatorKey = getHTMLInputValue('grant_delegation_delegator_key');
    const delegatorAccount = validAccounts[delegatorKey];

    const authorizedMsaId = parseInt(getHTMLInputValue('grant_delegation_provider'));
    const expiration = parseInt(getHTMLInputValue('grant_delegation_expiration'));
    const schemaIds  = getHTMLInputValue('grant_delegation_schema_ids')
        .split(/,\s+?/)
        .map(item => parseInt(item));

    const rawPayload: AddProviderPayload = { authorizedMsaId, expiration, schemaIds }
    const payload = singletonApi.registry.createType("PalletMsaAddProvider", rawPayload);

    const signature = providerName == 'localhost' ?
        signPayloadWithKeyring(delegatorAccount as KeyringPair, payload) :
        await signPayloadWithExtension(delegatorAccount as InjectedAccountWithMeta, delegatorKey, payload)

    let signatureEl = document.getElementById('signed_payload') as HTMLTextAreaElement;
    signatureEl.value = signature;
}

async function submitGrantDelegation(event: Event) {
    event.preventDefault();
    const formId = 'msa_grant_delegation';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    const delegatorKey = getHTMLInputValue('grant_delegation_delegator_key');

    const authorizedMsaId = parseInt(getHTMLInputValue('grant_delegation_provider'));
    const expiration = parseInt(getHTMLInputValue('grant_delegation_expiration'));
    const schemaIds = getHTMLInputValue('grant_delegation_schema_ids')
        .split(/,\s+?/)
        .map(item => parseInt(item));

    const rawPayload: AddProviderPayload = { authorizedMsaId, expiration, schemaIds }
    const payload = singletonApi.registry.createType("PalletMsaAddProvider", rawPayload);

    const proof = { Sr25519: getHTMLInputValue('signed_payload') };

    const extrinsic = singletonApi.tx.msa.grantDelegation(delegatorKey, proof, payload.toU8a())

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair):
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);

}

async function getApplyItemActionsWithSignatureFormData(): Promise<[string, any, any]> {
    const delegatorKey = getHTMLInputValue('apply_item_actions_with_signature_delegator_key');
    const delegatorAccount = validAccounts[delegatorKey];

    const delegatorMsaId = parseInt(getHTMLInputValue('apply_item_actions_with_signature_delegator_msa'));
    const itemizedSchemaId = parseInt(getHTMLInputValue('apply_item_actions_with_signature_schema_id'));

    const p1 = getHTMLInputValue('apply_item_actions_with_signature_actions1')
    const payload1 = new Bytes(singletonApi.registry, p1);

    let p2 = getHTMLInputValue('apply_item_actions_with_signature_actions2');
    console.log({p2});
    const payload2 = new Bytes(singletonApi.registry, "S");

    const expiration = parseInt(getHTMLInputValue('apply_item_actions_with_signature_expiration'));
    const targetHash = await getCurrentItemizedHash(singletonApi, delegatorMsaId, itemizedSchemaId);
    const addActions = [{Add: payload1}];
    const rawPayload = {
        msaId: delegatorMsaId,
        targetHash: targetHash,
        schemaId: itemizedSchemaId,
        actions: addActions,
        expiration,
    };
    const payload = singletonApi.registry.createType("PalletStatefulStorageItemizedSignaturePayload", rawPayload);
    return [delegatorKey, delegatorAccount, payload];
}

async function signApplyItemActionsWithSignature(event: Event) {
    event.preventDefault();
    const formId = 'stateful_storage_apply_item_actions_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
    const [delegatorKey, delegatorAccount, payload] = await getApplyItemActionsWithSignatureFormData();

    const signature = providerName == 'localhost' ?
        signPayloadWithKeyring(delegatorAccount, payload) :
        await signPayloadWithExtension(delegatorAccount, delegatorKey, payload)

    let signatureEl = document.getElementById('signed_payload') as HTMLTextAreaElement;
    signatureEl.value = signature;
}

async function submitApplyItemActionsWithSignature(event: Event) {
    event.preventDefault();
    const formId = 'stateful_storage_apply_item_actions_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    const [delegatorKey, _delegatorAccount, payload] = await getApplyItemActionsWithSignatureFormData();

    const proof = { Sr25519: getHTMLInputValue('signed_payload') };

    const extrinsic = singletonApi.tx.statefulStorage.applyItemActionsWithSignature(delegatorKey, proof, payload.toU8a())

    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    providerName === 'localhost' ?
        await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair):
        await submitExtrinsicWithExtension(extrinsic, signingAccount, signingKey);
}

async function signUpsertPageWithSignature(event: Event) {
    event.preventDefault();
    const formId = 'stateful_storage_upsert_page_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

    const delegatorKey = getHTMLInputValue('apply_item_actions_with_signature_delegator_key');
    const delegatorMsaId = parseInt(getHTMLInputValue('apply_item_actions_with_signature_delegator_msa'));
    const itemizedSchemaId = parseInt(getHTMLInputValue('apply_item_actions_with_signature_schema_id'));
    const payload1 = getHTMLInputValue('apply_item_actions_with_signature_actions1');
    const payload2 = getHTMLInputValue('apply_item_actions_with_signature_actions2')
    const expiration = parseInt(getHTMLInputValue('apply_item_actions_with_signature_expiration'));

    const targetHash = await getCurrentItemizedHash(singletonApi, delegatorMsaId, itemizedSchemaId);
    const addActions = [{ "Add": payload1}, {"Add": payload2}];
    const rawPayload: ItemizedSignaturePayload = {
        msaId: delegatorMsaId,
        targetHash: targetHash,
        schemaId: itemizedSchemaId,
        actions: addActions,
        expiration,
    };
    const payload = singletonApi.registry.createType("PalletStatefulStorageItemizedSignaturePayload", rawPayload);
}
async function submitUpsertPageWithSignature(event: Event) {
    event.preventDefault();
    const formId = 'stateful_storage_upsert_page_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
}

async function signDeletePageWithSignature(event: Event){
    event.preventDefault();
    const formId = 'stateful_storage_delete_page_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);

}
async function submitDeletePageWithSignature(event: Event){
    event.preventDefault();

    const formId = 'stateful_storage_delete_page_with_signature';
    if (!validateForm(formId)) { return; }
    clearFormInvalid(formId);
}


function init() {
    (document.getElementById("connectButton") as HTMLElement).addEventListener("click", connect);
}

init();

