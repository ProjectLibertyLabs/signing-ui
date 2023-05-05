// @ts-ignore
import { WsProvider, ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
// @ts-ignore
import { web3Accounts, web3Enable, web3FromAddress, web3FromSource } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
// @ts-ignore
import { Bytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/types@10.5.1/+esm';
// @ts-ignore
import { stringToU8a, u8aToHex, u8aWrapBytes } from 'https://cdn.jsdelivr.net/npm/@polkadot/util@12.1.2/+esm';
// @ts-ignore
import { Keyring } from 'https://cdn.jsdelivr.net/npm/@polkadot/keyring@12.1.2/+esm'

// const Hash = interfaces.Hash;

let PREFIX = 42;
let UNIT = "UNIT";

let singletonApi;
let singletonProvider;
let providerName;
let extrinsicsSelectionListenerIsRegistered = false;
let validAccounts: Record<string,any> = {};
let registeredEvents: Record<string, any> = {};

const GENESIS_HASHES = {
    rococo: "0x0c33dfffa907de5683ae21cc6b4af899b5c4de83f3794ed75b2dc74e1b088e72",
    frequency: "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1",
}

async function loadApi(providerUri) {
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
    singletonApi = await ApiPromise.create({provider: singletonProvider});

    await singletonApi.isReady;
    const chain = await singletonApi.rpc.system.properties();
    PREFIX = Number(chain.ss58Format.toString());
    UNIT = chain.tokenSymbol.toHuman();
    document.getElementById("unit").innerText = UNIT;

    let blockNumber = await getBlockNumber();
    console.log({blockNumber});

}

function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    // better to check a flag than to remove and add back.
    if (!extrinsicsSelectionListenerIsRegistered) {
        document.getElementById("extrinsics").addEventListener("change", showExtrinsicForm);
        extrinsicsSelectionListenerIsRegistered = true;
    }
    return;
}

function registerExtrinsicsButtonHandlers() {
    if (!registeredEvents['createMsaButton']) {
        document.getElementById('createMsaButton').addEventListener("click", createMsa);
        document.getElementById('handles_claimHandleButton').addEventListener("click", claimHandle);
        // TODO: change to fn ptr and use a general click handler that routes to the right place
        registeredEvents['createMsaButton'] = true;
        registeredEvents['claimHandle'] = true;
    }
}

// assumes only 1 item is selected.
function getSelectedOption(elementId: string):  HTMLOptionElement {
    let select: HTMLSelectElement = document.getElementById(elementId) as HTMLSelectElement;
    return select.selectedOptions[0];
}

// Connect to the wallet and blockchain
async function connect(event) {
    event.preventDefault();
    let selectedProvider = getSelectedOption('provider-list');
    providerName = selectedProvider.getAttribute("name");
    await loadApi(selectedProvider.getAttribute("value"));
    await loadAccounts();
    resetForms()
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

    let accountsSelect = document.getElementById("signing-address") as HTMLSelectElement;

    // populating for localhost and for a parachain are different since with localhost, there is
    // access to the Alice/Bob/Charlie accounts etc., and so won't use the extension.
    if (providerName === "localhost") {
        const keyring = new Keyring({ type: 'sr25519' });

        // Add Alice to our keyring with a hard-derivation path (empty phrase, so uses dev)
        ['//Alice', '//Bob', '//Charlie', '//Dave'].forEach(accountName => {
            let account = keyring.addFromUri(accountName);
            account.meta.name = accountName;
            validAccounts[account.address] = account;
        })
    } else {
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
    Object.keys(validAccounts).forEach( key => {
        const el: HTMLOptionElement = document.createElement("option");
        const a =  validAccounts[key];
        el.setAttribute("value", a.address);
        el.setAttribute("name", a.address);
        el.innerText = `${a.meta.name}: ${a.address}`;
        accountsSelect.add(el);
    })

}

function setVisibility(id: string, isVisible: boolean) {
    const classes = isVisible ? "extrinsic-form" : "hidden extrinsic-form";
    document.getElementById(id).setAttribute("class", classes);

}

// resetForms puts the form state back to initial setup with first extrinsic selected and first form showing
function resetForms() {
    setVisibility("handles_claim_handle", true);
    const selectedExtrinsic: HTMLOptionElement = getSelectedOption("extrinsics");
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
    const forms = document.getElementsByClassName("extrinsic-form")
    for (let i=0; i<forms.length; i++) {
        let form_id = forms.item(i).id;
        setVisibility(form_id, form_id === formToShow)
    }
}

// createMSA
async function createMsa(event) {
    event.preventDefault();
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];
    const createMsaExtrinsic = singletonApi.tx.msa.create();
    // if it's localhost then we do something different.
    if (providerName === 'localhost') {
        const [chainEvent] = await createMsaExtrinsic.signAndSend(signingAccount);
        console.log({chainEvent});
    }
}


// ------------------- claimHandle
async function claimHandle(event) {
    // get the signing key
    const signingKey = getSelectedOption('signing-address').value;
    const signingAccount = validAccounts[signingKey];

    const handleElem = document.getElementById("claim_handle_handle") as HTMLInputElement;
    const handle_vec = new Bytes(singletonApi.registry, handleElem.value);

    const ew: HTMLInputElement = document.getElementById("claim_handle_expiration") as HTMLInputElement;
    const expireWindow = parseInt(ew.value, 10);

    const currentBlock = await getBlockNumber();
    const rawPayload = {
        baseHandle: handle_vec,
        expiration: currentBlock + expireWindow,
    }
    const claimHandlePayload = singletonApi.registry.createType(
        "CommonPrimitivesHandlesClaimHandlePayload", rawPayload
    );

    if (providerName === 'localhost') {
        const proof = { Sr25519: u8aToHex(signingAccount.sign(u8aWrapBytes(claimHandlePayload.toU8a()))) }
        const claimHandleExtrinsic = singletonApi.tx.handles.claimHandle(signingAccount.publicKey, proof, claimHandlePayload);
        const [event] = await claimHandleExtrinsic.signAndSend(signingAccount);
        console.log({event})
    } else {
        // TODO: allow signing account and MSA Owner Key to be different
        // const injector = await web3FromSource(signingAccount.meta.source);
        // const signRaw = injector?.signer?.signRaw;
        //
        // // This uses the extension to sign.
        // if (!!signRaw) {
        //     // after making sure that signRaw is defined
        //     // we can use it to sign our message
        //     const { signature } = await signRaw({
        //         address: signingKey,
        //         data: claimHandlePayload,
        //         type: 'bytes'
        //     });
        //     const claimHandleExtrinsic = singletonApi.tx.handles.claimHandle(
        //         signingKey, signature, claimHandlePayload
        //     )
        //
        //     let result = await claimHandleExtrinsic.signAndSend(signingKey, {signer: injector.signer});
        //     console.log({result})
        // }
    }


    // const claimHandle = ExtrinsicHelper.claimHandle(msaOwnerKeys, claimHandlePayload);
    // const [event] = await claimHandle.fundAndSend();
    // console.log({event});
}

export async function getBlockNumber(): Promise<number> {
    let blockData = await singletonApi.rpc.chain.getBlock();
    return (await blockData.block.header.number.toNumber())
}

function init() {
    document.getElementById("connectButton").addEventListener("click", connect);
}

init();