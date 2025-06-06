'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../lib/api';
import { Search, Inbox, CheckCircle, Clock, User, AlertCircle, Plus, X, Trash2, Filter, Bell, Check } from 'lucide-react';
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationRef = useRef(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  // Add formatTimestamp function
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/');
      return;
    }

    try {
      const currentUser = JSON.parse(storedUser);
      setUser(currentUser);
      fetchTasks();
      fetchUsers();
      setIsLoading(false);

      // Initialize socket connection
      const socket = initSocket(token);
      console.log('Socket initialized:', socket.connected);

      // Listen for task assignments
      socket.on('task:assigned', (data) => {
        console.log('Task assigned event received:', data);
        console.log('Current user:', currentUser);
        console.log('Task assigned to:', data.assignedTo);
        
        // Check if the task is assigned to the current user
        if (data.assignedTo === currentUser.username) {
          console.log('Creating notification for assigned task');
          const notification = {
            id: uuidv4(),
            type: 'info',
            title: 'New Task Assigned',
            message: `You have been assigned to "${data.title}"`,
            taskId: data._id,
            timestamp: new Date().toISOString(),
            read: false
          };
          addNotification(notification);
          setUnreadNotifications(prev => prev + 1);
        }
      });

      // Listen for task updates
      socket.on('task:updated', (data) => {
        console.log('Task updated event received:', data);
        if (data.assignedTo === currentUser.username) {
          const notification = {
            id: uuidv4(),
            type: 'info',
            title: 'Task Updated',
            message: `Task "${data.title}" has been updated`,
            taskId: data._id,
            timestamp: new Date().toISOString(),
            read: false
          };
          addNotification(notification);
          setUnreadNotifications(prev => prev + 1);
        }
      });

      // Listen for task completion
      socket.on('task:done', (data) => {
        console.log('Task done event received:', data);
        if (data.assignedTo === currentUser.username) {
          const notification = {
            id: uuidv4(),
            type: 'success',
            title: 'Task Done',
            message: `Task "${data.title}" has been marked as done`,
            taskId: data._id,
            timestamp: new Date().toISOString(),
            read: false
          };
          addNotification(notification);
          setUnreadNotifications(prev => prev + 1);
        }
      });

      // Add a test notification on component mount
      setTimeout(() => {
        const testNotification = {
          id: uuidv4(),
          type: 'info',
          title: 'Welcome',
          message: 'You are now connected to the task manager',
          timestamp: new Date().toISOString(),
          read: false
        };
        addNotification(testNotification);
        setUnreadNotifications(prev => prev + 1);
      }, 1000);

      return () => {
        console.log('Cleaning up socket connection');
        disconnectSocket();
      };
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/');
    }
  }, [router]);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add click outside handler for profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth('/api/users');
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchTasks = async () => {
    setIsTaskLoading(true);
    try {
      const response = await fetchWithAuth('/api/tasks');
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
      const response = await fetchWithAuth(`/api/tasks/${editingTaskId}`, {
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
      await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      setTimeout(() => {
        setTasks(prev => {
          // Ensure prev is an array before filtering
          if (!Array.isArray(prev)) {
            console.error('Tasks is not an array:', prev);
            return [];
          }
          return prev.filter(task => task._id !== taskId);
        });
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
      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });
      const newTask = await response.json();

      if (response.ok) {
        // Emit socket event for task assignment
        const socket = getSocket();
        if (socket) {
          socket.emit('task:created', {
            ...newTask,
            assignedTo: taskForm.assignedTo
          });
        }

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
    
    // Ensure tasks is always an array
    if (!Array.isArray(tasks)) {
      console.error('Tasks is not an array:', tasks);
      return [];
    }
    
    const today = new Date();
    const searchLower = searchQuery.toLowerCase();
    
    const filtered = tasks.filter(task => {
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
          return task.dueDate && new Date(task.dueDate) < today && task.status !== 'done';
        default:
          return true;
      }
    });

    // Sort tasks by creation date in reverse order (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a._id);
      const dateB = new Date(b.createdAt || b._id);
      return dateB - dateA;
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
      case 'done': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'in progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'todo': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const addNotification = (notification) => {
    console.log('Adding notification to state:', notification); // Debug log
    setNotifications(prev => {
      // Ensure prev is an array
      const prevArray = Array.isArray(prev) ? prev : [];
      const newNotifications = [notification, ...prevArray];
      console.log('New notifications state:', newNotifications); // Debug log
      return newNotifications;
    });
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      // Ensure prev is an array before filtering
      if (!Array.isArray(prev)) {
        console.error('Notifications is not an array:', prev);
        return [];
      }
      return prev.filter(notification => notification.id !== id);
    });
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadNotifications(0);
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
      <header className="bg-black border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            {/* Logo/Title - Left side */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">TaskZen</h1>

            {/* Profile and Notifications - Right side */}
            {user && (
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full border border-white/20 shadow relative"
                  >
                    <Bell size={20} />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotificationDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="fixed sm:absolute right-0 sm:right-auto mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-black/95 border border-white/20 rounded-lg shadow-lg z-50 max-h-[calc(100vh-8rem)] sm:max-h-96 overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-white/70" />
                          <span className="text-white/70 text-sm">
                            {unreadNotifications} unread {unreadNotifications === 1 ? 'notification' : 'notifications'}
                          </span>
                        </div>
                        {unreadNotifications > 0 && (
                          <button
                            onClick={markAllNotificationsAsRead}
                            className="text-white/70 hover:text-white text-sm flex items-center gap-1"
                          >
                            <Check size={14} />
                            <span className="hidden sm:inline">Mark all as read</span>
                            <span className="sm:hidden">Mark all</span>
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto max-h-[calc(100vh-12rem)] sm:max-h-80">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-white/50 text-sm">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 border-b border-white/10 hover:bg-white/5 transition-colors ${
                                !notification.read ? 'bg-white/5' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2">
                                    <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                                      notification.type === 'error' ? 'bg-red-400' :
                                      notification.type === 'success' ? 'bg-green-400' :
                                      'bg-blue-400'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-sm mb-1 truncate">{notification.title}</h3>
                                      <p className="text-sm text-white/70 break-words">{notification.message}</p>
                                      <p className="text-xs text-white/50 mt-1">
                                        {formatTimestamp(notification.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-1 flex-shrink-0">
                                  {!notification.read && (
                                    <button
                                      onClick={() => markNotificationAsRead(notification.id)}
                                      className="text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                      title="Mark as read"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                    title="Close"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-2 border-t border-white/10 bg-black/50">
                          <button
                            onClick={() => {
                              setNotifications([]);
                              setUnreadNotifications(0);
                            }}
                            className="w-full text-center text-white/50 hover:text-white text-sm py-1.5 hover:bg-white/5 rounded transition-colors"
                          >
                            Clear all notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-white/20 shadow transition-all duration-200"
                  >
                    <div className="bg-white/20 text-white p-1.5 sm:p-2 rounded-full">
                      <User size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </div>
                    <span className="hidden sm:inline font-medium text-white/90 text-sm sm:text-base w-40 truncate">{user.username || user.email}</span>
                  </button>

                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-black/95 border border-white/20 rounded-lg shadow-lg z-50"
                    >
                      <div className="p-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 text-white p-2 rounded-full">
                            <User size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{user.username || user.email}</p>
                            <p className="text-sm text-white/60 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowNotificationDropdown(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <Bell size={18} />
                          <span>Notifications</span>
                          {unreadNotifications > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadNotifications}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <X size={18} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="container mx-auto p-2 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-white/40" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-black border border-white/20 p-2.5 sm:p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-white/40 transition-all duration-200 shadow text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <button
                onClick={() => setShowPriorityFilter(!showPriorityFilter)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 shadow text-sm sm:text-base"
              >
                <Filter size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Priority</span>
                <span className="sm:hidden">Filter</span>
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
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded cursor-pointer ${priorityFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('all');
                        setShowPriorityFilter(false);
                      }}
                    >
                      All Priorities
                    </div>
                    <div 
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded cursor-pointer ${priorityFilter === 'high' ? 'bg-white/10 text-red-400' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('high');
                        setShowPriorityFilter(false);
                      }}
                    >
                      High Priority
                    </div>
                    <div 
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded cursor-pointer ${priorityFilter === 'medium' ? 'bg-white/10 text-yellow-400' : 'text-white/70 hover:bg-white/10'}`}
                      onClick={() => {
                        setPriorityFilter('medium');
                        setShowPriorityFilter(false);
                      }}
                    >
                      Medium Priority
                    </div>
                    <div 
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded cursor-pointer ${priorityFilter === 'low' ? 'bg-white/10 text-green-400' : 'text-white/70 hover:bg-white/10'}`}
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
              className="bg-blue-700/70 hover:bg-blue-700/50 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-white/20 shadow text-sm sm:text-base"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-black rounded-lg border border-gray-800 mb-4 sm:mb-6 p-4 sm:p-6 animate-fade-in">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={handleSubmitTask} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Title*</label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleInputChange}
                  placeholder="Task Title"
                  required
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-gray-500 text-sm sm:text-base"
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
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-gray-500 min-h-20 text-sm sm:text-base"
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
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  name="priority"
                  value={taskForm.priority}
                  onChange={handleInputChange}
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-sm sm:text-base"
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
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-sm sm:text-base"
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
                  className="w-full bg-black border border-gray-800 p-2 sm:p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-sm sm:text-base"
                >
                  <option value="todo">Todo</option>
                  <option value="in progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-white hover:bg-gray-200 text-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm sm:text-base"
                  >
                    {isEditing ? (
                      <>
                        <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                        Update Task
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                        Create Task
                      </>
                    )}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm sm:text-base"
                    >
                      <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="mb-4 sm:mb-6 bg-black rounded-lg border border-gray-800 overflow-hidden">
          <div className="flex border-b border-gray-800 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`py-2 sm:py-3 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 font-medium transition-colors duration-200 text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'all' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Inbox size={16} className="sm:w-[18px] sm:h-[18px]" />
              All Tasks ({tasks.length})
              {priorityFilter !== 'all' && (
                <span className="text-xs bg-gray-700 rounded-full px-1.5 sm:px-2 py-0.5">
                  {priorityFilter}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('assigned')} 
              className={`py-2 sm:py-3 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 font-medium transition-colors duration-200 text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'assigned' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={16} className="sm:w-[18px] sm:h-[18px]" />
              Assigned to Me
            </button>
            <button 
              onClick={() => setActiveTab('created')} 
              className={`py-2 sm:py-3 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 font-medium transition-colors duration-200 text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'created' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
              Created by Me
            </button>
            <button 
              onClick={() => setActiveTab('overdue')} 
              className={`py-2 sm:py-3 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 font-medium transition-colors duration-200 text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'overdue' 
                  ? 'text-red-400 border-b-2 border-red-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
              Overdue
            </button>
          </div>
        </div>

        {isTaskLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="bg-white/5 rounded-lg border border-white/10 p-4 sm:p-5 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 sm:h-6 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-5 sm:h-6 w-16 bg-white/10 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 sm:h-4 w-full bg-white/10 rounded"></div>
                  <div className="h-3 sm:h-4 w-2/3 bg-white/10 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 sm:h-4 w-1/2 bg-white/10 rounded"></div>
                  <div className="h-3 sm:h-4 w-1/3 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-black rounded-lg border border-white/10 p-6 sm:p-8 text-center">
            <Clock size={40} className="mx-auto text-white/40 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-white/70 mb-1">No tasks found</h3>
            <p className="text-white/50 text-sm sm:text-base">
              {searchQuery ? 'Try adjusting your search query' : 'Create a new task to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTasks.map(task => {
              const isValidDate = task.dueDate && !isNaN(new Date(task.dueDate).getTime());
              const dueDate = isValidDate ? new Date(task.dueDate) : null;
              const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
              
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
                  <div className="p-4 sm:p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate">{task.title || 'No Title'}</h2>
                      <span className={`text-xs font-medium rounded-full px-2 py-1 border ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'N/A'}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 mb-4 line-clamp-2 text-sm sm:text-base">{task.description || 'No Description'}</p>
                    
                    <div className="flex flex-wrap gap-y-2 mb-4">
                      <div className="w-full flex items-center gap-2">
                        <Clock size={14} className={`sm:w-[16px] sm:h-[16px] ${isOverdue ? 'text-red-400' : 'text-gray-500'}`} />
                        <span className={`text-sm sm:text-base ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
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
                    
                    <div className="flex flex-col gap-2 text-xs sm:text-sm text-gray-400">
                      <p>Created by: {task.createdBy ? (task.createdBy.username || task.createdBy.email) : 'N/A'}</p>
                      <p>Assigned to: {task.assignedTo || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800 px-4 sm:px-5 py-2 sm:py-3 bg-black flex">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="w-1/2 text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                      disabled={isDeleting === task._id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[16px] sm:h-[16px]">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </button>
                    <div className="w-px bg-gray-800"></div>
                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="w-1/2 text-red-400 hover:text-red-300 font-medium transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                      disabled={isDeleting === task._id}
                    >
                      <Trash2 size={14} className="sm:w-[16px] sm:h-[16px]" />
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