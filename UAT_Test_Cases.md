# User Acceptance Testing (UAT) Cases

## 1. Authenticate User

### 1.1 Test Scenario #1 (i.e. User Authentication)
**1.1.1 Test Case #1 – (i.e. User Login - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | User Login – Normal State |
| **Requirement #:** | 1.1.1 – System shall allow registered users to log in with valid credentials. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Authentication Module |
| **Setup:** | • Obtain valid user credentials |
| **Procedure:** | 1. Launch application<br>2. Navigate to "Login"<br>3. Enter valid email and password<br>4. Click "Login" |
| **Expected Results:** | 1. User is successfully authenticated<br>2. Redirected to Main Dashboard |
| **Observed Results:** | User is successfully authenticated and redirected to Main Dashboard. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**1.1.2 Test Case #2 – (i.e. User Login - Error: Invalid Password)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | User Login – Error State (Invalid Password) |
| **Requirement #:** | 1.1.2 – System shall prevent login with incorrect credentials. |
| **Estimated Time (hours):** | 0.10 |
| **Object, Function or Procedure Under Test:** | Authentication Module - Validation |
| **Setup:** | • Obtain valid email, invalid password |
| **Procedure:** | 1. Navigate to "Login"<br>2. Enter valid email and incorrect password<br>3. Click "Login" |
| **Expected Results:** | 1. Login fails<br>2. Error message appears: "Invalid email or password" |
| **Observed Results:** | Login fails and Error message appears: "Invalid email or password". |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 2. Manage Users

### 2.1 Test Scenario #1 (i.e. User Management)
**2.1.1 Test Case #1 – (i.e. Add New User - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Add New User – Normal State |
| **Requirement #:** | 2.1.1 – System shall allow admin to add a new user and assign a role through the User Management Screen. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | User Management System |
| **Setup:** | • Obtain Administrator credentials |
| **Procedure:** | 1. Launch application and Login as Admin<br>2. Navigate to "User Management"<br>3. Click "Add New User"<br>4. Type new user's email, name, and select "Member" Role<br>5. Click "Save"<br>6. Logout and Login with new user's credentials |
| **Expected Results:** | 1. Add New User form appears<br>2. Form accepts input fields<br>3. System accepts new user, success message appears<br>4. New user can successfully login to Main Dashboard |
| **Observed Results:** | Add New User form appears, system accepts new user without deleting existing users, and new user can login successfully. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**2.1.2 Test Case #2 – (i.e. Add New User - Error: Duplicate Email)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Add New User – Error State (Duplicate Email) |
| **Requirement #:** | 2.1.2 – System shall prevent creation of users with already existing email addresses. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | User Management System - Validation |
| **Setup:** | • Obtain Administrator credentials<br>• Know an email address already registered |
| **Procedure:** | 1. Navigate to "User Management" as Admin<br>2. Click "Add New User"<br>3. Enter the existing email address and fill other fields<br>4. Click "Save" |
| **Expected Results:** | 1. System validates inputs<br>2. System rejects submission<br>3. Error message appears: "Email address already in use."<br>4. User is NOT added to the list |
| **Observed Results:** | System validates inputs and rejects submission with error "Email address already in use." without affecting other users. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 3. Manage Projects

### 3.1 Test Scenario #2 (i.e. Project Management)
**3.1.1 Test Case #1 – (i.e. Create New Project - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Create New Project – Normal State |
| **Requirement #:** | 3.1.1 – System shall allow managers to create a new project and add members. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | Project Management Module |
| **Setup:** | • Obtain Manager credentials |
| **Procedure:** | 1. Login as Manager, navigate to "Projects"<br>2. Click "Create Project"<br>3. Enter project name and description<br>4. Select team members from dropdown<br>5. Click "Create" |
| **Expected Results:** | 1. Create Project form appears<br>2. Form accepts alphanumeric input and multiple members<br>3. System accepts creation, redirects to new Project Board<br>4. Project listed under Active Projects |
| **Observed Results:** | Create Project form accepts input and system accepts creation of "Apollo Enterprise Portal". Redirects to new Project Board. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**3.1.2 Test Case #2 – (i.e. Create Project - Error: Missing Name)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Create New Project – Error State (Missing Name) |
| **Requirement #:** | 3.1.2 – System shall enforce required fields on project creation. |
| **Estimated Time (hours):** | 0.10 |
| **Object, Function or Procedure Under Test:** | Project Creation Validation |
| **Setup:** | • Obtain Manager credentials |
| **Procedure:** | 1. Navigate to "Create Project"<br>2. Leave project name blank<br>3. Fill description and members<br>4. Click "Create" |
| **Expected Results:** | 1. System validates inputs<br>2. System prevents submission<br>3. Validation error on Name field: "Project Name is required" |
| **Observed Results:** | System prevents submission and shows validation error "Project Name is required". |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 4. Manage Tasks & Kanban

