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
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePatientRegistration();
            });
        }
    }

    // Setup form validation
    setupFormValidation() {
        const requiredFields = ['patientName', 'patientEmail', 'patientPhone', 'patientCategory'];

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
        const requiredFields = ['patientName', 'patientEmail', 'patientPhone', 'patientCategory'];
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
                { value: 'Guest', text: 'Guest' }
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
                { value: 'Guest', text: 'Guest' }
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
        if (!this.validateForm()) {
            this.showNotification('Please select patient type and fill in all required fields correctly', 'error');
            return;
        }

        // Collect form data - only fields that exist in Patient Database
        const form = document.getElementById('registerPatientForm');
        const patientData = {
            name: document.getElementById('patientName').value.trim(),
            iyc: document.getElementById('patientIYC').value.trim(),
            email: document.getElementById('patientEmail').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            category: document.getElementById('patientCategory').value.trim(),
            emergencyContact: document.getElementById('emergencyContact').value.trim(),
            patientType: document.querySelector('input[name="patientType"]:checked')?.value || ''
        };

        console.log('=== PATIENT REGISTRATION DEBUG ===');
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

            // Refresh patient data
            await this.loadPatientData();

        } catch (error) {
            console.error('Error registering patient:', error);
            this.hideLoadingOverlay();
            this.showNotification('Failed to register patient. Please try again.', 'error');
        }
    }

    // Clear the registration form
    clearForm() {
        const form = document.getElementById('registerPatientForm');
        if (form) {
            form.reset();

            // Remove error styling
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                field.classList.remove('error');
            });

            this.isFormValid = false;
            this.formTouched = false; // Reset touched state
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

                // Debounce search
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.performPatientSearch(query);
                }, 300);
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

    // Perform search on patient data
    performPatientSearch(query) {
        if (query === '') {
            this.filteredPatients = [...this.patients];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredPatients = this.patients.filter(patient => {
                return (
                    (patient.iycNumber && patient.iycNumber.toLowerCase().includes(searchTerm)) ||
                    (patient.name && patient.name.toLowerCase().includes(searchTerm)) ||
                    (patient.phone && patient.phone.toLowerCase().includes(searchTerm)) ||
                    (patient.category && patient.category.toLowerCase().includes(searchTerm))
                );
            });
        }
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

        // Clear existing rows
        tbody.innerHTML = '';

        if (this.filteredPatients.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="4">No patients found</td>
                </tr>
            `;
            return;
        }

        // Create rows for each patient
        this.filteredPatients.forEach(patient => {
            const row = this.createPatientRow(patient);
            tbody.appendChild(row);
        });

        console.log(`Rendered ${this.filteredPatients.length} patients in table`);
    }

    // Create a patient row element
    createPatientRow(patient) {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${patient.iycNumber || 'N/A'}</td>
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.phone || 'N/A'}</td>
            <td>${patient.category || 'N/A'}</td>
        `;

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
        const fields = ['patientName', 'patientEmail', 'patientPhone', 'patientIYC', 'patientCategory', 'emergencyContact'];
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
const registerPatientManager = new RegisterPatientManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        registerPatientManager.init();
    });
} else {
    registerPatientManager.init();
}

console.log('✅ Register Patient module loaded successfully');
