  import React, { useState, useEffect, useRef } from "react";
  import "./style.css";

  import axios from 'axios';



  /*
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
  const db = admin.firestore();*/
  interface Chat {
    id?: string;
    name?: string | "";
    last_message?: Message | null;
  }

  interface Message {
    id: string;
    text?: {
      body: string | "";
    };
    from_me?: boolean;
    createdAt?: number;
    type?: string;
    image?: {
      link?: string;
      caption?: string;
    };
  }

  function Main() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState<string>("");
    const [isLoading, setLoading] = useState<boolean>(false); // Loading state
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null); 
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
    const WHAPI_ACCESS_TOKEN = 'YIaooL9Osgrtpj7ZlZLaVK5fOjUIvFNx'; // Replace with your Whapi access token

    // Update the CSS classes for message bubbles
    const myMessageClass = "flex-end bg-green-500 max-w-30 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md self-end ml-auto text-white text-right";
    const otherMessageClass = "flex-start bg-gray-700 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md text-white self-start";

    

  

    let ghlConfig ={
      ghl_id:'',
      ghl_secret:'',
      refresh_token:'',
    };
  /*ghlToken()
    async function ghlToken() {
      try {
          await fetchConfigFromDatabase();
          const { ghl_id, ghl_secret, refresh_token } = ghlConfig;
          console.log('ghl_id:', ghl_id);
          console.log('ghl_secret:', ghl_secret);
          console.log('refresh_token:', refresh_token);

          // Generate new token using fetched credentials and refresh token
          const encodedParams = new URLSearchParams();
          encodedParams.set('client_id', ghl_id);
          encodedParams.set('client_secret', ghl_secret);
          encodedParams.set('grant_type', 'refresh_token');
          encodedParams.set('refresh_token', refresh_token);
          encodedParams.set('user_type', 'Location');

          const options = {
              method: 'POST',
              url: 'https://services.leadconnectorhq.com/oauth/token',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Accept: 'application/json'
              },
              data: encodedParams,
          };

          const { data: newTokenData } = await axios.request(options);

          await db.collection('companies').doc('014').set({
              access_token: newTokenData.access_token,
              refresh_token: newTokenData.refresh_token,
          }, { merge: true });

          console.log('Token generation and update complete');
      } catch (error) {
          console.error('Error generating and updating token:', error);
          throw error;
      }
  }

  async function fetchConfigFromDatabase() {
      try {
          const docRef = db.collection('companies').doc('014');
          const doc = await docRef.get();
          if (!doc.exists) {
              console.log('No such document!');
              return;
          }
        
      } catch (error) {
          console.error('Error fetching config:', error);
          throw error;
      }
  }*/

    useEffect(() => {
      const fetchChatsWithRetry = async () => {
        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 1000; // 1 second
    
        while (retryCount < maxRetries) {
          try {
            setLoading(true); // Set loading to true before fetching chats
            const response = await fetch(`${WHAPI_BASE_URL}/chats`, {
              headers: {
                'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
              }
            });
    
            if (!response.ok) {
              throw new Error('Failed to fetch chats');
            }
    
            const data = await response.json();
            console.log(data);
            setChats(data.chats.map((chat: Chat) => ({
              ...chat,
            })));
            
            
            // Exit the loop if chats are fetched successfully
            return;
          } catch (error) {
            console.error('Failed to fetch chats:', error);
    
            // Increment the retry count
            retryCount++;
    
            // Wait for retryDelay milliseconds before trying again
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } finally {
            setLoading(false); // Set loading to false after fetching chats
          }
        }
    
        console.error(`Failed to fetch chats after ${maxRetries} retries`);
      };
    
      fetchChatsWithRetry();
    }, []);
  // Function to clear messages when a non-WhatsApp icon is clicked
  const handleIconClick =  (iconId: string) => {

    setMessages([]);
    setSelectedIcon(iconId);
  };
  const handleWhatsappClick =  (iconId: string) => {
    // Clear selected chat and messages
    setSelectedIcon(iconId);
    const fetchMessagesWithRetry = async () => {
      if (!selectedChatId) return;

      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 1000; // 1 second

      while (retryCount < maxRetries) {
        try {
          setLoading(true); // Set loading to true before fetching messages
          const response = await fetch(`${WHAPI_BASE_URL}/messages/list/${selectedChatId}`, {
            headers: {
              'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch messages');
          }

          const data = await response.json();
          console.log('Messages:', data);
          setMessages(data.messages.map((message: any) => ({
            id: message.id,
            text: {
              body: message.text ? message.text.body : ""
            },
            from_me: message.from_me,
            createdAt: message.timestamp,
            type: message.type,
            image: message.image ? message.image : undefined // Use undefined instead of empty string
          })));
          
          // Exit the loop if messages are fetched successfully
          return;
        } catch (error) {
          console.error('Failed to fetch messages:', error);

          // Increment the retry count
          retryCount++;

          // Wait for retryDelay milliseconds before trying again
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } finally {
          setLoading(false); // Set loading to false after fetching messages
        }
      }

      console.error(`Failed to fetch messages after ${maxRetries} retries`);
    };

    fetchMessagesWithRetry();
    [selectedChatId]
  };
    useEffect(() => {
      const fetchMessagesWithRetry = async () => {
        if (!selectedChatId) return;

        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 1000; // 1 second

        while (retryCount < maxRetries) {
          try {
            setLoading(true); // Set loading to true before fetching messages
            const response = await fetch(`${WHAPI_BASE_URL}/messages/list/${selectedChatId}`, {
              headers: {
                'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
              }
            });

            if (!response.ok) {
              throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            console.log('Messages:', data);
            setMessages(data.messages.map((message: any) => ({
              id: message.id,
              text: {
                body: message.text ? message.text.body : ""
              },
              from_me: message.from_me,
              createdAt: message.timestamp,
              type: message.type,
              image: message.image ? message.image : undefined // Use undefined instead of empty string
            })));
            
            // Exit the loop if messages are fetched successfully
            return;
          } catch (error) {
            console.error('Failed to fetch messages:', error);

            // Increment the retry count
            retryCount++;

            // Wait for retryDelay milliseconds before trying again
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } finally {
            setLoading(false); // Set loading to false after fetching messages
          }
        }

        console.error(`Failed to fetch messages after ${maxRetries} retries`);
      };

      fetchMessagesWithRetry();
    }, [selectedChatId]);

    const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedChatId) return;

      try {
        const response = await fetch(`${WHAPI_BASE_URL}/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            chatId: selectedChatId,
            text: newMessage
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        const newMsg: Message = {
          id: data.messageId,
          text: {
            body: newMessage
          },
          type: "text",
          from_me: true,
          createdAt: 0
        };
        setMessages([...messages, newMsg]);
        setChats(chats.map(chat =>
          chat.id === selectedChatId ? { ...chat, last_message: newMsg } : chat
        ));

        setNewMessage("");
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'visible';
      };
    }, []);
    const handleContextMenu = (e: React.MouseEvent, message: Message) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, message);
    };
  
    const showContextMenu = (x: number, y: number, message: Message) => {
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        setSelectedMessage(message);
        handleForwardToChat(message.id);
      }
    };
  
    const handleForwardToChat = (chatId: string) => {
      if (selectedMessage) {
        handleForwardMessage(selectedMessage, chatId);
        hideContextMenu();
      }
    };
  
    const hideContextMenu = () => {
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu) {
        contextMenu.style.display = 'none';
      }
    };
  
    const handleForwardMessage = async (message: Message, chatId: string) => {
      try {
        const response = await axios.post(`${WHAPI_BASE_URL}/messages/forward`, {
          chatId,
          messageId: message.id
        }, {
          headers: {
            'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
          }
        });
  
        // Handle success
      } catch (error) {
        console.error('Failed to forward message:', error);
        // Handle error
      }
    };
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="w-1/4 p-4 bg-gray-200 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Chats</h2>
          </div>
          <div>
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-2 mb-2 rounded cursor-pointer ${selectedChatId === chat.id ? 'bg-gray-300' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedChatId(chat.id!)}
              >
                <span className="font-semibold">{chat.name??chat.id}</span>
                {chat.last_message && (
                  <span className="text-gray-500 block" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {chat.last_message.text && chat.last_message.text.body ? chat.last_message.text.body : 'No Messages'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-3/4 p-4 bg-white overflow-y-auto relative">
          
          <div className="overflow-y-auto" style={{ paddingBottom: "200px" }}>
          {isLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-gray-700 bg-opacity-50 z-50">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
            <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin"></div>
            <p className="text-center">Loading...</p>
          </div>
        </div>
      )}

            {messages.slice().reverse().map((message) => (
              <div
                key={message.id}
                className={`p-2 mb-2 rounded ${
                  message.from_me ? myMessageClass : otherMessageClass
                }`}
                onClick={(e) => handleContextMenu(e, message)}
                onContextMenu={(e) => handleContextMenu(e, message)}
                style={{
                  maxWidth: '70%', // Set max-width to avoid text clipping
                  width: `${
                    message.type === 'image'
                      ? '320'
                      : Math.min(message.text!.body!.length * 15, 350)
                  }px`, // Limit width to 300px if there's no image
                  
                }}
       
              >
                {message.type === 'image' && message.image && (
                  <div className="message-content image-message">
                    <img
                      src={message.image.link}
                      alt="Image"
                      className="message-image"
                      style={{ maxWidth: '300px' }} // Adjust the width as needed
                    />
                    <div className="caption">{message.image.caption}</div>
                  </div>
                )}
                {message.type === 'text' && (
                  <div className="message-content"         onClick={(e) => handleContextMenu(e, message)}
                  onContextMenu={(e) => handleContextMenu(e, message)}>
                    {message.text!.body}
                  </div>
                  
                )}
               
              </div>
            ))}

            <div ref={messagesEndRef}></div>
            <div className="fixed bottom-0 w-full bg-white border-t border-gray-300 py-2 px-10 flex items-center">
            <div className="message-source-buttons flex items-center">
      <img
        className={`source-button ${selectedIcon === 'ws' ? 'border-2 border-blue-500' : ''}`}
        src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon4.png?alt=media&token=d4ab65b6-9b90-4aca-9d69-6263300a91ec"
        alt="WhatsApp"onClick={() => handleWhatsappClick('ws')}
        style={{ width: '30px', height: '30px' }} // Adjust size as needed
      />
      <img
        className={`source-button ${selectedIcon === 'fb' ? 'border-2 border-blue-500' : ''}`}
        src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/facebook-logo-on-transparent-isolated-background-free-vector-removebg-preview.png?alt=media&token=c312eb23-dfee-40d3-a55c-476ef3041369"
        alt="Facebook"onClick={() => handleIconClick('fb')}
        style={{ width: '30px', height: '30px' }} // Adjust size as needed
      />
      <img
        className={`source-button ${selectedIcon === 'ig' ? 'border-2 border-blue-500' : ''}`}onClick={() => handleIconClick('ig')}
        src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon3.png?alt=media&token=9395326d-ff56-45e7-8ebc-70df4be6971a"
        alt="Instagram"
        style={{ width: '30px', height: '30px' }} // Adjust size as needed
      />
      <img
        className={`source-button ${selectedIcon === 'gmb' ? 'border-2 border-blue-500' : ''}`}onClick={() => handleIconClick('gmb')}
        src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon1.png?alt=media&token=10842399-eca4-40d1-9051-ea70c72ac95b"
        alt="Google My Business"
        style={{ width: '20px', height: '20px' }} // Adjust size as needed
      />
      <img
        className={`source-button ${selectedIcon === 'mail' ? 'border-2 border-blue-500' : ''}`}onClick={() => handleIconClick('mail')}
        src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon2.png?alt=media&token=813f94d4-cad1-4944-805a-2454293278c9"
        alt="Email"
        style={{ width: '30px', height: '30px' }} // Adjust size as needed
      />
    </div>
              <input
                ref={inputRef}
                type="text"
                className="w-2/6" // Add w-full to make it fill the width
                placeholder="Type a message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                className="bg-green-500 text-white px-4 py-3 rounded"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  export default Main;