### 4.1 Test Scenario #3 (i.e. Task Status Flow)
**4.1.1 Test Case #1 – (i.e. Move Task to In Progress - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Move Task Status – Normal State |
| **Requirement #:** | 4.1.1 – System shall allow users to drag/drop tasks to change status. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Kanban Board Drag-and-Drop |
| **Setup:** | • Have an active project with a task in "To Do" |
| **Procedure:** | 1. Navigate to Project's Kanban Board<br>2. Drag a task from "To Do" to "In Progress"<br>3. Refresh the web page |
| **Expected Results:** | 1. Task visually moves to "In Progress"<br>2. Task remains in "In Progress" after reload (backend persistence) |
| **Observed Results:** | Task visually moves to "In Progress" and remains there after reload. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**4.1.2 Test Case #2 – (i.e. Delete Task - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Delete Task – Normal State |
| **Requirement #:** | 4.1.2 – System shall allow task creators to delete a task. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Deletion |
| **Setup:** | • Task creator credentials, active task |
| **Procedure:** | 1. Open task details modal<br>2. Click "Delete Task"<br>3. Confirm deletion in the prompt |
| **Expected Results:** | 1. Task is removed from the Kanban UI<br>2. Task is no longer searchable |
| **Observed Results:** | Task is removed from the Kanban UI and is no longer searchable. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 5. Assign & Prioritize Tasks

### 5.1 Test Scenario #4 (i.e. Task Assignment & Prioritization)
**5.1.1 Test Case #1 – (i.e. Assign Member and Set High Priority - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Assign Member and Set Priority – Normal State |
| **Requirement #:** | 5.1.1 – Allow assigning members and adjusting task priority. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Detail Interface |
| **Setup:** | • Project with multiple members |
| **Procedure:** | 1. Open an unassigned Task<br>2. Select a member from "Assignee" dropdown<br>3. Select "High" from "Priority" dropdown<br>4. Close or Save modal |
| **Expected Results:** | 1. Member's avatar updates on task card<br>2. Priority indicator shows "High"<br>3. Assigned member receives a notification |
| **Observed Results:** | Member's avatar updates, priority indicator shows 'High', and assigned member receives notification. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**5.1.2 Test Case #2 – (i.e. Change Assignee - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Reassign Task – Normal State |
| **Requirement #:** | 5.1.2 – Allow updating an existing task assignment. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Detail Interface |
| **Setup:** | • Task already assigned to User A |
| **Procedure:** | 1. Open assigned Task<br>2. Change Assignee to User B<br>3. Save changes |
| **Expected Results:** | 1. Task card avatar updates to User B<br>2. User B receives assignment notification |
| **Observed Results:** | Task card avatar updates to User B and they receive assignment notification. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 6. Track & Analyze Time

### 6.1 Test Scenario #5 (i.e. Time Tracking)
**6.1.1 Test Case #1 – (i.e. Log Task Time via Timer - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Log Task Time – Normal State |
| **Requirement #:** | 6.1.1 – Allow start/stop timer for tasks. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Time Tracking Module |
| **Setup:** | • User assigned to task |
| **Procedure:** | 1. Navigate to Task<br>2. Click "Start Timer"<br>3. Wait 1 min, click "Stop Timer" |
| **Expected Results:** | 1. Timer counts up visually<br>2. On stop, 1 minute time entry is added to task history under logged time |
| **Observed Results:** | Timer counts up visually, and stopping it records a time entry accurately. Total Time Spent matches logged time. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**6.1.2 Test Case #2 – (i.e. Manual Time Entry - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Manual Add Time – Normal State |
| **Requirement #:** | 6.1.2 – Allow users to manually log minutes on a task. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Manual Time Logger |
| **Setup:** | • User assigned to task |
| **Procedure:** | 1. Navigate to Task, open Time Logs tab<br>2. Enter "150" in Minutes spent field<br>3. Click "Log Time" |
| **Expected Results:** | 1. System accepts positive numeric minutes<br>2. New log entry appears in task time history with manual log note |
| **Observed Results:** | System accepts positive numeric minutes and new log entry appears in task time history. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 7. Generate Productivity Reports

### 7.1 Test Scenario #6 (i.e. Reporting System)
**7.1.1 Test Case #1 – (i.e. Generate Weekly Report - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Generate Weekly Productivity Report |
| **Requirement #:** | 7.1.1 – System shall aggregate logged task time into reports. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Analytics Module |
| **Setup:** | • System has time log data for the past week |
| **Procedure:** | 1. Navigate to "Reports"<br>2. Set time range to "Last 7 Days"<br>3. Apply optional filters (status/priority/assignee) |
| **Expected Results:** | 1. System displays visual charts<br>2. Correct total tracked hours and completed tasks are shown |
| **Observed Results:** | System displays visual charts and correct total tracked hours and completed tasks are shown. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**7.1.2 Test Case #2 – (i.e. Export Report - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Export Report to CSV |
| **Requirement #:** | 7.1.2 – System shall allow downloading report data. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Reporting Export |
| **Setup:** | • Generated report on screen |
| **Procedure:** | 1. Click "Export" -> "CSV"<br>2. Check downloaded file |
| **Expected Results:** | 1. Browser downloads a `.csv` file<br>2. File matches data set shown on the screen |
| **Observed Results:** | Browser downloads a .csv file matching the data shown on screen. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 8. Detect Workflow Bottlenecks

