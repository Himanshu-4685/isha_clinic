// Diet Request module functionality
console.log('Loading diet-request.js...');

class DietRequestManager {
    constructor() {
        this.currentSection = 'new-request';
        this.formData = {};
        this.isFormValid = false;
        this.sectionData = {
            'records': []
        };
        this.selectedRecords = {
            'records': new Set()
        };
        this.editingCell = null;
        this.patients = [];
    }

    // Initialize the diet request module
    init() {
        console.log('Diet Request - init() called');
        console.log('Diet Request - Current section:', this.currentSection);

        this.setupSidebarNavigation();
        this.setupNewRequestForm();
        this.setupFormValidation();
        this.setupTableInteractions();
        this.setupBulkActions();
        this.setupRefreshButtons();
        this.loadPatients();
        this.setDefaultStartDate();
        this.setupMultiSelectDropdown();
        this.restoreFormData();
        this.setupModuleVisibilityListener();
        this.loadSystemConfig();

        // Load data for current section if not new-request
        if (this.currentSection !== 'new-request') {
            this.loadSectionData(this.currentSection);
        }

        console.log('Diet Request - init() completed');
    }

    // Method called when module becomes active
    onModuleActivated() {
        console.log('Diet Request module activated, current section:', this.currentSection);
        // Restore form data when module becomes active
        if (this.currentSection === 'new-request') {
            setTimeout(() => {
                console.log('Restoring form data after module activation');
                this.restoreFormData();
            }, 200);
        }
    }

