import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import Pusher from 'pusher-js';
import axios from 'axios';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, FacebookAuthProvider, OAuthProvider, GithubAuthProvider } from "firebase/auth";
import './App.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1W-nD7IWXAB91babFjH9ay-J4IgySHGY",
  authDomain: "interesthub-eddb3.firebaseapp.com",
  projectId: "interesthub-eddb3",
  storageBucket: "interesthub.eddb3.firebasestorage.app",
  messagingSenderId: "199981598306",
  appId: "1:199981598306:web:8a229e4ebf4c4070fcf33b",
  measurementId: "G-TKNVYQP5LH"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user'); // Add necessary scopes for GitHub login

// Add the PopupConfirm component
const PopupConfirm = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
  if (!isOpen) return null;
  
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="popup-actions">
          <button 
            className="popup-btn popup-cancel-btn"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="popup-btn popup-confirm-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple alert popup component
const AlertPopup = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;
  
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="popup-actions">
          <button 
            className="popup-btn popup-confirm-btn"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// New ReactionButton component
const ReactionButton = memo(({ messageId, username, group, onReactionClick }) => {
  const reactions = ["👍", "❤️", "😂", "😮", "🔥", "🎉", "👏", "🤔"]

  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div className="reaction-container">
      <button 
        onClick={() => setShowPicker(!showPicker)} 
        className="reaction-btn"
        title="Add reaction"
      >
        "👉 Click to React! 🎭"

      </button>
      
      {showPicker && (
        <div className="reaction-picker">
          {reactions.map(emoji => (
            <button 
              key={emoji}
              className="reaction-emoji-btn" 
              onClick={() => {
                onReactionClick(messageId, emoji);
                setShowPicker(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const App = () => {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('general');
  const [file, setFile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [defaultGroups] = useState([
    'general',"health", "finance", "education", "science", "business",
    "travel", "productivity", "ai-tech", "cybersecurity",
    "mental-health", "personal-development", "news-politics",
    "investing", "self-care", "career-growth"
  ]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const fileInputRef = React.useRef(null);  // Add this line
  const [fileType, setFileType] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const chatBoxRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pusherRef = useRef(null);
  const messageListRef = useRef([]);  // Add this for message caching
  const [previewFile, setPreviewFile] = useState(null); // Renamed from previewImage
  const [previewType, setPreviewType] = useState(null); // Added to track preview type
  const [isSending, setIsSending] = useState(false); // State to track if a message is being sent
  const [user, setUser] = useState(null); // Track authenticated user

  // Add state for popup
  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const [alertPopup, setAlertPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
  });
  
  // Helper to show confirmation popup
  const showConfirm = (title, message, onConfirm) => {
    setConfirmPopup({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };
  
  // Helper to show alert popup
  const showAlert = (title, message) => {
    setAlertPopup({
      isOpen: true,
      title,
      message,
    });
  };

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch groups function
  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const response = await axios.get('http://localhost:5000/groups');
      if (response.data && response.data.groups) {
        setGroups(response.data.groups);
      } else {
        // Fallback to default groups if API fails
        setGroups(defaultGroups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups(defaultGroups);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Create new group
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      showAlert('Error', 'Please enter a group name');
      return;
    }

    try {
      console.log('Creating group:', newGroupName.trim());
      const response = await axios.post('http://localhost:5000/groups', {
        name: newGroupName.trim(),
        username: username // Include username when creating a group
      });

      if (response.data.success) {
        console.log('Group created successfully:', response.data);
        // Add the new group to the list
        setGroups(prevGroups => [...prevGroups, newGroupName.trim()]);
        // Switch to the new group
        setGroup(newGroupName.trim());
        // Close the modal
        setShowCreateGroup(false);
        setNewGroupName('');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      
      // Show more detailed error message
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        console.error('Server response:', error.response.data);
        
        if (error.response.status === 409) {
          showAlert('Error', 'A group with this name already exists');
        } else {
          showAlert('Error', `Failed to create group: ${error.response.data.error || 'Unknown error'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        showAlert('Connection Error', 'No response received from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        showAlert('Error', 'An error occurred while setting up the request: ' + error.message);
      }
    }
  };

  // Add a function to initialize the database if needed
  const initializeDatabase = async () => {
    try {
      console.log('Initializing database...');
      await axios.post('http://localhost:5000/setup/groups-table');
      console.log('Database initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  };

  // Call this function when the app loads
  useEffect(() => {
    initializeDatabase();
    fetchGroups();
  }, []);

  // Delete group (only for custom groups)
  const deleteGroup = async (groupName) => {
    if (defaultGroups.includes(groupName)) {
      showAlert('Cannot Delete', 'Cannot delete default groups');
      return;
    }

    showConfirm(
      'Delete Group',
      `Are you sure you want to delete the group: ${groupName}?`,
      async () => {
        try {
          const response = await axios.delete(`http://localhost:5000/groups/${groupName}`);
          if (response.data.success) {
            // Remove from groups list
            setGroups(prevGroups => prevGroups.filter(g => g !== groupName));
            
            // If we're in the deleted group, switch to general
            if (group === groupName) {
              setGroup('general');
            }
          }
        } catch (error) {
          console.error('Error deleting group:', error);
          showAlert('Error', 'Failed to delete group');
        }
      }
    );
  };

  useEffect(() => {
    // Initialize Pusher only once
    pusherRef.current = new Pusher('e916d48bd4a364640323', {
      cluster: 'ap2',
      encrypted: true,
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Fetch past messages for the selected group
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/messages/${group}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    const channel = pusherRef.current.subscribe(`chat-channel-${group}`);
    
    channel.bind('new-message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Listen for delete-message events
    channel.bind('delete-message', (data) => {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== data.id));
    });

    // Listen for reaction updates
    channel.bind("reaction-update", (data) => {
      if (!data.message_id) {
        console.error("Received reaction without message_id:", data);
        return;
      }

      setMessages((prevMessages) => {
        return prevMessages.map(msg => {
          if (msg.id === data.message_id) {
            // Initialize reactions array if it doesn't exist
            const reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
            reactions.push(data.reaction);
            
            return {
              ...msg,
              reactions
            };
          }
          return msg;
        });
      });
    });

    // Cleanup subscription on group change or component unmount
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [group]);

  useEffect(() => {
    if (chatBoxRef.current) {
      // Automatically scroll to the bottom when new messages are added
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (isSending) return; // Prevent duplicate submissions
    if (username.trim() === '' || (message.trim() === '' && !file)) {
      console.error("Username or message is missing.");
      return;
    }

    setIsSending(true); // Set sending state to true

    let fileUrl = null;
    let fileMediaType = null;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const uploadResponse = await axios.post('http://localhost:5000/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        if (uploadResponse.data && uploadResponse.data.url) {
          fileUrl = uploadResponse.data.url;
          fileMediaType = uploadResponse.data.file_type; // Get file type from response
        } else {
          console.error("Upload failed:", uploadResponse.data);
          setIsSending(false); // Reset sending state
          return;
        }
      } catch (error) {
        console.error('Upload error:', error.response?.data || error.message);
        setIsSending(false); // Reset sending state
        return;
      } 
    }

    try {
      const messageData = {
        username,
        message: message.trim(),
        group,
        file_url: fileUrl,
        file_type: fileMediaType,
        created_at: new Date().toISOString() // Add timestamp
      };

      const response = await axios.post('http://localhost:5000/messages', messageData);
      
      if (response.data.success) {
        setMessage('');
        setFile(null);
        setFileType(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('Failed to send message:', response.data);
      }
    } catch (error) {
      console.error('Message error:', error.response?.data || error.message);
    } finally {
      setIsSending(false); // Reset sending state
    }
  };

  const deleteMessage = async (messageId) => {
    if (!messageId) {
      console.error("Invalid messageId passed to deleteMessage");
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5000/messages/${messageId}`, {
        params: { username }, // Pass the username as a query parameter
      });
  
      if (response.data.success) {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
        console.log("Message deleted successfully");
      } else {
        console.error("Failed to delete message:", response.data.error);
      }
    } catch (error) {
      console.error("Error deleting message:", error.response?.data || error.message);
    }
  };

  // Add handleReaction function in the App component
  const handleReaction = async (messageId, reaction) => {
    if (!username.trim()) {
      showAlert('Error', 'Please enter your name before reacting');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/messages/${messageId}/react`, {
        reaction,
        username,
        group
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTyping = useCallback((e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  const handleEmojiClick = (e) => {
    e.preventDefault(); // Prevent page refresh
    setShowEmoji(!showEmoji);
  };

  const addEmoji = (emojiData) => {
    const emoji = emojiData.native;
    setMessage(message + emoji);
    setShowEmoji(false);
  };

  const handleFileClick = (fileUrl, type) => {
    setPreviewFile(fileUrl); // Set the file to preview
    setPreviewType(type); // Set the file type (image or video)
  };

  const closePreview = () => {
    setPreviewFile(null); // Close the preview modal
    setPreviewType(null);
  };

  const handleDownload = async (fileUrl) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Extract file name from URL
      let fileName = fileUrl.split('/').pop().split('?')[0];
      if (!fileName) {
        // Fallback if we couldn't get the filename
        const fileType = blob.type.split('/')[1];
        fileName = `download.${fileType}`;
      }
      
      // Create a temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      
      // Add to body, click, then remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up after download starts
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error("Error downloading file:", error);
      // Fallback method
      try {
        const downloadLink = document.createElement('a');
        downloadLink.href = fileUrl;
        downloadLink.download = fileUrl.split('/').pop().split('?')[0] || 'download';
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          document.body.removeChild(downloadLink);
        }, 100);
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
        alert("Download failed. Try right-clicking on the file and select 'Save As'.");
      } 
    }
  };

  const MessageDisplay = useMemo(() => {
    return React.memo(({ msg, username, onDelete }) => {
      const handleFileLoad = () => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
      };

      // Determine file type
      let fileType = msg.file_type; // Use the file_type if provided by the server
      if (!fileType) {
        // Fallback detection if server didn't provide file_type
        if (msg.video_url) fileType = 'video';
        else if (msg.image_url) {
          // Check if this is actually a video stored in image_url (fallback method)
          if (msg.message && msg.message.includes("[VIDEO]")) {
            fileType = 'video';
          } else {
            fileType = 'image';
          }
        } else if (msg.audio_url) {
          fileType = 'audio';
        }
      }
      
      // Get the appropriate URL based on file type
      let fileUrl = null;
      if (fileType === 'video') {
        fileUrl = msg.video_url || msg.image_url; // Try video_url first, fall back to image_url
      } else if (fileType === 'image') {
        fileUrl = msg.image_url;
      } else if (fileType === 'audio') {
        fileUrl = msg.audio_url;
      }        

      // Remove the [VIDEO] text from the displayed message if present
      const displayMessage = msg.message?.replace(/\n\[VIDEO\]/g, '') || '';
      
      // Format reactions for display
      const renderReactions = () => {
        if (!msg.reactions || msg.reactions.length === 0) return null;
        
        // Count occurrences of each reaction
        const reactionCounts = msg.reactions.reduce((acc, reaction) => {
          acc[reaction] = (acc[reaction] || 0) + 1;
          return acc;
        }, {});
        
        return (
          <div className="message-reactions">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <div key={emoji} className="reaction-badge">
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{count}</span>
              </div>
            ))}
          </div>
        );
      };

      return (
        <div className={`chat-message ${msg.username === username ? "sent" : "received"}`}>
          <div className="message-content">
            <div className="message-header">
              <span className="message-username">{msg.username}</span>
              <span className="message-time">
                {formatTime(msg.created_at || new Date())}
              </span>
            </div>
            <div className="message-text">{displayMessage}</div>
            {fileUrl && fileType === 'image' && (
              <div className="image-container">
                <img 
                  src={fileUrl} 
                  alt="Sent" 
                  className="chat-image"
                  onLoad={handleFileLoad}
                  onClick={() => handleFileClick(fileUrl, 'image')}
                  onError={(e) => {
                    console.error('Image failed to load:', fileUrl);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            {fileUrl && fileType === 'video' && (
              <div className="video-container">
                <div className="video-preview" onClick={() => handleFileClick(fileUrl, 'video')}>
                  <div className="video-play-button">
                    <i className="play-icon">▶</i>
                  </div>
                  <video 
                    className="chat-video-thumbnail" 
                    preload="metadata"
                    onLoadedMetadata={handleFileLoad}
                    muted
                    controls
                  >
                    <source src={fileUrl} type="video/mp4" />
                    <source src={fileUrl} type="video/webm" />
                    <source src={fileUrl} type="video/ogg" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
            {fileUrl && fileType === 'audio' && (
              <div className="audio-container">
                <audio 
                  className="chat-audio"
                  controls
                  preload="metadata"
                  onLoadedMetadata={handleFileLoad}
                >
                  <source src={fileUrl} type="audio/mpeg" />
                  <source src={fileUrl} type="audio/wav" />
                  <source src={fileUrl} type="audio/ogg" />
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
            <div className="message-status">
              {msg.username === username && <span>✓✓</span>}
            </div>
            <div className="message-footer">
              {renderReactions()}
              <ReactionButton
                messageId={msg.id}
                username={username}
                group={msg.group_name || 'general'}
                onReactionClick={handleReaction}
              />
              {msg.username === username && (
                <button onClick={() => onDelete(msg.id)} className="delete-btn">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
  }, [handleReaction]);

  // Ensure deleteMessage is called with a valid messageId
  const messageList = useMemo(() => {
    return messages
      .filter((msg) => msg.id) // Filter out messages without a valid `id`
      .map((msg, index) => (
        <MessageDisplay
          key={msg.id || index}
          msg={msg}
          username={username}
          onDelete={(messageId) => deleteMessage(messageId)}
        />
      ));
  }, [messages, username]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Set file type based on MIME type
      if (selectedFile.type.startsWith('image/')) {
        setFileType('image');
      } else if (selectedFile.type.startsWith('video/')) {
        setFileType('video');
      } else if (selectedFile.type.startsWith('audio/')) {
        setFileType('audio');
      } else {
        setFileType(null);
        setFile(null);
        alert('Only image, video, and audio files are supported.');
      }
    }
  };

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUsername(currentUser.email.split('@')[0]); // Set username to email username
      } else {
        setUser(null);
        setUsername('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (provider) => {
    try {
      if (provider instanceof GithubAuthProvider) {
        // Ensure GitHub login uses the correct OAuth flow
        provider.setCustomParameters({
          allow_signup: 'true', // Allow users to sign up if they don't have an account
        });
      }
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to log in. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Welcome to InterestHub</h2>
          <p className="auth-description">Connect with your favorite groups and start chatting!</p>
          <button onClick={() => handleLogin(provider)} className="auth-btn google-btn">
            Login with Google
          </button>
          <button onClick={() => handleLogin(facebookProvider)} className="auth-btn facebook-btn">
            Login with Facebook
          </button>
          <button onClick={() => handleLogin(microsoftProvider)} className="auth-btn microsoft-btn">
            Login with Microsoft
          </button>
          <button onClick={() => handleLogin(githubProvider)} className="auth-btn github-btn">
            Login with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="auth-header">
        <div className="user-info">
          <img 
            src={"https://th.bing.com/th/id/OIP.e1KNYwnuhNwNj7_-98yTRwHaF7?rs=1&pid=ImgDetMain"} 
            alt="Profile" 
            className="profile-icon" 
          />
          <span>{user.displayName || user.email.split('@')[0]}</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
      <h2>InterestHub</h2>
      <div className="group-header">
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="group-select"
          disabled={isLoadingGroups}
        >
          {isLoadingGroups ? (
            <option value="loading">Loading groups...</option>
          ) : (
            <>
              <optgroup label="Default Groups">
                {defaultGroups.map((grp) => (
                  <option key={grp} value={grp}>{grp.replace(/_/g, ' ')}</option>
                ))}
              </optgroup>
              
              {groups.filter(g => !defaultGroups.includes(g)).length > 0 && (
                <optgroup label="Custom Groups">
                  {groups
                    .filter(g => !defaultGroups.includes(g))
                    .map((grp) => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))
                  }
                </optgroup>
              )}
            </>
          )}
        </select>
        <button 
          className="add-group-btn"
          onClick={() => setShowCreateGroup(true)}
          title="Create New Group"
        >
          +
        </button>
      </div>

      {/* Group Creation Modal */}
      {showCreateGroup && (
        <div className="group-modal">
          <div className="group-modal-content">
            <h3>Create New Group</h3>
            <input
              type="text"
              placeholder="Enter group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)} 
              className="input-field" 
            />
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn" 
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn" 
                onClick={createGroup}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Management */}
      {!isLoadingGroups && groups.filter(g => !defaultGroups.includes(g)).length > 0 && (
        <div className="group-actions">
          {groups
            .filter(g => !defaultGroups.includes(g))
            .map((grp) => (
              <div key={grp} className="custom-group-tag">
                {grp}
                <button 
                  className="delete-group-btn" 
                  onClick={() => deleteGroup(grp)}
                  title="Delete group"
                >
                  ×
                </button>
              </div>
            ))
          }
        </div>
      )}

      <div className="chat-header">
        <input
          type="text"
          value={username} // Username is fixed
          readOnly // Prevent changes
          className="input-field"
        />
      </div>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div className="welcome-message">
            <i className="welcome-icon">💡 share your thoughts!</i>
            <p>Welcome to InterestHub! Start chatting by sending a message.</p>
          </div>
        ) : (
          messageList
        )}
        {isTyping && <div className="typing-indicator">Someone is typing...</div>}
      </div>
      {/* File Preview Modal */}
      {previewFile && (
        <div className="file-preview-modal" onClick={closePreview}>
          <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
            {previewType === 'image' && (
              <img src={previewFile} alt="Preview" className="image-preview" />
            )}
            {previewType === 'video' && (
              <video className="video-preview" controls autoPlay playsInline>
                <source src={previewFile} type="video/mp4" />
                <source src={previewFile} type="video/webm" />
                <source src={previewFile} type="video/ogg" />
                Your browser does not support the video tag.
              </video>
            )}
            <div className="preview-actions">
              <button
                className="download-btn"
                onClick={() => handleDownload(previewFile)}
              >
                Download
              </button>
            </div>
            <button className="close-btn" onClick={closePreview}>✕</button>
          </div>
        </div>
      )}
      <div className="input-container">
        <button 
          type="button" // Add type="button" to prevent form submission
          className="emoji-btn"
          onClick={handleEmojiClick}
        >
          😊
        </button>
        {showEmoji && (
          <div className="emoji-picker-container">
            <Picker 
              data={data}
              onEmojiSelect={addEmoji}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        )}
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          className="input-field"
        />
        <input
          type="file"
          accept="image/*,video/*,audio/*" // Add audio to accepted file types
          onChange={handleFileChange}
          className="input-field"
          ref={fileInputRef}  // Add this line
        />
        <button 
          onClick={sendMessage} 
          className="send-btn" 
          disabled={isSending} // Disable button while sending
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
      {/* Add popup components at the end of the component return */}
      <PopupConfirm 
        isOpen={confirmPopup.isOpen}
        onClose={() => setConfirmPopup(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmPopup.onConfirm}
        title={confirmPopup.title}
        message={confirmPopup.message}
      />
      <AlertPopup 
        isOpen={alertPopup.isOpen}
        onClose={() => setAlertPopup(prev => ({ ...prev, isOpen: false }))}
        title={alertPopup.title}
        message={alertPopup.message}
      />
    </div>
  );
};

export default memo(App);
