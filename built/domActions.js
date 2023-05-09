let registeredEvents = {};
function setVisibility(id, isVisible) {
    const classes = isVisible ? "extrinsic-form" : "hidden extrinsic-form";
    document.getElementById(id).setAttribute("class", classes);
}
function showExtrinsicForm(event) {
    event.preventDefault();
    const selectedEl = event.target.selectedOptions[0];
    const formToShow = selectedEl.value;
    // hide all the forms but the selected ones.
    const forms = document.getElementsByClassName("extrinsic-form");
    clearSignedPayload();
    for (let i = 0; i < forms.length; i++) {
        let form_id = forms.item(i).id;
        setVisibility(form_id, form_id === formToShow);
    }
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
function clearSignedPayload() {
    document.getElementById('signed_payload').value = '';
}
export { clearSignedPayload, getHTMLInputValue, getSelectedOption, listenForExtrinsicsChange, setVisibility };
