# Digit.It - EdTech Learning Task Manager

A full-stack EdTech Learning Task Manager that manages the Student-Teacher relationship with role-based access control for learning tasks.

## Project Overview

Digit.It is a modern task management system designed specifically for educational environments. It enables students to manage their learning tasks while allowing teachers to monitor their students' progress. The application implements robust role-based access control to ensure data security and appropriate permissions.

## Tech Stack

- **Frontend**: React with Vite, React Router, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (instead of MongoDB for better Replit compatibility)
- **Authentication**: JWT with bcrypt password hashing

## Features

### Authentication & Authorization
- User registration with role selection (student/teacher)
- Students must be assigned to a teacher during signup
- JWT-based authentication with secure token storage
- Protected routes requiring authentication
- Rate limiting on login endpoint (5 attempts per 15 minutes)

### Student Features
- View only their own tasks
- Create new learning tasks with title, description, and optional due date
- Update task progress (not-started, in-progress, completed)
- Delete their own tasks
- Filter tasks by progress status

### Teacher Features
- View all tasks created by them
- View all tasks from their assigned students (read-only for student tasks)
- Can only modify/delete tasks they personally created
- See which tasks belong to students vs their own

### Security Features
- Password hashing with bcrypt (10 rounds minimum)
- JWT token validation on all protected routes
- Input validation on both frontend and backend
- Proper authorization checks preventing unauthorized access
- SQL injection protection through parameterized queries
- CORS configuration for cross-origin requests

## Setup Instructions

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_secret_key_for_jwt
PORT=3000
NODE_ENV=development
```

For the client, create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd digit-it
```

2. **Install server dependencies**
```bash
npm install
```

3. **Install client dependencies**
```bash
cd client
npm install
cd ..
```

4. **Start the backend server**
```bash
cd server
node index.js
```

The server will run on `http://localhost:3000` and automatically create the database tables on first run.

5. **Start the frontend development server**
```bash
cd client
npm run dev
```

The client will run on `http://localhost:5000`

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR UNIQUE NOT NULL)
- `password_hash` (VARCHAR NOT NULL)
- `role` (VARCHAR CHECK: 'student' or 'teacher')
- `teacher_id` (INTEGER REFERENCES users.id) - Required for students
- `created_at` (TIMESTAMP)

### Tasks Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users.id)
- `title` (VARCHAR NOT NULL)
- `description` (TEXT NOT NULL)
- `due_date` (DATE OPTIONAL)
- `progress` (VARCHAR CHECK: 'not-started', 'in-progress', 'completed')
- `created_at` (TIMESTAMP)

## API Endpoints

### Authentication Endpoints

#### POST /auth/signup
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student",
  "teacherId": 1
}
```

#### POST /auth/login
Login and receive JWT token
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET /auth/teachers
Get list of all teachers (no authentication required)

### Task Endpoints (All require JWT authentication)

#### GET /tasks
Get tasks based on user role
- Students: Returns only their own tasks
- Teachers: Returns their tasks + all assigned students' tasks

#### POST /tasks
Create a new task
```json
{
  "title": "Complete Math Assignment",
  "description": "Chapter 5 exercises",
  "dueDate": "2024-12-31",
  "progress": "not-started"
}
```

#### PUT /tasks/:id
Update a task (only task owner can update)
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "progress": "in-progress"
}
```

#### DELETE /tasks/:id
Delete a task (only task owner can delete)

## Role-Based Access Control Implementation

### Students
- Can only view, create, update, and delete their own tasks
- Must be assigned to a teacher during registration
- Cannot access other students' tasks

### Teachers
- Can view all tasks from their assigned students (read-only)
- Can view and modify their own created tasks
- Cannot modify or delete students' tasks
- Teacher-student association is enforced at signup

### Authorization Logic
The system implements authorization through middleware and database queries:

1. **Authentication Middleware**: Verifies JWT token and attaches user info to request
2. **Task Ownership Checks**: Ensures users can only modify tasks they created
3. **Role-Based Queries**: Different SQL queries based on user role for GET /tasks
4. **Validation Middleware**: Validates all inputs using express-validator

## AI Assistance Disclosure

This project was developed with assistance from AI tools including:
- Code structure and implementation guidance
- Best practices for security and authentication
- Database schema design
- Error handling patterns
- Documentation writing

All code has been reviewed and tested to ensure it meets the project requirements.

## Known Issues & Improvement Suggestions

### Known Issues
1. Teacher names are not displayed in student dashboard (only teacher IDs)
2. No pagination for teachers with many students
3. Date filtering not yet implemented
4. No task editing UI (only progress updates)

### Future Improvements
1. **Enhanced UI/UX**
   - Add task editing modal for full task updates
   - Display teacher names instead of IDs
   - Add user profile pages
   - Implement dark mode

2. **Additional Features**
   - Date filtering (overdue tasks, this week's tasks)
   - Pagination for task lists
   - Task categories/subjects
   - File attachments for tasks
   - Comments/feedback system for teachers

3. **Performance**
   - Implement caching for frequently accessed data
   - Add pagination for large task lists
   - Optimize database queries with indexes

4. **Analytics**
   - Student progress dashboards for teachers
   - Task completion statistics
   - Due date reminders

5. **Mobile**
   - Responsive design improvements
   - Progressive Web App (PWA) capabilities
   - Mobile-specific features

## Project Structure

```
digit-it/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API client configuration
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   └── package.json
├── server/                # Express backend
│   ├── middleware/        # Auth and error handling
│   ├── routes/           # API routes
│   ├── db.js             # Database configuration
│   ├── index.js          # Server entry point
│   └── package.json
└── README.md
```

## License

MIT

## Contributing

This is an educational project. Contributions and suggestions are welcome!
