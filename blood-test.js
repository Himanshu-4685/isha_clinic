// Blood Test module functionality
class BloodTestManager {
    constructor() {
        this.currentSection = 'add-test';
        this.formData = {};
        this.isFormValid = false;
        this.sectionData = {
            'upcoming-test': [],
            'pending-test': [],
            'pending-review': [],
            'completed': [],
            'cancelled-test': []
        };
        this.selectedTests = {
            'upcoming-test': new Set(),
            'pending-test': new Set(),
            'pending-review': new Set(),
            'completed': new Set(),
            'cancelled-test': new Set()
        };
        this.editingCell = null;
    }

    // Initialize the blood test module
    init() {
        this.setupSidebarNavigation();
        this.setupAddTestForm();
        this.setupFormValidation();
        this.setupTableInteractions();
        this.setupBulkActions();
        this.setupRefreshButtons();
        this.setDefaultValues();
        this.loadSystemConfig();

        // Load data for current section if not add-test
        if (this.currentSection !== 'add-test') {
            this.loadSectionData(this.currentSection);
        }
    }

    // Setup sidebar navigation
    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    // Switch between different sections
    switchSection(sectionName) {
        // Update sidebar active state
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content area
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        this.currentSection = sectionName;

        // Load data for the new section (except add-test)
        if (sectionName !== 'add-test') {
            this.loadSectionData(sectionName);
        }

        // Clear any editing state
        this.exitEditMode();
    }

    // Setup add test form
    setupAddTestForm() {
        const form = document.getElementById('addTestForm');
        const scheduleSelect = document.getElementById('schedule');
        const dateInput = document.getElementById('testDate');
        const iycInput = document.getElementById('iycNumber');
        const resetBtn = document.getElementById('resetFormBtn');

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

        // Handle update details button
        const updateDetailsBtn = document.getElementById('updateBloodTestDetailsBtn');
        if (updateDetailsBtn) {
            updateDetailsBtn.addEventListener('click', () => {
                this.updatePatientDetails();
            });
        }
    }

