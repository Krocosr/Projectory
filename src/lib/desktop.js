const isTauri = () => typeof window !== 'undefined' && window.__TAURI__;

let tauriCore = null;
let tauriShell = null;
let tauriDialog = null;

async function ensureTauri() {
  if (tauriCore) return true;
  try {
    tauriCore = await import('@tauri-apps/api/core');
    tauriShell = await import('@tauri-apps/plugin-shell');
    tauriDialog = await import('@tauri-apps/plugin-dialog');
    return true;
  } catch {
    return false;
  }
}

export const isDesktop = () => isTauri();

export async function pickFile() {
  if (!(await ensureTauri())) return null;
  const result = await tauriDialog.open({ multiple: false });
  return result || null;
}

export async function pickFolder() {
  if (!(await ensureTauri())) return null;
  const result = await tauriDialog.open({ directory: true, multiple: false });
  return result || null;
}

export async function launchItems(items) {
  if (!(await ensureTauri())) return { success: false };
  try {
    await tauriCore.invoke('launch_items', { items });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function stopItem(itemId) {
  if (!(await ensureTauri())) return { success: false };
  try {
    await tauriCore.invoke('stop_item', { itemId });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
