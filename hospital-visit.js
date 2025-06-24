// Hospital Visit module functionality
console.log('Loading hospital-visit.js...');

class HospitalVisitManager {
    constructor() {
        this.currentSection = 'new-request';
        this.formData = {};
        this.isFormValid = false;
        this.sectionData = {
            'pending-visits': [],
            'confirmed-visits': [],
            'todays-visits': [],
            'tomorrows-visits': [],
            'later-visits': [],
            'post-visit': [],
            'completed': [],
            'cancelled': []
        };
        this.selectedVisits = {
            'pending-visits': new Set(),
            'confirmed-visits': new Set(),
            'todays-visits': new Set(),
            'tomorrows-visits': new Set(),
            'later-visits': new Set(),
            'post-visit': new Set(),
            'completed': new Set(),
            'cancelled': new Set()
        };
        this.confirmedVisitsExpanded = false;
        this.editingCell = null;
        this.hospitals = [];
        this.patients = [];
    }

    // Initialize the hospital visit module
    init() {
        console.log('Hospital Visit - init() called');
        console.log('Hospital Visit - Current section:', this.currentSection);

        this.setupSidebarNavigation();
        this.setupNewRequestForm();
        this.setupFormValidation();
        this.setupTableInteractions();
        this.setupBulkActions();
        this.setupRefreshButtons();
        this.loadHospitals();
        this.loadPatients();

        // Load data for current section if not new-request
        if (this.currentSection !== 'new-request') {
            this.loadSectionData(this.currentSection);
        }

        console.log('Hospital Visit - init() completed');
    }

    // Setup sidebar navigation
    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('#hospital-visit-module .sidebar-item');

        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    // Toggle Confirmed Visits expandable menu
    toggleConfirmedVisitsMenu() {
        const subMenu = document.getElementById('confirmedVisitsSubMenu');
        const arrow = document.getElementById('confirmedVisitsArrow');

        if (this.confirmedVisitsExpanded) {
            // Collapse
            subMenu.style.display = 'none';
            subMenu.classList.remove('show');
            arrow.classList.remove('expanded');
            this.confirmedVisitsExpanded = false;
        } else {
            // Expand
            subMenu.style.display = 'block';
            subMenu.classList.add('show');
            arrow.classList.add('expanded');
            this.confirmedVisitsExpanded = true;
        }
    }

    // Switch between sections
    switchSection(sectionName) {
        // Update sidebar active state
        const sidebarItems = document.querySelectorAll('#hospital-visit-module .sidebar-item');
        sidebarItems.forEach(item => {
            item.classList.remove('active');
        });

        // Remove active class from all sub-menu items
        const subMenuItems = document.querySelectorAll('#hospital-visit-module .sub-menu-item');
        subMenuItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`#hospital-visit-module .sidebar-item[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Add active class to sub-menu item if applicable
        const activeSubMenuItem = document.querySelector(`#hospital-visit-module .sub-menu-item[data-section="${sectionName}"]`);
        if (activeSubMenuItem) {
            activeSubMenuItem.classList.add('active');
            // Ensure the parent menu is expanded when a sub-item is selected
            if (!this.confirmedVisitsExpanded) {
                this.toggleConfirmedVisitsMenu();
            }
        }

        // Hide all sections
        const sections = document.querySelectorAll('#hospital-visit-module .section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        let sectionId = `${sectionName}-section`;
        // Handle special case for completed section to avoid ID conflicts
        if (sectionName === 'completed') {
            sectionId = 'completed-visits-section';
        }

        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
            this.currentSection = sectionName;

            // Load data for the section
            if (sectionName !== 'new-request') {
                this.loadSectionData(sectionName);
            }
        }
    }

