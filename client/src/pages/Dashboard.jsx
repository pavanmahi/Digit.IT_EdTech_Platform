import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function Dashboard({ setIsAuthenticated }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: ''
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchTasks()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, filter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tasks')
      setTasks(response.data.tasks)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    if (filter === 'all') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(task => task.progress === filter))
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    try {
      await api.post('/tasks', newTask)
      setNewTask({ title: '', description: '', dueDate: '' })
      setShowAddTask(false)
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task')
    }
  }

  const handleUpdateProgress = async (taskId, newProgress) => {
    try {
      await api.put(`/tasks/${taskId}`, { progress: newProgress })
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }
    
    try {
      await api.delete(`/tasks/${taskId}`)
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    navigate('/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const getProgressColor = (progress) => {
    switch (progress) {
      case 'not-started':
        return 'bg-gray-200 text-gray-800'
      case 'in-progress':
        return 'bg-yellow-200 text-yellow-800'
      case 'completed':
        return 'bg-green-200 text-green-800'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  const getProgressLabel = (progress) => {
    switch (progress) {
      case 'not-started':
        return 'Not Started'
      case 'in-progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return progress
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-primary-700">Digit.It</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{user?.email}</span>
                <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 rounded">
                  {user?.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'student' && user?.teacherId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Assigned Teacher ID:</span> {user.teacherId}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">×</button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {user?.role === 'teacher' ? 'All Tasks' : 'My Tasks'}
          </h2>
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="btn-primary"
          >
            {showAddTask ? 'Cancel' : '+ Add New Task'}
          </button>
        </div>

        {showAddTask && (
          <div className="card mb-6">
            <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="input-field"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <button type="submit" className="btn-primary">
                Create Task
              </button>
            </form>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Progress
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="all">All Tasks</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="card text-center text-gray-500">
              No tasks found. {filter !== 'all' && 'Try changing the filter or '}Create your first task to get started!
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className="card hover:shadow-lg transition duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {task.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Due: {formatDate(task.due_date)}</span>
                      <span>Created: {formatDate(task.created_at)}</span>
                      {user?.role === 'teacher' && task.user_id !== user.id && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Student Task
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getProgressColor(task.progress)}`}>
                      {getProgressLabel(task.progress)}
                    </span>
                  </div>
                </div>
                
                {task.user_id === user?.id && (
                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                    <select
                      value={task.progress}
                      onChange={(e) => handleUpdateProgress(task.id, e.target.value)}
                      className="input-field max-w-xs"
                    >
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                )}
                
                {user?.role === 'teacher' && task.user_id !== user.id && (
                  <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 italic">
                    This task belongs to one of your students. You can view it but cannot modify it.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