### 8.1 Test Scenario #7 (i.e. Bottleneck Analytics)
**8.1.1 Test Case #1 – (i.e. View Workflow Health Bottlenecks - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | View Workflow Health Bottlenecks |
| **Requirement #:** | 8.1.1 – System shall show AI-detected bottlenecks and overdue risk indicators. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Workflow Bottleneck Analytics |
| **Setup:** | • Historical project data where tasks stuck in "Review" |
| **Procedure:** | 1. Navigate to project recommendations area<br>2. Open "Workflow Health" (or jump to bottlenecks)<br>3. Review returned bottleneck cards |
| **Expected Results:** | 1. System displays bottleneck cards with severity and recommendations<br>2. Overdue tasks are listed when present |
| **Observed Results:** | System displays bottleneck cards with severity and recommendations. Overdue tasks are listed. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**8.1.2 Test Case #2 – (i.e. Workflow Health Availability State - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | View Workflow Health Availability Message |
| **Requirement #:** | 8.1.2 – System shall handle ML bottleneck service availability gracefully. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Workflow Health Service Fallback |
| **Setup:** | • ML bottleneck endpoint unavailable or returns unavailable state |
| **Procedure:** | 1. Open recommendations section<br>2. Scroll to "Workflow Health" panel |
| **Expected Results:** | 1. Friendly unavailable message is shown<br>2. Page remains usable without crashes |
| **Observed Results:** | Friendly unavailable message is shown, page remains usable. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 9. ML Task Recommendations

### 9.1 Test Scenario #8 (i.e. ML Prioritization)
**9.1.1 Test Case #1 – (i.e. View Intelligent Task Suggestions - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | View Intelligent Task Prioritization |
| **Requirement #:** | 9.1.1 – Apply ML to recommend focus tasks based on urgency/deadline. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | ML Recommendation Engine |
| **Setup:** | • User with multiple assigned tasks of varying deadlines/priorities |
| **Procedure:** | 1. Navigate to User Dashboard (Recommendations section)<br>2. Observe recommendation cards and ordering<br>3. Inspect reason and urgency text shown on each card |
| **Expected Results:** | 1. Urgent tasks (overdue/due soon/high priority) are surfaced prominently<br>2. Reasoning is visible inline on the card |
| **Observed Results:** | Urgent tasks are surfaced prominently with reasoning visible inline. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**9.1.2 Test Case #2 – (i.e. Reschedule Action on Overdue - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Reschedule ML Suggested Task |
| **Requirement #:** | 9.1.2 – Allow user action (Reschedule) directly from ML recommendation. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Recommendation Actions Interface |
| **Setup:** | • Overdue or due-soon task showing in recommendations |
| **Procedure:** | 1. Locate an overdue risk suggestion with "Reschedule" action<br>2. Click "Reschedule"<br>3. Enter number of delay days and confirm |
| **Expected Results:** | 1. Task due date is shifted forward by entered days<br>2. Recommendation list updates after task update |
| **Observed Results:** | Task due date is shifted forward by entered days and list updates. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

<br>

## 10. Collaborate via Chat / Comments

### 10.1 Test Scenario #9 (i.e. Task Collaboration)
**10.1.1 Test Case #1 – (i.e. Post Task Comment - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Post Task Comment |
| **Requirement #:** | 10.1.1 – Allow users to add comments on tasks. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | Commenting System |
| **Setup:** | • User A and B in same project |
| **Procedure:** | 1. Open a task details modal<br>2. Go to Comments tab<br>3. Enter comment text and click "Send" |
| **Expected Results:** | 1. Comment appears in the thread with author and timestamp<br>2. Comment remains visible on reload |
| **Observed Results:** | Comment appears in the thread with author and timestamp, and remains visible on reload. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |

**10.1.2 Test Case #2 – (i.e. Validate Comment Input - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Block Empty Comment Submission |
| **Requirement #:** | 10.1.2 – System shall prevent empty task comments. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Comment Validation |
| **Setup:** | • Any valid task URL |
| **Procedure:** | 1. Open task comments tab<br>2. Leave input empty<br>3. Attempt to click "Send" |
| **Expected Results:** | 1. Send action is disabled for empty input<br>2. No empty comment is created |
| **Observed Results:** | Send action is disabled for empty input and no empty comment is created. |
| **Approved, Conditionally Approved, or Rejected:** | Approved |
| **Failure Type:** | N/A |


