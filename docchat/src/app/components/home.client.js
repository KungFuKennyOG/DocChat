'use client'

import { db } from '../firebase/firebaseConfig';
import { Container, Box, List, ListItemButton, ListItemText, TextField, Button, Typography, AppBar, Toolbar, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListItem, CircularProgress, InputAdornment, Snackbar, Card, createTheme, ThemeProvider } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, arrayUnion, serverTimestamp, orderBy, doc, updateDoc } from "firebase/firestore";
import { getStorage, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import AttachmentIcon from '@mui/icons-material/Attachment';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { defaultTheme } from '../layout';

export default function HomeComponent() {

    /*
     Brief description of the data model used in the chatting system.
     -> Each chat is stored as a document that has a unique ID, the list of users involved, and also the latest message sent timestamp.
     -> Each message is stored in a collection which stores all the messages in the chat app, but each message document has their own 'Chat ID' which specifies which chat it is in.
     -> Each message must either contain a text and/or attachment, sender info, and timestamp info.
     -> Each attachment (pdf/images) is stored in the storage, and has a link to directly retrieve it (download).
     -> Depending on whether or not a message has an attachment, and what type the attachment is, the message visual form will differ respectively to best show the attachment.
    */

const [username, setUsername] = useState('');
const [isLogInPressed, setIsLoginPressed] = useState(false);
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [chats, setChats] = useState([]);
const [selectedChat, setSelectedChat] = useState(null);
const [message, setMessage] = useState('');
const [messages, setMessages] = useState([]);
const [openDialog, setOpenDialog] = useState(false);
const [newChatUsername, setNewChatUsername] = useState('');
const [loading, setLoading] = useState(true);
const [attachment, setAttachment] = useState(null);
const fileInputRef = useRef(null);
const [openSnackBar, setOpenSnackBar] = useState(false);
const [isUploading, setIsUploading] = useState(false);


useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setIsLoggedIn(true);
      fetchChats(storedUsername);
    }
  }, []);

