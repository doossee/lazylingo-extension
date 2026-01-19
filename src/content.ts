console.log("LazyLingo Content Script Loaded");

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    console.log("Selected text:", selection.toString());
    // TODO: Show floating UI
  }
});
