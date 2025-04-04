/**
 * Message deletion functionality
 * This file contains the functions needed to add delete buttons to messages
 * and handle the deletion process.
 */

// Add this to your main JS file after message rendering logic
function addDeleteButtonToMessage(messageElement, message, currentUsername) {
    // Only add delete button to user's own messages
    if (message.username === currentUsername) {
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-message-btn';
        deleteButton.innerHTML = '🗑️';
        deleteButton.title = 'Delete message';
        
        // Add click handler
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            if (confirm('Are you sure you want to delete this message? This cannot be undone.')) {
                deleteMessage(message.id, currentUsername, getCurrentGroup());
            }
        });
        
        // Add to message
        messageElement.appendChild(deleteButton);
    }
}

/**
 * Delete a message from Supabase
 */
function deleteMessage(messageId, username, group) {
    // Show loading state
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.classList.add('deleting');
    }
    
    // Make API request to delete
    fetch(`/messages/${messageId}?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete message');
        }
        return response.json();
    })
    .then(data => {
        console.log('Message deleted successfully:', data);
    })
    .catch(error => {
        console.error('Error deleting message:', error);
        alert('Failed to delete message. Please try again.');
        
        if (messageElement) {
            messageElement.classList.remove('deleting');
        }
    });
}

/**
 * Get the current active group
 */
function getCurrentGroup() {
    // This should return the name of the currently active chat group
    // Adjust this based on how you track the current group in your app
    const activeGroupElement = document.querySelector('.group-item.active');
    return activeGroupElement ? activeGroupElement.dataset.groupName : 'health';
}

/**
 * Handle message deletion events from Pusher
 */
function handleMessageDeletion(data) {
    const deletedMessageId = data.id;
    const messageElement = document.querySelector(`[data-message-id="${deletedMessageId}"]`);
    
    if (messageElement) {
        // Animate the removal
        messageElement.classList.add('deleted');
        setTimeout(() => {
            messageElement.remove();
        }, 500);
    }
}

// Add this to your CSS
// .delete-message-btn {
//   position: absolute;
//   top: 5px;
//   right: 5px;
//   background: transparent;
//   border: none;
//   cursor: pointer;
//   opacity: 0.5;
//   transition: opacity 0.2s;
// }
// 
// .delete-message-btn:hover {
//   opacity: 1;
// }
// 
// .message-item {
//   position: relative;
// }
// 
// .message-item.deleting {
//   opacity: 0.5;
// }
// 
// .message-item.deleted {
//   transform: scale(0.8);
//   opacity: 0;
//   transition: all 0.3s ease-out;
// }
