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
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [editValues, setEditValues] = useState({})

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchTasks()
    fetchInviteCodeIfTeacher()
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

  const fetchInviteCodeIfTeacher = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (currentUser?.role !== 'teacher') return
      setInviteLoading(true)
      const resp = await api.get('/auth/invite-code')
      setInviteCode(resp.data.inviteCode)
    } catch (err) {
      // Do not block dashboard if invite code fails
      console.warn('Failed to load invite code', err)
    } finally {
      setInviteLoading(false)
    }
  }

  const filterTasks = () => {
    if (user?.role !== 'student') {
      setFilteredTasks(tasks)
      return
    }
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

  const toInputDate = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const startEdit = (task) => {
    setEditValues(prev => ({
      ...prev,
      [task._id]: {
        title: task.title,
        description: task.description,
        dueDate: toInputDate(task.dueDate)
      }
    }))
  }

  const cancelEdit = (taskId) => {
    setEditValues(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  const saveEdit = async (taskId) => {
    try {
      const values = editValues[taskId]
      if (!values) return
      await api.put(`/tasks/${taskId}`, {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate || null
      })
      cancelEdit(taskId)
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task details')
    }
  }

  const getProgressColor = (progress) => {
    switch (progress) {
      case 'Not Started':
        return 'bg-gray-200 text-gray-800'
      case 'In Progress':
        return 'bg-yellow-200 text-yellow-800'
      case 'Completed':
        return 'bg-green-200 text-green-800'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  const getProgressLabel = (progress) => {
    return progress
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
        {user?.role === 'student' && user?.assignedTeacher && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Assigned Teacher ID:</span> {user.assignedTeacher}
            </p>
          </div>
        )}

        {user?.role === 'teacher' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Invite Code:</span> {inviteLoading ? 'Loading…' : inviteCode || 'Not generated'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Share this code with students to join your class.</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => navigator.clipboard.writeText(inviteCode || '')}
                  disabled={!inviteCode}
                >
                  Copy
                </button>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      setInviteLoading(true)
                      const resp = await api.post('/auth/invite-code/rotate')
                      setInviteCode(resp.data.inviteCode)
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to rotate invite code')
                    } finally {
                      setInviteLoading(false)
                    }
                  }}
                >
                  Rotate Code
                </button>
              </div>
            </div>
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
            {user?.role === 'teacher' ? 'My Tasks' : 'Assigned Tasks'}
          </h2>
          {user?.role === 'teacher' && (
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="btn-primary"
            >
              {showAddTask ? 'Cancel' : '+ Add New Task'}
            </button>
          )}
        </div>

        {showAddTask && user?.role === 'teacher' && (
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

        {user?.role === 'student' && (
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
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        )}

        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="card text-center text-gray-500">
              No tasks found. {filter !== 'all' && 'Try changing the filter or '}Create your first task to get started!
            </div>
          ) : (
                filteredTasks.map(task => (
                <div key={task._id} className="card hover:shadow-lg transition duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {task.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Due: {formatDate(task.dueDate)}</span>
                        <span>Created: {formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                    {user?.role === 'student' && (
                      <div className="ml-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getProgressColor(task.progress)}`}>
                          {getProgressLabel(task.progress)}
                        </span>
                      </div>
                    )}
                  </div>

                {user?.role === 'teacher' && (
                  <div className="pt-4 border-t border-gray-200">
                    {editValues[task._id] ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          className="input-field w-full"
                          value={editValues[task._id].title}
                          onChange={e => setEditValues(prev => ({...prev, [task._id]: {...prev[task._id], title: e.target.value}}))}
                        />
                        <textarea
                          className="input-field w-full"
                          value={editValues[task._id].description}
                          onChange={e => setEditValues(prev => ({...prev, [task._id]: {...prev[task._id], description: e.target.value}}))}
                        />
                        <input
                          type="date"
                          className="input-field"
                          value={editValues[task._id].dueDate}
                          onChange={e => setEditValues(prev => ({...prev, [task._id]: {...prev[task._id], dueDate: e.target.value}}))}
                        />
                        <div className="flex gap-2">
                          <button className="btn-primary" onClick={() => saveEdit(task._id)}>Save</button>
                          <button className="btn-secondary" onClick={() => cancelEdit(task._id)}>Cancel</button>
                          <button className="btn-danger ml-auto" onClick={() => handleDeleteTask(task._id)}>Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button className="btn-primary" onClick={() => startEdit(task)}>Edit Details</button>
                        <button className="btn-danger ml-auto" onClick={() => handleDeleteTask(task._id)}>Delete</button>
                      </div>
                    )}

                    {Array.isArray(task.assignees) && task.assignees.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Student Progress</h4>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {task.assignees.map(a => (
                            <li key={a.studentId} className="flex justify-between">
                              <span>{a.email}</span>
                              <span className={`px-2 py-0.5 rounded ${getProgressColor(a.progress)}`}>{getProgressLabel(a.progress)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {user?.role === 'student' && (
                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                    <select
                      value={task.progress}
                      onChange={(e) => handleUpdateProgress(task._id, e.target.value)}
                      className="input-field max-w-xs"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
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
