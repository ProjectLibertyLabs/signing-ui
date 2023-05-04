// @ts-ignore
import { WsProvider, ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
// @ts-ignore
import { web3Accounts, web3Enable } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
let PREFIX = 42;
let UNIT = "UNIT";
let singletonApi;
let singletonProvider;
let providerName;
let extrinsicsSelectionListenerIsRegistered = false;
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
    getBlockNumber();
    return;
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
function getSelectedOption(elementId) {
    let select = document.getElementById(elementId);
    return select.selectedOptions[0];
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
    return;
}
async function loadAccounts() {
    // meta.source contains the name of the extension that provides this account
    const extensions = await web3Enable('Frequency parachain signer helper');
    if (!extensions.length) {
        alert("Polkadot{.js} extension not found; please install it first.");
        return;
    }
    let accounts = await web3Accounts();
    // clear options
    document.getElementById("signing-address").innerHTML = "";
    let accountsSelect = document.getElementById("signing-address");
    // set options.
    accounts.forEach(a => {
        // display only the accounts allowed for this chain
        // TODO: add Alice..Ferdie accounts if localhost. add everything for localhost for now
        if (!a.meta.genesisHash
            || GENESIS_HASHES[providerName] === a.meta.genesisHash
            || providerName === "localhost") {
            let el = document.createElement("option");
            el.setAttribute("value", a.address);
            el.setAttribute("name", a.address);
            el.innerText = `${a.meta.name}: ${a.address}`;
            accountsSelect.add(el);
        }
    });
    return;
}
// resetForms puts the form state back to initial setup with first extrinsic selected and first form showing
function resetForms() {
    document.getElementById("handles_claim_handle").setAttribute("class", "extrinsic-form");
    let selectedExtrinsic = getSelectedOption("extrinsics");
    if (selectedExtrinsic.value !== "handles_claim_handle") {
        document.getElementById(selectedExtrinsic.value).setAttribute("class", "hidden extrinsic-form");
        selectedExtrinsic.selected = false;
    }
    return;
}
function showExtrinsicForm(event) {
    event.preventDefault();
    let selectedEl = event.target.selectedOptions[0];
    let formToShow = selectedEl.value;
    // hide all the forms
    let forms = document.getElementsByClassName("extrinsic-form");
    for (let i = 0; i < forms.length; i++) {
        let form = forms.item(i);
        if (form.id !== formToShow) {
            form.setAttribute("class", "hidden extrinsic-form");
        }
        else {
            form.setAttribute("class", "extrinsic-form");
        }
    }
    return;
}
async function claimHandle() {
    // const handle_vec = new Bytes(ExtrinsicHelper.api.registry, handle);
    // const payload = {
    //     baseHandle: handle_vec,
    //     expiration: currentBlock + 10,
    // }
    // const claimHandlePayload = ExtrinsicHelper.api.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", payload);
    //
    // const proof = { Sr25519: u8aToHex(delegatorKeys.sign(u8aWrapBytes(payload.toU8a()))) }
    //
    //
    // const claimHandle = ExtrinsicHelper.claimHandle(msaOwnerKeys, claimHandlePayload);
    // const [event] = await claimHandle.fundAndSend();
    // console.log({event});
    return;
}
export async function getBlockNumber() {
    let blockData = await singletonApi.rpc.chain.getBlock();
    console.log({ blockData });
    return (await blockData.block.header.number.toNumber());
}
function init() {
    document.getElementById("connectButton").addEventListener("click", connect);
    return;
}
init();
