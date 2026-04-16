// Listen for the push event from Apple/Google in the background
self.addEventListener('push', function(event) {
    if (event.data) {
      const data = event.data.json(); 
      
      const options = {
        body: data.body,
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
        }
      };
  
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    }
  });
  
  // Listen for when the user taps the notification banner
  self.addEventListener('notificationclick', function(event) {
    event.notification.close(); 
    
    event.waitUntil(
      clients.openWindow('/')
    );
  });