    // Setup new request form
    setupNewRequestForm() {
        console.log('Hospital Visit - Setting up new request form');

        const form = document.getElementById('hospitalVisitForm');
        const iycInput = document.getElementById('visitIycNumber');
        const nameInput = document.getElementById('visitPatientName');
        const resetBtn = document.getElementById('resetVisitFormBtn');

        console.log('Hospital Visit - Form elements:', {
            form: !!form,
            iycInput: !!iycInput,
            nameInput: !!nameInput,
            resetBtn: !!resetBtn
        });

        // Handle IYC number input with debouncing
        if (iycInput) {
            console.log('Hospital Visit - Adding event listener to IYC input');
            let debounceTimer;
            iycInput.addEventListener('input', () => {
                console.log('Hospital Visit - IYC input event triggered, value:', iycInput.value);
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleIYCLookup(iycInput.value);
                }, 500); // 500ms delay
            });
        } else {
            console.error('Hospital Visit - IYC input element not found!');
        }

        // Handle name input for search
        if (nameInput) {
            let searchTimer;
            nameInput.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.handleNameSearch(nameInput.value);
                }, 300); // 300ms delay
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!nameInput.contains(e.target)) {
                    this.hideNameDropdown();
                }
            });
        }

        // Handle form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Handle reset button
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }
    }

    // Setup form validation
    setupFormValidation() {
        const form = document.getElementById('hospitalVisitForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateForm();
            });
            input.addEventListener('change', () => {
                this.validateForm();
            });
        });
    }

    // Setup table interactions
    setupTableInteractions() {
        // Setup checkbox interactions specifically for hospital visit module
        const hospitalVisitModule = document.getElementById('hospital-visit-module');
        if (!hospitalVisitModule) {
            console.error('Hospital visit module not found for table interactions');
            return;
        }

        hospitalVisitModule.addEventListener('change', (e) => {
            if (e.target.classList.contains('visit-checkbox')) {
                this.handleVisitSelection(e.target);
            } else if (e.target.classList.contains('select-all-checkbox')) {
                this.handleSelectAll(e.target);
            }
        });
    }

    // Setup bulk actions
    setupBulkActions() {
        // Setup action button clicks specifically for hospital visit module
        const hospitalVisitModule = document.getElementById('hospital-visit-module');
        if (!hospitalVisitModule) {
            console.error('Hospital visit module not found');
            return;
        }

        hospitalVisitModule.addEventListener('click', (e) => {
            // Check if clicked element is an action button or find closest action button
            const actionBtn = e.target.classList.contains('action-btn') ? e.target : e.target.closest('.action-btn');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleActionDropdown(actionBtn);
            } else if (e.target.classList.contains('dropdown-item')) {
                this.handleBulkAction(e.target);
            } else {
                // Close all dropdowns when clicking elsewhere
                this.closeAllDropdowns();
            }
        });

        // Also add direct event listeners to each action button as backup
        const actionButtons = [
            'pendingVisitsActionBtn',
            'confirmedVisitsActionBtn',
            'todaysVisitsActionBtn',
            'tomorrowsVisitsActionBtn',
            'laterVisitsActionBtn',
            'postVisitsActionBtn',
            'completedVisitsActionBtn',
            'cancelledVisitsActionBtn'
        ];

        actionButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleActionDropdown(btn);
                });
            }
        });
    }

    // Setup refresh buttons
    setupRefreshButtons() {
        const refreshButtons = [
            'refreshPendingVisitsBtn',
            'refreshConfirmedVisitsBtn', 
            'refreshPostVisitsBtn',
            'refreshCompletedVisitsBtn'
        ];

        refreshButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    const section = btnId.replace('refresh', '').replace('Btn', '').toLowerCase();
                    const sectionName = section.replace(/([A-Z])/g, '-$1').toLowerCase();
                    this.loadSectionData(sectionName);
                });
            }
        });
    }

    // Load hospitals from Hospital Directory
    async loadHospitals() {
        const hospitalSelect = document.getElementById('visitHospital');
        const loadingIndicator = document.getElementById('hospitalLoading');

        if (!hospitalSelect) return;

        try {
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            const result = await googleSheetsAPI.getHospitals();
            
            if (result.success) {
                this.hospitals = result.hospitals;
                
                // Clear existing options except the first one
                hospitalSelect.innerHTML = '<option value="">Select Hospital</option>';
                
                // Add hospital options
                this.hospitals.forEach(hospital => {
                    const option = document.createElement('option');
                    option.value = hospital;
                    option.textContent = hospital;
                    hospitalSelect.appendChild(option);
                });
            } else {
                console.error('Failed to load hospitals:', result.message);
            }
        } catch (error) {
            console.error('Error loading hospitals:', error);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // Load patients for search functionality
    async loadPatients() {
        try {
            const result = await googleSheetsAPI.getAllPatients();
            
            if (result.success) {
                this.patients = result.patients;
            } else {
                console.error('Failed to load patients:', result.message);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    // Handle IYC number lookup
    async handleIYCLookup(iycNumber) {
        console.log('Hospital Visit - handleIYCLookup called with:', iycNumber);
        console.log('Hospital Visit - googleSheetsAPI.isInitialized:', googleSheetsAPI.isInitialized);

        const loadingIndicator = document.getElementById('visitIycLoading');
        const nameInput = document.getElementById('visitPatientName');
        const phoneInput = document.getElementById('visitPhoneNumber');

        console.log('Hospital Visit - Form elements found:', {
            loadingIndicator: !!loadingIndicator,
            nameInput: !!nameInput,
            phoneInput: !!phoneInput
        });

        if (!iycNumber || iycNumber.trim() === '') {
            // Clear fields if IYC is empty
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            this.validateForm();
            return;
        }

        try {
            // Show loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            console.log('Hospital Visit - About to call googleSheetsAPI.lookupPatientByIYC');
            // Lookup patient data
            const result = await googleSheetsAPI.lookupPatientByIYC(iycNumber.trim());
            console.log('Hospital Visit - API result:', result);

            if (result.found) {
                // Populate fields with found data
                if (nameInput) {
                    nameInput.value = result.name;
                    nameInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-filled
                    nameInput.placeholder = 'Auto-filled from database (editable)';
                }
                if (phoneInput) {
                    phoneInput.value = result.phone;
                    phoneInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-filled
                    phoneInput.placeholder = 'Auto-filled from database (editable)';
                }
            } else {
                // Clear fields if not found
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.style.backgroundColor = '';
                    nameInput.placeholder = 'Patient not found - enter manually';
                }
                if (phoneInput) {
                    phoneInput.value = '';
                    phoneInput.style.backgroundColor = '';
                    phoneInput.placeholder = 'Enter phone number manually';
                }
            }
        } catch (error) {
            console.error('Error looking up patient:', error);
            
            // Allow manual entry on error
            if (nameInput) {
                nameInput.style.backgroundColor = '';
                nameInput.placeholder = 'Lookup failed - enter manually';
            }
            if (phoneInput) {
                phoneInput.style.backgroundColor = '';
                phoneInput.placeholder = 'Enter phone number manually';
            }
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            this.validateForm();
        }
    }

    // Handle name search
    handleNameSearch(searchTerm) {
        const dropdown = document.getElementById('nameSearchDropdown');
        
        if (!searchTerm || searchTerm.trim() === '' || searchTerm.length < 2) {
            this.hideNameDropdown();
            return;
        }

        const filteredPatients = this.patients.filter(patient => 
            patient.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredPatients.length > 0) {
            this.showNameDropdown(filteredPatients);
        } else {
            this.hideNameDropdown();
        }
    }

    // Show name search dropdown
    showNameDropdown(patients) {
        const dropdown = document.getElementById('nameSearchDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '';
        
        patients.slice(0, 10).forEach(patient => { // Limit to 10 results
            const item = document.createElement('div');
            item.className = 'search-dropdown-item';
            item.textContent = `${patient.name} (${patient.iycNumber})`;
            item.addEventListener('click', () => {
                this.selectPatient(patient);
            });
            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    // Hide name search dropdown
    hideNameDropdown() {
        const dropdown = document.getElementById('nameSearchDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Select patient from dropdown
    selectPatient(patient) {
        const iycInput = document.getElementById('visitIycNumber');
        const nameInput = document.getElementById('visitPatientName');
        const phoneInput = document.getElementById('visitPhoneNumber');

        if (iycInput) iycInput.value = patient.iycNumber;
        if (nameInput) {
            nameInput.value = patient.name;
            nameInput.style.backgroundColor = '#e8f5e8';
        }
        if (phoneInput) {
            phoneInput.value = patient.phone;
            phoneInput.style.backgroundColor = '#e8f5e8';
        }

        this.hideNameDropdown();
        this.validateForm();
    }

    // Validate form
    validateForm() {
        const form = document.getElementById('hospitalVisitForm');
        const saveBtn = document.getElementById('saveVisitBtn');

        if (!form || !saveBtn) return;

        // Collect form data
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        // Check required fields
        const requiredFields = ['iycNumber', 'patientName', 'phoneNumber', 'hospital', 'purpose', 'priority'];
        const errors = [];

        requiredFields.forEach(field => {
            if (!data[field] || data[field] === '') {
                errors.push(`${field} is required`);
            }
        });

        // Special validation: Doctor field is mandatory when purpose is "Consultation & Investigation"
        if (data.purpose === 'Consultation & Investigation') {
            if (!data.doctor || data.doctor === '') {
                errors.push('Doctor is required when purpose is "Consultation & Investigation"');

                // Highlight the doctor field to show it's required
                const doctorField = document.getElementById('visitDoctor');
                if (doctorField) {
                    doctorField.style.borderColor = '#e74c3c';
                    doctorField.style.backgroundColor = '#fdf2f2';

                    // Add required indicator if not already present
                    const label = document.querySelector('label[for="visitDoctor"]');
                    if (label && !label.querySelector('.required-indicator')) {
                        const requiredSpan = document.createElement('span');
                        requiredSpan.className = 'required-indicator';
                        requiredSpan.style.color = '#e74c3c';
                        requiredSpan.textContent = ' *';
                        label.appendChild(requiredSpan);
                    }
                }
            } else {
                // Reset doctor field styling if it's filled
                const doctorField = document.getElementById('visitDoctor');
                if (doctorField) {
                    doctorField.style.borderColor = '';
                    doctorField.style.backgroundColor = '';
                }
            }
        } else {
            // Reset doctor field styling and remove required indicator when purpose is not "Consultation & Investigation"
            const doctorField = document.getElementById('visitDoctor');
            if (doctorField) {
                doctorField.style.borderColor = '';
                doctorField.style.backgroundColor = '';
            }

            const label = document.querySelector('label[for="visitDoctor"]');
            const requiredIndicator = label?.querySelector('.required-indicator');
            if (requiredIndicator) {
                requiredIndicator.remove();
            }
        }

        // Update form validity
        this.isFormValid = errors.length === 0;
        saveBtn.disabled = !this.isFormValid;

        // Store form data
        this.formData = data;

        return this.isFormValid;
    }

    // Handle form submission
    async handleFormSubmit() {
        if (!this.validateForm()) {
            this.showMessage('visitFormMessage', 'Please fill in all required fields', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveVisitBtn');
        const originalText = saveBtn.innerHTML;

        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            // Prepare visit data
            const visitData = {
                dateRequested: new Date().toISOString().split('T')[0], // Current date
                iycNumber: this.formData.iycNumber,
                patientName: this.formData.patientName,
                phoneNumber: this.formData.phoneNumber,
                hospital: this.formData.hospital,
                purpose: this.formData.purpose,
                doctor: this.formData.doctor || '',
                remarks: this.formData.remarks || '',
                priority: this.formData.priority,
                status: 'Pending'
            };

            // Save to Google Sheets
            const result = await googleSheetsAPI.saveHospitalVisit(visitData);

            if (result.success) {
                this.showMessage('visitFormMessage', 'Hospital visit request saved successfully!', 'success');
                this.resetForm();
            } else {
                this.showMessage('visitFormMessage', result.message || 'Failed to save hospital visit request', 'error');
            }

        } catch (error) {
            console.error('Error saving hospital visit:', error);
            this.showMessage('visitFormMessage', 'An error occurred while saving. Please try again.', 'error');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('hospitalVisitForm');
        if (form) {
            form.reset();

            // Clear auto-filled styling
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.style.backgroundColor = '';
                input.placeholder = input.getAttribute('placeholder') || '';
            });

            // Reset validation
            this.validateForm();

            // Clear any messages
            this.showMessage('visitFormMessage', '', '');
        }
    }

    // Load section data
    async loadSectionData(sectionName) {
        this.showSectionLoading(sectionName, true);

        try {
            let status;
            let filteredVisits = [];

            switch (sectionName) {
                case 'pending-visits':
                    status = 'Pending';
                    break;
                case 'confirmed-visits':
                    status = 'Confirmed';
                    break;
                case 'todays-visits':
                case 'tomorrows-visits':
                case 'later-visits':
                    // These sections filter from pending visits based on appointment date
                    status = 'Pending';
                    break;
                case 'post-visit':
                    status = 'Post Visit';
                    break;
                case 'completed':
                    status = 'Completed';
                    break;
                case 'cancelled':
                    status = 'Cancelled';
                    break;
                default:
                    console.warn(`Unknown section: ${sectionName}`);
                    return;
            }

            const result = await googleSheetsAPI.getHospitalVisits(status);
            console.log(`Loading ${sectionName} data:`, result);

            if (result.success) {
                // Filter visits based on section type
                if (['todays-visits', 'tomorrows-visits', 'later-visits'].includes(sectionName)) {
                    filteredVisits = this.filterVisitsByDate(result.visits, sectionName);
                } else {
                    filteredVisits = result.visits;
                }

                console.log(`Filtered visits for ${sectionName}:`, filteredVisits);

                // Sort completed visits in descending order by appointment date
                if (sectionName === 'completed') {
                    filteredVisits.sort((a, b) => {
                        const dateA = a.appointmentDate || '';
                        const dateB = b.appointmentDate || '';
                        return dateB.localeCompare(dateA); // Descending order
                    });
                }

                this.sectionData[sectionName] = filteredVisits;
                this.renderSectionTable(sectionName);
                this.updateSectionControls(sectionName);
            } else {
                console.error(`Failed to load ${sectionName} data:`, result.message);
                this.showSectionMessage(sectionName, 'Failed to load data: ' + result.message, 'error');
            }
        } catch (error) {
            console.error(`Error loading ${sectionName} data:`, error);
            this.showSectionMessage(sectionName, 'Failed to load data. Please try again.', 'error');
        } finally {
            this.showSectionLoading(sectionName, false);
        }
    }

    // Render section table
    renderSectionTable(sectionName) {
        const tableId = this.getSectionTableId(sectionName);
        const table = document.getElementById(tableId);



        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const visits = this.sectionData[sectionName] || [];

        if (visits.length === 0) {
            let colspanCount;
            if (['pending-visits', 'todays-visits', 'tomorrows-visits', 'later-visits'].includes(sectionName)) {
                colspanCount = 10;
            } else if (['post-visit', 'completed'].includes(sectionName)) {
                colspanCount = 8;
            } else {
                colspanCount = 11;
            }
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="${colspanCount}">No ${sectionName.replace('-', ' ')} found</td>
                </tr>
            `;
            return;
        }

        if (['pending-visits', 'todays-visits', 'tomorrows-visits', 'later-visits'].includes(sectionName)) {
            // Special rendering for pending visits and date-filtered sections with same column structure
            tbody.innerHTML = visits.map((visit, index) => `
                <tr data-visit-id="${visit.id}" data-row-index="${visit.rowIndex}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="visit-checkbox" value="${visit.id}">
                    </td>
                    <td class="appointment-date-col">
                        <input type="date" class="appointment-date-input" id="dateInput-${visit.id}"
                               value="${visit.appointmentDate || ''}"
                               onchange="hospitalVisitManager.handleDateChange('${visit.id}', this.value)"
                               title="${visit.appointmentDate ? 'Appointment: ' + hospitalVisitManager.formatDisplayDate(visit.appointmentDate) : 'Select appointment date'}">
                    </td>
                    <td>${visit.patientName}</td>
                    <td>${visit.phoneNumber}</td>
                    <td>${visit.hospital}</td>
                    <td>
                        <button class="action-button details-button" onclick="hospitalVisitManager.showVisitDetails('${visit.id}')" title="View Details">
                            Details
                        </button>
                    </td>
                    <td>
                        ${visit.emailSent === 'Yes' ?
                            '<button class="action-button email-sent-button" disabled title="Email already sent"><i class="fas fa-check"></i> Email Sent</button>' :
                            `<button class="action-button credit-button" onclick="hospitalVisitManager.sendCredit('${visit.id}')" title="Send Credit">Send Credit</button>`
                        }
                    </td>
                    <td>
                        <button class="action-button send-details-button" onclick="hospitalVisitManager.sendDetails('${visit.id}')" title="Send Details">
                            Send Details
                        </button>
                    </td>
                    <td>
                        <button class="action-button cab-button" onclick="hospitalVisitManager.bookCab('${visit.id}')" title="Book Cab">
                            Book Cab
                        </button>
                    </td>
                    <td>${visit.remarks}</td>
                </tr>
            `).join('');
        } else if (['post-visit', 'completed'].includes(sectionName)) {
            // Special rendering for post visit and completed sections
            tbody.innerHTML = visits.map((visit, index) => `
                <tr data-visit-id="${visit.id}" data-row-index="${visit.rowIndex}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="visit-checkbox" value="${visit.id}">
                    </td>
                    <td class="appointment-date-col">${visit.appointmentDate || 'Not set'}</td>
                    <td>${visit.patientName}</td>
                    <td>${visit.hospital}</td>
                    <td>${visit.phoneNumber}</td>
                    <td>
                        <button class="action-button details-button" onclick="hospitalVisitManager.showVisitDetails('${visit.id}')" title="View Details">
                            View Details
                        </button>
                    </td>
                    <td>
                        ${sectionName === 'completed' ?
                            visit.billsSubmission || 'No' :
                            `<select class="submission-dropdown" data-visit-id="${visit.id}" data-field="billsSubmission"
                                    onchange="hospitalVisitManager.handleSubmissionChange('${visit.id}', 'billsSubmission', this.value)">
                                <option value="No" ${visit.billsSubmission === 'No' ? 'selected' : ''}>No</option>
                                <option value="Yes" ${visit.billsSubmission === 'Yes' ? 'selected' : ''}>Yes</option>
                                <option value="Not needed" ${visit.billsSubmission === 'Not needed' ? 'selected' : ''}>Not needed</option>
                            </select>`
                        }
                    </td>
                    <td>
                        ${sectionName === 'completed' ?
                            visit.reportsSubmission || 'No' :
                            `<select class="submission-dropdown" data-visit-id="${visit.id}" data-field="reportsSubmission"
                                    onchange="hospitalVisitManager.handleSubmissionChange('${visit.id}', 'reportsSubmission', this.value)">
                                <option value="No" ${visit.reportsSubmission === 'No' ? 'selected' : ''}>No</option>
                                <option value="Yes" ${visit.reportsSubmission === 'Yes' ? 'selected' : ''}>Yes</option>
                                <option value="Not needed" ${visit.reportsSubmission === 'Not needed' ? 'selected' : ''}>Not needed</option>
                            </select>`
                        }
                    </td>
                </tr>
            `).join('');
        } else {
            // Original rendering for other sections
            tbody.innerHTML = visits.map((visit, index) => `
                <tr data-visit-id="${visit.id}" data-row-index="${visit.rowIndex}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="visit-checkbox" value="${visit.id}">
                    </td>
                    <td>${visit.dateRequested}</td>
                    <td>${visit.iycNumber}</td>
                    <td>${visit.patientName}</td>
                    <td>${visit.phoneNumber}</td>
                    <td>${visit.hospital}</td>
                    <td>${visit.purpose}</td>
                    <td>${visit.doctor}</td>
                    <td>${visit.sendCreditNote ? 'Yes' : 'No'}</td>
                    <td>${visit.bookCab ? 'Yes' : 'No'}</td>
                    <td>${visit.remarks}</td>
                </tr>
            `).join('');
        }
    }

    // Get section table ID
    getSectionTableId(sectionName) {
        const mapping = {
            'pending-visits': 'pendingVisitsTable',
            'confirmed-visits': 'confirmedVisitsTable',
            'todays-visits': 'todaysVisitsTable',
            'tomorrows-visits': 'tomorrowsVisitsTable',
            'later-visits': 'laterVisitsTable',
            'post-visit': 'postVisitsTable',
            'completed': 'completedVisitsTable',
            'cancelled': 'cancelledVisitsTable'
        };
        return mapping[sectionName];
    }

    // Show visit details in modal
    async showVisitDetails(visitId) {
        // Find the visit data
        let visitData = null;
        for (const sectionName in this.sectionData) {
            const visit = this.sectionData[sectionName].find(v => v.id === visitId);
            if (visit) {
                visitData = visit;
                break;
            }
        }

        if (!visitData) {
            console.error('Visit not found:', visitId);
            return;
        }

        // Populate modal with visit data
        document.getElementById('modalIycNumber').textContent = visitData.iycNumber || '';
        document.getElementById('modalPatientName').textContent = visitData.patientName || '';
        document.getElementById('modalPhoneNumber').textContent = visitData.phoneNumber || '';
        document.getElementById('modalHospital').textContent = visitData.hospital || '';
        document.getElementById('modalDoctor').textContent = visitData.doctor || '';
        document.getElementById('modalPurpose').textContent = visitData.purpose || '';
        document.getElementById('modalDateRequested').textContent = visitData.dateRequested || '';
        document.getElementById('modalPriority').textContent = visitData.priority || '';
        document.getElementById('modalRemarks').textContent = visitData.remarks || '';

        // Fetch patient email from database
        try {
            if (visitData.iycNumber) {
                const patientResult = await googleSheetsAPI.lookupPatientByIYC(visitData.iycNumber);
                if (patientResult.found && patientResult.email) {
                    document.getElementById('modalEmail').textContent = patientResult.email;
                } else {
                    document.getElementById('modalEmail').textContent = 'Not available';
                }
            } else {
                document.getElementById('modalEmail').textContent = 'Not available';
            }
        } catch (error) {
            console.error('Error fetching patient email:', error);
            document.getElementById('modalEmail').textContent = 'Error loading email';
        }

        // Show modal
        const modal = document.getElementById('visitDetailsModal');
        modal.style.display = 'flex';

        // Add event listener for clicking outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Add event listener for close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // Add keyboard event listener for ESC key
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('visitDetailsModal');
        modal.style.display = 'none';

        // Remove any keyboard event listeners
        document.removeEventListener('keydown', this.handleKeyPress);
    }



    // Handle date change for appointment
    handleDateChange(visitId, selectedDate) {
        const dateInput = document.getElementById(`dateInput-${visitId}`);

        if (selectedDate) {
            // Format date for display in "d-MMM-yyyy" format (e.g., "2-Apr-2025")
            const date = new Date(selectedDate);
            const day = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            const formattedDate = `${day}-${month}-${year}`;

            // Update input title
            dateInput.title = `Appointment: ${formattedDate}`;

            console.log(`Appointment date set for visit ${visitId}: ${formattedDate}`);

            // Save the appointment date to the backend
            this.saveAppointmentDate(visitId, selectedDate);
        } else {
            // Reset if no date selected
            dateInput.title = 'Select appointment date';

            // Save empty date to backend when clearing
            console.log(`Clearing appointment date for visit ${visitId}`);
            this.saveAppointmentDate(visitId, '');
        }
    }

    // Send Credit button functionality
    async sendCredit(visitId) {
        console.log(`Send Credit clicked for visit: ${visitId}`);

        // Find the button element
        const button = document.querySelector(`[onclick="hospitalVisitManager.sendCredit('${visitId}')"]`);
        if (!button) return;

        // Disable button and show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // Send email via API
            const response = await fetch('/api/send-credit-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ visitId })
            });

            const result = await response.json();

            if (result.success) {
                // Update button to show success state permanently
                button.innerHTML = '<i class="fas fa-check"></i> Email Sent';
                button.classList.remove('credit-button');
                button.classList.add('email-sent-button');
                button.disabled = true;
                button.title = 'Email already sent';

                // Remove the onclick attribute to prevent further clicks
                button.removeAttribute('onclick');

                // Update the local data cache to reflect the email sent status
                this.updateLocalVisitEmailStatus(visitId, 'Yes');

                const recipientCount = result.emailsSent || result.emailAddresses?.length || 1;
                AppUtils.showNotification(`Credit email sent successfully to ${recipientCount} recipient(s)`, 'success');

                // Note: Button state will persist because we updated the local cache
                // and the database is also updated on the backend
            } else {
                // Check if the error is due to missing appointment date
                if (result.requiresAppointmentDate) {
                    // Show specific prompt for appointment date
                    const shouldUpdateDate = confirm(
                        'Appointment date is required before sending credit email.\n\n' +
                        'Would you like to update the appointment date now?'
                    );

                    if (shouldUpdateDate) {
                        // Find the appointment date input for this visit and focus on it
                        const appointmentInput = document.getElementById(`dateInput-${visitId}`);
                        if (appointmentInput) {
                            appointmentInput.focus();
                            appointmentInput.style.border = '2px solid #e74c3c';
                            appointmentInput.style.backgroundColor = '#fdf2f2';

                            // Reset styling after a few seconds
                            setTimeout(() => {
                                appointmentInput.style.border = '';
                                appointmentInput.style.backgroundColor = '';
                            }, 5000);
                        }

                        AppUtils.showNotification('Please set the appointment date and try sending the email again.', 'warning');
                    }
                } else {
                    // Show general error message
                    AppUtils.showNotification('Failed to send credit email: ' + result.message, 'error');
                }

                // Restore button state
                button.disabled = false;
                button.innerHTML = originalText;
            }

        } catch (error) {
            console.error('Error sending credit email:', error);
            AppUtils.showNotification('Failed to send credit email. Please try again.', 'error');

            // Restore button state
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    // Send Details button functionality (placeholder)
    sendDetails(visitId) {
        console.log(`Send Details clicked for visit: ${visitId}`);
        // TODO: Implement send details functionality
        // This will be defined later as per user request

        // For now, show a placeholder message
        AppUtils.showNotification('Send Details functionality will be implemented later', 'info');
    }

    // Book Cab button functionality (placeholder)
    bookCab(visitId) {
        console.log(`Book Cab clicked for visit: ${visitId}`);
        // TODO: Implement book cab functionality
        // This will be defined later as per user request

        // For now, show a placeholder message
        AppUtils.showNotification('Book Cab functionality will be implemented later', 'info');
    }

    // Handle submission dropdown changes
    async handleSubmissionChange(visitId, field, value) {
        console.log(`Submission change for visit ${visitId}: ${field} = ${value}`);

        try {
            // Update the backend
            const result = await googleSheetsAPI.updateHospitalVisitSubmission(visitId, field, value);

            if (result.success) {
                // Update local data
                this.updateLocalVisitSubmissionStatus(visitId, field, value);

                // Check if both submissions are complete and auto-move to completed
                this.checkAndAutoCompleteVisit(visitId);

                AppUtils.showNotification(`${field === 'billsSubmission' ? 'Bills' : 'Reports'} submission updated successfully`, 'success');
            } else {
                console.error('Failed to update submission:', result.message);
                AppUtils.showNotification('Failed to update submission: ' + result.message, 'error');

                // Revert the dropdown to previous value
                const dropdown = document.querySelector(`select[data-visit-id="${visitId}"][data-field="${field}"]`);
                if (dropdown) {
                    // Find the visit data to get the previous value
                    let previousValue = 'No'; // default
                    for (const sectionName in this.sectionData) {
                        const visit = this.sectionData[sectionName].find(v => v.id === visitId);
                        if (visit) {
                            previousValue = visit[field] || 'No';
                            break;
                        }
                    }
                    dropdown.value = previousValue;
                }
            }
        } catch (error) {
            console.error('Error updating submission:', error);
            AppUtils.showNotification('Failed to update submission. Please try again.', 'error');
        }
    }

    // Update local visit submission status
    updateLocalVisitSubmissionStatus(visitId, field, value) {
        for (const sectionName in this.sectionData) {
            const visitIndex = this.sectionData[sectionName].findIndex(v => v.id === visitId);
            if (visitIndex !== -1) {
                this.sectionData[sectionName][visitIndex][field] = value;
                break;
            }
        }
    }

    // Check if visit should be auto-completed and move it
    async checkAndAutoCompleteVisit(visitId) {
        // Find the visit in post-visit section
        const postVisitIndex = this.sectionData['post-visit'].findIndex(v => v.id === visitId);
        if (postVisitIndex === -1) return; // Not in post-visit section

        const visit = this.sectionData['post-visit'][postVisitIndex];
        const billsSubmission = visit.billsSubmission || 'No';
        const reportsSubmission = visit.reportsSubmission || 'No';

        // Check if both are complete (Yes or Not needed, but not No)
        const billsComplete = billsSubmission === 'Yes' || billsSubmission === 'Not needed';
        const reportsComplete = reportsSubmission === 'Yes' || reportsSubmission === 'Not needed';

        if (billsComplete && reportsComplete) {
            console.log(`Auto-completing visit ${visitId} - Bills: ${billsSubmission}, Reports: ${reportsSubmission}`);

            try {
                // Update status to Completed in backend
                const result = await googleSheetsAPI.updateHospitalVisitStatus([visitId], 'Completed');

                if (result.success) {
                    // Remove from post-visit section
                    this.sectionData['post-visit'].splice(postVisitIndex, 1);

                    // Add to completed section
                    this.sectionData['completed'].push(visit);

                    // Re-render both sections
                    this.renderSectionTable('post-visit');
                    this.renderSectionTable('completed');

                    AppUtils.showNotification('Visit automatically moved to Completed section', 'success');
                } else {
                    console.error('Failed to auto-complete visit:', result.message);
                }
            } catch (error) {
                console.error('Error auto-completing visit:', error);
            }
        }
    }

    // Save appointment date to backend
    async saveAppointmentDate(visitId, appointmentDate) {
        try {
            console.log(`Saving appointment date ${appointmentDate || 'EMPTY'} for visit ${visitId}`);

            // Call API to save appointment date
            const response = await fetch('/api/update-appointment-date', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitId: visitId,
                    appointmentDate: appointmentDate || '' // Ensure empty string for null/undefined
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('Appointment date saved successfully');
                // Update local cache
                this.updateLocalVisitAppointmentDate(visitId, appointmentDate || '');

                const message = appointmentDate ? 'Appointment date updated successfully' : 'Appointment date cleared successfully';
                AppUtils.showNotification(message, 'success');
            } else {
                console.error('Failed to save appointment date:', result.message);
                AppUtils.showNotification('Failed to save appointment date: ' + result.message, 'error');
            }

        } catch (error) {
            console.error('Error saving appointment date:', error);
            AppUtils.showNotification('Failed to save appointment date', 'error');
        }
    }

    // Update local visit email status in cache
    updateLocalVisitEmailStatus(visitId, emailSentStatus) {
        // Update the visit data in all section caches
        for (const sectionName in this.sectionData) {
            const visits = this.sectionData[sectionName];
            const visitIndex = visits.findIndex(visit => visit.id === visitId);
            if (visitIndex !== -1) {
                visits[visitIndex].emailSent = emailSentStatus;
                console.log(`Updated local email status for visit ${visitId} to ${emailSentStatus}`);
            }
        }
    }

    // Update local visit appointment date in cache
    updateLocalVisitAppointmentDate(visitId, appointmentDate) {
        // Update the visit data in all section caches
        for (const sectionName in this.sectionData) {
            const visits = this.sectionData[sectionName];
            const visitIndex = visits.findIndex(visit => visit.id === visitId);
            if (visitIndex !== -1) {
                visits[visitIndex].appointmentDate = appointmentDate || '';
                console.log(`Updated local appointment date for visit ${visitId} to ${appointmentDate || 'EMPTY'}`);
            }
        }
    }

    // Format date for display in "d-MMM-yyyy" format
    formatDisplayDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    // Filter visits by appointment date
    filterVisitsByDate(visits, sectionName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        return visits.filter(visit => {
            if (!visit.appointmentDate) return false;

            const appointmentDate = new Date(visit.appointmentDate);
            appointmentDate.setHours(0, 0, 0, 0);

            switch (sectionName) {
                case 'todays-visits':
                    return appointmentDate.getTime() === today.getTime();
                case 'tomorrows-visits':
                    return appointmentDate.getTime() === tomorrow.getTime();
                case 'later-visits':
                    return appointmentDate.getTime() >= dayAfterTomorrow.getTime();
                default:
                    return false;
            }
        });
    }

    // Find visit by ID (consistent with blood test module)
    findVisitById(visitId) {
        const visits = this.sectionData[this.currentSection];
        return visits.find(visit => visit.id.toString() === visitId.toString());
    }

    // Handle visit selection
    handleVisitSelection(checkbox) {
        const visitId = checkbox.value;
        const section = this.currentSection;

        if (checkbox.checked) {
            this.selectedVisits[section].add(visitId);
        } else {
            this.selectedVisits[section].delete(visitId);
        }

        this.updateSectionControls(section);
    }

    // Handle select all
    handleSelectAll(checkbox) {
        const section = this.currentSection;
        const visitCheckboxes = document.querySelectorAll(`#${section}-section .visit-checkbox`);

        visitCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            const visitId = cb.value;

            if (checkbox.checked) {
                this.selectedVisits[section].add(visitId);
            } else {
                this.selectedVisits[section].delete(visitId);
            }
        });

        this.updateSectionControls(section);
    }

    // Update section controls
    updateSectionControls(sectionName) {
        // Count selected visits
        const selectedCount = this.selectedVisits[sectionName].size;

        // Update action button state
        const actionBtnId = this.getActionBtnId(sectionName);
        const actionBtn = document.getElementById(actionBtnId);

        if (actionBtn) {
            actionBtn.disabled = selectedCount === 0;
            // Update button text to show selection count (consistent with blood test module)
            actionBtn.textContent = selectedCount > 0 ?
                `Actions (${selectedCount})` : 'Actions';
        }

        // Update select all checkbox
        const selectAllId = this.getSelectAllId(sectionName);
        const selectAllCheckbox = document.getElementById(selectAllId);

        if (selectAllCheckbox) {
            const totalVisits = this.sectionData[sectionName].length;
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalVisits;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalVisits;
        }
    }

    // Get select all checkbox ID
    getSelectAllId(sectionName) {
        const mapping = {
            'pending-visits': 'selectAllPendingVisits',
            'confirmed-visits': 'selectAllConfirmedVisits',
            'todays-visits': 'selectAllTodaysVisits',
            'tomorrows-visits': 'selectAllTomorrowsVisits',
            'later-visits': 'selectAllLaterVisits',
            'post-visit': 'selectAllPostVisits',
            'completed': 'selectAllCompletedVisits',
            'cancelled': 'selectAllCancelledVisits'
        };
        return mapping[sectionName];
    }

    // Get action button ID
    getActionBtnId(sectionName) {
        const mapping = {
            'pending-visits': 'pendingVisitsActionBtn',
            'confirmed-visits': 'confirmedVisitsActionBtn',
            'todays-visits': 'todaysVisitsActionBtn',
            'tomorrows-visits': 'tomorrowsVisitsActionBtn',
            'later-visits': 'laterVisitsActionBtn',
            'post-visit': 'postVisitsActionBtn',
            'completed': 'completedVisitsActionBtn',
            'cancelled': 'cancelledVisitsActionBtn'
        };
        return mapping[sectionName];
    }

    // Show section loading
    showSectionLoading(sectionName, show) {
        let messageId = `${sectionName.replace('-', '')}Message`;
        // Handle special case for completed section to avoid ID conflicts
        if (sectionName === 'completed') {
            messageId = 'completedVisitsMessage';
        }
        const messageDiv = document.getElementById(messageId);

        if (messageDiv) {
            if (show) {
                messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                messageDiv.className = 'section-message loading';
                messageDiv.style.display = 'block';
            } else {
                messageDiv.style.display = 'none';
            }
        }
    }

    // Show section message
    showSectionMessage(sectionName, message, type) {
        let messageId = `${sectionName.replace('-', '')}Message`;
        // Handle special case for completed section to avoid ID conflicts
        if (sectionName === 'completed') {
            messageId = 'completedVisitsMessage';
        }
        const messageDiv = document.getElementById(messageId);

        if (messageDiv) {
            messageDiv.className = `section-message ${type}`;
            messageDiv.textContent = message;

            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    messageDiv.textContent = '';
                    messageDiv.className = 'section-message';
                }, 3000);
            }
        }
    }

    // Show form message
    showMessage(elementId, message, type) {
        const messageDiv = document.getElementById(elementId);
        if (messageDiv) {
            messageDiv.className = `form-message ${type}`;
            messageDiv.textContent = message;

            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    messageDiv.textContent = '';
                    messageDiv.className = 'form-message';
                }, 3000);
            }
        }
    }

    // Toggle action dropdown
    toggleActionDropdown(button) {
        console.log('Toggle dropdown clicked for button:', button.id, 'Disabled:', button.disabled);

        // Find dropdown - it should be the next sibling with class 'dropdown-menu'
        let dropdown = button.nextElementSibling;
        while (dropdown && !dropdown.classList.contains('dropdown-menu')) {
            dropdown = dropdown.nextElementSibling;
        }

        if (!dropdown) {
            console.error('No dropdown found next to button:', button.id);
            console.log('Button parent:', button.parentElement);
            console.log('Button siblings:', Array.from(button.parentElement.children));
            return;
        }

        console.log('Found dropdown:', dropdown.id || dropdown.className);
        const isOpen = dropdown.style.display === 'block';

        // Close all dropdowns first
        this.closeAllDropdowns();

        // Always show dropdown when clicked, regardless of button state
        if (!isOpen) {
            dropdown.style.display = 'block';
            console.log('Dropdown opened:', dropdown.id || dropdown.className);
        }
    }

    // Close all dropdowns
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    // Handle bulk action
    async handleBulkAction(actionItem) {
        const action = actionItem.getAttribute('data-action');
        const selectedVisitIds = Array.from(this.selectedVisits[this.currentSection]);

        console.log('Bulk action triggered:', {
            action,
            currentSection: this.currentSection,
            selectedVisitIds,
            selectedCount: selectedVisitIds.length
        });

        if (selectedVisitIds.length === 0) {
            this.showSectionMessage(this.currentSection, 'No visits selected', 'warning');
            return;
        }

        // Close dropdown
        this.closeAllDropdowns();

        // Confirm action
        const actionText = actionItem.textContent.trim();
        if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedVisitIds.length} visit(s)?`)) {
            return;
        }

        try {
            this.showSectionLoading(this.currentSection, true);

            if (action === 'delete') {
                await this.deleteSelectedVisits();
            } else {
                await this.moveSelectedVisits(action);
            }

            // Clear selections
            this.selectedVisits[this.currentSection].clear();

            // Reload data
            await this.loadSectionData(this.currentSection);

            this.showSectionMessage(this.currentSection, `Successfully ${actionText.toLowerCase()} ${selectedVisitIds.length} visit(s)`, 'success');

        } catch (error) {
            console.error('Error performing bulk action:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            let errorMessage = 'A network error occurred. Please check your connection.';
            if (error.message && !error.message.includes('fetch')) {
                errorMessage = 'Failed to perform action: ' + error.message;
            }

            this.showSectionMessage(this.currentSection, errorMessage, 'error');
        } finally {
            this.showSectionLoading(this.currentSection, false);
        }
    }

    // Move selected visits to new status (following blood test module pattern)
    async moveSelectedVisits(newStatus) {
        const selectedVisitIds = Array.from(this.selectedVisits[this.currentSection]);
        const statusValue = this.getStatusFromAction(newStatus);

        try {
            // Get row indices for selected visits (like blood test module does)
            const rowIndices = selectedVisitIds.map(visitId => {
                const visit = this.findVisitById(visitId);
                return visit ? visit.rowIndex : null;
            }).filter(index => index !== null);

            if (rowIndices.length === 0) {
                throw new Error('No valid visits found for update');
            }

            // Use Google Sheets API like blood test module does
            const result = await googleSheetsAPI.updateHospitalVisitStatus(selectedVisitIds, statusValue, rowIndices);

            if (!result.success) {
                throw new Error(result.message || 'Failed to update visit status');
            }
        } catch (error) {
            console.error('Error moving visits:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Delete selected visits
    async deleteSelectedVisits() {
        const selectedVisitIds = Array.from(this.selectedVisits[this.currentSection]);

        console.log(`Deleting visits: ${selectedVisitIds}`);

        try {
            // Call API to delete visits
            const response = await fetch('/api/delete-visits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitIds: selectedVisitIds
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`Successfully deleted ${selectedVisitIds.length} visits`);
                return Promise.resolve();
            } else {
                throw new Error(result.message || 'Failed to delete visits');
            }
        } catch (error) {
            console.error('Error deleting visits:', error);
            throw error;
        }
    }

    // Map action to proper status name
    getStatusFromAction(action) {
        const statusMapping = {
            'post-visit': 'Post Visit',
            'complete': 'Completed',
            'confirm': 'Confirmed',
            'cancel': 'Cancelled'
        };
        return statusMapping[action] || action;
    }


}

// Create global hospital visit manager instance
console.log('Creating hospitalVisitManager...');
const hospitalVisitManager = new HospitalVisitManager();
console.log('hospitalVisitManager created successfully:', hospitalVisitManager);

// Make it globally accessible for debugging
window.hospitalVisitManager = hospitalVisitManager;

// Test function for debugging
window.testHospitalVisitAPI = async function() {
    console.log('Testing Hospital Visit API...');
    console.log('googleSheetsAPI.isInitialized:', googleSheetsAPI.isInitialized);

    try {
        const result = await googleSheetsAPI.lookupPatientByIYC('TEST001');
        console.log('API test result:', result);
        return result;
    } catch (error) {
        console.error('API test error:', error);
        return error;
    }
};

// Test function to check form elements
window.testHospitalVisitElements = function() {
    console.log('Testing Hospital Visit Form Elements...');

    const elements = {
        form: document.getElementById('hospitalVisitForm'),
        iycInput: document.getElementById('visitIycNumber'),
        nameInput: document.getElementById('visitPatientName'),
        phoneInput: document.getElementById('visitPhoneNumber'),
        loadingIndicator: document.getElementById('visitIycLoading')
    };

    console.log('Form elements:', elements);

    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            console.log(`✓ ${key} found`);
        } else {
            console.error(`✗ ${key} NOT found`);
        }
    });

    return elements;
};

// Test function to manually trigger IYC lookup
window.testHospitalVisitLookup = async function(iycNumber = 'TEST001') {
    console.log('Manually testing Hospital Visit IYC lookup...');

    if (typeof hospitalVisitManager !== 'undefined') {
        try {
            await hospitalVisitManager.handleIYCLookup(iycNumber);
            console.log('Manual lookup completed');
        } catch (error) {
            console.error('Manual lookup failed:', error);
        }
    } else {
        console.error('hospitalVisitManager not found');
    }
};
