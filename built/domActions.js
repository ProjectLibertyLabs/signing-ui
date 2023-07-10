// For functions that act only on the DOM and don't need any external imports
let registeredEvents = {};
// Simple loading and button blocker
export function setProgress(id, isInProgress) {
    const spinner = document.getElementById("txProcessing");
    const submitButton = document.getElementById(id);
    const spinnerContainer = document.getElementById('txProcessingContainer');
    if (isInProgress) {
        document.getElementById('connection-status').innerText = "";
        submitButton.disabled = true;
        spinner.style.display = "block";
        spinnerContainer.setAttribute("class", "isProcessing");
    }
    else {
        submitButton.disabled = false;
        spinner.style.display = "none";
        spinnerContainer.setAttribute("class", "");
    }
}
export function setVisibility(id, isVisible) {
    let el = document.getElementById(id);
    if (el) {
        if (isVisible) {
            el.classList.remove('hidden');
        }
        else {
            !el.classList.contains('hidden') && el.classList.add('hidden');
        }
    }
}
export function showExtrinsicForm(event) {
    event.preventDefault();
    clearSignedPayloads();
    if (event.target && event.target.selectedOptions?.length) {
        const selectEl = event.target;
        const formToShow = selectEl.selectedOptions[0].value || "";
        const forms = document.getElementsByClassName("extrinsic-form");
        for (let i = 0; i < forms.length; i++) {
            // @ts-ignore
            let form_id = forms.item(i).id;
            setVisibility(form_id, form_id === formToShow);
        }
    }
    else {
        console.error("Could not find selected option");
    }
}
export function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    if (!`registeredEvents`["extrinsics"]) {
        let extrinsicsEl = document.getElementById("extrinsics");
        extrinsicsEl.addEventListener("change", showExtrinsicForm);
        let signedPayloadEl = document.getElementById('signed_payload');
        signedPayloadEl.value = '';
        registeredEvents["extrinsics"] = true;
    }
    return;
}
// assumes only 1 item is selected.
export function getSelectedOption(elementId) {
    return document.getElementById(elementId).selectedOptions[0];
}
// Gets the raw value from HTMLInputElement
export function getHTMLInputValue(elementId) {
    return document.getElementById(elementId).value;
}
export function clearSignedPayloads() {
    document.getElementById('signed_payload').value = '';
    document.getElementById('signed_payload2').value = '';
}
export function validateForm(formId) {
    let form = document.getElementById(formId);
    let inputs = form.getElementsByTagName('input');
    let formValid = true;
    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (input.required && input.value === '') {
            input.setAttribute('class', 'invalid');
            formValid = false;
        }
    }
    if (!formValid) {
        alert("Please fill out all form items");
    }
    return formValid;
}
export function clearFormInvalid(formId) {
    let form = document.getElementById(formId);
    let inputs = form.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].setAttribute('class', '');
    }
}
export function showExtrinsicStatus(status) {
    let newEl = document.createElement("p");
    newEl.innerText = status;
    document.getElementById('status').appendChild(newEl);
}
export function onProviderEndpointChanged(_event) {
    let selectEl = document.getElementById('provider-list');
    setVisibility('other-endpoint', !!selectEl.selectedOptions.namedItem('other-endpoint-value'));
}
