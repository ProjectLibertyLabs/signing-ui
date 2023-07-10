// For functions that act only on the DOM and don't need any external imports
let registeredEvents: Record<string, any> = {};

// Simple loading and button blocker
export function setProgress(id: string, isInProgress: boolean) {
    const spinner = document.getElementById("txProcessing") as HTMLElement;
    const submitButton = document.getElementById(id) as HTMLButtonElement;
    const spinnerContainer = document.getElementById('txProcessingContainer') as HTMLElement;
    if (isInProgress) {
        (document.getElementById('connection-status') as HTMLElement).innerText = "";
        submitButton.disabled = true;
        spinner.style.display = "block";
        spinnerContainer.setAttribute("class", "isProcessing");
    } else {
        submitButton.disabled = false;
        spinner.style.display = "none";
        spinnerContainer.setAttribute("class", "");
    }
}
export function setVisibility(id: string, isVisible: boolean) {
    let el = document.getElementById(id);
    if (el) {
        if (isVisible) {
            el.classList.remove('hidden');
        } else {
            !el.classList.contains('hidden') && el.classList.add('hidden')
        }
    }
}

export function showExtrinsicForm(event: Event) {
    event.preventDefault();
    clearSignedPayloads();
    if (event.target && (event.target as HTMLSelectElement).selectedOptions?.length) {
        const selectEl = event.target as HTMLSelectElement
        const formToShow = selectEl.selectedOptions[0].value || "";
        const forms = document.getElementsByClassName("extrinsic-form")
        for (let i = 0; i < forms.length; i++) {
            // @ts-ignore
            let form_id = forms.item(i).id;
            setVisibility(form_id, form_id === formToShow)
        }
    } else {
        console.error("Could not find selected option")
    }
}

export function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    if (!`registeredEvents`["extrinsics"]) {
        let extrinsicsEl = document.getElementById("extrinsics") as HTMLElement;
        extrinsicsEl.addEventListener("change", showExtrinsicForm);
        let signedPayloadEl = (document.getElementById('signed_payload') as HTMLTextAreaElement);
        signedPayloadEl.value = '';
        registeredEvents["extrinsics"] = true;
    }
    return;
}

// assumes only 1 item is selected.
export function getSelectedOption(elementId: string): HTMLOptionElement {
    return (document.getElementById(elementId) as HTMLSelectElement).selectedOptions[0];
}

// Gets the raw value from HTMLInputElement
export function getHTMLInputValue(elementId: string): string {
    return (document.getElementById(elementId) as HTMLInputElement).value;
}

export function clearSignedPayloads() {
    (document.getElementById('signed_payload') as HTMLTextAreaElement).value = '';
    (document.getElementById('signed_payload2') as HTMLTextAreaElement).value = '';
}

export function validateForm(formId: string): boolean {
    let form = document.getElementById(formId) as HTMLFormElement;
    let inputs = form.getElementsByTagName('input') as HTMLCollectionOf<HTMLInputElement>;
    let formValid = true;
    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i] as HTMLInputElement;
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

export function clearFormInvalid(formId: string) {
    let form = document.getElementById(formId) as HTMLFormElement
    let inputs = form.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].setAttribute('class', '')
    }
}

export function showExtrinsicStatus(status: string) {
    let newEl = document.createElement("p");
    newEl.innerText = status;
    (document.getElementById('status') as HTMLElement).appendChild(newEl);
}

export function onProviderEndpointChanged(_event: unknown) {
    let selectEl = document.getElementById('provider-list') as HTMLSelectElement;
    setVisibility('other-endpoint', !!selectEl.selectedOptions.namedItem('other-endpoint-value'));
}