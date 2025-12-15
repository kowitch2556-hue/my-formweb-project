// eruda-loader.js
// Loads Eruda debugger for mobile devices

const ErudaLoader = {
    isLoaded: false,
    
    init(options = {}) {
        // Check if should load
        if (!this.shouldLoad(options)) {
            console.log('📱 Eruda: Not loading (conditions not met)');
            return;
        }
        
        // Check if already loaded
        if (this.isLoaded || window.eruda) {
            console.log('📱 Eruda: Already loaded');
            return;
        }
        
        console.log('📱 Eruda: Loading debugger...');
        
        // Load Eruda
        this.loadScript()
            .then(() => {
                this.isLoaded = true;
                this.configureEruda(options);
                console.log('✅ Eruda loaded successfully');
            })
            .catch(error => {
                console.error('❌ Failed to load Eruda:', error);
            });
    },
    
    shouldLoad(options) {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check conditions
        const conditions = [
            // 1. URL has ?debug parameter
            urlParams.has('debug'),
            
            // 2. Is mobile device
            options.forceLoad || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
            
            // 3. Localhost
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1',
            
            // 4. Has debug cookie
            document.cookie.includes('debug=true')
        ];
        
        return conditions.some(condition => condition);
    },
    
    loadScript() {
        return new Promise((resolve, reject) => {
            // Check if already exists
            if (document.querySelector('script[src*="eruda"]')) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/eruda';
            
            script.onload = () => {
                // Wait a bit for Eruda to be available
                setTimeout(() => {
                    if (typeof eruda !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('Eruda not available after loading'));
                    }
                }, 100);
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load Eruda script'));
            };
            
            document.head.appendChild(script);
        });
    },
    
    configureEruda(options) {
        if (typeof eruda === 'undefined') {
            console.error('Eruda not available');
            return;
        }
        
        // Initialize Eruda
        eruda.init({
            tool: options.tools || ['console', 'elements', 'network', 'resources', 'info'],
            defaults: {
                displaySize: 50,
                transparency: 0.9,
                theme: options.theme || 'Dark'
            }
        });
        
        // Customize
        const devTools = eruda.get();
        
        // Add custom plugin if needed
        if (options.customPlugin) {
            this.addCustomPlugin();
        }
        
        // Position the launcher
        this.positionLauncher();
        
        // Auto-hide on production
        if (!window.location.hostname.includes('localhost') && 
            !window.location.search.includes('debug')) {
            eruda.hide();
        }
        
        console.log('🎛️ Eruda configured');
    },
    
    positionLauncher() {
        // Move launcher to bottom right
        const launcher = document.querySelector('.eruda-launcher');
        if (launcher) {
            launcher.style.bottom = '20px';
            launcher.style.right = '20px';
            launcher.style.top = 'auto';
            launcher.style.left = 'auto';
        }
    },
    
    addCustomPlugin() {
        // Example custom plugin for upload debugging
        const plugin = {
            name: 'upload',
            init($el) {
                this.$el = $el;
                this.render();
            },
            render() {
                this.$el.html(`
                    <div style="padding: 20px;">
                        <h3>📤 Upload Debugger</h3>
                        <button onclick="ErudaLoader.testUpload()" 
                                style="padding:10px;background:#007bff;color:white;border:none;border-radius:5px;">
                            ทดสอบ Upload
                        </button>
                        <div id="upload-result" style="margin-top:10px;"></div>
                    </div>
                `);
            }
        };
        
        eruda.add(plugin);
    },
    
    testUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                eruda.get('console').log(`Test file: ${file.name} (${file.size} bytes)`);
                
                // Test upload
                const formData = new FormData();
                formData.append('test', file);
                
                fetch('https://httpbin.org/post', {
                    method: 'POST',
                    body: formData
                })
                .then(r => r.json())
                .then(data => {
                    eruda.get('console').log('✅ Upload test success', data);
                })
                .catch(err => {
                    eruda.get('console').error('❌ Upload test failed', err);
                });
            }
        };
        
        input.click();
    },
    
    // Utility to toggle Eruda
    toggle() {
        if (!window.eruda) {
            this.init({ forceLoad: true });
        } else {
            eruda.show();
        }
    },
    
    // Remove Eruda
    destroy() {
        if (window.eruda) {
            eruda.destroy();
            this.isLoaded = false;
            console.log('🗑️ Eruda destroyed');
        }
    }
};

// Auto-init if conditions met
(function() {
    // Check immediately
    if (ErudaLoader.shouldLoad({})) {
        // Load after page is fully loaded
        if (document.readyState === 'complete') {
            setTimeout(() => ErudaLoader.init(), 1000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => ErudaLoader.init(), 1000);
            });
        }
    }
})();

// Make available globally
window.ErudaLoader = ErudaLoader;

// Add keyboard shortcut for developers
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+D to toggle Eruda
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        ErudaLoader.toggle();
    }
});