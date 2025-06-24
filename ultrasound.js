// Ultrasound module functionality
class UltrasoundManager {
    constructor() {
        this.currentSection = 'add-ultrasound';
        this.formData = {};
        this.isFormValid = false;
        this.sectionData = {
            'upcoming-ultrasound': [],
            'pending-ultrasound': [],
            'pending-review-ultrasound': [],
            'completed-ultrasound': [],
            'cancelled-ultrasound': []
        };
        this.selectedUltrasounds = {
            'upcoming-ultrasound': new Set(),
            'pending-ultrasound': new Set(),
            'pending-review-ultrasound': new Set(),
            'completed-ultrasound': new Set(),
            'cancelled-ultrasound': new Set()
        };
        this.editingCell = null;
    }

    // Initialize the ultrasound module
    init() {
        console.log('🚀 Initializing ultrasound module...');
        console.log('🔗 googleSheetsAPI.isInitialized:', typeof googleSheetsAPI !== 'undefined' ? googleSheetsAPI.isInitialized : 'googleSheetsAPI not found');

        this.setupSidebarNavigation();
        this.setupAddUltrasoundForm();
        this.setupFormValidation();
        this.setupTableInteractions();
        this.setupBulkActions();
        this.setupRefreshButtons();
        this.setDefaultValues();
        this.loadSystemConfig();

        // Load data for current section if not add-ultrasound
        if (this.currentSection !== 'add-ultrasound') {
            console.log('🔄 Loading initial data for section:', this.currentSection);
            this.loadSectionData(this.currentSection);
        }

        console.log('✅ Ultrasound module initialization complete');
    }

