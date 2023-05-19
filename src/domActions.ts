let registeredEvents: Record<string, any> = {};

function setVisibility(id: string, isVisible: boolean) {
    let classes = document.getElementById(id)?.getAttribute('class') || "";
    if (isVisible) {
        classes = classes.split(' ').filter(c => c !== 'hidden').join(' ')
    } else {
        classes = classes + ' hidden';
    }
    document.getElementById(id)?.setAttribute("class", classes);
}

function showExtrinsicForm(event: Event) {
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
    } else { console.error("Could not find selected option")}
}

function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    if (!registeredEvents["extrinsics"]) {
        let extrinsicsEl = document.getElementById("extrinsics") as HTMLElement;
        extrinsicsEl.addEventListener("change", showExtrinsicForm);
        let signedPayloadEl =(document.getElementById('signed_payload') as HTMLTextAreaElement);
        signedPayloadEl.value = '';
        registeredEvents["extrinsics"] = true;
    }
    return;
}

// assumes only 1 item is selected.
function getSelectedOption(elementId: string): HTMLOptionElement {
    return (document.getElementById(elementId) as HTMLSelectElement).selectedOptions[0];
}

// Gets the raw value from HTMLInputElement
function getHTMLInputValue(elementId: string): string {
   return (document.getElementById(elementId) as HTMLInputElement).value;
}

function clearSignedPayloads() {
   ( document.getElementById('signed_payload') as HTMLTextAreaElement).value = '';
   ( document.getElementById('signed_payload2') as HTMLTextAreaElement).value = '';
}

function validateForm(formId: string): boolean {
    let form = document.getElementById(formId) as HTMLFormElement;
    let inputs = form.getElementsByTagName('input') as HTMLCollectionOf<HTMLInputElement>;
    let formValid = true;
    for (let i=0; i< inputs.length; i++) {
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

function clearFormInvalid(formId: string) {
    let form = document.getElementById(formId) as HTMLFormElement
    let inputs = form.getElementsByTagName('input');
    for (let i=0; i< inputs.length; i++) {
        inputs[i].setAttribute('class', '')
    }
}

export {
    clearFormInvalid,
    clearSignedPayloads,
    getHTMLInputValue,
    getSelectedOption,
    listenForExtrinsicsChange,
    setVisibility,
    validateForm,
};

