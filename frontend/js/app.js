// Import the message deletion functionality
// Add this near your other imports
document.addEventListener('DOMContentLoaded', function() {
  // Load the delete functionality script
  const deleteScript = document.createElement('script');
  deleteScript.src = 'js/message-delete.js';
  document.head.appendChild(deleteScript);

  // Load the delete styles
  const deleteStyles = document.createElement('link');
  deleteStyles.rel = 'stylesheet';
  deleteStyles.href = 'css/message-delete.css';
  document.head.appendChild(deleteStyles);
});

// Update your message rendering function to add delete buttons
function renderMessage(message, prepend = false) {
  // ...existing message rendering code...

  const messageElement = document.createElement('div');
  messageElement.className = 'message-item';
  messageElement.dataset.messageId = message.id; // Important: Add this data attribute for deletion
  
  // ...existing code to build the message element...

  // Add delete button if the message belongs to the current user
  const currentUsername = localStorage.getItem('username');
  addDeleteButtonToMessage(messageElement, message, currentUsername);

  // ...existing code to append/prepend message to container...

  return messageElement;
}

// Add Pusher event listener for message deletion
// Add this with your other Pusher channel subscriptions
channel.bind('delete-message', function(data) {
  handleMessageDeletion(data);
});