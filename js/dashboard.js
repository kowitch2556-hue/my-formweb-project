// js/dashboard.js - Dashboard Application (แก้ไขใหม่)

window.dashboardApp = {
    // Configuration
    config: {
        apiUrl: '', // จะถูกตั้งค่าจาก main.js
        refreshInterval: 300000, // 5 นาที
        colors: {
            training: '#007bff',
            student: '#28a745',
            teacher: '#ffc107',
            personnel: '#6f42c1',
            photos: '#17a2b8'
        }
    },
    
    // Data storage
    data: {
        training: [],
        student: [],
        teacher: [],
        personnel: [],
        photos: [],
        dashboard: null,
        summary: {
            training: 0,
            student: 0,
            teacher: 0,
            personnel: 0,
            photos: 0,
            total: 0
        },
        filteredData: {
            training: [],
            student: [],
            teacher: []
        }
    },
    
    // UI State
    state: {
        currentTable: 'training',
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1,
        isLoading: false,
        charts: null,
        searchQuery: ''
    },
    
    // Initialize dashboard
    init: function(apiUrl = '') {
        console.log('📊 Dashboard Initializing...');
        
        // Set API URL
        if (apiUrl) {
            this.config.apiUrl = apiUrl;
        } else if (window.GAS_API_URL) {
            this.config.apiUrl = window.GAS_API_URL;
        }
        
        if (!this.config.apiUrl) {
            console.error('❌ API URL not configured');
            this.showError('กรุณากำหนด URL API');
            return;
        }
        
        // Show loading
        this.showLoading();
        
        // Load all data
        this.loadDashboardData()
            .then(() => {
                // Update summary cards
                this.updateSummaryCards();
                
                // Initialize charts
                this.initCharts();
                
                // Load initial table
                this.loadTable('training');
                
                // Hide loading
                this.hideLoading();
                
                console.log('✅ Dashboard initialized successfully');
                
                // Auto-refresh every 5 minutes
                this.setupAutoRefresh();
            })
            .catch(error => {
                console.error('❌ Error initializing dashboard:', error);
                this.hideLoading();
                this.showError('ไม่สามารถโหลดข้อมูลได้: ' + (error.message || error));
            });
    },
    
    // Setup auto-refresh
    setupAutoRefresh: function() {
        setInterval(() => {
            if (!this.state.isLoading && document.visibilityState === 'visible') {
                console.log('🔄 Auto-refreshing dashboard data...');
                this.refreshAllData(true); // silent refresh
            }
        }, this.config.refreshInterval);
    },
    
    // Load dashboard data from API
    loadDashboardData: async function() {
        console.log('📥 Loading dashboard data from API...');
        
        try {
            // 1. ดึงข้อมูล Dashboard หลัก
            const dashboardResponse = await this.callAPI('getDashboardData');
            if (dashboardResponse.status === 'SUCCESS') {
                this.data.dashboard = dashboardResponse.data;
                
                // ตั้งค่าข้อมูลสรุป
                this.data.summary = {
                    training: dashboardResponse.data.summary?.total?.trainings || 0,
                    student: dashboardResponse.data.summary?.total?.studentWorks || 0,
                    teacher: dashboardResponse.data.summary?.total?.teacherAwards || 0,
                    personnel: dashboardResponse.data.summary?.total?.personnel || 0,
                    photos: dashboardResponse.data.summary?.total?.photos || 0,
                    total: dashboardResponse.data.summary?.total?.totalRecords || 0
                };
                
                // ตั้งข้อมูลล่าสุด
                if (dashboardResponse.data.recent?.trainings) {
                    this.data.training = dashboardResponse.data.recent.trainings.map(item => ({
                        ...item,
                        type: 'training'
                    }));
                    this.data.filteredData.training = [...this.data.training];
                }
                
                if (dashboardResponse.data.recent?.studentWorks) {
                    this.data.student = dashboardResponse.data.recent.studentWorks.map(item => ({
                        ...item,
                        type: 'student'
                    }));
                    this.data.filteredData.student = [...this.data.student];
                }
                
                if (dashboardResponse.data.recent?.teacherAwards) {
                    this.data.teacher = dashboardResponse.data.recent.teacherAwards.map(item => ({
                        ...item,
                        type: 'teacher'
                    }));
                    this.data.filteredData.teacher = [...this.data.teacher];
                }
                
                // ตั้งข้อมูลบุคลากร
                if (dashboardResponse.data.personnel?.list) {
                    this.data.personnel = dashboardResponse.data.personnel.list;
                }
                
            } else {
                throw new Error(dashboardResponse.error || 'Failed to load dashboard data');
            }
            
            // 2. ดึงข้อมูลเพิ่มเติมสำหรับตาราง
            try {
                const [trainingData, studentData, teacherData] = await Promise.all([
                    this.callAPI('getTrainingData'),
                    this.callAPI('getStudentWorkData'),
                    this.callAPI('getTeacherAwardData')
                ]);
                
                // อัพเดตข้อมูลการอบรม
                if (trainingData.status === 'SUCCESS' && trainingData.data) {
                    this.data.training = trainingData.data;
                    this.data.filteredData.training = [...trainingData.data];
                    this.data.summary.training = trainingData.data.length;
                }
                
                // อัพเดตข้อมูลนักเรียน
                if (studentData.status === 'SUCCESS' && studentData.data) {
                    this.data.student = studentData.data;
                    this.data.filteredData.student = [...studentData.data];
                    this.data.summary.student = studentData.data.length;
                }
                
                // อัพเดตข้อมูลครู
                if (teacherData.status === 'SUCCESS' && teacherData.data) {
                    this.data.teacher = teacherData.data;
                    this.data.filteredData.teacher = [...teacherData.data];
                    this.data.summary.teacher = teacherData.data.length;
                }
                
            } catch (error) {
                console.warn('⚠️ Could not load detailed table data:', error);
                // ใช้ข้อมูลจาก dashboard แทน
            }
            
            console.log('📊 Dashboard data loaded:', this.data.summary);
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            
            // ถ้าโหลดไม่สำเร็จ ให้ใช้ mock data
            console.log('🔄 Using mock data for development');
            this.useMockData();
        }
    },
    
    // Use mock data for development
    useMockData: function() {
        const mockSummary = {
            training: 45,
            student: 28,
            teacher: 32,
            personnel: 125,
            photos: 180,
            total: 285
        };
        
        this.data.summary = mockSummary;
        
        // Mock data สำหรับตาราง
        this.data.training = this.generateMockData('training', 10);
        this.data.student = this.generateMockData('student', 10);
        this.data.teacher = this.generateMockData('teacher', 10);
        this.data.personnel = Array.from({length: 10}, (_, i) => `ครู${i+1} นามสกุล${i+1}`);
        
        this.data.filteredData.training = [...this.data.training];
        this.data.filteredData.student = [...this.data.student];
        this.data.filteredData.teacher = [...this.data.teacher];
    },
    
    // Generate mock data
    generateMockData: function(type, count) {
        const names = ['สมชาย ใจดี', 'สมหญิง สุขใจ', 'นักรบ มั่นคง', 'กนกวรรณ ใสสะอาด', 'วีระศักดิ์ กล้าหาญ'];
        const courses = ['อบรมการสอนออนไลน์', 'ศึกษาดูงานโรงเรียนมาตรฐาน', 'วิทยากรอบรมครู', 'สัมมนาวิชาการ'];
        const projects = ['โครงงานวิทยาศาสตร์', 'ผลงานศิลปะ', 'การแข่งขันกีฬา', 'กิจกรรมบำเพ็ญประโยชน์'];
        const awards = ['ครูดีเด่นประจำปี', 'ครูผู้สอนดีเด่น', 'ครูผู้มีคุณูปการต่อการศึกษา', 'รางวัลสร้างสรรค์นวัตกรรม'];
        
        return Array.from({length: count}, (_, i) => {
            const base = {
                id: `${type.toUpperCase()}${String(i+1).padStart(3, '0')}`,
                submissionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed'
            };
            
            switch(type) {
                case 'training':
                    return {
                        ...base,
                        fullName: names[i % names.length],
                        courseName: courses[i % courses.length],
                        courseType: ['อบรม', 'ศึกษาดูงาน', 'วิทยากร'][i % 3],
                        startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                        endDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                        totalHours: [8, 16, 24, 32][i % 4],
                        location: ['โรงเรียนตัวอย่าง', 'สำนักงานเขตพื้นที่', 'มหาวิทยาลัย'][i % 3]
                    };
                    
                case 'student':
                    return {
                        ...base,
                        studentName: `นักเรียน${i+1} นามสกุล${i+1}`,
                        projectName: projects[i % projects.length],
                        workType: ['ผลงานวิชาการ', 'ผลงานศิลปะ', 'กีฬา', 'กิจกรรม'][i % 4],
                        teacherAdvisor: names[i % names.length],
                        awardLevel: ['ระดับโรงเรียน', 'ระดับเขต', 'ระดับจังหวัด', 'ระดับประเทศ'][i % 4],
                        awardDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
                    };
                    
                case 'teacher':
                    return {
                        ...base,
                        teacherName: names[i % names.length],
                        awardName: awards[i % awards.length],
                        awardLevel: ['ระดับโรงเรียน', 'ระดับเขต', 'ระดับจังหวัด', 'ระดับประเทศ'][i % 4],
                        awardDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
                    };
                    
                default:
                    return base;
            }
        });
    },
    
    // Update summary cards
    updateSummaryCards: function() {
        const summaryCards = document.getElementById('summary-cards');
        if (!summaryCards) return;
        
        const cardsHTML = `
            <!-- Training Card -->
            <div class="summary-card training-card">
                <span class="card-icon">🎓</span>
                <div class="card-content">
                    <h3>อบรม/ศึกษาดูงาน/วิทยากร</h3>
                    <div class="card-stats">
                        <span class="stat-number">${this.data.summary.training.toLocaleString()}</span>
                        <span class="stat-label">รายการ</span>
                    </div>
                    <div class="card-subtext">
                        <span><i class="fas fa-chart-line"></i> ข้อมูลจาก Google Sheet</span>
                    </div>
                </div>
                <button class="card-btn" onclick="dashboardApp.switchTable('training')">
                    <i class="fas fa-list"></i> ดูรายละเอียดทั้งหมด
                </button>
            </div>
            
            <!-- Student Card -->
            <div class="summary-card student-card">
                <span class="card-icon">👨‍🎓</span>
                <div class="card-content">
                    <h3>ผลงานนักเรียน</h3>
                    <div class="card-stats">
                        <span class="stat-number">${this.data.summary.student.toLocaleString()}</span>
                        <span class="stat-label">ผลงาน</span>
                    </div>
                    <div class="card-subtext">
                        <span><i class="fas fa-chart-line"></i> ข้อมูลจาก Google Sheet</span>
                    </div>
                </div>
                <button class="card-btn" onclick="dashboardApp.switchTable('student')">
                    <i class="fas fa-list"></i> ดูรายละเอียดทั้งหมด
                </button>
            </div>
            
            <!-- Teacher Card -->
            <div class="summary-card teacher-card">
                <span class="card-icon">🏆</span>
                <div class="card-content">
                    <h3>ผลงานรางวัลครู</h3>
                    <div class="card-stats">
                        <span class="stat-number">${this.data.summary.teacher.toLocaleString()}</span>
                        <span class="stat-label">รางวัล</span>
                    </div>
                    <div class="card-subtext">
                        <span><i class="fas fa-chart-line"></i> ข้อมูลจาก Google Sheet</span>
                    </div>
                </div>
                <button class="card-btn" onclick="dashboardApp.switchTable('teacher')">
                    <i class="fas fa-list"></i> ดูรายละเอียดทั้งหมด
                </button>
            </div>
            
            <!-- Personnel Card -->
            <div class="summary-card" style="border-color: #6f42c1;">
                <span class="card-icon">👥</span>
                <div class="card-content">
                    <h3>บุคลากรทั้งหมด</h3>
                    <div class="card-stats">
                        <span class="stat-number">${this.data.summary.personnel.toLocaleString()}</span>
                        <span class="stat-label">คน</span>
                    </div>
                    <div class="card-subtext">
                        <span><i class="fas fa-chart-line"></i> ข้อมูลจาก Google Sheet</span>
                    </div>
                </div>
                <button class="card-btn" onclick="dashboardApp.viewPersonnelList()">
                    <i class="fas fa-users"></i> ดูรายชื่อทั้งหมด
                </button>
            </div>
        `;
        
        summaryCards.innerHTML = cardsHTML;
    },
    
    // View personnel list
    viewPersonnelList: function() {
        if (!this.data.personnel || this.data.personnel.length === 0) {
            this.showError('ไม่มีข้อมูลบุคลากร');
            return;
        }
        
        const personnelList = this.data.personnel.slice(0, 20); // แสดง 20 คนแรก
        const listHTML = personnelList.map(name => `<li>${name}</li>`).join('');
        
        const modal = window.open('', '_blank', 'width=600,height=500');
        modal.document.write(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>รายชื่อบุคลากร</title>
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 20px; background: #f5f5f5; }
                    .container { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #6f42c1; border-bottom: 2px solid #6f42c1; padding-bottom: 10px; margin-bottom: 20px; }
                    ul { list-style-type: none; padding: 0; }
                    li { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 1.1em; }
                    li:last-child { border-bottom: none; }
                    .stats { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .close-btn { background: #6f42c1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1><i class="fas fa-users"></i> รายชื่อบุคลากร</h1>
                    <div class="stats">
                        <strong>จำนวนบุคลากรทั้งหมด:</strong> ${this.data.summary.personnel} คน
                    </div>
                    <ul>${listHTML}</ul>
                    ${this.data.personnel.length > 20 ? `<p style="color: #666; margin-top: 15px;">...และอีก ${this.data.personnel.length - 20} รายชื่อ</p>` : ''}
                    <button class="close-btn" onclick="window.close()"><i class="fas fa-times"></i> ปิด</button>
                </div>
            </body>
            </html>
        `);
        modal.document.close();
    },
    
    // Initialize charts
    initCharts: function() {
        const chartsSection = document.getElementById('charts-section');
        if (!chartsSection) return;
        
        const chartsHTML = `
            <!-- Comparison Chart -->
            <div class="chart-card">
                <h3><span class="chart-icon">📊</span> เปรียบเทียบจำนวนรายการ</h3>
                <div class="chart-container">
                    <canvas id="comparisonChart"></canvas>
                </div>
                <div class="chart-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #007bff;"></span>
                        <span>การอบรม</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #28a745;"></span>
                        <span>ผลงานนักเรียน</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #ffc107;"></span>
                        <span>รางวัลครู</span>
                    </div>
                </div>
            </div>
            
            <!-- Distribution Chart -->
            <div class="chart-card">
                <h3><span class="chart-icon">🍩</span> สัดส่วนผลงานทั้งหมด</h3>
                <div class="chart-container">
                    <canvas id="distributionChart"></canvas>
                </div>
                <div class="time-filter">
                    <button class="filter-btn active" onclick="dashboardApp.updateTimeRange('month')">เดือนนี้</button>
                    <button class="filter-btn" onclick="dashboardApp.updateTimeRange('quarter')">ไตรมาสนี้</button>
                    <button class="filter-btn" onclick="dashboardApp.updateTimeRange('year')">ปีนี้</button>
                </div>
            </div>
            
            <!-- Monthly Activity Chart -->
            <div class="chart-card">
                <h3><span class="chart-icon">📈</span> กิจกรรมรายเดือน</h3>
                <div class="chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
                <div class="chart-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #007bff;"></span>
                        <span>การอบรม</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #28a745;"></span>
                        <span>ผลงานนักเรียน</span>
                    </div>
                </div>
            </div>
        `;
        
        chartsSection.innerHTML = chartsHTML;
        
        // Initialize Chart.js charts
        this.initChartJS();
    },
    
    // Initialize Chart.js
    initChartJS: function() {
        // Wait for DOM
        setTimeout(() => {
            // Comparison Chart (Bar)
            const comparisonCtx = document.getElementById('comparisonChart');
            if (comparisonCtx) {
                this.charts = this.charts || {};
                this.charts.comparison = new Chart(comparisonCtx, {
                    type: 'bar',
                    data: {
                        labels: ['การอบรม', 'ผลงานนักเรียน', 'รางวัลครู'],
                        datasets: [{
                            label: 'จำนวนรายการ',
                            data: [
                                this.data.summary.training,
                                this.data.summary.student,
                                this.data.summary.teacher
                            ],
                            backgroundColor: [
                                '#007bff',
                                '#28a745',
                                '#ffc107'
                            ],
                            borderColor: [
                                '#0069d9',
                                '#218838',
                                '#e0a800'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Distribution Chart (Doughnut)
            const distributionCtx = document.getElementById('distributionChart');
            if (distributionCtx) {
                const total = this.data.summary.training + this.data.summary.student + this.data.summary.teacher;
                this.charts.distribution = new Chart(distributionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['การอบรม', 'ผลงานนักเรียน', 'รางวัลครู'],
                        datasets: [{
                            data: [
                                this.data.summary.training,
                                this.data.summary.student,
                                this.data.summary.teacher
                            ],
                            backgroundColor: [
                                '#007bff',
                                '#28a745',
                                '#ffc107'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        return `${label}: ${value} รายการ (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Activity Chart (Line)
            const activityCtx = document.getElementById('activityChart');
            if (activityCtx) {
                // สร้างข้อมูลตัวอย่างสำหรับกราฟกิจกรรมรายเดือน
                const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const trainingData = Array.from({length: 12}, () => Math.floor(Math.random() * 10));
                const studentData = Array.from({length: 12}, () => Math.floor(Math.random() * 8));
                
                this.charts.activity = new Chart(activityCtx, {
                    type: 'line',
                    data: {
                        labels: months,
                        datasets: [
                            {
                                label: 'การอบรม',
                                data: trainingData,
                                borderColor: '#007bff',
                                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'ผลงานนักเรียน',
                                data: studentData,
                                borderColor: '#28a745',
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 2
                                }
                            }
                        }
                    }
                });
            }
        }, 500);
    },
    
    // Load table data
    loadTable: function(tableType) {
        this.state.currentTable = tableType;
        this.state.currentPage = 1;
        
        // Update active tab
        document.querySelectorAll('.data-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.table-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Set active tab and content
        const activeTab = document.querySelector(`.data-tab:nth-child(${this.getTabIndex(tableType)})`);
        const activeContent = document.getElementById(`${tableType}-table`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        // Render table
        this.renderTable(tableType);
    },
    
    // Get tab index
    getTabIndex: function(tableType) {
        const indexMap = {
            training: 1,
            student: 2,
            teacher: 3
        };
        return indexMap[tableType] || 1;
    },
    
    // Render table
    renderTable: function(tableType) {
        const tableContainer = document.getElementById(`${tableType}-table`);
        if (!tableContainer) return;
        
        const data = this.data.filteredData[tableType];
        const totalItems = data.length;
        this.state.totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        // Calculate pagination
        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = Math.min(startIndex + this.state.itemsPerPage, totalItems);
        const pageData = data.slice(startIndex, endIndex);
        
        // Generate table HTML
        let tableHTML = '';
        
        if (pageData.length === 0) {
            tableHTML = `
                <div class="no-data">
                    <i class="fas fa-inbox" style="font-size: 3em; color: #ccc; margin-bottom: 15px;"></i>
                    <p style="margin: 0; color: #666; font-size: 1.1em;">📭 ไม่พบข้อมูล</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #888;">
                        ยังไม่มีข้อมูลในหมวดหมู่นี้ หรือข้อมูลไม่ตรงกับการค้นหา
                    </p>
                </div>
            `;
        } else {
            tableHTML = `
                <table class="data-table">
                    <thead>
                        ${this.getTableHeaders(tableType)}
                    </thead>
                    <tbody>
                        ${pageData.map((item, index) => this.getTableRow(tableType, item, startIndex + index + 1)).join('')}
                    </tbody>
                </table>
            `;
        }
        
        tableContainer.innerHTML = tableHTML;
        
        // Update page info
        this.updatePageInfo();
    },
    
    // Get table headers
    getTableHeaders: function(tableType) {
        const headers = {
            training: `
                <tr>
                    <th>#</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>หลักสูตร/กิจกรรม</th>
                    <th>ประเภท</th>
                    <th>วันที่เริ่ม</th>
                    <th>สถานะ</th>
                    <th>การดำเนินการ</th>
                </tr>
            `,
            student: `
                <tr>
                    <th>#</th>
                    <th>ชื่อนักเรียน</th>
                    <th>ผลงาน</th>
                    <th>ประเภท</th>
                    <th>ครูที่ปรึกษา</th>
                    <th>วันที่ได้รับรางวัล</th>
                    <th>การดำเนินการ</th>
                </tr>
            `,
            teacher: `
                <tr>
                    <th>#</th>
                    <th>ชื่อครู</th>
                    <th>รางวัล</th>
                    <th>ระดับรางวัล</th>
                    <th>วันที่ได้รับรางวัล</th>
                    <th>การดำเนินการ</th>
                </tr>
            `
        };
        
        return headers[tableType] || headers.training;
    },
    
    // Get table row
    getTableRow: function(tableType, item, index) {
        const rowTemplates = {
            training: (item, index) => `
                <tr>
                    <td>${index}</td>
                    <td><strong>${item.fullName || item.name || 'ไม่มีข้อมูล'}</strong></td>
                    <td>${item.courseName || item.course || 'ไม่มีข้อมูล'}</td>
                    <td><span class="badge training">${item.courseType || item.type || 'อบรม'}</span></td>
                    <td>${this.formatDate(item.startDate || item.timestamp)}</td>
                    <td><span class="status completed">เสร็จสิ้น</span></td>
                    <td>
                        <button class="action-btn view-btn" onclick="dashboardApp.viewDetail('training', ${index})">
                            <i class="fas fa-eye"></i> ดู
                        </button>
                    </td>
                </tr>
            `,
            student: (item, index) => `
                <tr>
                    <td>${index}</td>
                    <td><strong>${item.studentName || 'ไม่มีข้อมูล'}</strong></td>
                    <td>${item.projectName || 'ไม่มีข้อมูล'}</td>
                    <td><span class="badge student">${item.workType || 'ผลงาน'}</span></td>
                    <td>${item.advisorName || item.teacherAdvisor || item.advisor || 'ไม่มีข้อมูล'}</td>
                    <td>${this.formatDate(item.awardDate)}</td>
                    <td>
                        <button class="action-btn view-btn" onclick="dashboardApp.viewDetail('student', ${index})">
                            <i class="fas fa-eye"></i> ดู
                        </button>
                    </td>
                </tr>
            `,
            teacher: (item, index) => `
                <tr>
                    <td>${index}</td>
                    <td><strong>${item.teacherName || 'ไม่มีข้อมูล'}</strong></td>
                    <td>${item.awardName || 'ไม่มีข้อมูล'}</td>
                    <td><span class="badge teacher">${item.awardLevel || 'รางวัล'}</span></td>
                    <td>${this.formatDate(item.awardDate)}</td>
                    <td>
                        <button class="action-btn view-btn" onclick="dashboardApp.viewDetail('teacher', ${index})">
                            <i class="fas fa-eye"></i> ดู
                        </button>
                    </td>
                </tr>
            `
        };
        
        const template = rowTemplates[tableType] || rowTemplates.training;
        return template(item, index);
    },
    
    // Format date
    formatDate: function(dateString) {
        if (!dateString) return 'ไม่มีข้อมูล';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    },
    
    // Update page info
    updatePageInfo: function() {
        const pageInfo = document.getElementById('page-info');
        if (pageInfo) {
            pageInfo.textContent = `หน้า ${this.state.currentPage} จาก ${this.state.totalPages}`;
        }
    },
    
    // Pagination
    prevPage: function() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.renderTable(this.state.currentTable);
        }
    },
    
    nextPage: function() {
        if (this.state.currentPage < this.state.totalPages) {
            this.state.currentPage++;
            this.renderTable(this.state.currentTable);
        }
    },
    
    // Switch table
    switchTable: function(tableType) {
        this.loadTable(tableType);
    },
    
    // Filter data
    filterData: function() {
        const category = document.getElementById('category-filter');
        const dateFilter = document.getElementById('date-filter');
        const searchText = document.getElementById('search-input');
        
        if (!category || !dateFilter || !searchText) return;
        
        const categoryValue = category.value;
        const dateFilterValue = dateFilter.value;
        const searchTextValue = searchText.value.toLowerCase();
        
        // Filter by category
        let filteredData = {};
        
        if (categoryValue === 'all') {
            filteredData.training = this.filterByDate(this.data.training, dateFilterValue);
            filteredData.student = this.filterByDate(this.data.student, dateFilterValue);
            filteredData.teacher = this.filterByDate(this.data.teacher, dateFilterValue);
        } else {
            const data = this.data[categoryValue] || [];
            filteredData[categoryValue] = this.filterByDate(data, dateFilterValue);
        }
        
        // Filter by search text
        if (searchTextValue) {
            Object.keys(filteredData).forEach(key => {
                filteredData[key] = filteredData[key].filter(item => {
                    // Search in all text fields
                    const searchableText = Object.values(item)
                        .filter(value => typeof value === 'string')
                        .join(' ')
                        .toLowerCase();
                    
                    return searchableText.includes(searchTextValue);
                });
            });
        }
        
        this.data.filteredData = filteredData;
        this.state.searchQuery = searchTextValue;
        
        // Reload current table
        this.state.currentPage = 1;
        this.renderTable(this.state.currentTable);
    },
    
    // Filter by date
    filterByDate: function(data, dateFilter) {
        if (dateFilter === 'all') return [...data];
        
        const now = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return [...data];
        }
        
        return data.filter(item => {
            let itemDate;
            
            // Determine which date field to use based on data type
            if (item.awardDate) {
                itemDate = new Date(item.awardDate);
            } else if (item.startDate) {
                itemDate = new Date(item.startDate);
            } else if (item.timestamp) {
                itemDate = new Date(item.timestamp);
            } else if (item.submissionDate) {
                itemDate = new Date(item.submissionDate);
            } else {
                return false; // No date field found
            }
            
            return itemDate >= startDate && itemDate <= now;
        });
    },
    
    // Search data
    searchData: function(event) {
        if (event && event.key === 'Enter') {
            this.filterData();
        } else if (!event) {
            this.filterData();
        }
    },
    
    // View detail
    viewDetail: function(category, index) {
        const data = this.data.filteredData[category];
        if (!data || index < 1 || index > data.length) {
            this.showError('ไม่พบข้อมูล');
            return;
        }
        
        const item = data[index - 1]; // Adjust for 1-based index
        this.showDetailModal(category, item);
    },
    
    // Show detail modal
    showDetailModal: function(category, item) {
        // สร้าง modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        const title = category === 'training' ? 'การอบรม' : 
                     category === 'student' ? 'ผลงานนักเรียน' : 'รางวัลครู';
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #333; font-size: 1.5em;">
                        <i class="fas fa-info-circle" style="color: #007bff; margin-right: 10px;"></i>
                        รายละเอียด${title}
                    </h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #666;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    ${this.getDetailContent(category, item)}
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()"
                            style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1em;">
                        <i class="fas fa-times"></i> ปิด
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // ปิดเมื่อคลิกนอก modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },
    
    // Get detail content
    getDetailContent: function(category, item) {
        let html = '';
        
        switch (category) {
            case 'training':
                html = `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ชื่อ-นามสกุล:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.fullName || item.name || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">หลักสูตร/กิจกรรม:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.courseName || item.course || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">ประเภท:</strong>
                            <span class="badge training" style="display: inline-block;">${item.courseType || item.type || 'อบรม'}</span>
                        </div>
                        
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">จำนวนชั่วโมง:</strong>
                            <div style="font-size: 1.1em; color: #333;">${item.hours || item.totalHours || '0'} ชั่วโมง</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่เริ่ม:</strong>
                            <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.startDate)}</div>
                        </div>
                        
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่สิ้นสุด:</strong>
                            <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.endDate)}</div>
                        </div>
                    </div>
                    
                    ${item.location ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">สถานที่:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.location}</div>
                    </div>` : ''}
                    
                    ${item.certificate ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">เกียรติบัตร:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.certificate}</div>
                    </div>` : ''}
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่บันทึก:</strong>
                        <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.timestamp || item.submissionDate)}</div>
                    </div>
                `;
                break;
                
            case 'student':
                html = `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ชื่อนักเรียน:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.studentName || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ชื่อผลงาน:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.projectName || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">ประเภทผลงาน:</strong>
                            <span class="badge student" style="display: inline-block;">${item.workType || 'ผลงาน'}</span>
                        </div>
                        
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">ระดับรางวัล:</strong>
                            <div style="font-size: 1.1em; color: #333;">${item.awardLevel || 'ไม่มีข้อมูล'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ครูที่ปรึกษา:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.advisorName || item.teacherAdvisor || item.advisor || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่ได้รับรางวัล:</strong>
                        <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.awardDate)}</div>
                    </div>
                    
                    ${item.certificate ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">เกียรติบัตร:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.certificate}</div>
                    </div>` : ''}
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่บันทึก:</strong>
                        <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.timestamp || item.submissionDate)}</div>
                    </div>
                `;
                break;
                
            case 'teacher':
                html = `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ชื่อครู:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.teacherName || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">ชื่อรางวัล:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.awardName || 'ไม่มีข้อมูล'}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">ระดับรางวัล:</strong>
                            <span class="badge teacher" style="display: inline-block;">${item.awardLevel || 'รางวัล'}</span>
                        </div>
                        
                        <div>
                            <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่ได้รับรางวัล:</strong>
                            <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.awardDate)}</div>
                        </div>
                    </div>
                    
                    ${item.certificate ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">เกียรติบัตร:</strong>
                        <div style="font-size: 1.1em; color: #333;">${item.certificate}</div>
                    </div>` : ''}
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; color: #666; margin-bottom: 5px;">วันที่บันทึก:</strong>
                        <div style="font-size: 1.1em; color: #333;">${this.formatDate(item.timestamp || item.submissionDate)}</div>
                    </div>
                `;
                break;
        }
        
        return html;
    },
    
    // Refresh all data
    refreshAllData: async function(silent = false) {
        if (!silent) {
            this.showLoading();
        }
        
        try {
            await this.loadDashboardData();
            
            this.updateSummaryCards();
            this.updateCharts();
            this.renderTable(this.state.currentTable);
            
            if (!silent) {
                this.hideLoading();
                this.showSuccess('อัพเดตข้อมูลสำเร็จ');
            }
            
        } catch (error) {
            if (!silent) {
                this.hideLoading();
                this.showError('ไม่สามารถอัพเดตข้อมูลได้: ' + error.message);
            }
            console.error('Refresh error:', error);
        }
    },
    
    // Update charts
    updateCharts: function() {
        if (!this.charts) return;
        
        if (this.charts.comparison) {
            this.charts.comparison.data.datasets[0].data = [
                this.data.summary.training,
                this.data.summary.student,
                this.data.summary.teacher
            ];
            this.charts.comparison.update();
        }
        
        if (this.charts.distribution) {
            const total = this.data.summary.training + this.data.summary.student + this.data.summary.teacher;
            this.charts.distribution.data.datasets[0].data = [
                this.data.summary.training,
                this.data.summary.student,
                this.data.summary.teacher
            ];
            this.charts.distribution.update();
        }
    },
    
    // Refresh table
    refreshTable: function() {
        this.renderTable(this.state.currentTable);
        this.showSuccess('รีเฟรชตารางสำเร็จ');
    },
    
    // Export table
    exportTable: function() {
        const data = this.data.filteredData[this.state.currentTable];
        if (data.length === 0) {
            this.showError('ไม่มีข้อมูลที่จะส่งออก');
            return;
        }
        
        const headers = this.getExportHeaders(this.state.currentTable);
        const csvContent = this.convertToCSV(data, headers);
        const fileName = `${this.state.currentTable}_export_${new Date().getTime()}.csv`;
        
        this.downloadCSV(csvContent, fileName);
        this.showSuccess('ส่งออกข้อมูลสำเร็จ');
    },
    
    // Get export headers
    getExportHeaders: function(tableType) {
        const headerMap = {
            training: ['ลำดับ', 'ชื่อ-นามสกุล', 'หลักสูตร/กิจกรรม', 'ประเภท', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'จำนวนชั่วโมง', 'สถานที่', 'วันที่บันทึก'],
            student: ['ลำดับ', 'ชื่อนักเรียน', 'ผลงาน', 'ประเภท', 'ครูที่ปรึกษา', 'ระดับรางวัล', 'วันที่ได้รับรางวัล', 'วันที่บันทึก'],
            teacher: ['ลำดับ', 'ชื่อครู', 'รางวัล', 'ระดับรางวัล', 'วันที่ได้รับรางวัล', 'วันที่บันทึก']
        };
        
        return headerMap[tableType] || headerMap.training;
    },
    
    // Convert to CSV
    convertToCSV: function(data, headers) {
        const csvRows = [];
        
        // Add headers with BOM for UTF-8
        csvRows.push(['\ufeff', ...headers].join(','));
        
        // Add data rows
        data.forEach((item, index) => {
            const row = [];
            
            switch (this.state.currentTable) {
                case 'training':
                    row.push(index + 1);
                    row.push(item.fullName || item.name || '');
                    row.push(item.courseName || item.course || '');
                    row.push(item.courseType || item.type || '');
                    row.push(this.formatDate(item.startDate));
                    row.push(this.formatDate(item.endDate));
                    row.push(item.hours || item.totalHours || '');
                    row.push(item.location || '');
                    row.push(this.formatDate(item.timestamp || item.submissionDate));
                    break;
                    
                case 'student':
                    row.push(index + 1);
                    row.push(item.studentName || '');
                    row.push(item.projectName || '');
                    row.push(item.workType || '');
                    row.push(item.advisorName || item.teacherAdvisor || item.advisor || '');
                    row.push(item.awardLevel || '');
                    row.push(this.formatDate(item.awardDate));
                    row.push(this.formatDate(item.timestamp || item.submissionDate));
                    break;
                    
                case 'teacher':
                    row.push(index + 1);
                    row.push(item.teacherName || '');
                    row.push(item.awardName || '');
                    row.push(item.awardLevel || '');
                    row.push(this.formatDate(item.awardDate));
                    row.push(this.formatDate(item.timestamp || item.submissionDate));
                    break;
            }
            
            csvRows.push(row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','));
        });
        
        return csvRows.join('\n');
    },
    
    // Download CSV
    downloadCSV: function(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        if (navigator.msSaveBlob) {
            // IE 10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },
    
    // Export dashboard
    exportDashboard: async function() {
        try {
            const response = await this.callAPI('getDashboardSummary');
            if (response.status === 'SUCCESS') {
                const exportData = {
                    ...response.data,
                    exportDate: new Date().toISOString(),
                    exportTitle: 'Dashboard Export'
                };
                
                const jsonContent = JSON.stringify(exportData, null, 2);
                const fileName = `dashboard_export_${new Date().getTime()}.json`;
                
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showSuccess('ส่งออกแดชบอร์ดสำเร็จ');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('ไม่สามารถส่งออกแดชบอร์ดได้');
        }
    },
    
    // Update time range
    updateTimeRange: function(range) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.filter-btn:nth-child(${range === 'month' ? 1 : range === 'quarter' ? 2 : 3})`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // อัพเดตข้อมูลตามช่วงเวลา
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.value = range;
            this.filterData();
        }
    },
    
    // Call API
    callAPI: async function(action, payload = {}) {
        if (!this.config.apiUrl) {
            throw new Error('API URL not configured');
        }
        
        const requestBody = {
            action: action,
            ...payload
        };
        
        console.log(`📡 Calling API: ${action}`, requestBody);
        
        try {
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`📡 API Response for ${action}:`, data);
            
            return data;
            
        } catch (error) {
            console.error(`❌ API Error for ${action}:`, error);
            throw error;
        }
    },
    
    // Show loading
    showLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
        this.state.isLoading = true;
    },
    
    // Hide loading
    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
        this.state.isLoading = false;
    },
    
    // Show success message
    showSuccess: function(message) {
        this.showNotification(message, 'success');
    },
    
    // Show error message
    showError: function(message) {
        this.showNotification(message, 'error');
    },
    
    // Show notification
    showNotification: function(message, type) {
        // สร้าง notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-family: 'Sarabun', sans-serif;
            z-index: 99999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        if (type === 'success') {
            notification.style.background = '#28a745';
            notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        } else {
            notification.style.background = '#dc3545';
            notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        }
        
        document.body.appendChild(notification);
        
        // หายไปหลังจาก 3 วินาที
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Initialize when page loads
if (document.getElementById('dashboard-container')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 Dashboard DOM Content Loaded');
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Initialize dashboard with a delay to ensure DOM is ready
        setTimeout(() => {
            if (window.GAS_API_URL && typeof window.dashboardApp !== 'undefined') {
                window.dashboardApp.init(window.GAS_API_URL);
            } else {
                console.error('Dashboard cannot initialize: API URL not set');
                window.dashboardApp.showError('ไม่สามารถโหลด Dashboard ได้ กรุณาตรวจสอบการเชื่อมต่อ API');
            }
        }, 500);
    });
}

// For main.js integration
window.initializeDashboard = function(apiUrl) {
    console.log('initializeDashboard called from main.js with API URL:', apiUrl);
    if (typeof window.dashboardApp !== 'undefined') {
        window.dashboardApp.init(apiUrl);
    }
};

console.log('📊 Dashboard script loaded');