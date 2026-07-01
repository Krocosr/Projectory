const CHANNEL_NAME = 'projectory_sync';
let channel = null;

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function postSync() {
  const ch = getChannel();
  if (!ch) return;
  ch.postMessage({ type: 'projects_updated' });
}

export function listenSync(callback) {
  const ch = getChannel();
  if (!ch) return () => {};
  ch.onmessage = (event) => {
    if (event.data?.type === 'projects_updated') callback();
  };
  return () => {
    if (channel) {
      channel.close();
      channel = null;
    }
  };
}
