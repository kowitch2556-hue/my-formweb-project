// js/form-training.js
console.log('✅ form-training.js loaded');

// ฟังก์ชันสำหรับส่งข้อมูล (ใช้จาก main.js)
async function submitTrainingForm(data) {
    try {
        const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz6pqVa04Xt0k_bDTy2jHbhShT4IUnZoJXTkOV6MNwWhNTCQMsmjp7y72c-sBfUFw4J/exec';
        
        const formData = new URLSearchParams();
        formData.append('jsonPayload', JSON.stringify(data));
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        
        const result = await response.text();
        return JSON.parse(result);
    } catch (error) {
        console.error('Submission error:', error);
        return { success: false, error: error.message };
    }
}

// Expose function globally
window.submitTrainingForm = submitTrainingForm;
window.initializeTrainingForm = function() {
    console.log('form-training.js: Initialize function called');
    // This will be overridden by the inline script
};