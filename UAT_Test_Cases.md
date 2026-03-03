# User Acceptance Testing (UAT) Cases

## 1. Authenticate User

### 1.1 Test Scenario #1 (i.e. User Authentication)
**1.1.1 Sample Test Case #1 – (i.e. User Login - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | User Login – Normal State |
| **Requirement #:** | 1.1.1 – System shall allow registered users to log in with valid credentials. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Authentication Module |
| **Setup:** | • Obtain valid user credentials |
| **Procedure:** | 1. Launch application<br>2. Navigate to "Login"<br>3. Enter valid email and password<br>4. Click "Login" |
| **Expected Results:** | 1. User is successfully authenticated<br>2. Redirected to Main Dashboard |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**1.1.2 Sample Test Case #2 – (i.e. User Login - Error: Invalid Password)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | User Login – Error State (Invalid Password) |
| **Requirement #:** | 1.1.2 – System shall prevent login with incorrect credentials. |
| **Estimated Time (hours):** | 0.10 |
| **Object, Function or Procedure Under Test:** | Authentication Module - Validation |
| **Setup:** | • Obtain valid email, invalid password |
| **Procedure:** | 1. Navigate to "Login"<br>2. Enter valid email and incorrect password<br>3. Click "Login" |
| **Expected Results:** | 1. Login fails<br>2. Error message appears: "Invalid email or password" |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 2. Manage Users

### 2.1 Test Scenario #1 (i.e. User Management)
**2.1.1 Sample Test Case #1 – (i.e. Add New User - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Add New User – Normal State |
| **Requirement #:** | 2.1.1 – System shall allow admin to add a new user and assign a role through the User Management Screen. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | User Management System |
| **Setup:** | • Obtain Administrator credentials |
| **Procedure:** | 1. Launch application and Login as Admin<br>2. Navigate to "User Management"<br>3. Click "Add New User"<br>4. Type new user's email, name, and select "Member" Role<br>5. Click "Save"<br>6. Logout and Login with new user's credentials |
| **Expected Results:** | 1. Add New User form appears<br>2. Form accepts input fields<br>3. System accepts new user, success message appears<br>4. New user can successfully login to Main Dashboard |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**2.1.2 Sample Test Case #2 – (i.e. Add New User - Error: Duplicate Email)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Add New User – Error State (Duplicate Email) |
| **Requirement #:** | 2.1.2 – System shall prevent creation of users with already existing email addresses. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | User Management System - Validation |
| **Setup:** | • Obtain Administrator credentials<br>• Know an email address already registered |
| **Procedure:** | 1. Navigate to "User Management" as Admin<br>2. Click "Add New User"<br>3. Enter the existing email address and fill other fields<br>4. Click "Save" |
| **Expected Results:** | 1. System validates inputs<br>2. System rejects submission<br>3. Error message appears: "Email address already in use."<br>4. User is NOT added to the list |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 3. Manage Projects

### 3.1 Test Scenario #2 (i.e. Project Management)
**3.1.1 Sample Test Case #1 – (i.e. Create New Project - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Create New Project – Normal State |
| **Requirement #:** | 3.1.1 – System shall allow managers to create a new project and add members. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | Project Management Module |
| **Setup:** | • Obtain Manager credentials |
| **Procedure:** | 1. Login as Manager, navigate to "Projects"<br>2. Click "Create Project"<br>3. Enter project name and description<br>4. Select team members from dropdown<br>5. Click "Create" |
| **Expected Results:** | 1. Create Project form appears<br>2. Form accepts alphanumeric input and multiple members<br>3. System accepts creation, redirects to new Project Board<br>4. Project listed under Active Projects |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**3.1.2 Sample Test Case #2 – (i.e. Create Project - Error: Missing Name)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Create New Project – Error State (Missing Name) |
| **Requirement #:** | 3.1.2 – System shall enforce required fields on project creation. |
| **Estimated Time (hours):** | 0.10 |
| **Object, Function or Procedure Under Test:** | Project Creation Validation |
| **Setup:** | • Obtain Manager credentials |
| **Procedure:** | 1. Navigate to "Create Project"<br>2. Leave project name blank<br>3. Fill description and members<br>4. Click "Create" |
| **Expected Results:** | 1. System validates inputs<br>2. System prevents submission<br>3. Validation error on Name field: "Project Name is required" |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 4. Manage Tasks & Kanban

