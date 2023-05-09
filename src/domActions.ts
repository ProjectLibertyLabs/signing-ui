function setVisibility(id: string, isVisible: boolean) {
    const classes = isVisible ? "extrinsic-form" : "hidden extrinsic-form";
    document.getElementById(id).setAttribute("class", classes);

}

export { setVisibility };