    // Setup sidebar navigation
    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('#ultrasound-module .sidebar-item');
        
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    // Switch between sections
    switchSection(sectionName) {
        // Update sidebar active state
        document.querySelectorAll('#ultrasound-module .sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`#ultrasound-module .sidebar-item[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Hide all sections
        document.querySelectorAll('#ultrasound-module .section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const selectedSection = document.getElementById(`${sectionName}-section`);
        if (selectedSection) {
            selectedSection.classList.add('active');
            this.currentSection = sectionName;

            console.log(`Switched to ultrasound section: ${sectionName}`);

            // Load data for the section if it's not the add form
            if (sectionName !== 'add-ultrasound') {
                console.log(`Loading data for ultrasound section: ${sectionName}`);
                this.loadSectionData(sectionName);
            }
        }
    }

    // Setup add ultrasound form
    setupAddUltrasoundForm() {
        const form = document.getElementById('addUltrasoundForm');
        const scheduleSelect = document.getElementById('ultrasoundSchedule');
        const dateInput = document.getElementById('ultrasoundDate');
        const iycInput = document.getElementById('ultrasoundIycNumber');
        const resetBtn = document.getElementById('resetUltrasoundFormBtn');

        // Handle schedule change
        if (scheduleSelect) {
            scheduleSelect.addEventListener('change', () => {
                this.handleScheduleChange();
            });
        }

        // Handle IYC number input with debouncing
        if (iycInput) {
            let debounceTimer;
            iycInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleIYCLookup(iycInput.value);
                }, 500); // 500ms delay
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
        const form = document.getElementById('addUltrasoundForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateForm();
            });
            input.addEventListener('change', () => {
                this.validateForm();
            });
        });
    }

    // Handle schedule change - key difference from blood test
    handleScheduleChange() {
        const scheduleSelect = document.getElementById('ultrasoundSchedule');
        const dateInput = document.getElementById('ultrasoundDate');
        
        if (!scheduleSelect || !dateInput) return;

        const selectedSchedule = scheduleSelect.value;
        
        // For ultrasound: date is always optional, no auto-filling
        // This is different from blood test where upcoming tests get auto-filled dates
        dateInput.value = '';
        
        this.validateForm();
    }

    // Handle IYC lookup
    async handleIYCLookup(iycNumber) {
        const nameInput = document.getElementById('ultrasoundPatientName');
        const categoryInput = document.getElementById('ultrasoundCategory');
        const phoneInput = document.getElementById('ultrasoundPhoneNumber');
        const loadingIndicator = document.getElementById('ultrasoundIycLoading');

        if (!iycNumber || iycNumber.trim() === '') {
            // Clear fields if IYC is empty
            if (nameInput) nameInput.value = '';
            if (categoryInput) categoryInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            this.validateForm();
            return;
        }

        try {
            // Show loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            console.log('Ultrasound - About to call googleSheetsAPI.lookupPatientByIYC');
            // Lookup patient data
            const result = await googleSheetsAPI.lookupPatientByIYC(iycNumber.trim());
            console.log('Ultrasound - API result:', result);

            if (result.found) {
                // Populate fields with found data but allow manual editing
                if (nameInput) {
                    nameInput.value = result.name;
                    nameInput.readOnly = false;
                    nameInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-filled
                    nameInput.placeholder = 'Auto-filled from database (editable)';
                }
                if (categoryInput) {
                    categoryInput.value = result.category;
                    categoryInput.readOnly = false;
                    categoryInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-filled
                    categoryInput.placeholder = 'Auto-filled from database (editable)';
                }
                if (phoneInput) {
                    phoneInput.value = result.phone;
                    phoneInput.readOnly = false;
                    phoneInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-filled
                    phoneInput.placeholder = 'Auto-filled from database (editable)';
                }
            } else {
                // Clear fields and allow manual entry
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.readOnly = false;
                    nameInput.style.backgroundColor = '';
                    nameInput.placeholder = 'Patient not found - enter manually';
                }
                if (categoryInput) {
                    categoryInput.value = '';
                    categoryInput.readOnly = false;
                    categoryInput.style.backgroundColor = '';
                    categoryInput.placeholder = 'Enter category manually';
                }
                if (phoneInput) {
                    phoneInput.value = '';
                    phoneInput.readOnly = false;
                    phoneInput.style.backgroundColor = '';
                    phoneInput.placeholder = 'Enter phone number manually';
                }
            }

        } catch (error) {
            console.error('Error looking up patient:', error);

            // Allow manual entry on error
            if (nameInput) {
                nameInput.readOnly = false;
                nameInput.style.backgroundColor = '';
                nameInput.placeholder = 'Lookup failed - enter manually';
            }
            if (categoryInput) {
                categoryInput.readOnly = false;
                categoryInput.style.backgroundColor = '';
                categoryInput.placeholder = 'Enter category manually';
            }
            if (phoneInput) {
                phoneInput.readOnly = false;
                phoneInput.style.backgroundColor = '';
                phoneInput.placeholder = 'Enter phone number manually';
            }
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            this.validateForm();
        }
    }

    // Validate form - modified for ultrasound (date is optional)
    validateForm() {
        const form = document.getElementById('addUltrasoundForm');
        const saveBtn = document.getElementById('saveUltrasoundBtn');
        
        if (!form || !saveBtn) return;

        const schedule = document.getElementById('ultrasoundSchedule').value;
        const iycNumber = document.getElementById('ultrasoundIycNumber').value.trim();
        const patientName = document.getElementById('ultrasoundPatientName').value.trim();
        const category = document.getElementById('ultrasoundCategory').value.trim();
        const phoneNumber = document.getElementById('ultrasoundPhoneNumber').value.trim();
        const testName = document.getElementById('ultrasoundTestName').value.trim();
        const referredBy = document.getElementById('ultrasoundReferredBy').value;

        // Date is optional for ultrasound - this is the key difference
        const isValid = schedule && iycNumber && patientName && category && phoneNumber && testName && referredBy;

        this.isFormValid = isValid;
        saveBtn.disabled = !isValid;

        // Update visual feedback
        if (isValid) {
            saveBtn.classList.remove('disabled');
        } else {
            saveBtn.classList.add('disabled');
        }
    }

    // Handle form submission
    async handleFormSubmit() {
        if (!this.isFormValid) {
            UTILS.showMessage('ultrasoundFormMessage', 'Please fill in all required fields', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveUltrasoundBtn');
        const originalText = saveBtn.innerHTML;

        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            // Collect form data
            const ultrasoundData = {
                schedule: document.getElementById('ultrasoundSchedule').value,
                testDate: document.getElementById('ultrasoundDate').value || '', // Optional
                iycNumber: document.getElementById('ultrasoundIycNumber').value.trim(),
                patientName: document.getElementById('ultrasoundPatientName').value.trim(),
                category: document.getElementById('ultrasoundCategory').value.trim(),
                phoneNumber: document.getElementById('ultrasoundPhoneNumber').value.trim(),
                testName: document.getElementById('ultrasoundTestName').value.trim(),
                referredBy: document.getElementById('ultrasoundReferredBy').value
            };

            console.log('Submitting ultrasound data:', ultrasoundData);

            // Save to Google Sheets
            const result = await googleSheetsAPI.saveUltrasound(ultrasoundData);

            if (result.success) {
                UTILS.showMessage('ultrasoundFormMessage', 'Ultrasound saved successfully!', 'success');
                this.resetForm();
            } else {
                UTILS.showMessage('ultrasoundFormMessage', result.message || 'Failed to save ultrasound', 'error');
            }

        } catch (error) {
            console.error('Error saving ultrasound:', error);
            UTILS.showMessage('ultrasoundFormMessage', 'An error occurred while saving. Please try again.', 'error');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Set default values - key difference: default to "Pending" instead of "Upcoming"
    setDefaultValues() {
        const scheduleSelect = document.getElementById('ultrasoundSchedule');
        
        if (scheduleSelect) {
            // Set default to "Pending" instead of "Upcoming"
            scheduleSelect.value = 'Pending';
            this.handleScheduleChange();
        }
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('addUltrasoundForm');
        const nameInput = document.getElementById('ultrasoundPatientName');
        const categoryInput = document.getElementById('ultrasoundCategory');
        const phoneInput = document.getElementById('ultrasoundPhoneNumber');

        if (form) {
            form.reset();
        }

        // Reset field states
        [nameInput, categoryInput, phoneInput].forEach(input => {
            if (input) {
                input.readOnly = false;
                input.style.backgroundColor = '';
                input.placeholder = input.getAttribute('data-original-placeholder') || input.placeholder;
            }
        });

        // Clear messages
        UTILS.clearMessage('ultrasoundFormMessage');

        // Set default values
        this.setDefaultValues();

        // Revalidate form
        this.validateForm();
    }

    // Setup table interactions
    setupTableInteractions() {
        // Handle cell editing
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('editable-cell') && e.target.closest('#ultrasound-module')) {
                this.enterEditMode(e.target);
            }
        });

        // Handle checkbox selection
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('ultrasound-checkbox') && e.target.closest('#ultrasound-module')) {
                this.handleUltrasoundSelection(e.target);
            }
        });

        // Handle select all checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.id && e.target.id.startsWith('selectAllUltrasound') && e.target.closest('#ultrasound-module')) {
                this.handleSelectAll(e.target);
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }

    // Setup bulk actions
    setupBulkActions() {
        // Setup action button click handlers
        const actionButtons = [
            'upcomingUltrasoundActionBtn',
            'pendingUltrasoundActionBtn',
            'reviewUltrasoundActionBtn',
            'completedUltrasoundActionBtn',
            'cancelledUltrasoundActionBtn'
        ];

        actionButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleActionDropdown(button);
                });
            }
        });

        // Setup dropdown action handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item') && e.target.closest('#ultrasound-module')) {
                this.handleBulkAction(e.target);
            }
        });
    }

    // Setup refresh buttons
    setupRefreshButtons() {
        const refreshButtons = [
            'refreshUpcomingUltrasoundBtn',
            'refreshPendingUltrasoundBtn',
            'refreshReviewUltrasoundBtn',
            'refreshCompletedUltrasoundBtn',
            'refreshCancelledUltrasoundBtn'
        ];

        refreshButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    const section = this.getSectionFromButtonId(buttonId);
                    this.loadSectionData(section);
                });
            }
        });
    }

    // Get section name from button ID
    getSectionFromButtonId(buttonId) {
        const mapping = {
            'refreshUpcomingUltrasoundBtn': 'upcoming-ultrasound',
            'refreshPendingUltrasoundBtn': 'pending-ultrasound',
            'refreshReviewUltrasoundBtn': 'pending-review-ultrasound',
            'refreshCompletedUltrasoundBtn': 'completed-ultrasound',
            'refreshCancelledUltrasoundBtn': 'cancelled-ultrasound'
        };
        return mapping[buttonId];
    }

    // Load section data
    async loadSectionData(sectionName) {
        console.log(`🔄 Loading data for ultrasound section: ${sectionName}`);
        console.log(`🔄 googleSheetsAPI.isInitialized: ${googleSheetsAPI.isInitialized}`);

        this.showSectionLoading(sectionName, true);

        try {
            // Map section names to status values
            const statusMapping = {
                'upcoming-ultrasound': 'Upcoming',
                'pending-ultrasound': 'Pending',
                'pending-review-ultrasound': 'Pending Review',
                'completed-ultrasound': 'Completed',
                'cancelled-ultrasound': 'Cancelled'
            };

            const status = statusMapping[sectionName];

            if (!status) {
                console.error(`Unknown section: ${sectionName}`);
                this.showSectionMessage(sectionName, 'Unknown section', 'error');
            } else {
                const result = await googleSheetsAPI.getUltrasounds(status);
                console.log(`Ultrasounds result for ${sectionName} (status: ${status}):`, result);
                if (result.success) {
                    this.sectionData[sectionName] = result.ultrasounds;
                    this.renderSectionTable(sectionName);
                    this.updateSectionControls(sectionName);
                } else {
                    this.showSectionMessage(sectionName, 'Failed to load data: ' + result.message, 'error');
                }
            }
        } catch (error) {
            console.error(`Error loading ${sectionName} data:`, error);
            this.showSectionMessage(sectionName, 'Failed to load data. Please try again.', 'error');
        } finally {
            this.showSectionLoading(sectionName, false);
        }
    }

    // Show section loading state
    showSectionLoading(sectionName, isLoading) {
        const messageMapping = {
            'upcoming-ultrasound': 'upcomingUltrasoundMessage',
            'pending-ultrasound': 'pendingUltrasoundMessage',
            'pending-review-ultrasound': 'reviewUltrasoundMessage',
            'completed-ultrasound': 'completedUltrasoundMessage',
            'cancelled-ultrasound': 'cancelledUltrasoundMessage'
        };

        const messageElement = document.getElementById(messageMapping[sectionName]);
        if (messageElement) {
            if (isLoading) {
                messageElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                messageElement.className = 'section-message loading';
                messageElement.style.display = 'block';
            } else {
                messageElement.style.display = 'none';
            }
        }
    }

    // Show section message
    showSectionMessage(sectionName, message, type = 'info') {
        const messageMapping = {
            'upcoming-ultrasound': 'upcomingUltrasoundMessage',
            'pending-ultrasound': 'pendingUltrasoundMessage',
            'pending-review-ultrasound': 'reviewUltrasoundMessage',
            'completed-ultrasound': 'completedUltrasoundMessage',
            'cancelled-ultrasound': 'cancelledUltrasoundMessage'
        };

        const messageElement = document.getElementById(messageMapping[sectionName]);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `section-message ${type}`;
            messageElement.style.display = 'block';

            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, 5000);
            }
        }
    }

    // Render section table
    renderSectionTable(sectionName) {
        console.log(`Rendering table for ${sectionName}`, this.sectionData[sectionName]);

        const tableMapping = {
            'upcoming-ultrasound': 'upcomingUltrasoundsTable',
            'pending-ultrasound': 'pendingUltrasoundsTable',
            'pending-review-ultrasound': 'reviewUltrasoundsTable',
            'completed-ultrasound': 'completedUltrasoundsTable',
            'cancelled-ultrasound': 'cancelledUltrasoundsTable'
        };

        const tableId = tableMapping[sectionName];
        const table = document.getElementById(tableId);
        console.log(`Table element for ${tableId}:`, table);
        if (!table) {
            console.error(`Table not found: ${tableId}`);
            return;
        }

        const tbody = table.querySelector('tbody');
        const ultrasounds = this.sectionData[sectionName];

        // Clear existing rows
        tbody.innerHTML = '';

        if (ultrasounds.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="9">No ${sectionName.replace('-', ' ')} found</td>
                </tr>
            `;
            return;
        }

        // Render ultrasound rows
        ultrasounds.forEach(ultrasound => {
            const row = this.createUltrasoundRow(ultrasound, sectionName);
            tbody.appendChild(row);
        });

        console.log(`Rendered ${ultrasounds.length} rows for ${sectionName}`);
    }

    // Create an ultrasound row element
    createUltrasoundRow(ultrasound, sectionName) {
        const row = document.createElement('tr');
        row.setAttribute('data-ultrasound-id', ultrasound.id);
        row.setAttribute('data-row-index', ultrasound.rowIndex);

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="ultrasound-checkbox" data-ultrasound-id="${ultrasound.id}">
            </td>
            <td class="editable-cell" data-field="date">${ultrasound.date}</td>
            <td class="editable-cell" data-field="iycNumber">${ultrasound.iycNumber}</td>
            <td class="editable-cell" data-field="name">${ultrasound.name}</td>
            <td class="editable-cell" data-field="category">${ultrasound.category}</td>
            <td class="editable-cell" data-field="phone">${ultrasound.phone}</td>
            <td class="editable-cell" data-field="testName">${ultrasound.testName}</td>
            <td class="editable-cell" data-field="referredBy">${ultrasound.referredBy}</td>
            <td class="editable-cell" data-field="remarks">${ultrasound.remarks}</td>
        `;

        return row;
    }

    // Update section controls
    updateSectionControls(sectionName) {
        const selectedCount = this.selectedUltrasounds[sectionName].size;

        // Update action button state
        const actionBtnMapping = {
            'upcoming-ultrasound': 'upcomingUltrasoundActionBtn',
            'pending-ultrasound': 'pendingUltrasoundActionBtn',
            'pending-review-ultrasound': 'reviewUltrasoundActionBtn',
            'completed-ultrasound': 'completedUltrasoundActionBtn',
            'cancelled-ultrasound': 'cancelledUltrasoundActionBtn'
        };

        const actionBtn = document.getElementById(actionBtnMapping[sectionName]);
        if (actionBtn) {
            actionBtn.disabled = selectedCount === 0;
            actionBtn.textContent = selectedCount > 0 ?
                `Actions (${selectedCount})` : 'Actions';
        }

        // Update select all checkbox
        const selectAllMapping = {
            'upcoming-ultrasound': 'selectAllUpcomingUltrasound',
            'pending-ultrasound': 'selectAllPendingUltrasound',
            'pending-review-ultrasound': 'selectAllReviewUltrasound',
            'completed-ultrasound': 'selectAllCompletedUltrasound',
            'cancelled-ultrasound': 'selectAllCancelledUltrasound'
        };

        const selectAllCheckbox = document.getElementById(selectAllMapping[sectionName]);
        if (selectAllCheckbox) {
            const totalUltrasounds = this.sectionData[sectionName].length;
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalUltrasounds;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalUltrasounds;
        }
    }

    // Enter edit mode for a cell
    enterEditMode(cell) {
        if (this.editingCell) {
            this.exitEditMode();
        }

        this.editingCell = cell;
        const currentValue = cell.textContent;
        const field = cell.getAttribute('data-field');

        // Create input element based on field type
        let input;
        if (field === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.value = currentValue;
        } else if (field === 'referredBy') {
            input = document.createElement('select');
            // Use system config if available, otherwise fallback to CONFIG.DOCTORS
            const doctorsList = this.systemConfig && this.systemConfig.referredBy ?
                              this.systemConfig.referredBy : CONFIG.DOCTORS;
            doctorsList.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor;
                option.textContent = doctor;
                option.selected = doctor === currentValue;
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
        }

        input.className = 'cell-editor';
        input.addEventListener('blur', () => this.saveEdit());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit();
            } else if (e.key === 'Escape') {
                this.cancelEdit();
            }
        });

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
    }

    // Exit edit mode
    exitEditMode() {
        if (this.editingCell) {
            const input = this.editingCell.querySelector('.cell-editor');
            if (input) {
                this.editingCell.textContent = input.value;
            }
            this.editingCell = null;
        }
    }

    // Save edit
    async saveEdit() {
        if (!this.editingCell) return;

        const input = this.editingCell.querySelector('.cell-editor');
        if (!input) return;

        const newValue = input.value;
        const field = this.editingCell.getAttribute('data-field');
        const row = this.editingCell.closest('tr');
        const ultrasoundId = row.getAttribute('data-ultrasound-id');
        const rowIndex = row.getAttribute('data-row-index');

        try {
            // Get current ultrasound data
            const ultrasound = this.findUltrasoundById(ultrasoundId);
            if (!ultrasound) return;

            // Update ultrasound data
            ultrasound[field] = newValue;

            // Prepare data for API
            const ultrasoundData = {
                date: ultrasound.date,
                iycNumber: ultrasound.iycNumber,
                name: ultrasound.name,
                category: ultrasound.category,
                phone: ultrasound.phone,
                testName: ultrasound.testName,
                referredBy: ultrasound.referredBy,
                status: ultrasound.status,
                remarks: ultrasound.remarks
            };

            // Update in Google Sheets
            const result = await googleSheetsAPI.updateUltrasound(rowIndex, ultrasoundData);

            if (result.success) {
                this.editingCell.textContent = newValue;
                this.showSectionMessage(this.currentSection, 'Ultrasound updated successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to update ultrasound');
            }
        } catch (error) {
            console.error('Error saving edit:', error);
            this.showSectionMessage(this.currentSection, 'Failed to save changes: ' + error.message, 'error');
            // Revert to original value
            const ultrasound = this.findUltrasoundById(ultrasoundId);
            if (ultrasound) {
                this.editingCell.textContent = ultrasound[field];
            }
        } finally {
            this.editingCell = null;
        }
    }

    // Cancel edit
    cancelEdit() {
        if (this.editingCell) {
            const ultrasoundId = this.editingCell.closest('tr').getAttribute('data-ultrasound-id');
            const field = this.editingCell.getAttribute('data-field');
            const ultrasound = this.findUltrasoundById(ultrasoundId);

            if (ultrasound) {
                this.editingCell.textContent = ultrasound[field];
            }
            this.editingCell = null;
        }
    }

    // Find ultrasound by ID
    findUltrasoundById(ultrasoundId) {
        const ultrasounds = this.sectionData[this.currentSection];
        return ultrasounds.find(ultrasound => ultrasound.id.toString() === ultrasoundId.toString());
    }

    // Handle ultrasound selection
    handleUltrasoundSelection(checkbox) {
        const ultrasoundId = checkbox.getAttribute('data-ultrasound-id');
        const section = this.currentSection;

        if (checkbox.checked) {
            this.selectedUltrasounds[section].add(ultrasoundId);
        } else {
            this.selectedUltrasounds[section].delete(ultrasoundId);
        }

        this.updateSectionControls(section);
    }

    // Handle select all
    handleSelectAll(checkbox) {
        const section = this.currentSection;
        const ultrasoundCheckboxes = document.querySelectorAll(`#${section}-section .ultrasound-checkbox`);

        ultrasoundCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            const ultrasoundId = cb.getAttribute('data-ultrasound-id');

            if (checkbox.checked) {
                this.selectedUltrasounds[section].add(ultrasoundId);
            } else {
                this.selectedUltrasounds[section].delete(ultrasoundId);
            }
        });

        this.updateSectionControls(section);
    }

    // Toggle action dropdown
    toggleActionDropdown(button) {
        const dropdown = button.nextElementSibling;
        const isOpen = dropdown.style.display === 'block';

        // Close all dropdowns first
        this.closeAllDropdowns();

        // Toggle current dropdown
        if (!isOpen) {
            dropdown.style.display = 'block';
        }
    }

    // Close all dropdowns
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('#ultrasound-module .dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    // Handle bulk action
    async handleBulkAction(actionItem) {
        const action = actionItem.getAttribute('data-action');
        const selectedUltrasoundIds = Array.from(this.selectedUltrasounds[this.currentSection]);

        if (selectedUltrasoundIds.length === 0) {
            this.showSectionMessage(this.currentSection, 'No ultrasounds selected', 'warning');
            return;
        }

        // Close dropdown
        this.closeAllDropdowns();

        // Confirm action
        const actionText = actionItem.textContent.trim();
        if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedUltrasoundIds.length} ultrasound(s)?`)) {
            return;
        }

        try {
            this.showSectionLoading(this.currentSection, true);

            if (action === 'delete') {
                await this.deleteSelectedUltrasounds();
            } else {
                await this.moveSelectedUltrasounds(action);
            }

            // Clear selections
            this.selectedUltrasounds[this.currentSection].clear();

            // Reload data
            await this.loadSectionData(this.currentSection);

            this.showSectionMessage(this.currentSection, `Successfully ${actionText.toLowerCase()} ${selectedUltrasoundIds.length} ultrasound(s)`, 'success');

        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showSectionMessage(this.currentSection, 'Failed to perform action: ' + error.message, 'error');
        } finally {
            this.showSectionLoading(this.currentSection, false);
        }
    }

    // Move selected ultrasounds (updates status)
    async moveSelectedUltrasounds(action) {
        const selectedUltrasoundIds = Array.from(this.selectedUltrasounds[this.currentSection]);

        // Determine new status
        const statusMapping = {
            'test-done': 'Pending Review',
            'postpone': 'Pending',
            'cancelled': 'Cancelled',
            'upcoming': 'Upcoming',
            'completed': 'Completed'
        };

        const newStatus = statusMapping[action];
        if (!newStatus) {
            throw new Error('Invalid action: ' + action);
        }

        // Get row indices for selected ultrasounds
        const rowIndices = selectedUltrasoundIds.map(ultrasoundId => {
            const ultrasound = this.findUltrasoundById(ultrasoundId);
            return ultrasound ? ultrasound.rowIndex : null;
        }).filter(index => index !== null);

        // Update ultrasound status via API
        const result = await googleSheetsAPI.updateUltrasoundStatus(selectedUltrasoundIds, newStatus, rowIndices);

        if (!result.success) {
            throw new Error(result.message || 'Failed to update ultrasound status');
        }
    }

    // Delete selected ultrasounds
    async deleteSelectedUltrasounds() {
        const selectedUltrasoundIds = Array.from(this.selectedUltrasounds[this.currentSection]);

        // Get row indices for selected ultrasounds
        const rowIndices = selectedUltrasoundIds.map(ultrasoundId => {
            const ultrasound = this.findUltrasoundById(ultrasoundId);
            return ultrasound ? ultrasound.rowIndex : null;
        }).filter(index => index !== null);

        // Delete ultrasounds via API
        const result = await googleSheetsAPI.deleteUltrasounds(rowIndices);

        if (!result.success) {
            throw new Error(result.message || 'Failed to delete ultrasounds');
        }
    }

    // Load system configuration
    async loadSystemConfig() {
        try {
            console.log('Loading system configuration for ultrasound...');
            const result = await googleSheetsAPI.getSystemConfig();

            if (result.success) {
                console.log('System config loaded successfully');

                // Update referred by dropdown
                this.updateReferredByDropdown(result.data.referredBy);

                // Store config for later use
                this.systemConfig = result.data;
            } else {
                console.error('Failed to load system config:', result.message);
            }
        } catch (error) {
            console.error('Error loading system config:', error);
        }
    }

    // Update referred by dropdown with data from system config
    updateReferredByDropdown(referredByList) {
        const referredBySelect = document.getElementById('ultrasoundReferredBy');
        if (!referredBySelect || !Array.isArray(referredByList)) return;

        // Clear existing options except the first one
        while (referredBySelect.children.length > 1) {
            referredBySelect.removeChild(referredBySelect.lastChild);
        }

        // Add new options from system config
        referredByList.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            referredBySelect.appendChild(option);
        });

        console.log(`Updated referred by dropdown with ${referredByList.length} options`);
    }
}

// Create global ultrasound manager instance
const ultrasoundManager = new UltrasoundManager();

// Test function for debugging
window.testUltrasoundAPI = async function() {
    console.log('Testing Ultrasound API...');
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

// Test function for ultrasound data loading
window.testUltrasoundDataLoading = async function() {
    console.log('🧪 Testing Ultrasound Data Loading...');

    try {
        // Test pending ultrasounds
        console.log('📋 Testing Pending Ultrasounds...');
        const pendingResult = await googleSheetsAPI.getUltrasounds('Pending');
        console.log('Pending ultrasounds result:', pendingResult);

        // Test upcoming ultrasounds
        console.log('📅 Testing Upcoming Ultrasounds...');
        const upcomingResult = await googleSheetsAPI.getUltrasounds('Upcoming');
        console.log('Upcoming ultrasounds result:', upcomingResult);

        // Test manual section loading
        console.log('🔄 Testing Manual Section Loading...');
        if (typeof ultrasoundManager !== 'undefined') {
            await ultrasoundManager.loadSectionData('pending-ultrasound');
            console.log('Manual pending section load completed');

            await ultrasoundManager.loadSectionData('upcoming-ultrasound');
            console.log('Manual upcoming section load completed');
        }

        return {
            pending: pendingResult,
            upcoming: upcomingResult
        };
    } catch (error) {
        console.error('❌ Ultrasound data loading test error:', error);
        return error;
    }
};
