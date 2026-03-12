const BASE_URL = 'https://sujal.pockethost.io';
const COLLECTION = 'files';

const targetInput = document.getElementById('targetId');
const deleteBtn = document.getElementById('deleteBtn');
const logContent = document.getElementById('logContent');
const statusIndicator = document.getElementById('statusIndicator');

function log(message, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-msg ${type}`;
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.textContent = `[${time}] ${message}`;
    logContent.appendChild(p);
    logContent.scrollTop = logContent.scrollHeight;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function purgeRecords() {
    const id = targetInput.value.trim();
    if (!id) {
        log('Error: ID is required', 'error');
        return;
    }

    // UI State: Active
    deleteBtn.disabled = true;
    statusIndicator.textContent = 'Processing';
    statusIndicator.className = 'status-active';
    logContent.innerHTML = ''; // Clear logs
    log(`Initializing purge for ID: ${id}`, 'system');

    try {
        const unique = await sha256(id);
        log(`Generated hash: ${unique.substring(0, 16)}...`, 'info');

        const filter = encodeURIComponent(`unique = "${unique}"`);
        const url = `${BASE_URL}/api/collections/${COLLECTION}/records?filter=${filter}`;

        log('Searching for records...', 'info');
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        
        const data = await response.json();
        const items = data.items || [];

        if (items.length === 0) {
            log('No records found matching this ID.', 'info');
        } else {
            log(`Found ${items.length} record(s). Starting deletion...`, 'success');

            for (const item of items) {
                log(`Deleting record: ${item.id}`, 'info');
                const delRes = await fetch(`${BASE_URL}/api/collections/${COLLECTION}/records/${item.id}`, {
                    method: 'DELETE'
                });

                if (delRes.status === 204) {
                    log(`Successfully deleted ${item.id}`, 'success');
                } else {
                    log(`Failed to delete ${item.id}: ${delRes.status}`, 'error');
                }
            }
            log('Purge operation completed.', 'success');
        }

    } catch (err) {
        log(`Fatal Error: ${err.message}`, 'error');
        console.error(err);
    } finally {
        deleteBtn.disabled = false;
        statusIndicator.textContent = 'Idle';
        statusIndicator.className = 'status-idle';
    }
}

deleteBtn.addEventListener('click', purgeRecords);

targetInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') purgeRecords();
});

log('System Ready. Enter ID to start.', 'system');
