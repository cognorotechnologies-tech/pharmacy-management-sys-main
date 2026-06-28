# MVP Initial Data Requirements

> A comprehensive guide to the initial data required to test the Pharmacy Management System MVP.

To fully test the MVP (Minimum Viable Product) workflows including POS, Inventory Management, Purchasing, and Clinical features, the database needs to be seeded with specific records. 

Below is the structured breakdown of the required initial data categorized by module.

---

## 1. Core Configuration

### Branches
At least one active branch is required for users to log in and perform actions.

| Name | Address | Phone | Email | License Number |
| :--- | :--- | :--- | :--- | :--- |
| Main Pharmacy | 123 Health Ave, City, ST 12345 | 555-0100 | main@pharmacy.com | PHARM-001 |

### Users (Profiles & Roles)
Test accounts for each distinct role to verify permissions and workflows. They should be assigned to the "Main Pharmacy" branch.

| Role | Email | Password | Full Name | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `super_admin` | superadmin@pharmacy.com | `Test@123` | System Admin | Global configuration, branch management, and system-wide reports. |
| `admin` | admin@pharmacy.com | `Test@123` | Branch Manager | Branch-level reporting, overrides, and setting management. |
| `pharmacist` | pharmacist@pharmacy.com | `Test@123` | Clinical Rx | Verifying and dispensing prescriptions, clinical overrides. |
| `cashier` | cashier@pharmacy.com | `Test@123` | Front Desk POS | Managing shifts, processing sales, and cart checkouts. |
| `inventory_staff` | inventory@pharmacy.com | `Test@123` | Stock Manager | Creating purchase orders, receiving stock, and stock adjustments. |

---

## 2. Inventory & Purchasing Module

### Suppliers
Vendors required to create Purchase Orders (POs) and receive stock.

| Name | Contact Person | Email | Phone |
| :--- | :--- | :--- | :--- |
| MedSupply Co. | John Doe | orders@medsupply.com | 555-0200 |
| PharmaDistributors | Jane Smith | sales@pharmadist.com | 555-0201 |

### Products
A diverse set of medicinal and retail products to test different behaviors (e.g., prescriptions, OTC, low stock warnings).

| Product Name | Generic Name | Category | Rx Required | Min Stock | Price |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Paracetamol 500mg | Acetaminophen | OTC | No | 50 | $5.00 |
| Amoxicillin 250mg | Amoxicillin | Antibiotic | Yes | 20 | $15.00 |
| Asthma Inhaler | Albuterol | Respiratory | Yes | 10 | $45.00 |
| Vitamin C 1000mg | Ascorbic Acid | Supplement| No | 30 | $12.00 |

### Initial Stock (Inventory & Batches)
Stock levels mapped to the products above to test sales, stock adjustments, and expiry alerts.

| Product | Batch Number | Expiry Date | Qty On Hand | Cost Price | Selling Price |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Paracetamol 500mg | BATCH-PARA-001 | 2027-12-31 | 150 | $2.00 | $5.00 |
| Amoxicillin 250mg | BATCH-AMOX-001 | 2026-06-30 | 5 | $8.00 | $15.00 | *(Low Stock Test)*
| Asthma Inhaler | BATCH-INHL-001 | 2025-01-15 | 20 | $30.00 | $45.00 | *(Expired/Expiring Test)*

---

## 3. Clinical & Sales Module

### Insurance Plans
Data to test the insurance split-payment workflows in POS.

| Plan Name | Provider Name | Coverage % | Copay Amount |
| :--- | :--- | :--- | :--- |
| Blue HMO Basic | Blue Health Co. | 80% | $15.00 |
| Shield PPO Plus | Shield Medical | 90% | null (Calculated) |

### Patients
Sample patients to test Prescription (Rx) creation, Dispensing, and Sales History.

| First Name | Last Name | Date of Birth | Phone | Allergies | Insurance Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Alice | Walker | 1985-04-12 | 555-0301 | Penicillin | Blue HMO Basic |
| Bob | Miller | 1990-11-05 | 555-0302 | None | Shield PPO Plus |

### Prescriptions (Optional but Recommended)
Pre-populated medical orders for the `pharmacist` to verify and the `cashier` to attach to sales.

| Patient | Prescriber | Product | Qty | Dosage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Alice Walker | Dr. Smith | Amoxicillin 250mg | 14 | 1 pill, 2x day | `pending_verification` |
| Bob Miller | Dr. Adams | Asthma Inhaler | 2 | 2 puffs PRN | `verified` |

---

## Summary of Usage Flow with Data

1. **Shift Management:** `cashier` logs into `Main Pharmacy`, opens a shift with $100 float.
2. **Sales/POS:** `cashier` adds `Paracetamol` and `Asthma Inhaler` to cart for patient `Bob Miller`. Identifies stock warnings for Inhaler (`BATCH-INHL-001`).
3. **Insurance:** Applies `Bob Miller`'s `Shield PPO Plus` plan. Checks calculated copay values.
4. **Clinical:** `pharmacist` logs in, views `Alice Walker`'s prescription, verifies it, and dispenses it using `BATCH-AMOX-001`.
5. **Inventory:** `inventory_staff` sees `Amoxicillin` is below `Min Stock (20)`. Creates a Purchase Order for `MedSupply Co.` to buy more.

> **Testing Recommendation:** Ensure your Supabase `seed.sql` script creates these absolute minimums. This guarantees all features of the MVP can be tested from end-to-end without users encountering empty screens or validation blockers!