    // Setup form validation
    setupFormValidation() {
        const form = document.getElementById('addTestForm');
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

    // Set default values
    setDefaultValues() {
        const scheduleSelect = document.getElementById('schedule');
        if (scheduleSelect) {
            scheduleSelect.value = 'Upcoming';
            this.handleScheduleChange();
        }
    }

    // Handle schedule change
    handleScheduleChange() {
        const scheduleSelect = document.getElementById('schedule');
        const dateInput = document.getElementById('testDate');
        const dateLabel = document.querySelector('label[for="testDate"] .conditional');

        if (!scheduleSelect || !dateInput) return;

        const schedule = scheduleSelect.value;

        if (schedule === 'Upcoming') {
            // Auto-fill with next test date
            dateInput.value = UTILS.getNextTestDate();
            dateInput.readOnly = true;
            dateInput.style.backgroundColor = '#f8f9fa';
            if (dateLabel) dateLabel.style.display = 'none';
        } else if (schedule === 'Pending') {
            // Allow manual date selection for pending tests
            dateInput.value = '';
            dateInput.readOnly = false;
            dateInput.style.backgroundColor = '';
            if (dateLabel) dateLabel.style.display = 'inline';
        } else if (schedule === 'Pending Review' || schedule === 'Completed') {
            // Use today's date for completed/review tests
            dateInput.value = new Date().toISOString().split('T')[0];
            dateInput.readOnly = true;
            dateInput.style.backgroundColor = '#f8f9fa';
            if (dateLabel) dateLabel.style.display = 'none';
        } else {
            // Clear date if no schedule selected
            dateInput.value = '';
            dateInput.readOnly = false;
            dateInput.style.backgroundColor = '';
            if (dateLabel) dateLabel.style.display = 'none';
        }

        this.validateForm();
    }

    // Handle IYC number lookup
    async handleIYCLookup(iycNumber) {
        console.log('Blood Test - handleIYCLookup called with:', iycNumber);
        console.log('Blood Test - googleSheetsAPI.isInitialized:', googleSheetsAPI.isInitialized);

        const loadingIndicator = document.getElementById('iycLoading');
        const nameInput = document.getElementById('patientName');
        const categoryInput = document.getElementById('category');
        const phoneInput = document.getElementById('phoneNumber');

        console.log('Blood Test - Form elements found:', {
            loadingIndicator: !!loadingIndicator,
            nameInput: !!nameInput,
            categoryInput: !!categoryInput,
            phoneInput: !!phoneInput
        });

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

            console.log('Blood Test - About to call googleSheetsAPI.lookupPatientByIYC');
            // Lookup patient data
            const result = await googleSheetsAPI.lookupPatientByIYC(iycNumber.trim());
            console.log('Blood Test - API result:', result);

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

    // Validate form
    validateForm() {
        const form = document.getElementById('addTestForm');
        const saveBtn = document.getElementById('saveTestBtn');
        
        if (!form || !saveBtn) return;

        // Collect form data
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        // Validate using utility function
        const errors = UTILS.validateForm(data);
        
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
            UTILS.showMessage('formMessage', 'Please fill in all required fields', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveTestBtn');
        const originalText = saveBtn.innerHTML;

        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Clear any previous messages
            UTILS.clearMessage('formMessage');

            // Prepare data for saving
            const testData = {
                schedule: this.formData.schedule,
                testDate: this.formData.testDate,
                iycNumber: this.formData.iycNumber,
                patientName: this.formData.patientName,
                category: this.formData.category,
                phoneNumber: this.formData.phoneNumber,
                testName: this.formData.testName,
                referredBy: this.formData.referredBy
            };

            // Save to Google Sheets
            const result = await googleSheetsAPI.saveBloodTest(testData);

            if (result.success) {
                UTILS.showMessage('formMessage', 'Blood test saved successfully!', 'success');
                this.resetForm();
            } else {
                UTILS.showMessage('formMessage', result.message || 'Failed to save blood test', 'error');
            }

        } catch (error) {
            console.error('Error saving blood test:', error);
            UTILS.showMessage('formMessage', 'An error occurred while saving. Please try again.', 'error');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('addTestForm');
        const nameInput = document.getElementById('patientName');
        const categoryInput = document.getElementById('category');
        const phoneInput = document.getElementById('phoneNumber');

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
        UTILS.clearMessage('formMessage');

        // Set default values
        this.setDefaultValues();

        // Revalidate form
        this.validateForm();
    }

    // Setup table interactions
    setupTableInteractions() {
        // Setup click-to-edit for table cells
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('editable-cell')) {
                this.enterEditMode(e.target);
            } else if (this.editingCell && !this.editingCell.contains(e.target)) {
                this.exitEditMode();
            }
        });

        // Setup checkbox interactions
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('test-checkbox')) {
                this.handleTestSelection(e.target);
            } else if (e.target.classList.contains('select-all-checkbox')) {
                this.handleSelectAll(e.target);
            }
        });
    }

    // Setup bulk actions
    setupBulkActions() {
        // Setup action button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                this.toggleActionDropdown(e.target);
            } else if (e.target.classList.contains('dropdown-item')) {
                this.handleBulkAction(e.target);
            } else {
                // Close all dropdowns when clicking elsewhere
                this.closeAllDropdowns();
            }
        });
    }

    // Setup refresh buttons
    setupRefreshButtons() {
        const refreshButtons = [
            'refreshUpcomingBtn',
            'refreshPendingBtn',
            'refreshReviewBtn',
            'refreshCompletedBtn',
            'refreshCancelledBtn'
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
            'refreshUpcomingBtn': 'upcoming-test',
            'refreshPendingBtn': 'pending-test',
            'refreshReviewBtn': 'pending-review',
            'refreshCompletedBtn': 'completed',
            'refreshCancelledBtn': 'cancelled-test'
        };
        return mapping[buttonId];
    }

    // Load data for a specific section
    async loadSectionData(sectionName) {
        const statusMapping = {
            'upcoming-test': 'Upcoming',
            'pending-test': ['Pending', 'Later'], // Handle both "Pending" and "Later" for backward compatibility
            'pending-review': 'Pending Review',
            'completed': 'Completed',
            'cancelled-test': 'Cancelled'
        };

        const status = statusMapping[sectionName];
        if (!status) return;

        try {
            this.showSectionLoading(sectionName, true);

            // For pending-test section, we need to handle multiple status values
            if (sectionName === 'pending-test') {
                // Get all tests and filter client-side for multiple statuses
                const result = await googleSheetsAPI.getAllTests();
                console.log('All tests result:', result);
                if (result.success) {
                    const filteredTests = result.tests.filter(test =>
                        status.includes(test.status)
                    );
                    console.log(`Filtered tests for ${sectionName}:`, filteredTests);
                    this.sectionData[sectionName] = filteredTests;
                    this.renderSectionTable(sectionName);
                    this.updateSectionControls(sectionName);
                } else {
                    this.showSectionMessage(sectionName, 'Failed to load data: ' + result.message, 'error');
                }
            } else {
                const result = await googleSheetsAPI.getTests(status);
                console.log(`Tests result for ${sectionName} (status: ${status}):`, result);
                if (result.success) {
                    this.sectionData[sectionName] = result.tests;
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

    // Render table for a section
    renderSectionTable(sectionName) {
        console.log(`Rendering table for ${sectionName}`, this.sectionData[sectionName]);

        const tableMapping = {
            'upcoming-test': 'upcomingTestsTable',
            'pending-test': 'pendingTestsTable',
            'pending-review': 'reviewTestsTable',
            'completed': 'completedTestsTable',
            'cancelled-test': 'cancelledTestsTable'
        };

        const tableId = tableMapping[sectionName];
        const table = document.getElementById(tableId);
        console.log(`Table element for ${tableId}:`, table);
        if (!table) {
            console.error(`Table not found: ${tableId}`);
            return;
        }

        const tbody = table.querySelector('tbody');
        const tests = this.sectionData[sectionName];

        // Clear existing rows
        tbody.innerHTML = '';

        if (tests.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="9">No ${sectionName.replace('-', ' ')} found</td>
                </tr>
            `;
            return;
        }

        // Render test rows
        tests.forEach(test => {
            const row = this.createTestRow(test, sectionName);
            tbody.appendChild(row);
        });

        console.log(`Rendered ${tests.length} rows for ${sectionName}`);
    }

    // Create a test row element
    createTestRow(test, sectionName) {
        const row = document.createElement('tr');
        row.setAttribute('data-test-id', test.id);
        row.setAttribute('data-row-index', test.rowIndex);

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="test-checkbox" data-test-id="${test.id}">
            </td>
            <td class="editable-cell" data-field="date">${test.date}</td>
            <td class="editable-cell" data-field="iycNumber">${test.iycNumber}</td>
            <td class="editable-cell" data-field="name">${test.name}</td>
            <td class="editable-cell" data-field="category">${test.category}</td>
            <td class="editable-cell" data-field="phone">${test.phone}</td>
            <td class="editable-cell" data-field="testName">${test.testName}</td>
            <td class="editable-cell" data-field="referredBy">${test.referredBy}</td>
            <td class="editable-cell" data-field="remarks">${test.remarks}</td>
        `;

        return row;
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
        const testId = row.getAttribute('data-test-id');
        const rowIndex = row.getAttribute('data-row-index');

        try {
            // Get current test data
            const test = this.findTestById(testId);
            if (!test) return;

            // Update test data
            test[field] = newValue;

            // Prepare data for API
            const testData = {
                date: test.date,
                iycNumber: test.iycNumber,
                name: test.name,
                category: test.category,
                phone: test.phone,
                testName: test.testName,
                referredBy: test.referredBy,
                status: test.status,
                remarks: test.remarks
            };

            // Update in Google Sheets
            const result = await googleSheetsAPI.updateTest(rowIndex, testData);

            if (result.success) {
                this.editingCell.textContent = newValue;
                this.showSectionMessage(this.currentSection, 'Test updated successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to update test');
            }
        } catch (error) {
            console.error('Error saving edit:', error);
            this.showSectionMessage(this.currentSection, 'Failed to save changes: ' + error.message, 'error');
            // Revert to original value
            const test = this.findTestById(testId);
            if (test) {
                this.editingCell.textContent = test[field];
            }
        } finally {
            this.editingCell = null;
        }
    }

    // Cancel edit
    cancelEdit() {
        if (this.editingCell) {
            const testId = this.editingCell.closest('tr').getAttribute('data-test-id');
            const field = this.editingCell.getAttribute('data-field');
            const test = this.findTestById(testId);

            if (test) {
                this.editingCell.textContent = test[field];
            }
            this.editingCell = null;
        }
    }

    // Find test by ID
    findTestById(testId) {
        const tests = this.sectionData[this.currentSection];
        return tests.find(test => test.id.toString() === testId.toString());
    }



    // Handle test selection
    handleTestSelection(checkbox) {
        const testId = checkbox.getAttribute('data-test-id');
        const section = this.currentSection;

        if (checkbox.checked) {
            this.selectedTests[section].add(testId);
        } else {
            this.selectedTests[section].delete(testId);
        }

        this.updateSectionControls(section);
    }

    // Handle select all
    handleSelectAll(checkbox) {
        const section = this.currentSection;
        const testCheckboxes = document.querySelectorAll(`#${section}-section .test-checkbox`);

        testCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            const testId = cb.getAttribute('data-test-id');

            if (checkbox.checked) {
                this.selectedTests[section].add(testId);
            } else {
                this.selectedTests[section].delete(testId);
            }
        });

        this.updateSectionControls(section);
    }

    // Update section controls
    updateSectionControls(sectionName) {
        const selectedCount = this.selectedTests[sectionName].size;

        // Update action button state
        const actionBtnMapping = {
            'upcoming-test': 'upcomingActionBtn',
            'pending-test': 'pendingActionBtn',
            'pending-review': 'reviewActionBtn',
            'completed': 'completedActionBtn',
            'cancelled-test': 'cancelledActionBtn'
        };

        const actionBtn = document.getElementById(actionBtnMapping[sectionName]);
        if (actionBtn) {
            actionBtn.disabled = selectedCount === 0;
            actionBtn.textContent = selectedCount > 0 ?
                `Actions (${selectedCount})` : 'Actions';
        }

        // Update select all checkbox
        const selectAllMapping = {
            'upcoming-test': 'selectAllUpcoming',
            'pending-test': 'selectAllPending',
            'pending-review': 'selectAllReview',
            'completed': 'selectAllCompleted',
            'cancelled-test': 'selectAllCancelled'
        };

        const selectAllCheckbox = document.getElementById(selectAllMapping[sectionName]);
        if (selectAllCheckbox) {
            const totalTests = this.sectionData[sectionName].length;
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalTests;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalTests;
        }
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
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    // Handle bulk action
    async handleBulkAction(actionItem) {
        const action = actionItem.getAttribute('data-action');
        const selectedTestIds = Array.from(this.selectedTests[this.currentSection]);

        if (selectedTestIds.length === 0) {
            this.showSectionMessage(this.currentSection, 'No tests selected', 'warning');
            return;
        }

        // Close dropdown
        this.closeAllDropdowns();

        // Confirm action
        const actionText = actionItem.textContent.trim();
        if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedTestIds.length} test(s)?`)) {
            return;
        }

        try {
            this.showSectionLoading(this.currentSection, true);

            if (action === 'delete') {
                await this.deleteSelectedTests();
            } else {
                await this.moveSelectedTests(action);
            }

            // Clear selections
            this.selectedTests[this.currentSection].clear();

            // Reload data
            await this.loadSectionData(this.currentSection);

            this.showSectionMessage(this.currentSection, `Successfully ${actionText.toLowerCase()} ${selectedTestIds.length} test(s)`, 'success');

        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showSectionMessage(this.currentSection, 'Failed to perform action: ' + error.message, 'error');
        } finally {
            this.showSectionLoading(this.currentSection, false);
        }
    }

    // Move selected tests (now updates status instead of moving between sheets)
    async moveSelectedTests(action) {
        const selectedTestIds = Array.from(this.selectedTests[this.currentSection]);

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

        // Get row indices for selected tests
        const rowIndices = selectedTestIds.map(testId => {
            const test = this.findTestById(testId);
            return test ? test.rowIndex : null;
        }).filter(index => index !== null);

        // Update test status via API (much more efficient than moving between sheets)
        const result = await googleSheetsAPI.updateTestStatus(selectedTestIds, newStatus, rowIndices);

        if (!result.success) {
            throw new Error(result.message || 'Failed to update test status');
        }
    }

    // Delete selected tests
    async deleteSelectedTests() {
        const selectedTestIds = Array.from(this.selectedTests[this.currentSection]);

        // Get row indices for selected tests
        const rowIndices = selectedTestIds.map(testId => {
            const test = this.findTestById(testId);
            return test ? test.rowIndex : null;
        }).filter(index => index !== null);

        // Delete tests via API
        const result = await googleSheetsAPI.deleteTests(rowIndices);

        if (!result.success) {
            throw new Error(result.message || 'Failed to delete tests');
        }
    }

    // Show section loading state
    showSectionLoading(sectionName, isLoading) {
        const messageMapping = {
            'upcoming-test': 'upcomingMessage',
            'pending-test': 'pendingMessage',
            'pending-review': 'reviewMessage',
            'completed': 'completedMessage',
            'cancelled-test': 'cancelledMessage'
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
            'upcoming-test': 'upcomingMessage',
            'pending-test': 'pendingMessage',
            'pending-review': 'reviewMessage',
            'completed': 'completedMessage',
            'cancelled-test': 'cancelledMessage'
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

    // Load system configuration
    async loadSystemConfig() {
        try {
            console.log('Loading system configuration for blood test...');
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
        const referredBySelect = document.getElementById('referredBy');
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

    // Update patient details from form
    updatePatientDetails() {
        // Get current form data
        const formData = {
            iycNumber: document.getElementById('iycNumber')?.value || '',
            patientName: document.getElementById('patientName')?.value || '',
            email: document.getElementById('email')?.value || '',
            phoneNumber: document.getElementById('phoneNumber')?.value || ''
        };

        console.log('Blood Test - Form data for update modal:', formData);
        this.showUpdateDetailsModal(formData);
    }

    // Show update details modal
    showUpdateDetailsModal(formData) {
        // Create modal HTML with editable patient fields
        const modalHtml = `
            <div id="bloodTestUpdateDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Update Patient Details</h3>
                        <span class="modal-close" onclick="bloodTestManager.closeUpdateDetailsModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="details-grid">
                            <div class="detail-item">
                                <label>IYC Number:</label>
                                <input type="text" class="readonly-field" value="${formData.iycNumber || ''}" readonly>
                            </div>
                            <div class="detail-item">
                                <label>Name: <span class="required">*</span></label>
                                <input type="text" id="updatePatientName" value="${formData.patientName || ''}" required>
                            </div>
                            <div class="detail-item">
                                <label>Email: <span class="required">*</span></label>
                                <input type="email" id="updatePatientEmail" value="${formData.email || ''}" required>
                            </div>
                            <div class="detail-item">
                                <label>Phone: <span class="required">*</span></label>
                                <input type="tel" id="updatePatientPhone" value="${formData.phoneNumber || ''}" required>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-primary" onclick="bloodTestManager.savePatientDetails()">Save Changes</button>
                        <button type="button" class="btn-secondary" onclick="bloodTestManager.closeUpdateDetailsModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal with proper display
        const modal = document.getElementById('bloodTestUpdateDetailsModal');
        modal.style.display = 'flex';

        // Add event listener for clicking outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeUpdateDetailsModal();
            }
        });

        // Add keyboard event listener for ESC key
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                this.closeUpdateDetailsModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }

    // Close update details modal
    closeUpdateDetailsModal() {
        const modal = document.getElementById('bloodTestUpdateDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    // Save patient details
    async savePatientDetails() {
        try {
            // Get form values from modal
            const name = document.getElementById('updatePatientName').value.trim();
            const email = document.getElementById('updatePatientEmail').value.trim();
            const phone = document.getElementById('updatePatientPhone').value.trim();
            const iycNumber = document.querySelector('#bloodTestUpdateDetailsModal .readonly-field').value.trim();

            // Validate required fields
            if (!name || !email || !phone) {
                alert('Please fill in all required fields (Name, Email, Phone)');
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }

            // Prepare patient data for update
            const patientData = {
                iycNumber: iycNumber,
                name: name,
                email: email,
                phone: phone
            };

            // Update patient in database
            const result = await googleSheetsAPI.updatePatientDetails(patientData);

            if (result && result.success) {
                // Update the form fields with the new values
                const nameInput = document.getElementById('patientName');
                const emailInput = document.getElementById('email');
                const phoneInput = document.getElementById('phoneNumber');

                if (nameInput) nameInput.value = name;
                if (emailInput) emailInput.value = email;
                if (phoneInput) phoneInput.value = phone;

                this.showMessage('formMessage', 'Patient details updated successfully!', 'success');
                this.closeUpdateDetailsModal();

                // Refresh the records table if we're on that section
                if (this.currentSection !== 'new-test') {
                    this.loadSectionData(this.currentSection);
                }
            } else {
                const errorMessage = result ? (result.message || 'Failed to update patient details') : 'No response from server';
                this.showMessage('formMessage', errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error updating patient details:', error);
            let errorMessage = 'An error occurred while updating patient details';

            // Provide more specific error messages
            if (error.message && error.message.includes('Doctype')) {
                errorMessage = 'Server error: Please make sure the backend server is running on port 3001';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }

            this.showMessage('formMessage', errorMessage, 'error');
        }
    }

    // Show message
    showMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `form-message ${type}`;

            if (message) {
                setTimeout(() => {
                    messageElement.textContent = '';
                    messageElement.className = 'form-message';
                }, 5000);
            }
        }
    }

    // Send Message functionality (placeholder for WhatsApp API integration)
    async sendMessage(sectionName) {
        console.log(`Blood Test - Send Message clicked for section: ${sectionName}`);

        try {
            // Get selected tests from the current section
            const selectedTestIds = Array.from(this.selectedTests[sectionName]);
            const sectionData = this.sectionData[sectionName];

            if (selectedTestIds.length === 0) {
                this.showSectionMessage(sectionName, 'Please select at least one test to send messages', 'warning');
                return;
            }

            // Collect patient data for selected tests
            const selectedTests = selectedTestIds.map(testId => {
                return sectionData.find(test => test.id.toString() === testId.toString());
            }).filter(test => test !== undefined);

            console.log('Blood Test - Selected tests for messaging:', selectedTests);

            // Prepare message data structure for future WhatsApp API integration
            const messageData = {
                module: 'blood-test',
                section: sectionName,
                recipients: selectedTests.map(test => ({
                    name: test.name,
                    phone: test.phone,
                    iycNumber: test.iycNumber,
                    testName: test.testName,
                    date: test.date,
                    referredBy: test.referredBy
                })),
                messageTemplate: this.getMessageTemplate(sectionName),
                timestamp: new Date().toISOString()
            };

            console.log('Blood Test - Message data prepared:', messageData);

            // TODO: Replace this placeholder with actual WhatsApp API call
            // Example: await whatsappAPI.sendBulkMessages(messageData);

            // Placeholder success message
            this.showSectionMessage(
                sectionName,
                `Message sending prepared for ${selectedTests.length} patient(s). WhatsApp API integration pending.`,
                'info'
            );

            // Log for future development
            console.log('Blood Test - WhatsApp API integration point - messageData ready:', messageData);

        } catch (error) {
            console.error('Blood Test - Error in sendMessage:', error);
            this.showSectionMessage(sectionName, 'Error preparing message data: ' + error.message, 'error');
        }
    }

    // Get message template based on section (placeholder for future customization)
    getMessageTemplate(sectionName) {
        const templates = {
            'upcoming-test': {
                subject: 'Blood Test Reminder',
                body: 'Dear {name}, this is a reminder for your upcoming blood test ({testName}) scheduled for {date}. Please arrive 15 minutes early. Referred by: {referredBy}. IYC: {iycNumber}'
            },
            'pending-review': {
                subject: 'Blood Test Results Ready',
                body: 'Dear {name}, your blood test results ({testName}) are ready for review. Please contact us to schedule a consultation. Referred by: {referredBy}. IYC: {iycNumber}'
            }
        };

        return templates[sectionName] || {
            subject: 'Blood Test Update',
            body: 'Dear {name}, we have an update regarding your blood test ({testName}). Please contact us for more information. IYC: {iycNumber}'
        };
    }
}

// Create global blood test manager instance
const bloodTestManager = new BloodTestManager();

// Test function for debugging
window.testBloodTestAPI = async function() {
    console.log('Testing Blood Test API...');
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