### 4.1 Test Scenario #3 (i.e. Task Status Flow)
**4.1.1 Sample Test Case #1 – (i.e. Move Task to In Progress - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Move Task Status – Normal State |
| **Requirement #:** | 4.1.1 – System shall allow users to drag/drop tasks to change status. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Kanban Board Drag-and-Drop |
| **Setup:** | • Have an active project with a task in "To Do" |
| **Procedure:** | 1. Navigate to Project's Kanban Board<br>2. Drag a task from "To Do" to "In Progress"<br>3. Refresh the web page |
| **Expected Results:** | 1. Task visually moves to "In Progress"<br>2. Task remains in "In Progress" after reload (backend persistence) |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**4.1.2 Sample Test Case #2 – (i.e. Delete Task - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Delete Task – Normal State |
| **Requirement #:** | 4.1.2 – System shall allow task creators to delete a task. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Deletion |
| **Setup:** | • Task creator credentials, active task |
| **Procedure:** | 1. Open task details modal<br>2. Click "Delete Task"<br>3. Confirm deletion in the prompt |
| **Expected Results:** | 1. Task is removed from the Kanban UI<br>2. Task is no longer searchable |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 5. Assign & Prioritize Tasks

### 5.1 Test Scenario #4 (i.e. Task Assignment & Prioritization)
**5.1.1 Sample Test Case #1 – (i.e. Assign Member and Set High Priority - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Assign Member and Set Priority – Normal State |
| **Requirement #:** | 5.1.1 – Allow assigning members and adjusting task priority. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Detail Interface |
| **Setup:** | • Project with multiple members |
| **Procedure:** | 1. Open an unassigned Task<br>2. Select a member from "Assignee" dropdown<br>3. Select "High" from "Priority" dropdown<br>4. Close or Save modal |
| **Expected Results:** | 1. Member's avatar updates on task card<br>2. Priority indicator shows "High"<br>3. Assigned member receives a notification |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**5.1.2 Sample Test Case #2 – (i.e. Change Assignee - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Reassign Task – Normal State |
| **Requirement #:** | 5.1.2 – Allow updating an existing task assignment. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Task Detail Interface |
| **Setup:** | • Task already assigned to User A |
| **Procedure:** | 1. Open assigned Task<br>2. Change Assignee to User B<br>3. Save changes |
| **Expected Results:** | 1. Task card avatar updates to User B<br>2. User B receives assignment notification |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 6. Track & Analyze Time

### 6.1 Test Scenario #5 (i.e. Time Tracking)
**6.1.1 Sample Test Case #1 – (i.e. Log Task Time via Timer - Normal)**

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

**6.1.2 Sample Test Case #2 – (i.e. Manual Time Entry - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Manual Add Time – Normal State |
| **Requirement #:** | 6.1.2 – Allow users to backdate or manually log hours. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Manual Time Logger |
| **Setup:** | • User assigned to task |
| **Procedure:** | 1. Navigate to Task, click Add Time Log<br>2. Enter "2h 30m" and past date<br>3. Save |
| **Expected Results:** | 1. System accepts manual time string<br>2. Time history displays the 2h 30m entry |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 7. Generate Productivity Reports

### 7.1 Test Scenario #6 (i.e. Reporting System)
**7.1.1 Sample Test Case #1 – (i.e. Generate Weekly Report - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Generate Weekly Productivity Report |
| **Requirement #:** | 7.1.1 – System shall aggregate logged task time into reports. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Analytics Module |
| **Setup:** | • System has time log data for the past week |
| **Procedure:** | 1. Navigate to "Reports"<br>2. Select "Productivity Report" and filter "Last 7 Days"<br>3. Click "Generate" |
| **Expected Results:** | 1. System displays visual charts<br>2. Correct total tracked hours and completed tasks are shown |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**7.1.2 Sample Test Case #2 – (i.e. Export Report - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Export Report to CSV |
| **Requirement #:** | 7.1.2 – System shall allow downloading report data. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Reporting Export |
| **Setup:** | • Generated report on screen |
| **Procedure:** | 1. Click "Export" -> "CSV"<br>2. Check downloaded file |
| **Expected Results:** | 1. Browser downloads a `.csv` file<br>2. File matches data set shown on the screen |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 8. Detect Workflow Bottlenecks

