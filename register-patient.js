// Register Patient Module
console.log('Loading register-patient.js...');

class RegisterPatientManager {
    constructor() {
        this.currentSection = 'new-patient';
        this.formData = {};
        this.isFormValid = false;
        this.patients = [];
        this.filteredPatients = [];
        this.formTouched = false; // Track if user has interacted with the form
        this.isSubmitting = false; // Track if form submission is in progress
    }

    // Initialize the register patient module
    init() {
        console.log('Register Patient - Initializing module...');

        // Ensure DOM is ready before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }

        console.log('Register Patient - Module initialized successfully');
    }

    // Setup all event listeners
    setupEventListeners() {
        this.setupSidebarNavigation();
        this.setupPatientForm();
        this.setupFormValidation();
        this.setupPatientListFunctionality();
    }

    // Setup sidebar navigation
    setupSidebarNavigation() {
        const sidebarItems = document.querySelectorAll('#register-patient-module .sidebar-item');

        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    // Switch between sections
    switchSection(sectionName) {
        // Save current form state before switching (if coming from new-patient section)
        if (this.currentSection === 'new-patient') {
            this.saveFormState();
        }

        // Update sidebar active state
        const sidebarItems = document.querySelectorAll('#register-patient-module .sidebar-item');
        sidebarItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`#register-patient-module .sidebar-item[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Hide all sections
        const sections = document.querySelectorAll('#register-patient-module .section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`register-${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load data for specific sections
        if (sectionName === 'patient-list') {
            this.loadPatientData();
        } else if (sectionName === 'new-patient') {
            // Restore form state when returning to new-patient section
            this.restoreFormState();
        }

        console.log(`Switched to section: ${sectionName}`);
    }

    // Setup patient registration form
    setupPatientForm() {
        const form = document.getElementById('registerPatientForm');
        if (form && !form.hasAttribute('data-listener-attached')) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePatientRegistration();
            });
            form.setAttribute('data-listener-attached', 'true');
        }
    }

    // Setup form validation
    setupFormValidation() {
        const requiredFields = ['patientName', 'patientEmail', 'patientPhone', 'patientCategory', 'patientAge', 'patientDepartment'];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.formTouched = true;
                    this.validateForm();
                });
                field.addEventListener('blur', () => {
                    this.formTouched = true;
                    this.validateField(field);
                });
            }
        });

        // Add special handling for category field to auto-fill Samskriti details
        const categoryField = document.getElementById('patientCategory');
        if (categoryField) {
            categoryField.addEventListener('change', () => {
                this.handleCategoryChange(categoryField.value);
                this.formTouched = true;
                this.validateForm();
            });
        }

        // Add validation for patient type radio buttons
        const patientTypeRadios = document.querySelectorAll('input[name="patientType"]');
        patientTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.formTouched = true;
                this.handlePatientTypeChange(radio.value);
                this.validateForm();
            });
        });

        // Add validation for IYC field
        const iycField = document.getElementById('patientIYC');
        if (iycField) {
            iycField.addEventListener('input', () => {
                this.formTouched = true;
                this.validateForm();
            });
            iycField.addEventListener('blur', () => {
                this.formTouched = true;
                this.validateField(iycField);
            });
        }
    }

    // Validate individual field
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;

        // Remove existing error styling
        field.classList.remove('error');

        // Validate based on field type
        let isValid = true;

        if (field.required && !value) {
            isValid = false;
        } else if (fieldName === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(value);
        } else if (fieldName === 'phone' && value) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            isValid = phoneRegex.test(value) && value.length >= 10;
        } else if (fieldName === 'iyc' && field.required && !value) {
            // Special validation for IYC when it's required (Poornanga patients)
            isValid = false;
        }

        // Only show error styling if form has been touched
        if (!isValid && this.formTouched) {
            field.classList.add('error');
        }

        return isValid;
    }

    // Validate entire form
    validateForm() {
        const requiredFields = ['patientName', 'patientEmail', 'patientPhone', 'patientCategory', 'patientAge', 'patientDepartment'];
        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });

        // Validate patient type selection
        const patientTypeSelected = document.querySelector('input[name="patientType"]:checked');
        if (!patientTypeSelected) {
            isValid = false;
        } else {
            // Validate IYC field based on patient type
            const iycField = document.getElementById('patientIYC');
            if (patientTypeSelected.value === 'poornanga' && iycField) {
                // For Poornanga, IYC is mandatory
                if (!this.validateField(iycField)) {
                    isValid = false;
                }
            }
        }

        this.isFormValid = isValid;

        // Update submit button state
        const submitButton = document.querySelector('#registerPatientForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = !isValid;
        }

        return isValid;
    }

    // Handle patient type change
    handlePatientTypeChange(patientType) {
        console.log('Patient type selected:', patientType);

        const iycField = document.getElementById('patientIYC');
        const categoryField = document.getElementById('patientCategory');
        const iycLabel = document.querySelector('label[for="patientIYC"]');

        if (patientType === 'poornanga') {
            // Poornanga: IYC mandatory, Category options include FTV
            if (iycField) {
                iycField.required = true;
                iycField.placeholder = 'Enter IYC Number';
                iycField.value = '';
                iycField.readOnly = false;
            }

            if (categoryField) {
                this.updateCategoryOptions('poornanga');
                categoryField.value = 'FTV'; // Pre-select FTV for Poornanga
                categoryField.disabled = false;
                categoryField.required = true;
            }

            if (iycLabel) {
                iycLabel.innerHTML = 'IYC Number *';
            }

        } else if (patientType === 'non-poornanga') {
            // Non-Poornanga: Auto-generate ID, Category options exclude FTV
            if (iycField) {
                iycField.required = false;
                iycField.placeholder = 'Auto-generated ID';
                iycField.readOnly = true;
                this.generateAutoId();
            }

            if (categoryField) {
                this.updateCategoryOptions('non-poornanga');
                categoryField.value = '';
                categoryField.disabled = false;
                categoryField.required = true;
            }

            if (iycLabel) {
                iycLabel.innerHTML = 'Patient ID';
            }
        }

        // Revalidate form after changes
        this.validateForm();
    }

    // Handle category change for special cases like Samskriti
    handleCategoryChange(category) {
        console.log('Category selected:', category);

        const emailField = document.getElementById('patientEmail');
        const phoneField = document.getElementById('patientPhone');
        const departmentField = document.getElementById('patientDepartment');

        if (category === 'Samskriti') {
            // Auto-fill Samskriti contact details
            if (emailField) {
                emailField.value = 'samaskriti.office@ishafoundation.com';
                emailField.readOnly = true;
                emailField.style.backgroundColor = '#f0f0f0';
            }

            if (phoneField) {
                phoneField.value = '8870871357';
                phoneField.readOnly = true;
                phoneField.style.backgroundColor = '#f0f0f0';
            }

            if (departmentField) {
                departmentField.value = 'Samskriti';
                departmentField.readOnly = true;
                departmentField.style.backgroundColor = '#f0f0f0';
            }
        } else {
            // Reset fields for other categories
            if (emailField) {
                emailField.readOnly = false;
                emailField.style.backgroundColor = '';
                // Only clear if it was the Samskriti email
                if (emailField.value === 'samaskriti.office@ishafoundation.com') {
                    emailField.value = '';
                }
            }

            if (phoneField) {
                phoneField.readOnly = false;
                phoneField.style.backgroundColor = '';
                // Only clear if it was the Samskriti phone
                if (phoneField.value === '8870871357') {
                    phoneField.value = '';
                }
            }

            if (departmentField) {
                departmentField.readOnly = false;
                departmentField.style.backgroundColor = '';
                // Only clear if it was the Samskriti department
                if (departmentField.value === 'Samskriti') {
                    departmentField.value = '';
                }
            }
        }

        // Revalidate form after changes
        this.validateForm();
    }

    // Update category options based on patient type
    updateCategoryOptions(patientType) {
        const categoryField = document.getElementById('patientCategory');
        if (!categoryField) return;

        // Clear existing options except the first one (Select Category)
        categoryField.innerHTML = '<option value="">Select Category</option>';

        if (patientType === 'poornanga') {
            // Poornanga patients can select FTV + other categories
            const poornangaOptions = [
                { value: 'FTV', text: 'FTV' },
                { value: 'STV', text: 'STV' },
                { value: 'LTV', text: 'LTV' },
                { value: 'Staff', text: 'Staff' },
                { value: 'Sevadar', text: 'Sevadar' },
                { value: 'Samskriti', text: 'Samskriti' },
                { value: 'Guest', text: 'Guest' },
                { value: 'SPD', text: 'SPD' }
            ];

            poornangaOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                categoryField.appendChild(optionElement);
            });

        } else if (patientType === 'non-poornanga') {
            // Non-Poornanga patients cannot select FTV
            const nonPoornangaOptions = [
                { value: 'STV', text: 'STV' },
                { value: 'LTV', text: 'LTV' },
                { value: 'Staff', text: 'Staff' },
                { value: 'Sevadar', text: 'Sevadar' },
                { value: 'Samskriti', text: 'Samskriti' },
                { value: 'Guest', text: 'Guest' },
                { value: 'SPD', text: 'SPD' }
            ];

            nonPoornangaOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                categoryField.appendChild(optionElement);
            });
        }
    }

    // Generate auto ID for non-poornanga patients
    async generateAutoId() {
        try {
            console.log('Generating auto ID for non-poornanga patient...');

            // Get the next available ID from server
            const response = await fetch('/api/next-patient-id');
            if (response.ok) {
                const data = await response.json();
                console.log('Server response:', data);

                if (data.success && data.nextId) {
                    const nextId = data.nextId;
                    console.log('Setting auto-generated ID:', nextId);

                    const iycField = document.getElementById('patientIYC');
                    if (iycField) {
                        iycField.value = nextId;
                    }
                } else {
                    throw new Error('Server did not return a valid ID');
                }
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error generating auto ID:', error);

            // Show error to user instead of using random fallback
            this.showNotification('Failed to generate patient ID. Please try again.', 'error');

            // Clear the field instead of setting random ID
            const iycField = document.getElementById('patientIYC');
            if (iycField) {
                iycField.value = '';
                iycField.placeholder = 'Error generating ID - please try again';
            }
        }
    }

    // Handle patient registration
    async handlePatientRegistration() {
        // Prevent multiple submissions
        if (this.isSubmitting) {
            console.log('Form submission already in progress, ignoring duplicate request');
            return;
        }

        if (!this.validateForm()) {
            this.showNotification('Please select patient type and fill in all required fields correctly', 'error');
            return;
        }

        // Set submission flag and disable submit button
        this.isSubmitting = true;
        const submitButton = document.querySelector('#registerPatientForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        }

        // Collect form data - only fields that exist in Patient Database
        const patientData = {
            name: document.getElementById('patientName').value.trim(),
            iyc: document.getElementById('patientIYC').value.trim(),
            email: document.getElementById('patientEmail').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            category: document.getElementById('patientCategory').value.trim(),
            age: document.getElementById('patientAge').value.trim(),
            department: document.getElementById('patientDepartment').value.trim(),
            emergencyContact: document.getElementById('emergencyContact').value.trim(),
            patientType: document.querySelector('input[name="patientType"]:checked')?.value || ''
        };

        console.log('=== PATIENT REGISTRATION DEBUG ===');
        console.log('Submission timestamp:', new Date().toISOString());
        console.log('Is submitting flag:', this.isSubmitting);
        console.log('Form validation passed:', this.validateForm());
        console.log('Patient data being sent:', patientData);
        console.log('Required fields check:');
        console.log('- name:', patientData.name ? '✓' : '✗');
        console.log('- email:', patientData.email ? '✓' : '✗');
        console.log('- phone:', patientData.phone ? '✓' : '✗');
        console.log('- category:', patientData.category ? '✓' : '✗');
        console.log('- patientType:', patientData.patientType ? '✓' : '✗');
        console.log('- iyc:', patientData.iyc ? '✓' : '✗');

        try {
            this.showLoadingOverlay('Registering patient...');

            // Send data to server
            const response = await fetch('/api/register-patient', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patientData)
            });

            console.log('Server response status:', response.status);
            console.log('Server response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Server success response:', result);

            this.hideLoadingOverlay();
            this.showNotification('Patient registered successfully!', 'success');
            this.clearForm();

            // Refresh patient data to show the newly registered patient at the top
            await this.loadPatientData();

            // If we're currently viewing the patient list, ensure it's updated
            if (this.currentSection === 'patient-list') {
                console.log('Refreshing patient list view after registration');
            }

        } catch (error) {
            console.error('Error registering patient:', error);
            this.hideLoadingOverlay();
            this.showNotification('Failed to register patient. Please try again.', 'error');
        } finally {
            // Reset submission flag and restore submit button
            this.isSubmitting = false;
            const submitButton = document.querySelector('#registerPatientForm button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Register Patient';
            }
        }
    }

    // Clear the registration form
    clearForm() {
        const form = document.getElementById('registerPatientForm');
        if (form) {
            form.reset();

            // Remove error styling and reset field properties
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                field.classList.remove('error');
                // Reset readonly state and background color for all fields
                field.readOnly = false;
                field.style.backgroundColor = '';
            });

            // Reset IYC field properties (will be set correctly when patient type is selected)
            const iycField = document.getElementById('patientIYC');
            if (iycField) {
                iycField.placeholder = '';
                iycField.required = false;
            }

            this.isFormValid = false;
            this.formTouched = false; // Reset touched state
            this.isSubmitting = false; // Reset submission flag
            this.validateForm();
        }
    }

    // Setup patient list functionality
    setupPatientListFunctionality() {
        // Setup search functionality
        const searchInput = document.getElementById('searchPatientList');
        const clearBtn = document.getElementById('clearSearchPatientList');
        const refreshBtn = document.getElementById('refreshPatientListBtn');

        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();

                // Show/hide clear button
                if (clearBtn) {
                    if (query.length > 0) {
                        clearBtn.classList.add('visible');
                    } else {
                        clearBtn.classList.remove('visible');
                    }
                }

                // Debounce search to prevent rapid table updates
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.performPatientSearch(query);
                }, 150); // Reduced debounce time for better responsiveness
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    clearBtn.classList.remove('visible');
                    this.performPatientSearch('');
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadPatientData();
            });
        }
    }

    // Load patient data from server
    async loadPatientData() {
        try {
            console.log('Loading patient data...');
            this.showLoadingOverlay('Loading patient data...');

            const result = await googleSheetsAPI.getAllPatients();

            if (result && result.success) {
                this.patients = result.patients || [];
                // Sort patients to show recently registered ones first
                this.sortPatientsByRegistrationDate();
                this.filteredPatients = [...this.patients];
                console.log('Patient data loaded successfully:', this.patients.length, 'patients');
                this.renderPatientTable();
            } else {
                console.error('Failed to load patient data');
                this.patients = [];
                this.filteredPatients = [];
                this.renderPatientTable();
            }
        } catch (error) {
            console.error('Error loading patient data:', error);
            this.patients = [];
            this.filteredPatients = [];
            this.renderPatientTable();
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Sort patients by registration date (most recent first)
    sortPatientsByRegistrationDate() {
        this.patients.sort((a, b) => {
            // Primary sort: Use row index (higher row index = more recent registration)
            if (a.rowIndex && b.rowIndex) {
                const rowDiff = b.rowIndex - a.rowIndex;
                if (rowDiff !== 0) {
                    return rowDiff;
                }
            }

            // Secondary sort: For non-poornanga patients, sort by ID number
            // (higher ID numbers are more recent)
            if (a.iycNumber && b.iycNumber) {
                const aIsId = a.iycNumber.startsWith('ID');
                const bIsId = b.iycNumber.startsWith('ID');

                if (aIsId && bIsId) {
                    const aNum = parseInt(a.iycNumber.replace('ID', ''));
                    const bNum = parseInt(b.iycNumber.replace('ID', ''));
                    const idDiff = bNum - aNum;
                    if (idDiff !== 0) {
                        return idDiff;
                    }
                }
            }

            // Tertiary sort: Alphabetical by name
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }

            // Default: maintain original order
            return 0;
        });

        console.log(`Patients sorted by registration date (most recent first). Total: ${this.patients.length}`);
    }

    // Perform search on patient data
    performPatientSearch(query) {
        console.log('Performing patient search for:', query);

        // Ensure we have patient data to search
        if (!this.patients || this.patients.length === 0) {
            console.log('No patient data available for search');
            this.filteredPatients = [];
            this.renderPatientTable();
            return;
        }

        if (query === '') {
            this.filteredPatients = [...this.patients];
        } else {
            const searchTerm = query.toLowerCase().trim();
            this.filteredPatients = this.patients.filter(patient => {
                // Ensure patient object exists and has properties
                if (!patient) return false;

                return (
                    (patient.iycNumber && patient.iycNumber.toString().toLowerCase().includes(searchTerm)) ||
                    (patient.name && patient.name.toString().toLowerCase().includes(searchTerm)) ||
                    (patient.phone && patient.phone.toString().toLowerCase().includes(searchTerm)) ||
                    (patient.category && patient.category.toString().toLowerCase().includes(searchTerm))
                );
            });

            // Maintain the same sorting order for filtered results
            // (The original patients array is already sorted, so filtered results will maintain that order)
        }

        console.log(`Search results: ${this.filteredPatients.length} patients found`);
        this.renderPatientTable();
    }

    // Render patient table
    renderPatientTable() {
        const table = document.getElementById('patientListTable');
        if (!table) {
            console.error('Patient list table not found');
            return;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.error('Patient list table tbody not found');
            return;
        }

        // Use DocumentFragment for better performance and stability
        const fragment = document.createDocumentFragment();

        if (this.filteredPatients.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.className = 'no-data';
            noDataRow.innerHTML = '<td colspan="4">No patients found</td>';
            fragment.appendChild(noDataRow);
        } else {
            // Create rows for each patient
            this.filteredPatients.forEach(patient => {
                const row = this.createPatientRow(patient);
                fragment.appendChild(row);
            });
        }

        // Clear existing rows and append new ones in one operation
        tbody.innerHTML = '';
        tbody.appendChild(fragment);

        console.log(`Rendered ${this.filteredPatients.length} patients in table`);
    }

    // Create a patient row element
    createPatientRow(patient) {
        const row = document.createElement('tr');

        // Create cells individually for better control
        const iycCell = document.createElement('td');
        iycCell.textContent = patient.iycNumber || 'N/A';

        const nameCell = document.createElement('td');
        nameCell.textContent = patient.name || 'N/A';

        const phoneCell = document.createElement('td');
        phoneCell.textContent = patient.phone || 'N/A';

        const categoryCell = document.createElement('td');
        categoryCell.textContent = patient.category || 'N/A';

        // Append cells to row
        row.appendChild(iycCell);
        row.appendChild(nameCell);
        row.appendChild(phoneCell);
        row.appendChild(categoryCell);

        return row;
    }
    // Save current form state
    saveFormState() {
        const form = document.getElementById('registerPatientForm');
        if (!form) return;

        this.formData = {
            patientName: document.getElementById('patientName')?.value || '',
            patientEmail: document.getElementById('patientEmail')?.value || '',
            patientPhone: document.getElementById('patientPhone')?.value || '',
            patientIYC: document.getElementById('patientIYC')?.value || '',
            patientCategory: document.getElementById('patientCategory')?.value || '',
            patientAge: document.getElementById('patientAge')?.value || '',
            patientDepartment: document.getElementById('patientDepartment')?.value || '',
            emergencyContact: document.getElementById('emergencyContact')?.value || '',
            patientType: document.querySelector('input[name="patientType"]:checked')?.value || ''
        };

        console.log('Form state saved:', this.formData);
    }

    // Restore form state
    restoreFormState() {
        if (!this.formData || Object.keys(this.formData).length === 0) return;

        console.log('Restoring form state:', this.formData);

        // Restore text inputs
        const fields = ['patientName', 'patientEmail', 'patientPhone', 'patientIYC', 'patientCategory', 'patientAge', 'patientDepartment', 'emergencyContact'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && this.formData[fieldId]) {
                field.value = this.formData[fieldId];
            }
        });

        // Restore patient type radio button
        if (this.formData.patientType) {
            const radio = document.querySelector(`input[name="patientType"][value="${this.formData.patientType}"]`);
            if (radio) {
                radio.checked = true;
                // Trigger the change event to update form behavior
                this.handlePatientTypeChange(this.formData.patientType);
            }
        }

        // Restore category-specific behavior (like Samskriti auto-fill)
        if (this.formData.patientCategory) {
            setTimeout(() => {
                this.handleCategoryChange(this.formData.patientCategory);
            }, 100);
        }

        // Only revalidate form after restoration if it was previously touched
        if (this.formTouched) {
            setTimeout(() => {
                this.validateForm();
            }, 100);
        }
    }















    // Utility methods
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        if (overlay && messageEl) {
            messageEl.textContent = message;
            overlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize the register patient manager
let registerPatientManager;

// Ensure single initialization
if (!window.registerPatientManager) {
    registerPatientManager = new RegisterPatientManager();
    window.registerPatientManager = registerPatientManager;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            registerPatientManager.init();
        });
    } else {
        registerPatientManager.init();
    }
} else {
    registerPatientManager = window.registerPatientManager;
}

console.log('✅ Register Patient module loaded successfully');