const fetchChats = (username) => {
    setLoading(true);
    const chatsRef = query(collection(db, 'chats'), where('users', 'array-contains', username), orderBy('latestMessageAt', 'desc'));

    onSnapshot(chatsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastMessage: doc.data().messages?.slice(-1)[0] || null
        }));
        const sortedData = data.sort((a, b) => (b.latestMessageAt || new Date(0)) - (a.latestMessageAt || new Date(0)));
        setChats(sortedData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
    });
};

  const selectChat = (chat) => {
    setSelectedChat(chat);
    const messagesRef = query(collection(db, 'messages'), where('chatId', '==', chat.id), orderBy('timestamp', 'asc'));
    onSnapshot(messagesRef, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : (new Date()).toLocaleString()
      }));
      setMessages(messagesData);
    });
  };  

  const handleLogin = () => {
    localStorage.setItem('username', username);
    setIsLoggedIn(true);
    fetchChats(username);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setChats([]);
    setSelectedChat(null);
  };

  const handleOpenNewChatDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseNewChatDialog = () => {
    setOpenDialog(false);
  };

  const handleAttachment = async (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg" || file.type === "application/pdf")) {
      setAttachment({
        file: file,
        name: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'IMAGE'
      });
    } else {
      setOpenSnackBar(true);
    }
  };

  const uploadFile = async () => {
        if (!attachment) return null;
        setIsUploading(true);
        const storage = getStorage();
        const storageRef = ref(storage, `attachments/${Date.now()}_${attachment.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, attachment.file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            setIsUploading(false);
            return { url: downloadURL, type: attachment.type, size: attachment.file.size };
        } catch (error) {
            setIsUploading(false);
            console.error("Error uploading file: ", error);
            return null;
        }
    };

  const handleSendMessage = async () => {
    if ((message.trim() || attachment) && selectedChat) {
      const fileInfo = await uploadFile();
      const messagesRef = collection(db, 'messages');
      const chatsRef = doc(db, 'chats', selectedChat.id);
      const newMessage = {
        chatId: selectedChat.id,
        sender: username,
        text: message,
        timestamp: serverTimestamp(),
        hasAttachment: !!fileInfo,
        attachmentType: fileInfo ? fileInfo.type : null,
        attachmentContent: fileInfo ? fileInfo.url : null,
        attachmentSize: fileInfo ? fileInfo.size : null,
      };

      try {
        await addDoc(messagesRef, newMessage);
        await updateDoc(chatsRef, {
          latestMessageAt: serverTimestamp()
        });
        setMessage('');
        setAttachment(null);
      } catch (error) {
        console.error("Error sending message: ", error);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleOpenAttachmentDialog = () => {
    if (!attachment) {
      fileInputRef.current.click();
    } else {
      handleRemoveAttachment();
    }
  };

  const handleCreateNewChat = async () => {
    if (newChatUsername) {
      const chatsRef = collection(db, 'chats');
      const newChat = {
        users: [username, newChatUsername],
        latestMessageAt: new Date()
      };
      await addDoc(chatsRef, newChat);
      setNewChatUsername('');
      handleCloseNewChatDialog();
    }
  };

  const extractFileName = (url) => {
    const matches = url.match(/%2F(.*?)\?/);
    if (matches && matches.length > 1) {
      return decodeURIComponent(matches[1]);
    }
    return url.split('/').pop().split('?')[0];
  };

  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  if (!isLoggedIn) {
    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', justifyContent: 'center' }}>
            <Card raised sx={{ minWidth: 275, boxShadow: 3, p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align='center' sx={{ mb: 4 }}>
                    DocChat
                </Typography>
                {!isLogInPressed ? (
                    <Button variant="contained" onClick={() => setIsLoginPressed(true)} fullWidth sx={{ padding: '10px 0' }}>
                        Login
                    </Button>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <TextField
                            label="Enter Username"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleLogin}
                            disabled={!username.trim()}
                            fullWidth
                            sx={{ padding: '10px 0', marginBottom: '12px' }}
                        >
                            Continue
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setIsLoginPressed(false)}
                            fullWidth
                            sx={{ padding: '10px 0' }}
                        >
                            Back
                        </Button>
                    </Box>
                )}
            </Card>
        </Container>
    );
}

  return (
    <Container>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Welcome, <b>{username}</b> to DocChat!
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', height: '90vh', bgcolor: "#f8f8f8" }}>
        <Box sx={{ position: 'relative', width: '20%' }}>
            <List sx={{ bgcolor: 'background.paper', overflow: 'auto', height: 'calc(100vh - 112px)', mb: 8, bgcolor: "#f8f8f8"}}>
                {loading ? (
                <ListItem>
                    <CircularProgress />
                    <Typography variant="subtitle1" sx={{ ml: 2 }}>Fetching chats...</Typography>
                </ListItem>
                ) : (
                chats.map(chat => {
                    const otherUsers = chat.users.filter(u => u !== username).join(', ');
                    const lastMessage = chat.lastMessage ? `${chat.lastMessage.text} - ${new Date(chat.lastMessage.timestamp).toLocaleString()}` : '';
                    return (
                    <ListItemButton key={chat.id} selected={selectedChat && chat.id === selectedChat.id} onClick={() => selectChat(chat)}>
                        <ListItemText primary={otherUsers} secondary={lastMessage} />
                    </ListItemButton>
                    );
                })
                )}
            </List>
            <Fab color="primary" aria-label="add" sx={{ position: 'absolute', bottom: 16, left: 16 }} onClick={handleOpenNewChatDialog}>
                <AddIcon />
            </Fab>
            </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, bgcolor: 'background.paper',}}>
          {selectedChat ? (
            <Box sx={{ flex: 1, overflow: 'auto'}}>
              {messages.map((msg, index) => (
                <Box key={index} sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === username ? 'flex-end' : 'flex-start',
                    margin: 1
                }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0 }}>
                        {msg.sender === username ? 'You' : msg.sender}
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: msg.sender ===username ? 'row-reverse' : 'row',
                        alignItems: 'center'
                    }}>
                        <Box sx={{
                            padding: '8px 12px',
                            borderRadius: '20px',
                            bgcolor: msg.sender === username ? '#3BC2FF' : '#eeeeee',
                            color: msg.sender === username ? 'white' : 'black',
                            maxWidth: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Typography variant="body2">{msg.text}</Typography>

                            {msg.hasAttachment && (
                                msg.attachmentType === 'PDF' ? (
                                    <Button onClick={() => window.open(msg.attachmentContent, '_blank')} sx={{ textTransform: 'none', justifyContent: 'flex-start', paddingLeft: 0 }}>
                                        <FileDownloadIcon sx={{ marginRight: 1 }} />
                                        <Typography variant="body2" noWrap>
                                            {extractFileName(msg.attachmentContent)} ({(msg.attachmentSize / 1000).toFixed(1)} KB)
                                        </Typography>
                                    </Button>
                                ) : (
                                    <img src={msg.attachmentContent} alt="Attached" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px' }} onClick={() => window.open(msg.attachmentContent, '_blank')} />
                                )
                            )}
                        </Box>

                    </Box>
                    <Typography variant="caption" sx={{ color: 'grey.600', fontSize: '0.65rem', mt: 0.5 }}>
                        {msg.timestamp}
                    </Typography>
                </Box>
            ))}
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h5" component="div">
                Select a chat to view or start a new chat
              </Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleOpenNewChatDialog}>Start a New Chat</Button>
            </Box>
          )}
          {selectedChat && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                {attachment && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                        <Typography sx={{ mr: 1 }}>{truncateText(attachment.name, 30)}</Typography>
                        <IconButton onClick={handleRemoveAttachment}>
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                )}
                {!attachment &&
                <IconButton onClick={handleOpenAttachmentDialog} color="primary" sx={{ mr: 1 }}>
                    <AttachmentIcon />
                </IconButton>
                }
                <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                InputProps={{
                    endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                        onClick={handleSendMessage}
                        color="primary"
                        disabled={!message.trim() && !attachment}
                        >
                        <SendIcon />
                        </IconButton>
                    </InputAdornment>
                    ),
                }}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf"
                    onChange={handleAttachment}
                />
            </Box>
            )}
        </Box>
      </Box>
      <Dialog open={openDialog} onClose={handleCloseNewChatDialog}>
        <DialogTitle>New Chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the username of the person you want to start a chat with.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewChatDialog}>Cancel</Button>
          <Button onClick={handleCreateNewChat}>Create</Button>
        </DialogActions>
      </Dialog>
      {isUploading && (
        <Dialog open={isUploading}>
            <DialogContent>
                <CircularProgress />
                <Typography sx={{ mt: 2, ml: 4 }}>Uploading attachment... Please wait.</Typography>
            </DialogContent>
        </Dialog>
      )}
      <Snackbar
        open={openSnackBar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackBar(false)}
        message="File type not supported"
      />
    </Container>
  );
}