### 8.1 Test Scenario #7 (i.e. Bottleneck Analytics)
**8.1.1 Sample Test Case #1 – (i.e. Identify Stalled Stages - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Identify Bottleneck Stages |
| **Requirement #:** | 8.1.1 – System shall analyze flow metrics and highlight stalled workflow stages. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Workflow Bottleneck Analytics |
| **Setup:** | • Historical project data where tasks stuck in "Review" |
| **Procedure:** | 1. Navigate to "Workflow Analytics"<br>2. Select target project<br>3. Locate "Time in Stage" chart |
| **Expected Results:** | 1. System visually highlights the stalled stage (e.g., "Review" column in red to indicate bottleneck) |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**8.1.2 Sample Test Case #2 – (i.e. Cycle Time Graph - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | View Cycle Time Graph |
| **Requirement #:** | 8.1.2 – Render lead and cycle time distributions. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Analytics Scatterplot |
| **Setup:** | • Project with completed tasks |
| **Procedure:** | 1. Navigate to "Workflow Analytics"<br>2. View "Cycle Time" Scatterplot |
| **Expected Results:** | 1. Graph loads successfully<br>2. Hovering over data points shows task specific cycle time duration |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 9. ML Task Recommendations

### 9.1 Test Scenario #8 (i.e. ML Prioritization)
**9.1.1 Sample Test Case #1 – (i.e. View Intelligent Task Suggestions - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | View Intelligent Task Prioritization |
| **Requirement #:** | 9.1.1 – Apply ML to recommend focus tasks based on urgency/deadline. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | ML Recommendation Engine |
| **Setup:** | • User with multiple assigned tasks of varying deadlines/priorities |
| **Procedure:** | 1. Navigate to User Dashboard (Recommendations section)<br>2. Observe top task list<br>3. Hover on insight tag |
| **Expected Results:** | 1. The most logically urgent task (e.g. overdue/high priority) is surfaced top<br>2. Tooltip explains algorithm reasoning |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**9.1.2 Sample Test Case #2 – (i.e. Reschedule Action on Overdue - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Reschedule ML Suggested Task |
| **Requirement #:** | 9.1.2 – Allow user action (Reschedule) directly from ML recommendation. |
| **Estimated Time (hours):** | 0.20 |
| **Object, Function or Procedure Under Test:** | Recommendation Actions Interface |
| **Setup:** | • Overdue task showing in recommendations |
| **Procedure:** | 1. Locate overdue suggestion<br>2. Click "Reschedule" button next to it<br>3. Pick a new date (Tomorrow) |
| **Expected Results:** | 1. Task due date is updated to tomorrow<br>2. Task may re-sort in recommendation list based on new parameters |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

<br>

## 10. Collaborate via Chat / Comments

### 10.1 Test Scenario #9 (i.e. Task Collaboration)
**10.1.1 Sample Test Case #1 – (i.e. Mention User in Comment - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Post and Receive Mention Comment |
| **Requirement #:** | 10.1.1 – Allow commenting on tasks and user mentions. |
| **Estimated Time (hours):** | 0.25 |
| **Object, Function or Procedure Under Test:** | Commenting System |
| **Setup:** | • User A and B in same project |
| **Procedure:** | 1. As User A, on a Task comment: type `@UserB` and message<br>2. Click "Post"<br>3. Login as User B in incognito |
| **Expected Results:** | 1. System renders mention as a clickable tag<br>2. User B receives an unread notification routed to comment |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |

**10.1.2 Sample Test Case #2 – (i.e. Post Image Attachment - Normal)**

| Field | Description |
| :--- | :--- |
| **Test Case Name:** | Attach image to comment |
| **Requirement #:** | 10.1.2 – Support file/image attachments in task threads. |
| **Estimated Time (hours):** | 0.15 |
| **Object, Function or Procedure Under Test:** | Comment Attachment |
| **Setup:** | • Any valid task URL, sample .png file |
| **Procedure:** | 1. Click attachment icon on comment box<br>2. Upload .png file<br>3. Click "Post" |
| **Expected Results:** | 1. Image attaches to drafted comment preview<br>2. Posted comment inline-renders or links the `.png` image |
| **Observed Results:** | |
| **Approved, Conditionally Approved, or Rejected:** | |
| **Failure Type:** | |
