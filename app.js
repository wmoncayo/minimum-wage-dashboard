(() => {
  async function loadChunkedScript() {
    const manifestResponse = await fetch("./app.b64.manifest.json", { cache: "no-store" });
    if (!manifestResponse.ok) {
      throw new Error("app manifest could not be loaded");
    }
    const manifest = await manifestResponse.json();
    const responses = await Promise.all(manifest.parts.map((part) => fetch(`./${part}`, { cache: "no-store" })));
    if (responses.some((response) => !response.ok)) {
      throw new Error("one or more app chunks could not be loaded");
    }
    const encoded = (await Promise.all(responses.map((response) => response.text()))).join("");
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const code = new TextDecoder().decode(bytes);
    (0, eval)(code);
  }
  loadChunkedScript().catch((error) => {
    const panel = document.getElementById("loadError");
    const text = document.getElementById("loadErrorText");
    const loading = document.getElementById("loadingState");
    if (loading) {
      loading.hidden = true;
    }
    if (panel && text) {
      text.textContent = `${error.message}. Refresh the page or republish the static dashboard files.`;
      panel.hidden = false;
    }
  });
})();