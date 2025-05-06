'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../lib/api';
import { Search, Inbox, CheckCircle, Clock, User, AlertCircle, Plus, X, Trash2, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { initSocket, getSocket, disconnectSocket } from '../lib/socket';
import Notification from '../components/Notification';
import { v4 as uuidv4 } from 'uuid';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    dueDate: '', 
    priority: 'medium', 
    status: 'todo', 
    assignedTo: '' 
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
      fetchTasks();
      fetchUsers();
      setIsLoading(false);

      // Initialize socket connection
      const socket = initSocket(token);

      // Listen for task assignments
      socket.on('task:assigned', (data) => {
        if (data.assignedTo === JSON.parse(storedUser).username) {
          addNotification({
            id: uuidv4(),
            type: 'info',
            title: 'New Task Assigned',
            message: `You have been assigned to "${data.title}"`
          });
        }
      });

      // Listen for task updates
      socket.on('task:updated', (data) => {
        if (data.assignedTo === JSON.parse(storedUser).username) {
          addNotification({
            id: uuidv4(),
            type: 'info',
            title: 'Task Updated',
            message: `Task "${data.title}" has been updated`
          });
        }
      });

      // Listen for task completion
      socket.on('task:completed', (data) => {
        if (data.assignedTo === JSON.parse(storedUser).username) {
          addNotification({
            id: uuidv4(),
            type: 'success',
            title: 'Task Completed',
            message: `Task "${data.title}" has been marked as completed`
          });
        }
      });

      return () => {
        disconnectSocket();
      };
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/');
    }
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:5000/api/users');
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchTasks = async () => {
    setIsTaskLoading(true);
    try {
      const response = await fetchWithAuth('http://localhost:5000/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setIsTaskLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditTask = (task) => {
    const formattedDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: formattedDate,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      assignedTo: task.assignedTo || ''
    });
    
    setEditingTaskId(task._id);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    
    if (!editingTaskId) return;
    
    const storedUser = localStorage.getItem('user');

    if (!taskForm.title || !taskForm.description || !taskForm.dueDate || !taskForm.assignedTo || !storedUser) {
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: 'Please fill out all required fields'
      });
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
      if (!currentUser || !currentUser._id) {
        console.error('Current user data is incomplete');
        addNotification({
          id: uuidv4(),
          type: 'error',
          title: 'Error',
          message: 'Your user information is incomplete. Please log out and log back in.'
        });
        return;
      }
    } catch (error) {
      console.error("Failed to parse current user from localStorage:", error);
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: 'Could not read your user information. Please log out and log back in.'
      });
      return;
    }

    const taskData = {
      title: taskForm.title,
      description: taskForm.description,
      dueDate: new Date(taskForm.dueDate).toISOString(),
      priority: taskForm.priority.toLowerCase(),
      status: taskForm.status.toLowerCase(),
      assignedTo: taskForm.assignedTo,
      createdBy: currentUser._id
    };

    try {
      const response = await fetchWithAuth(`http://localhost:5000/api/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });
      
      if (response.ok) {
        fetchTasks();
        resetForm();
        addNotification({
          id: uuidv4(),
          type: 'success',
          title: 'Success',
          message: 'Task updated successfully'
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to update task:', errorData.message || errorData);
        addNotification({
          id: uuidv4(),
          type: 'error',
          title: 'Error',
          message: errorData.message || 'Failed to update task'
        });
      }
    } catch (error) {
      console.error('Failed to update task', error);
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update task'
      });
    }
  };
  
  const resetForm = () => {
    setTaskForm({ 
      title: '', 
      description: '', 
      dueDate: '', 
      priority: 'medium', 
      status: 'todo', 
      assignedTo: '' 
    });
    setEditingTaskId(null);
    setIsEditing(false);
    setShowForm(false);
  };

  const handleDeleteTask = async (taskId) => {
    if (!taskId) {
      console.error('Task ID is undefined');
      return;
    }
    
    setIsDeleting(taskId);
    try {
      await fetchWithAuth(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      setTimeout(() => {
        setTasks(prev => prev.filter(task => task._id !== taskId));
        setIsDeleting(null);
      }, 300);
    } catch (error) {
      console.error('Failed to delete task', error);
      setIsDeleting(null);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
    if (isEditing) {
      await handleUpdateTask(e);
    } else {
      await handleCreateTask();
    }
  };
  
  const handleCreateTask = async (e = null) => {
    if (e) e.preventDefault();
    const storedUser = localStorage.getItem('user');

    if (!taskForm.title || !taskForm.description || !taskForm.dueDate || !taskForm.assignedTo || !storedUser) {
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: 'Please fill out all required fields'
      });
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
      if (!currentUser || !currentUser._id) {
        console.error('Current user data is incomplete');
        addNotification({
          id: uuidv4(),
          type: 'error',
          title: 'Error',
          message: 'Your user information is incomplete. Please log out and log back in.'
        });
        return;
      }
    } catch (error) {
      console.error("Failed to parse current user from localStorage:", error);
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: 'Could not read your user information. Please log out and log back in.'
      });
      return;
    }

    const taskData = {
      title: taskForm.title,
      description: taskForm.description,
      dueDate: new Date(taskForm.dueDate).toISOString(),
      priority: taskForm.priority.toLowerCase(),
      status: taskForm.status.toLowerCase(),
      assignedTo: taskForm.assignedTo,
      createdBy: currentUser._id
    };

    try {
      const response = await fetchWithAuth('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });
      const newTask = await response.json();

      if (response.ok) {
        fetchTasks();
        resetForm();
        addNotification({
          id: uuidv4(),
          type: 'success',
          title: 'Success',
          message: 'Task created successfully'
        });
      } else {
        console.error('Failed to create task:', newTask.message || newTask);
        addNotification({
          id: uuidv4(),
          type: 'error',
          title: 'Error',
          message: newTask.message || 'Failed to create task'
        });
      }
    } catch (error) {
      console.error('Failed to create task', error);
      addNotification({
        id: uuidv4(),
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create task'
      });
    }
  };

  const getFilteredTasks = () => {
    if (!user) return [];
    
    const today = new Date();
    const searchLower = searchQuery.toLowerCase();
    
    return tasks.filter(task => {
      const matchesSearch = 
        searchQuery === '' || 
        task.title?.toLowerCase().includes(searchLower) || 
        task.description?.toLowerCase().includes(searchLower);
      
      const matchesPriority = 
        priorityFilter === 'all' || 
        task.priority?.toLowerCase() === priorityFilter.toLowerCase();
      
      if (!matchesSearch || !matchesPriority) return false;
      
      switch (activeTab) {
        case 'assigned':
          return task.assignedTo === user.username;
        case 'created':
          return task.createdBy && task.createdBy._id === user._id;
        case 'overdue':
          return task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed';
        default:
          return true;
      }
    });
  };

  const filteredTasks = getFilteredTasks();

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/10 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'in progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'todo': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  if (isLoading) {
    return (
      <div className="bg-black min-h-screen text-white">
        <header className="bg-black border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-4 py-6 flex justify-between items-center">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-32 bg-white/10 rounded-full animate-pulse"></div>
              <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </header>
        <div className="container mx-auto p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full md:w-1/2 h-12 bg-white/10 rounded-lg animate-pulse"></div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="bg-white/5 rounded-lg border border-white/10 p-5 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-6 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-6 w-16 bg-white/10 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-white/10 rounded"></div>
                  <div className="h-4 w-2/3 bg-white/10 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-white/10 rounded"></div>
                  <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white transition-colors duration-500">
      <Notification notifications={notifications} onClose={removeNotification} />
      <header className="bg-black border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Task Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/20 shadow">
                <div className="bg-white/20 text-white p-2 rounded-full">
                  <User size={18} />
                </div>
                <span className="font-medium text-white/90">{user.username || user.email}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="bg-red-600/70 hover:bg-red-600/50 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-white/20 shadow">
              <X size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-white/40" />
            </div>
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-black border border-white/20 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-white/40 transition-all duration-200 shadow"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative">
              <button
                onClick={() => setShowPriorityFilter(!showPriorityFilter)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 shadow"
              >
                <Filter size={18} />
                Priority
              </button>
              {showPriorityFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-black/90 rounded-lg shadow-lg border border-white/20 z-10">
                  <div className="p-2">
                    <div 
                      className={`px-4 py-2 text-sm rounded cursor-pointer ${priorityFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('all');
                        setShowPriorityFilter(false);
                      }}
                    >
                      All Priorities
                    </div>
                    <div 
                      className={`px-4 py-2 text-sm rounded cursor-pointer ${priorityFilter === 'high' ? 'bg-white/10 text-red-400' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('high');
                        setShowPriorityFilter(false);
                      }}
                    >
                      High Priority
                    </div>
                    <div 
                      className={`px-4 py-2 text-sm rounded cursor-pointer ${priorityFilter === 'medium' ? 'bg-white/10 text-yellow-400' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('medium');
                        setShowPriorityFilter(false);
                      }}
                    >
                      Medium Priority
                    </div>
                    <div 
                      className={`px-4 py-2 text-sm rounded cursor-pointer ${priorityFilter === 'low' ? 'bg-white/10 text-green-400' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('low');
                        setShowPriorityFilter(false);
                      }}
                    >
                      Low Priority
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-700/70 hover:bg-blue-700/50 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-white/20 shadow"
            >
              <Plus size={18} />
              Add Task
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-black rounded-lg border border-gray-800 mb-6 p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-white">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={handleSubmitTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Title*</label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleInputChange}
                  placeholder="Task Title"
                  required
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-gray-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Description*</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleInputChange}
                  placeholder="Task Description"
                  required
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-gray-500 min-h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Due Date*</label>
                <input
                  type="date"
                  name="dueDate"
                  value={taskForm.dueDate}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  name="priority"
                  value={taskForm.priority}
                  onChange={handleInputChange}
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Assignee*</label>
                <select
                  name="assignedTo"
                  value={taskForm.assignedTo}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white"
                >
                  <option value="">Select Assignee</option>
                  {users.map(user => (
                    <option key={user._id} value={user.username}>{user.username || user.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  name="status"
                  value={taskForm.status}
                  onChange={handleInputChange}
                  className="w-full bg-black border border-gray-800 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white"
                >
                  <option value="todo">Todo</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-white hover:bg-gray-200 text-black px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
                  >
                    {isEditing ? (
                      <>
                        <CheckCircle size={18} />
                        Update Task
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Create Task
                      </>
                    )}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
                    >
                      <X size={18} />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6 bg-black rounded-lg border border-gray-800 overflow-hidden">
          <div className="flex border-b border-gray-800 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`py-3 px-6 flex items-center gap-2 font-medium transition-colors duration-200 ${
                activeTab === 'all' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Inbox size={18} />
              All Tasks ({tasks.length})
              {priorityFilter !== 'all' && (
                <span className="text-xs bg-gray-700 rounded-full px-2 py-0.5">
                  {priorityFilter}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('assigned')} 
              className={`py-3 px-6 flex items-center gap-2 font-medium transition-colors duration-200 ${
                activeTab === 'assigned' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={18} />
              Assigned to Me
            </button>
            <button 
              onClick={() => setActiveTab('created')} 
              className={`py-3 px-6 flex items-center gap-2 font-medium transition-colors duration-200 ${
                activeTab === 'created' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle size={18} />
              Created by Me
            </button>
            <button 
              onClick={() => setActiveTab('overdue')} 
              className={`py-3 px-6 flex items-center gap-2 font-medium transition-colors duration-200 ${
                activeTab === 'overdue' 
                  ? 'text-red-400 border-b-2 border-red-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <AlertCircle size={18} />
              Overdue
            </button>
          </div>
        </div>

        {isTaskLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="bg-white/5 rounded-lg border border-white/10 p-5 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-6 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-6 w-16 bg-white/10 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-white/10 rounded"></div>
                  <div className="h-4 w-2/3 bg-white/10 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-white/10 rounded"></div>
                  <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-black rounded-lg border border-white/10 p-8 text-center">
            <Clock size={48} className="mx-auto text-white/40 mb-4" />
            <h3 className="text-xl font-medium text-white/70 mb-1">No tasks found</h3>
            <p className="text-white/50">
              {searchQuery ? 'Try adjusting your search query' : 'Create a new task to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => {
              const isValidDate = task.dueDate && !isNaN(new Date(task.dueDate).getTime());
              const dueDate = isValidDate ? new Date(task.dueDate) : null;
              const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
              
              return (
                <motion.div 
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`bg-white/5 rounded-lg border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20 ${
                    isDeleting === task._id ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-bold text-white truncate">{task.title || 'No Title'}</h2>
                      <span className={`text-xs font-medium rounded-full px-2 py-1 border ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'N/A'}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 mb-4 line-clamp-2">{task.description || 'No Description'}</p>
                    
                    <div className="flex flex-wrap gap-y-2 mb-4">
                      <div className="w-full flex items-center gap-2">
                        <Clock size={16} className={isOverdue ? 'text-red-400' : 'text-gray-500'} />
                        <span className={isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}>
                          {isValidDate 
                            ? `Due: ${dueDate.toLocaleDateString()}` 
                            : 'Invalid Date'}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      </div>
                      
                      <div className="w-full">
                        <span className={`text-xs font-medium rounded-full px-2 py-1 border ${getStatusColor(task.status)}`}>
                          {task.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-sm text-gray-400">
                      <p>Created by: {task.createdBy ? (task.createdBy.username || task.createdBy.email) : 'N/A'}</p>
                      <p>Assigned to: {task.assignedTo || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800 px-5 py-3 bg-black flex">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="w-1/2 text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                      disabled={isDeleting === task._id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </button>
                    <div className="w-px bg-gray-800"></div>
                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="w-1/2 text-red-400 hover:text-red-300 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                      disabled={isDeleting === task._id}
                    >
                      <Trash2 size={16} />
                      {isDeleting === task._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}