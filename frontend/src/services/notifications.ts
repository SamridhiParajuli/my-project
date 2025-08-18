// src/services/notifications.ts

/**
 * Check if browser notifications are supported and permission is granted
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  // Check if the browser supports notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications')
    return false
  }

  // Check if permission is already granted
  if (Notification.permission === 'granted') {
    return true
  }

  // Request permission if it's not denied
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Show a notification with the given title and body
 */
export const showNotification = (
  title: string,
  options: NotificationOptions = {}
): Notification | null => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications')
    return null
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted')
    return null
  }

  const defaultOptions: NotificationOptions = {
    body: '',
    icon: '/logo.png', // Add your company logo or icon here
    badge: '/logo.png',
    silent: false,
    ...options,
  }

  try {
    const notification = new Notification(title, defaultOptions)

    // Add click event to focus the window when notification is clicked
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Error showing notification:', error)
    return null
  }
}

/**
 * Schedule a notification to be shown at the given date
 * Returns a timeout ID that can be used to cancel the notification
 */
export const scheduleNotification = (
  title: string,
  date: Date,
  options: NotificationOptions = {}
): number => {
  const now = new Date()
  const timeUntilNotification = date.getTime() - now.getTime()

  // If the time is in the past, show immediately
  if (timeUntilNotification <= 0) {
    showNotification(title, options)
    return -1
  }

  // Schedule the notification
  return window.setTimeout(() => {
    showNotification(title, options)
  }, timeUntilNotification)
}

/**
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = (timeoutId: number): void => {
  window.clearTimeout(timeoutId)
}

export default {
  checkNotificationPermission,
  requestNotificationPermission,
  showNotification,
  scheduleNotification,
  cancelScheduledNotification,
}