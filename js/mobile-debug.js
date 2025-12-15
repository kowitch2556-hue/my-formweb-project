// mobile-debug.js
// Debug utilities for mobile devices

const MobileDebug = {
    logs: [],
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    
    init() {
        console.log('📱 Mobile Debug Initialized');
        
        // Add debug styles
        this.addStyles();
        
        // Setup error handling
        this.setupErrorHandling();
        
        // Log initial info
        this.log('Device: ' + navigator.userAgent);
        this.log('URL: ' + window.location.href);
        this.log('Online: ' + navigator.onLine);
        
        // Add debug button to page
        this.addDebugButton();
    },
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .debug-log-entry {
                padding: 5px 10px;
                border-bottom: 1px solid #eee;
                font-family: monospace;
                font-size: 12px;
            }
            .debug-log-error {
                color: #d32f2f;
                background: #ffebee;
            }
            .debug-log-success {
                color: #388e3c;
                background: #e8f5e9;
            }
            .debug-log-info {
                color: #1976d2;
                background: #e3f2fd;
            }
        `;
        document.head.appendChild(style);
    },
    
    setupErrorHandling() {
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.error('Global Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno);
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled Promise: ' + event.reason);
        });
        
        // Network offline/online
        window.addEventListener('offline', () => {
            this.error('Device went offline');
        });
        
        window.addEventListener('online', () => {
            this.log('Device back online');
        });
    },
    
    addDebugButton() {
        if (!this.isMobile) return;
        
        const button = document.createElement('button');
        button.innerHTML = '🐛';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            font-size: 24px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            cursor: pointer;
        `;
        
        button.addEventListener('click', () => {
            this.toggleDebugPanel();
        });
        
        document.body.appendChild(button);
    },
    
    toggleDebugPanel() {
        let panel = document.getElementById('mobile-debug-panel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'mobile-debug-panel';
            panel.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 300px;
                height: 400px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            `;
            
            panel.innerHTML = `
                <div style="
                    padding: 10px;
                    background: #007bff;
                    color: white;
                    border-radius: 10px 10px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <strong>📱 Debug Console</strong>
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="background:none;border:none;color:white;font-size:20px;cursor:pointer">
                        ×
                    </button>
                </div>
                <div id="mobile-console-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    font-size: 12px;
                    font-family: monospace;
                "></div>
                <div style="
                    padding: 10px;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 5px;
                ">
                    <button onclick="MobileDebug.clear()" style="flex:1;padding:5px;">ล้าง</button>
                    <button onclick="MobileDebug.export()" style="flex:1;padding:5px;">บันทึก</button>
                    <button onclick="MobileDebug.testUpload()" style="flex:1;padding:5px;">ทดสอบ</button>
                </div>
            `;
            
            document.body.appendChild(panel);
        }
        
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            time: timestamp,
            message: message,
            type: type
        };
        
        this.logs.push(entry);
        
        // Console log
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝';
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        // Update UI if exists
        this.updateUI(entry);
        
        return entry;
    },
    
    error(message) {
        return this.log(message, 'error');
    },
    
    success(message) {
        return this.log(message, 'success');
    },
    
    updateUI(entry) {
        const content = document.getElementById('mobile-console-content');
        if (!content) return;
        
        const div = document.createElement('div');
        div.className = `debug-log-entry debug-log-${entry.type}`;
        div.innerHTML = `<small>[${entry.time}]</small> ${entry.message}`;
        
        content.appendChild(div);
        content.scrollTop = content.scrollHeight;
    },
    
    clear() {
        this.logs = [];
        const content = document.getElementById('mobile-console-content');
        if (content) {
            content.innerHTML = '';
        }
        this.log('Console cleared');
    },
    
    export() {
        const text = this.logs.map(log => `[${log.time}] ${log.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        this.log('Logs exported');
    },
    
    testUpload() {
        this.log('Starting upload test...');
        
        // Create test file
        const testContent = 'Test content for mobile debug';
        const blob = new Blob([testContent], { type: 'text/plain' });
        const testFile = new File([blob], 'test.txt', {
            type: 'text/plain',
            lastModified: Date.now()
        });
        
        this.log(`Created test file: ${testFile.name} (${testFile.size} bytes)`);
        
        // Test upload
        const formData = new FormData();
        formData.append('debug_file', testFile);
        formData.append('timestamp', new Date().toISOString());
        
        fetch('https://httpbin.org/post', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            this.success('Upload test successful!');
            this.log(`Response size: ${JSON.stringify(data).length} bytes`);
        })
        .catch(error => {
            this.error(`Upload test failed: ${error.message}`);
        });
    },
    
    // File upload helper
    async uploadFile(file, endpoint, options = {}) {
        this.log(`Starting upload: ${file.name} (${file.size} bytes)`);
        
        const startTime = Date.now();
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional data
        if (options.metadata) {
            for (const [key, value] of Object.entries(options.metadata)) {
                formData.append(key, value);
            }
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: options.headers,
                signal: options.signal
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.log(`Upload completed in ${duration}ms`);
            this.log(`Status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            this.success('Upload successful!');
            
            return {
                success: true,
                data: result,
                duration: duration,
                file: file.name,
                size: file.size
            };
            
        } catch (error) {
            this.error(`Upload failed: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                file: file.name,
                size: file.size
            };
        }
    },
    
    // Network monitor
    monitorNetwork() {
        if (navigator.connection) {
            const connection = navigator.connection;
            
            this.log(`Network type: ${connection.effectiveType}`);
            this.log(`Downlink: ${connection.downlink} Mbps`);
            this.log(`RTT: ${connection.rtt} ms`);
            
            connection.addEventListener('change', () => {
                this.log(`Network changed to: ${connection.effectiveType}`);
            });
        }
    }
};

// Global debug function
function debugLog(message, type = 'info') {
    return MobileDebug.log(message, type);
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MobileDebug.init());
} else {
    MobileDebug.init();
}

// Make available globally
window.MobileDebug = MobileDebug;
window.debugLog = debugLog;