    // Setup sidebar navigation
    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('#diet-request-module .sidebar-item');

        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    // Switch between sections
    switchSection(sectionName) {
        // Update sidebar active state
        const sidebarItems = document.querySelectorAll('#diet-request-module .sidebar-item');
        sidebarItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`#diet-request-module .sidebar-item[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Hide all sections
        const sections = document.querySelectorAll('#diet-request-module .section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const sectionId = sectionName === 'new-request' ? 'diet-new-request-section' :
                         sectionName === 'records' ? 'diet-records-section' :
                         `diet-${sectionName}-section`;

        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
            this.currentSection = sectionName;

            // Load data for the section
            if (sectionName !== 'new-request') {
                this.loadSectionData(sectionName);
            } else {
                // When switching to new-request section, restore form data
                setTimeout(() => {
                    this.restoreFormData();
                }, 100);
            }
        }
    }

    // Setup new request form
    setupNewRequestForm() {
        console.log('Diet Request - Setting up new request form');

        const form = document.getElementById('dietRequestForm');
        const nameInput = document.getElementById('dietPatientName');
        const resetBtn = document.getElementById('resetDietFormBtn');
        const durationInput = document.getElementById('dietDuration');
        const startDateInput = document.getElementById('dietStartDate');
        const endDateInput = document.getElementById('dietEndDate');

        console.log('Diet Request - Form elements:', {
            form: !!form,
            nameInput: !!nameInput,
            resetBtn: !!resetBtn,
            durationInput: !!durationInput,
            startDateInput: !!startDateInput,
            endDateInput: !!endDateInput
        });

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

        // Handle duration and date calculations
        if (durationInput && startDateInput && endDateInput) {
            durationInput.addEventListener('input', () => {
                this.calculateEndDate();
            });
            startDateInput.addEventListener('change', () => {
                this.calculateEndDate();
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
        const form = document.getElementById('dietRequestForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateForm();
                this.saveFormData(); // Save form data on input
            });
            input.addEventListener('change', () => {
                this.validateForm();
                this.saveFormData(); // Save form data on change
            });
        });
    }

    // Setup table interactions
    setupTableInteractions() {
        // Setup checkbox interactions specifically for diet request module
        const dietRequestModule = document.getElementById('diet-request-module');
        if (!dietRequestModule) {
            console.error('Diet request module not found for table interactions');
            return;
        }

        dietRequestModule.addEventListener('change', (e) => {
            if (e.target.classList.contains('diet-record-checkbox')) {
                this.handleRecordSelection(e.target);
            } else if (e.target.classList.contains('select-all-checkbox')) {
                this.handleSelectAll(e.target);
            }
        });
    }

    // Setup bulk actions
    setupBulkActions() {
        // Setup action button clicks specifically for diet request module
        const dietRequestModule = document.getElementById('diet-request-module');
        if (!dietRequestModule) {
            console.error('Diet request module not found');
            return;
        }

        dietRequestModule.addEventListener('click', (e) => {
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
            'dietRecordsActionBtn'
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
            'refreshDietRecordsBtn'
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

    // Handle name search
    handleNameSearch(searchTerm) {
        const dropdown = document.getElementById('dietNameSearchDropdown');
        
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
        const dropdown = document.getElementById('dietNameSearchDropdown');
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
        const dropdown = document.getElementById('dietNameSearchDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Select patient from dropdown
    selectPatient(patient) {
        const nameInput = document.getElementById('dietPatientName');
        const emailInput = document.getElementById('dietEmail');
        const phoneInput = document.getElementById('dietPhoneNumber');

        if (nameInput) {
            nameInput.value = patient.name;
            nameInput.style.backgroundColor = '#e8f5e8';
        }
        if (emailInput) {
            emailInput.value = patient.email || '';
            emailInput.style.backgroundColor = '#e8f5e8';
        }
        if (phoneInput) {
            phoneInput.value = patient.phone;
            phoneInput.style.backgroundColor = '#e8f5e8';
        }

        this.hideNameDropdown();
        this.validateForm();
        this.saveFormData(); // Save form data when patient is selected
    }

    // Setup multi-select dropdown
    setupMultiSelectDropdown() {
        const dropdown = document.getElementById('dietOthersDropdown');
        const input = document.getElementById('dietOthersInput');
        const options = document.getElementById('dietOthersOptions');
        const searchBox = document.getElementById('dietOthersSearch');
        const hiddenInput = document.getElementById('dietOthers');
        const arrow = input.querySelector('.dropdown-arrow');

        if (!dropdown || !input || !options) return;

        let selectedValues = [];

        // Toggle dropdown
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = options.style.display === 'block';

            if (isVisible) {
                this.closeMultiSelectDropdown();
            } else {
                this.openMultiSelectDropdown();
            }
        });

        // Handle option selection
        options.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.updateSelectedOptions();
            }
        });

        // Search functionality
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                this.filterOptions(e.target.value);
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                this.closeMultiSelectDropdown();
            }
        });
    }

    // Open multi-select dropdown
    openMultiSelectDropdown() {
        const options = document.getElementById('dietOthersOptions');
        const input = document.getElementById('dietOthersInput');
        const arrow = input.querySelector('.dropdown-arrow');

        options.style.display = 'block';
        input.classList.add('active');
        arrow.classList.add('rotated');
    }

    // Close multi-select dropdown
    closeMultiSelectDropdown() {
        const options = document.getElementById('dietOthersOptions');
        const input = document.getElementById('dietOthersInput');
        const arrow = input.querySelector('.dropdown-arrow');

        options.style.display = 'none';
        input.classList.remove('active');
        arrow.classList.remove('rotated');
    }

    // Update selected options display
    updateSelectedOptions() {
        const checkboxes = document.querySelectorAll('#dietOthersOptions input[type="checkbox"]:checked');
        const selectedValues = Array.from(checkboxes).map(cb => cb.value);
        const hiddenInput = document.getElementById('dietOthers');
        const input = document.getElementById('dietOthersInput');

        // Update hidden input value
        hiddenInput.value = selectedValues.join(', ');

        // Update display
        const placeholder = input.querySelector('.placeholder');
        let selectedItemsContainer = input.querySelector('.selected-items');

        if (!selectedItemsContainer) {
            selectedItemsContainer = document.createElement('div');
            selectedItemsContainer.className = 'selected-items';
            input.insertBefore(selectedItemsContainer, input.querySelector('.dropdown-arrow'));
        }

        if (selectedValues.length === 0) {
            placeholder.style.display = 'block';
            selectedItemsContainer.style.display = 'none';
        } else {
            placeholder.style.display = 'none';
            selectedItemsContainer.style.display = 'flex';

            selectedItemsContainer.innerHTML = selectedValues.map(value => `
                <span class="selected-tag">
                    ${value}
                    <span class="remove-tag" data-value="${value}">×</span>
                </span>
            `).join('');

            // Handle tag removal
            selectedItemsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-tag')) {
                    e.stopPropagation();
                    const valueToRemove = e.target.getAttribute('data-value');
                    const checkbox = document.querySelector(`#dietOthersOptions input[value="${valueToRemove}"]`);
                    if (checkbox) {
                        checkbox.checked = false;
                        this.updateSelectedOptions();
                    }
                }
            });
        }

        this.validateForm();
        this.saveFormData(); // Save form data when selection changes
    }

    // Filter options based on search
    filterOptions(searchTerm) {
        const options = document.querySelectorAll('#dietOthersOptions .option-item');
        const term = searchTerm.toLowerCase();

        options.forEach(option => {
            const text = option.querySelector('span').textContent.toLowerCase();
            if (text.includes(term)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }
        });
    }

    // Save form data to localStorage
    saveFormData() {
        const form = document.getElementById('dietRequestForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Also save the selected others values
        const hiddenInput = document.getElementById('dietOthers');
        if (hiddenInput && hiddenInput.value) {
            data.others = hiddenInput.value;
        }

        console.log('Saving form data:', data);
        localStorage.setItem('dietRequestFormData', JSON.stringify(data));
    }

    // Restore form data from localStorage
    restoreFormData() {
        const savedData = localStorage.getItem('dietRequestFormData');
        console.log('Attempting to restore form data:', savedData);

        if (!savedData) {
            console.log('No saved form data found');
            return;
        }

        try {
            const data = JSON.parse(savedData);
            const form = document.getElementById('dietRequestForm');
            if (!form) {
                console.log('Form not found for restoration');
                return;
            }

            console.log('Restoring form data:', data);

            // Restore form fields
            Object.keys(data).forEach(key => {
                if (key === 'others') return; // Handle others separately

                const field = form.querySelector(`[name="${key}"]`);
                if (field && data[key]) {
                    if (field.type === 'checkbox' || field.type === 'radio') {
                        field.checked = data[key] === 'on' || data[key] === true;
                    } else {
                        field.value = data[key];
                    }

                    // Apply auto-filled styling for restored data
                    if (['patientName', 'email', 'phoneNumber'].includes(key) && data[key]) {
                        field.style.backgroundColor = '#e8f5e8';
                    }

                    console.log(`Restored field ${key}:`, data[key]);
                }
            });

            // Restore others selection
            if (data.others) {
                console.log('Restoring others selection:', data.others);
                const hiddenInput = document.getElementById('dietOthers');
                if (hiddenInput) {
                    hiddenInput.value = data.others;
                }

                const selectedValues = data.others.split(', ').filter(v => v.trim());
                selectedValues.forEach(value => {
                    const checkbox = document.querySelector(`#dietOthersOptions input[value="${value}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        console.log(`Checked option: ${value}`);
                    }
                });
                this.updateSelectedOptions();
            }

            // Recalculate end date if start date and duration are present
            if (data.startDate && data.duration) {
                this.calculateEndDate();
            }

            this.validateForm();
            console.log('Form data restoration completed');
        } catch (error) {
            console.error('Error restoring form data:', error);
        }
    }

    // Clear saved form data
    clearSavedFormData() {
        console.log('Clearing saved form data');
        localStorage.removeItem('dietRequestFormData');
    }

    // Manual method to check and restore form data (for debugging)
    checkAndRestoreFormData() {
        console.log('Manual form data restoration triggered');
        const savedData = localStorage.getItem('dietRequestFormData');
        console.log('Current saved data:', savedData);
        this.restoreFormData();
    }

    // Setup module visibility listener
    setupModuleVisibilityListener() {
        // Use MutationObserver to detect when the module becomes visible
        const dietModule = document.getElementById('diet-request-module');
        if (!dietModule) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = dietModule.style.display !== 'none';
                    if (isVisible && this.currentSection === 'new-request') {
                        console.log('Diet request module became visible, restoring form data');
                        setTimeout(() => {
                            this.restoreFormData();
                        }, 200);
                    }
                }
            });
        });

        observer.observe(dietModule, {
            attributes: true,
            attributeFilter: ['style']
        });

        // Also listen for class changes that might indicate module activation
        const observer2 = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (dietModule.classList.contains('active') && this.currentSection === 'new-request') {
                        console.log('Diet request module became active, restoring form data');
                        setTimeout(() => {
                            this.restoreFormData();
                        }, 200);
                    }
                }
            });
        });

        observer2.observe(dietModule, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // Load system configuration
    async loadSystemConfig() {
        try {
            console.log('Loading system configuration...');
            const result = await googleSheetsAPI.getSystemConfig();

            if (result.success) {
                console.log('System config loaded successfully');

                // Update anchors dropdown
                this.updateAnchorsDropdown(result.data.anchors);

                // Store config for later use
                this.systemConfig = result.data;
            } else {
                console.error('Failed to load system config:', result.message);
            }
        } catch (error) {
            console.error('Error loading system config:', error);
        }
    }

    // Update anchors dropdown with data from system config
    updateAnchorsDropdown(anchors) {
        const anchorSelect = document.getElementById('dietAnchor');
        if (!anchorSelect || !Array.isArray(anchors)) return;

        // Clear existing options except the first one
        while (anchorSelect.children.length > 1) {
            anchorSelect.removeChild(anchorSelect.lastChild);
        }

        // Add new options from system config
        anchors.forEach(anchor => {
            const option = document.createElement('option');
            option.value = anchor.name || anchor;
            option.textContent = anchor.name || anchor;
            anchorSelect.appendChild(option);
        });

        console.log(`Updated anchors dropdown with ${anchors.length} options`);
    }

    // Set default start date to tomorrow
    setDefaultStartDate() {
        const startDateInput = document.getElementById('dietStartDate');
        if (startDateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowString = tomorrow.toISOString().split('T')[0];
            startDateInput.value = tomorrowString;

            // Trigger end date calculation if duration is already set
            this.calculateEndDate();
        }
    }

    // Calculate end date based on start date and duration
    calculateEndDate() {
        const durationInput = document.getElementById('dietDuration');
        const startDateInput = document.getElementById('dietStartDate');
        const endDateInput = document.getElementById('dietEndDate');

        if (durationInput && startDateInput && endDateInput) {
            const duration = parseInt(durationInput.value);
            const startDate = startDateInput.value;

            if (duration && startDate) {
                const start = new Date(startDate);
                const end = new Date(start);
                end.setDate(start.getDate() + duration - 1); // -1 because start date is day 1

                endDateInput.value = end.toISOString().split('T')[0];
            } else {
                endDateInput.value = '';
            }
        }
    }

    // Validate form
    validateForm() {
        const form = document.getElementById('dietRequestForm');
        const saveBtn = document.getElementById('saveDietRequestBtn');

        if (!form || !saveBtn) return;

        // Collect form data
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        // Check required fields
        const requiredFields = ['patientName', 'anchor', 'duration', 'startDate'];
        const errors = [];

        requiredFields.forEach(field => {
            if (!data[field] || data[field] === '') {
                errors.push(`${field} is required`);
            }
        });

        // Special validation for "others" field (multi-select dropdown)
        const othersHiddenInput = document.getElementById('dietOthers');
        if (othersHiddenInput) {
            const othersValue = othersHiddenInput.value.trim();
            if (!othersValue) {
                errors.push('Others field is required');
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
            this.showMessage('dietFormMessage', 'Please fill in all required fields', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveDietRequestBtn');
        const originalText = saveBtn.innerHTML;

        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            // Get selected others values from hidden input
            const othersHiddenInput = document.getElementById('dietOthers');
            const selectedOthers = othersHiddenInput ? othersHiddenInput.value : '';

            // Prepare diet request data
            const dietRequestData = {
                dateRequested: new Date().toISOString().split('T')[0], // Current date
                patientName: this.formData.patientName,
                email: this.formData.email || '',
                phoneNumber: this.formData.phoneNumber || '',
                anchor: this.formData.anchor,
                others: selectedOthers, // Already formatted as comma-separated string
                brunch: this.formData.brunch || '',
                lunch: this.formData.lunch || '',
                dinner: this.formData.dinner || '',
                oneTimeTakeaway: this.formData.oneTimeTakeaway || '',
                duration: this.formData.duration,
                startDate: this.formData.startDate,
                endDate: this.formData.endDate || '',
                remarks: this.formData.remarks || '',
                status: 'Active'
            };

            // Save to Google Sheets
            const result = await googleSheetsAPI.saveDietRequest(dietRequestData);

            if (result.success) {
                this.showMessage('dietFormMessage', 'Diet request saved successfully!', 'success');
                this.clearSavedFormData(); // Clear saved data on successful submission
                this.resetForm();
            } else {
                this.showMessage('dietFormMessage', result.message || 'Failed to save diet request', 'error');
            }

        } catch (error) {
            console.error('Error saving diet request:', error);
            this.showMessage('dietFormMessage', 'An error occurred while saving. Please try again.', 'error');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('dietRequestForm');
        if (form) {
            form.reset();

            // Clear auto-filled styling
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.style.backgroundColor = '';
                input.placeholder = input.getAttribute('placeholder') || '';
            });

            // Reset multi-select dropdown
            const checkboxes = document.querySelectorAll('#dietOthersOptions input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedOptions();

            // Clear saved form data
            this.clearSavedFormData();

            // Reset to default start date
            this.setDefaultStartDate();

            // Reset validation
            this.validateForm();

            // Clear any messages
            this.showMessage('dietFormMessage', '', '');
        }
    }

    // Load section data
    async loadSectionData(sectionName) {
        this.showSectionLoading(sectionName, true);

        try {
            const result = await googleSheetsAPI.getDietRequests();
            console.log(`Loading ${sectionName} data:`, result);

            if (result.success) {
                this.sectionData[sectionName] = result.dietRequests;
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

        const records = this.sectionData[sectionName] || [];

        if (records.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="12">No diet requests found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = records.map((record, index) => `
            <tr data-record-id="${record.id}" data-row-index="${record.rowIndex}">
                <td class="checkbox-col">
                    <input type="checkbox" class="diet-record-checkbox" value="${record.id}">
                </td>
                <td>${record.dateRequested}</td>
                <td>${record.patientName}</td>
                <td>${record.email}</td>
                <td>${record.phoneNumber}</td>
                <td>${record.anchor}</td>
                <td>${record.others}</td>
                <td>${record.duration} days</td>
                <td>${record.startDate}</td>
                <td>${record.endDate}</td>
                <td><span class="status-badge status-${record.status.toLowerCase()}">${record.status}</span></td>
                <td>
                    <button class="action-button details-button" onclick="dietRequestManager.showRecordDetails('${record.id}')" title="View Details">
                        Details
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Get section table ID
    getSectionTableId(sectionName) {
        const mapping = {
            'records': 'dietRecordsTable'
        };
        return mapping[sectionName];
    }

    // Show record details in modal
    async showRecordDetails(recordId) {
        // Find the record data
        let recordData = null;
        for (const sectionName in this.sectionData) {
            const record = this.sectionData[sectionName].find(r => r.id === recordId);
            if (record) {
                recordData = record;
                break;
            }
        }

        if (!recordData) {
            console.error('Record not found:', recordId);
            return;
        }

        // Populate modal with record data
        document.getElementById('modalDietPatientName').textContent = recordData.patientName || '';
        document.getElementById('modalDietEmail').textContent = recordData.email || '';
        document.getElementById('modalDietPhoneNumber').textContent = recordData.phoneNumber || '';
        document.getElementById('modalDietAnchor').textContent = recordData.anchor || '';
        document.getElementById('modalDietOthers').textContent = recordData.others || '';
        document.getElementById('modalDietDuration').textContent = recordData.duration ? `${recordData.duration} days` : '';
        document.getElementById('modalDietStartDate').textContent = recordData.startDate || '';
        document.getElementById('modalDietEndDate').textContent = recordData.endDate || '';
        document.getElementById('modalDietBrunch').textContent = recordData.brunch || 'Not specified';
        document.getElementById('modalDietLunch').textContent = recordData.lunch || 'Not specified';
        document.getElementById('modalDietDinner').textContent = recordData.dinner || 'Not specified';
        document.getElementById('modalDietOneTimeTakeaway').textContent = recordData.oneTimeTakeaway || 'Not specified';
        document.getElementById('modalDietRemarks').textContent = recordData.remarks || 'No remarks';

        // Show modal
        const modal = document.getElementById('dietDetailsModal');
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
        const modal = document.getElementById('dietDetailsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Show message
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

    // Show section loading
    showSectionLoading(sectionName, show) {
        let messageId = `${sectionName.replace('-', '')}Message`;
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

    // Update section controls
    updateSectionControls(sectionName) {
        const selectAllId = this.getSelectAllId(sectionName);
        const actionBtnId = this.getActionBtnId(sectionName);

        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById(selectAllId);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

        // Reset action button
        const actionBtn = document.getElementById(actionBtnId);
        if (actionBtn) {
            actionBtn.disabled = true;
        }

        // Clear selections
        this.selectedRecords[sectionName].clear();
    }

    // Get select all checkbox ID
    getSelectAllId(sectionName) {
        const mapping = {
            'records': 'selectAllDietRecords'
        };
        return mapping[sectionName];
    }

    // Get action button ID
    getActionBtnId(sectionName) {
        const mapping = {
            'records': 'dietRecordsActionBtn'
        };
        return mapping[sectionName];
    }

    // Handle record selection
    handleRecordSelection(checkbox) {
        const recordId = checkbox.value;
        const isChecked = checkbox.checked;

        if (isChecked) {
            this.selectedRecords[this.currentSection].add(recordId);
        } else {
            this.selectedRecords[this.currentSection].delete(recordId);
        }

        this.updateActionButtonState();
        this.updateSelectAllState();
    }

    // Handle select all
    handleSelectAll(selectAllCheckbox) {
        const isChecked = selectAllCheckbox.checked;
        const checkboxes = document.querySelectorAll(`#${this.currentSection}-section .diet-record-checkbox`);

        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            const recordId = checkbox.value;

            if (isChecked) {
                this.selectedRecords[this.currentSection].add(recordId);
            } else {
                this.selectedRecords[this.currentSection].delete(recordId);
            }
        });

        this.updateActionButtonState();
    }

    // Update action button state
    updateActionButtonState() {
        const actionBtnId = this.getActionBtnId(this.currentSection);
        const actionBtn = document.getElementById(actionBtnId);

        if (actionBtn) {
            const hasSelection = this.selectedRecords[this.currentSection].size > 0;
            actionBtn.disabled = !hasSelection;
        }
    }

    // Update select all state
    updateSelectAllState() {
        const selectAllId = this.getSelectAllId(this.currentSection);
        const selectAllCheckbox = document.getElementById(selectAllId);

        if (selectAllCheckbox) {
            const checkboxes = document.querySelectorAll(`#${this.currentSection}-section .diet-record-checkbox`);
            const checkedCheckboxes = document.querySelectorAll(`#${this.currentSection}-section .diet-record-checkbox:checked`);

            if (checkedCheckboxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCheckboxes.length === checkboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    // Toggle action dropdown
    toggleActionDropdown(button) {
        const dropdown = button.nextElementSibling;
        const isVisible = dropdown.style.display === 'block';

        // Close all dropdowns first
        this.closeAllDropdowns();

        if (!isVisible) {
            dropdown.style.display = 'block';
        }
    }

    // Close all dropdowns
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('#diet-request-module .dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    // Handle bulk action
    async handleBulkAction(actionItem) {
        const action = actionItem.getAttribute('data-action');
        const selectedRecordIds = Array.from(this.selectedRecords[this.currentSection]);

        console.log('Bulk action:', {
            action,
            selectedRecordIds,
            selectedCount: selectedRecordIds.length
        });

        if (selectedRecordIds.length === 0) {
            this.showSectionMessage(this.currentSection, 'No records selected', 'warning');
            return;
        }

        // Close dropdown
        this.closeAllDropdowns();

        // Confirm action
        const actionText = actionItem.textContent.trim();
        if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedRecordIds.length} record(s)?`)) {
            return;
        }

        try {
            this.showSectionLoading(this.currentSection, true);

            if (action === 'delete') {
                await this.deleteSelectedRecords();
            }

            // Clear selections
            this.selectedRecords[this.currentSection].clear();

            // Reload data
            await this.loadSectionData(this.currentSection);

            this.showSectionMessage(this.currentSection, `Successfully ${actionText.toLowerCase()} ${selectedRecordIds.length} record(s)`, 'success');

        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showSectionMessage(this.currentSection, 'Failed to perform action: ' + error.message, 'error');
        } finally {
            this.showSectionLoading(this.currentSection, false);
        }
    }

    // Delete selected records
    async deleteSelectedRecords() {
        const selectedRecordIds = Array.from(this.selectedRecords[this.currentSection]);

        try {
            const result = await googleSheetsAPI.deleteDietRequests(selectedRecordIds);

            if (!result.success) {
                throw new Error(result.message || 'Failed to delete records');
            }
        } catch (error) {
            console.error('Error deleting records:', error);
            throw error;
        }
    }
}

// Global instance
let dietRequestManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    dietRequestManager = new DietRequestManager();
});

// Global function for testing form persistence
window.testDietFormPersistence = function() {
    if (dietRequestManager) {
        dietRequestManager.checkAndRestoreFormData();
    } else {
        console.log('Diet request manager not initialized');
    }
};

// Global function to check saved data
window.checkDietFormData = function() {
    const savedData = localStorage.getItem('dietRequestFormData');
    console.log('Saved diet form data:', savedData);
    return savedData;
};
