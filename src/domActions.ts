let registeredEvents: Record<string, any> = {};

function setVisibility(id: string, isVisible: boolean) {
    const classes = isVisible ? "extrinsic-form" : "hidden extrinsic-form";
    document.getElementById(id).setAttribute("class", classes);

}

function showExtrinsicForm(event) {
    event.preventDefault();
    const selectedEl = event.target.selectedOptions[0];
    const formToShow = selectedEl.value;
    // hide all the forms but the selected ones.
    const forms = document.getElementsByClassName("extrinsic-form")
    clearSignedPayloads();
    for (let i = 0; i < forms.length; i++) {
        let form_id = forms.item(i).id;
        setVisibility(form_id, form_id === formToShow)
    }
}

function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    if (!registeredEvents["extrinsics"]) {
        document.getElementById("extrinsics").addEventListener("change", showExtrinsicForm);
        (document.getElementById('signed_payload') as HTMLTextAreaElement).value = '';
        registeredEvents["extrinsics"] = true;
    }
    return;
}


// assumes only 1 item is selected.
function getSelectedOption(elementId: string): HTMLOptionElement {
    let select: HTMLSelectElement = document.getElementById(elementId) as HTMLSelectElement;
    return select.selectedOptions[0];
}

// Gets the raw value from HTMLInputElement
function getHTMLInputValue(elementId: string): string {
    let input: HTMLInputElement = document.getElementById(elementId) as HTMLInputElement;
    return input.value;
}

function clearSignedPayloads() {
   ( document.getElementById('signed_payload') as HTMLTextAreaElement).value = '';
   ( document.getElementById('signed_payload2') as HTMLTextAreaElement).value = '';
}

export {
    clearSignedPayloads,
    getHTMLInputValue,
    getSelectedOption,
    listenForExtrinsicsChange,
    setVisibility
};

