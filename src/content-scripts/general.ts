// general.ts - Injected into all pages
console.log('PageLive general.ts loaded on', window.location.hostname);

// Create the main container for PageLive if it doesn't exist
function ensurePageLiveContainer() {
  let container = document.getElementById('pagelive234');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pagelive234';
    container.style.position = 'absolute';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.clipPath = 'inset(50%)';
    container.style.margin = '-1px';
    container.style.padding = '0';
    container.style.border = '0';
    container.style.background = 'none';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  }
  let announce = document.getElementById('announce');
  if (!announce) {
    announce = document.createElement('div');
    announce.id = 'announce';
    container.appendChild(announce);
  }
}

// Announce object type
type Announce = {
  msg: string;
};

// Function to announce a message
export function pageLiveAnnounce(announceObj: Announce) {
  ensurePageLiveContainer();
  const announceDiv = document.getElementById('announce');
  if (announceDiv) {
    const msgDiv = document.createElement('div');
    msgDiv.setAttribute('aria-live', 'polite');
    msgDiv.textContent = announceObj.msg;
    announceDiv.appendChild(msgDiv);
    // Optionally, remove after a delay to avoid DOM bloat
    setTimeout(() => {
      announceDiv.removeChild(msgDiv);
    }, 5000);
  }
}

// Initialize on script load
ensurePageLiveContainer();
