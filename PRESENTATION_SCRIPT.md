# Video Demonstration Script: Pickleball Court Reservation & Management System

## 📋 Video Recording Guide & Checklist

- **Target Duration:** 5 to 8 minutes
- **Recommended Resolution:** 1080p (Full HD) at 60 FPS
- **Audio:** Clear microphone with minimal background noise
- **Pre-Recording Setup:**
  1. Have browser open with two tabs:
     - Tab 1: Customer booking page (http://localhost:3000)
     - Tab 2: Admin Dashboard (http://localhost:3000/manage)
  2. Have VS Code open to key files:
     - `src/actions/reservations.js` (Server Actions, business logic & concurrency control)
     - `src/app/book/payment/page.jsx` or `src/app/book/time/page.jsx`
     - `package.json` (dependencies & tech stack)
  3. Turn on "Do Not Disturb" on Windows to prevent popups.

---

## 🎬 Presentation Script

---

### PART 1: Introduction & System Overview (~45 seconds)

**[Visual Action]:**
- Start on the Landing Page (`/`).
- Show the hero section, court reservation banner, and clean layout.

**[Spoken Script]:**
"Good day, everyone! My name is [Your Full Name], and today I am proud to present my project: the Pickleball Court Reservation and Management System.

As pickleball continues to grow rapidly in popularity, sports facilities often struggle with manual bookings, double-booking errors, and untracked payments. To solve this, I designed and developed an end-to-end web application that delivers a seamless booking experience for players, paired with a comprehensive administrative portal for facility owners.

In this demonstration, I will walk you through our live user experience, the admin management dashboard, our code architecture, and the technologies powering this system. Let’s dive in!"

---

### PART 2: Live System Demo - Customer Booking Flow (~2 to 2.5 minutes)

**[Visual Action]:**
- Scroll through the landing page highlighting features, courts preview, and testimonials.
- Click "Book a Court" or "Reserve Now".

**[Spoken Script]:**
"First, let's explore the customer-facing interface.

As you can see, our landing page features a modern, responsive UI design built with clean typography, dynamic badge indicators, and high contrast accents.

When a customer wants to reserve a court, they click 'Book a Court', which launches our guided multi-step booking flow."

---

**[Visual Action]:**
- Navigate to Court Selection (`/book/court`).
- Hover over court options and select one (e.g., Court 1).

**[Spoken Script]:**
"Step 1 is Court Selection. The system fetches all active courts directly from our database. Each court card displays key information like surface type, lighting, and hourly rates.

Let's select Court 1 and proceed to time slot selection."

---

**[Visual Action]:**
- Show the Date Picker and Time Slot grid (`/book/time`).
- Select a date (today or tomorrow).
- Show the available time buttons and click a time slot (e.g., 5:00 PM).

**[Spoken Script]:**
"Step 2 is Date and Time Scheduling. Here, we have an interactive calendar and real-time availability checker.

The system queries the database for existing confirmed bookings and maintenance blocks. It automatically disables already-booked slots to prevent double bookings, ensuring strict concurrency control. Let’s pick an available 1-hour slot at 5:00 PM."

---

**[Visual Action]:**
- Proceed to Customer Details (`/book/details`).
- Fill in a test name, email address, phone number, and player count.

**[Spoken Script]:**
"Step 3 is Customer Information. We collect the customer's full name, email address, phone number, and player count.

Notice our form validation handled via Zod and React Hook Form. If any field is invalid or missing, informative feedback appears instantly without page reloads."

---

**[Visual Action]:**
- Move to Booking Summary & Payment (`/book/summary` and `/book/payment`).
- Show the pricing breakdown and payment methods (PayMongo checkout / QR Ph / GCash / Card).

**[Spoken Script]:**
"Step 4 is the Booking Summary. The customer gets a transparent breakdown of their reservation: the court, date, timeslot duration, and total cost.

Moving to payment, the platform supports integrated digital payment gateways via PayMongo, allowing customers to pay through GCash, QR Ph, or credit card.

Once the payment is submitted, the transaction updates the booking status to confirmed and triggers an automated confirmation email with their reservation reference code via Nodemailer."

---

### PART 3: Admin Management Dashboard (~1.5 minutes)

**[Visual Action]:**
- Switch to Tab 2: Admin Dashboard (`/manage`).
- Show the KPI cards (Revenue, Total Bookings, Occupancy Rate) and the Recharts graphs.

**[Spoken Script]:**
"Now, let's switch hats and look at the Administrative Management Portal.

Upon logging into the management route, facility operators are greeted by an analytics overview dashboard. Using Recharts, admins can monitor revenue trends, total bookings, occupancy rates, and active players in real time."

---

**[Visual Action]:**
- Click through the sidebar:
  1. **Calendar** (`/manage/calendar`)
  2. **Reservations** (`/manage/reservations`)
  3. **Courts** (`/manage/courts`)
  4. **Settings** (`/manage/settings`)

**[Spoken Script]:**
"From the sidebar, admins have full operational control:
- The Calendar View gives a bird's-eye schedule of all court bookings across days and weeks.
- The Reservations Table allows staff to filter bookings, confirm payments, perform player check-ins, or cancel reservations with automated notification emails.
- The Courts & Settings tabs allow administrators to configure operating hours, adjust hourly pricing, and block specific courts for maintenance or tournaments.

All database operations execute with optimistic UI updates and toast notifications powered by Sonner for an ultra-responsive management experience."

---

### PART 4: Code Walkthrough, Efficiency & Architecture (~1.5 minutes)

**[Visual Action]:**
- Switch to VS Code.
- Show the project file structure in the file explorer.
- Open `src/actions/reservations.js` (highlight `'use server'`, `getActiveCourts`, and `getAvailableTimeSlots`).

**[Spoken Script]:**
"Now, let's examine the code architecture and engineering practices behind this system.

The application is built on Next.js 16 with React 19 using the modern App Router architecture.

In `src/actions/reservations.js`, you can observe our use of Next.js Server Actions indicated by the 'use server' directive.

Using Server Actions provides three major benefits:
1. Security: Sensitive database credentials and payment API keys never leak to the client browser.
2. Code Readability: Client components call these async server functions like regular JavaScript functions without writing verbose boilerplate fetch handlers.
3. Efficiency: Look at our `getAvailableTimeSlots` function. Instead of fetching the entire reservation history, we run targeted queries filtered by `court_id`, `reservation_date`, and active status. This keeps our queries fast and scalable even with thousands of records.

For our database layer, we utilize Supabase with PostgreSQL, giving us strict relational schemas, role-based policies, and fast execution."

---

**[Visual Action]:**
- Open `src/lib/paymongo.js` or `src/lib/email.js`.
- Open a UI component or `src/app/globals.css`.

**[Spoken Script]:**
"For modularity:
- Third-party integrations such as PayMongo payment processing and Nodemailer email dispatching are isolated in `src/lib/`, ensuring clean separation of concerns.
- On the UI side, the frontend leverages Tailwind CSS v4 paired with accessible primitive UI components from shadcn/ui and Base UI, guaranteeing consistent design tokens, sleek aesthetics, and accessible keyboard navigation."

---

### PART 5: Resources & Tech Stack Summary (~30 seconds)

**[Visual Action]:**
- Open `package.json` and highlight the dependencies list.

**[Spoken Script]:**
"To summarize the core resources and technologies utilized:
- Framework: Next.js 16 & React 19
- Styling & Components: Tailwind CSS v4, Lucide Icons, and shadcn/ui
- Backend & Database: Supabase (PostgreSQL & SSR auth client)
- Payments & Notifications: PayMongo API & Nodemailer
- Form Management & Validation: React Hook Form & Zod
- Data Visualization: Recharts"

---

### PART 6: Conclusion & Closing (~20 seconds)

**[Visual Action]:**
- Switch back to the browser showing the landing page or admin dashboard.

**[Spoken Script]:**
"In summary, this Pickleball Reservation and Management System demonstrates a clean and intuitive UI, efficient server-side architecture, robust data validation, and real-world payment and notification workflows.

Thank you very much for your time and consideration. Have a great day!"

---

## 📤 Google Drive Submission Checklist

1. Record your screen and voice following this script.
2. Save your video file (e.g., `Pickleball_System_Demonstration_[YourName].mp4`).
3. Upload the video to your **Google Drive**.
4. Right-click the file in Google Drive -> **Share** -> **General access**:
   - Change from **Restricted** to **"Anyone with the link"**.
   - Set the role to **"Viewer"**.
5. Copy the link and test it in an **Incognito / Private window** to make sure it plays without requiring a Google sign-in.
