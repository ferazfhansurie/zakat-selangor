import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';

interface Chat {
  id?: string;
  name?: string | "";
  last_message?: Message | null;
}

interface Message {
  id: string;
  text?: {
    body: string|"";
  };
  from_me: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
  const WHAPI_ACCESS_TOKEN = 'rubP6ggd7RZpHwmazHD6mAmJHUMS8pWV'; // Replace with your Whapi access token

  // Update the CSS classes for message bubbles
  const myMessageClass = "flex-end bg-green-500 max-w-30 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md self-end ml-auto text-white text-right";
  const otherMessageClass = "flex-start bg-gray-700 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md text-white self-start";

  useEffect(() => {
    const fetchChats = async () => {
      const response = await axios.get(`${WHAPI_BASE_URL}/chats`, {
        headers: {
          'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
        }
      });
    console.log(response);
    setChats(response.data.chats.map((chat: Chat) => ({
      ...chat,
    })));
    };
  
    fetchChats();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId) return;
   
      try {
        const response = await axios.get(`${WHAPI_BASE_URL}/messages/list/${selectedChatId}`, {
          headers: {
            'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
          }
        });
    
        setMessages(response.data.messages.map((message: any) => ({
          id: message.id,
          text: {
            body: message.text ? message.text.body : ""
          },
          from_me: message.from_me,
          createdAt: message.timestamp,
          type: message.type,
          image: message.image ? message.image : undefined // Use undefined instead of empty string
        })));
        console.log(response);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [selectedChatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;

    try {
      const response = await axios.post(`${WHAPI_BASE_URL}/messages/send`, {
        chatId: selectedChatId,
        text: newMessage
      }, {
        headers: {
          'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`
        }
      });

      const newMsg: Message = {
        id: response.data.messageId,
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
          
          {messages.slice().reverse().map((message) => (
            <div
              key={message.id}
              className={`p-2 mb-2 rounded ${
                message.from_me ? myMessageClass : otherMessageClass
              }`}
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
                <div className="message-content">
                  {message.text!.body}
                </div>
              )}
            </div>
          ))}
          
          <div ref={messagesEndRef}></div>
             <div className="fixed bottom-0  w-full bg-white border-t border-gray-300 py-2 px-10 flex items-center">
             <input
  ref={inputRef}
  type="text"
  className="w-3/6" // Add w-full to make it fill the width
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