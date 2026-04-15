self.addEventListener('push', function (event) {
    if (event.data) {
      const data = event.data.json();
      const options = {
        body: data.body,
        // If you add a favicon later, name it icon.png and put it in the public folder!
        icon: '/icon.png', 
        badge: '/icon.png',
        vibrate: [100, 50, 100],
      };
      
      // Tell the browser to hold the service worker alive until the notification is shown
      event.waitUntil(self.registration.showNotification(data.title, options));
    }
  });
  
  self.addEventListener('notificationclick', function (event) {
    // Close the notification when the user clicks it
    event.notification.close();
    
    // Open the Fotion app in a new tab if it isn't already open
    event.waitUntil(clients.openWindow('/'));
  });