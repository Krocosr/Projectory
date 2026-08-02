let tauriCore = null;
let tauriDialog = null;

async function ensureTauri() {
  if (tauriCore) return true;
  try {
    const corePkg = '@tauri-apps/api/core';
    const dialogPkg = '@tauri-apps/plugin-dialog';
    tauriCore = await import(corePkg);
    tauriDialog = await import(dialogPkg);
    return true;
  } catch {
    return false;
  }
}

export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI__ || window.__TAURI_INTERNALS__);
};

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

export async function stopItem(itemName) {
  if (!(await ensureTauri())) return { success: false };
  try {
    await tauriCore.invoke('stop_item', { itemName });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function readDataFile() {
  if (!(await ensureTauri())) return null;
  try {
    return await tauriCore.invoke('read_projects_data');
  } catch {
    return null;
  }
}

export async function writeDataFile(contents) {
  if (!(await ensureTauri())) return false;
  try {
    await tauriCore.invoke('write_projects_data', { contents });
    return true;
  } catch (e) {
    console.error('writeDataFile failed:', e.message);
    return false;
  }
}
