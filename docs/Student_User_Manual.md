# Student User Manual

This guide explains how Students use the Biocella WebApp features.

**Quick Start**

- Deployed site (for test runs): https://biocella.dcism.org — see `docs/Test_Environment.md` for test-account guidance.

- Sign in via the main `Login` page. Students are redirected to the Collections view.

**Dashboard & Navigation**
- Default landing: Collections (`UsersUI/UsersDashBoard/Features/UserCollection`).
- Menu includes: Collection, Inventory, Appointments, Profile, Logout.
- Logout clears client auth and redirects to `/Login`.

**1) Collection**
- Purpose: Browse published specimens and projects.
- Entry: `UsersUI/UsersDashBoard/Features/UserCollection`.
- Notes:
  - Students see only published specimens (client filters by `publish_status === 'published'`).
  - You can view specimen details at `/UsersUI/UsersDashBoard/Features/UserCollection/specimen/[id]`.
  - Add/Edit specimen and projects are available in the UI; success messages: "Specimen added successfully! QR code has been generated." and "Project created successfully!".

**2) Inventory**
- Purpose: View inventory items and batch details relevant to users.
- Entry: `UsersUI/UsersDashBoard/Features/UserInventory`.
- Actions: view batches, view batch pages, and (where allowed) request or view chemical information.
- Common UI errors: "Failed to fetch chemicals", generic network errors.

**3) Appointments (Booking)**
- Purpose: Book and view appointments (book via calendar UI).
- Entry: `UsersUI/UsersDashBoard/Features/UserAppointment`.
- Book flow:
  - Click "Book Appointment" → select department, date, time, and purpose → Confirm Request.
  - Date must be >= tomorrow. Blocked dates (Sunday or admin-blocked) are rejected.
  - Time conflicts are detected; messages include:
    - "Please select a date and time."
    - "Selected date is unavailable. Please pick another day."
    - "That time slot is already taken. Please choose another time."
    - "Failed to create appointment"
- Appointments show in tabs: Pending, Approved & Ongoing, Denied, Visited.

**4) Profile**
- Purpose: View and edit your profile details and upload profile photo.
- Entry: `UsersUI/UsersDashBoard/Features/UserProfile`.
- Common messages: "Loading profile...", "Failed to load profile.", "Failed to update profile.", "Failed to upload profile photo."

**Common Client Behaviors**
- Redirects: Students and Faculty are routed to the Collection view by `redirectByRole`.
- Loading indicators: "Loading...", "Loading specimens...".
- API examples used:
  - `GET ${API_URL}/microbials` (collection)
  - `GET ${API_URL}/projects`
  - `POST ${API_URL}/appointments` (book)

**Message Catalog (from UsersUI)**
- Info / Loading:
  - "Loading..."
  - "Loading specimens..."
  - "Loading profile..."
- Success:
  - "Specimen added successfully! QR code has been generated."
  - "Project created successfully!"
  - "Specimen deleted successfully!"
- Validation / Input:
  - "Please select a date and time."
  - "Error: Specimen ID is missing"
- Errors / Failures:
  - "Failed to fetch specimens"
  - "Failed to fetch chemicals"
  - "Failed to create appointment"
  - "Failed to delete specimen"
  - "Connection error. Please check your network."

**Developer Notes**
- Students use the shared `UsersUI` routes; behavior is identical for `faculty` unless role-based backend checks differ.
- If the UI shows network errors, verify `API_URL` and backend server availability.

---
Generated from code inspection of `WebApp/src/app/UsersUI` on April 28, 2026.
