Quantex Estimator Tool

A modern, React-based project estimation and workflow management application designed for Quantex (formerly FirstBaseIT). This tool streamlines the process of creating, reviewing, and approving project cost estimates.

🚀 Features
Core Functionality
- Project Dashboard: Centralized view of all estimates with search, filtering, and status tracking.
- Detailed Estimation: Tabbed interface for breaking down costs:

		- Administration & Project Costs: Fixed day-rate items.
		- Service Menus: Fixed-price standard and API service items.
		- Time & Materials: Flexible T&M estimation.

- Automated Calculations: Real-time calculation of totals, days of effort, and contingency buffers.
- Workflow Engine: Structured status lifecycle:

		- Draft: Initial creation.
		- Pending SPOE Check: Triggered by the estimator (includes validation for empty cost sections).
		- Approved: Final approval by a Manager.

- Reporting: dedicated reporting module for viewing and exporting "Approved Estimates" within specific date ranges.
- Export: Generate CSV reports or copy formatted summary tables directly to the clipboard for emails/docs.

Technical Highlights
- Framework: Built with React and Vite for high performance.
- Styling: Tailwind CSS for a responsive, clean UI following the 60-30-10 color rule.
- Icons: Lucide React for consistent iconography.
- Persistence: Uses browser LocalStorage to persist data without a backend (portable design).

🛠️ Installation & Setup

To run this project locally on your machine:

	1. Prerequisites: Ensure you have Node.js installed.
	2. Clone the repository:
			git clone [https://github.com/YOUR_USERNAME/quantex-estimator.git](https://github.com/YOUR_USERNAME/quantex-estimator.git)
			cd quantex-estimator
	3. Install dependencies:
			npm install
	4. Start the development server:
			npm run dev
	5. Open your browser and navigate to the link shown (usually http://localhost:5173).

📖 Usage Guide

User Roles

The app simulates user roles (switchable in the Dashboard header for testing):

	Estimator: Can create projects and request SPOE checks.
	Manager: Can view pending reviews and approve SPOE requests.

The Workflow

	Create: An estimator starts a New Estimate.
	Populate: Fill in the Project Name, JIRA Ref, and line items across the various tabs.
	Validate: Click Request SPOE Check.
	Note: If specific cost sections are empty, a warning modal will appear asking for confirmation.
	Approve: A Manager logs in, filters the dashboard by "Pending Reviews," and clicks Approve SPOE.
	Edit/Revert: If an approved estimate is edited, it automatically reverts to Draft status, requiring re-approval.

📂 Project Structure

		quantex-estimator/
		├── public/              # Static assets (logo.png)
		├── src/
		│   ├── App.jsx          # Main Application Logic & Components
		│   ├── main.jsx         # Entry point
		│   └── index.css        # Global Tailwind styles
		├── index.html           # HTML template
		├── package.json         # Dependencies and scripts
		├── tailwind.config.js   # Tailwind configuration
		└── vite.config.js       # Vite configuration


📄 License

Internal Tool - Proprietary.
