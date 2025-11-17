# Digit.It LTM — Assignment - Pavan Bejawada

A full-stack role-based learning task manager engineered to streamline teacher–student task workflows, ensure secure access, and deliver transparent academic progress tracking.

---

## Tech Stack

### **Frontend**

* React (Vite)
* React Router
* Tailwind CSS

### **Backend**

* Node.js + Express

### **Database**

* MongoDB with Mongoose ODM

### **Security**

* JWT Authentication
* bcrypt password hashing
* Rate limiting
* Full authorization middleware layer

---

##  Key Features

###  Authentication & Authorization

* Login/register with **Student** or **Teacher** roles
* Teachers get a unique **invite code** students must use during signup
* Protected routes with JWT
* Input validation & secure token handling
* Login rate limiting (5 attempts per 15 minutes)

###  Student Panel

* View tasks assigned by their teacher
* Update task progress:

  * Not Started → In Progress → Completed
* Clean interface with filtered progress views
* Can only access their own tasks

### Teacher Panel

* Create tasks for all assigned students
* View progress of all students per task
* Modify/delete only their created tasks
* Read-only access to student progress

###  Security Features

* Password hashing using bcrypt
* Authorization enforced at route-level
* MongoDB safe queries (no injections)
* Strong validation on both client & server

---

##  Database Models

### **User Model**

```js
{
  email: String,
  passwordHash: String,
  name: String,
  role: 'student' | 'teacher',
  assignedTeacher: ObjectId(User),
  inviteCode: String (unique for teachers)
}
```

### **Task Model**

```js
{
  teacherId: ObjectId(User),
  title: String,
  description: String,
  dueDate: Date
}
```

### **Progress Model**

```js
{
  studentId: ObjectId(User),
  taskId: ObjectId(Task),
  progress: "Not Started" | "In Progress" | "Completed"
}
```

###  Progress Workflow

* When a teacher creates a task, **every student assigned to that teacher** automatically gets a Progress entry.
* Students only update their own progress.
* Teachers only view (cannot modify) student progress.
* Unique index ensures one progress entry per student-task pair.

---

##  API Endpoints

### **Auth Endpoints**

#### POST `/auth/signup`

Register user (Student must enter teacher invite code).

#### POST `/auth/login`

Returns JWT token.

#### GET `/auth/teachers`

Public endpoint to fetch all teachers.

---

### **Task Endpoints** *(JWT required)*

#### GET `/tasks`

* Students → their tasks + progress
* Teachers → tasks they created + progress of each student

#### POST `/tasks`

* Teacher creates a task

#### PUT `/tasks/:id`

* Teachers → can update **only the tasks they created**
* Students → can update **only the progress** for tasks assigned to them

#### DELETE `/tasks/:id`

* Delete task (teacher-only if owner)

---

## Project Structure

```
digit-it/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── server/
│   ├── middleware/
│   ├── models/   {User, Task, Progress}
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tasks.js
│   ├── db.js
│   ├── index.js
│   └── package.json
└── README.md
```

---

##  Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd digit-it
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd client
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside `server/`:

```env
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_secret_key
PORT=3000
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 5. Start Development Servers

Backend:

```bash
cd server
node index.js
```

Frontend:

```bash
cd client
npm run dev
```

---

## AI Assistance Disclosure

I used AI assistance to accelerate delivery. The core engine, architecture, and integration decisions are my own; AI acted as fuel for execution. Thank you for reviewing this work.

I’m confident in the implementation and excited to contribute, learn, and build impactful systems with your team.

---

##  Contact

**Pavan Bejawada**

📧 [pavanbejawada4376@gmail.com](mailto:pavanbejawada4376@gmail.com)
📱 6305857476
🔗 LinkedIn: [https://www.linkedin.com/in/bejawada-pavan67/](https://www.linkedin.com/in/bejawada-pavan67/)
