chrome.action.onClicked.addListener(async (e) => {
	if (e.id !== void 0) try {
		await chrome.tabs.sendMessage(e.id, { type: "pinspec:toggle" });
	} catch {
		try {
			await chrome.scripting.executeScript({
				target: { tabId: e.id },
				files: ["content.js"]
			});
		} catch (e) {
			console.warn("pinspec: cannot run on this page", e);
		}
	}
}), chrome.runtime.onMessage.addListener((e, t, n) => {
	if (e?.type !== "pinspec:capture") return;
	let r = t.tab?.windowId;
	if (r === void 0) n({ error: "No tab" });
	else return chrome.tabs.captureVisibleTab(r, { format: "png" }).then((e) => n({ dataUrl: e })).catch((e) => n({ error: String(e?.message ?? e) })), !0;
});
//#endregion
