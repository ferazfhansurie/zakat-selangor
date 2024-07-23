import React, { useState, useEffect, useRef } from "react";
import logoUrl from "@/assets/images/logo_black.png";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useConfig } from '../../config';
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { signOut } from "firebase/auth";
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);



function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { isLoading: contactsLoading } = useContacts();
  const { config: initialContacts } = useConfig();

  const fetchQRCode = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setIsLoading(true);
    setError(null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error("User document does not exist");
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error("Company document does not exist");
      }

      const companyData = docSnapshot.data();
      if (!companyData.v2) {
        // If "v2" is not present or is false, navigate to the next page
        if (initialContacts.name === "Infinity Pilates & Physiotherapy") {
          navigate('/calendar');
        } else {
          navigate('/chat');
        }
        return;
      }
      //http://jutaserver.ddns.net:8443/api/bot-status
      console.log('test');
      const botStatusResponse = await axios.get(`https://mighty-dane-newly.ngrok-free.app/api/bot-status/${companyId}`);

      console.log(botStatusResponse.data);
      if (botStatusResponse.status !== 200) {
        throw new Error(`Unexpected response status: ${botStatusResponse.status}`);
      }

      const { status, qrCode } = botStatusResponse.data;
      setBotStatus(status);
      if (status === 'qr') {
        setQrCodeImage(qrCode);
        console.log({companyId});
      } else if (status === 'authenticated' || status === 'ready') {
        navigate('/chat');
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(error.response?.data || 'Failed to fetch QR code. Please try again.');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      console.error("Error fetching QR code:", error);
    }
  };

  const handleRefresh = () => {
    fetchQRCode();
  };

  useEffect(() => {
    fetchQRCode();
  }, []);

  useEffect(() => {
    if (botStatus === 'qr' && !wsConnected) {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      ws.current = new WebSocket(`wss://mighty-dane-newly.ngrok-free.app/ws/${user?.email}`);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'authenticated' || data.status === 'ready') {
          setBotStatus(data.status);
          navigate('/chat');
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Please try again.');
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [botStatus]);

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!contactsLoading && !isLoading && botStatus === 'qr') {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 500);
    }

    return () => clearInterval(progressInterval);
  }, [contactsLoading, isLoading, botStatus]);

  const handleLogout = async () => {
    const auth = getAuth(app);
    try {
      await signOut(auth);
      navigate('/login'); // Adjust this to your login route
    } catch (error) {
      console.error("Error signing out: ", error);
      setError('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
        <img alt="Logo" className="w-40 h-40 p-25" src={logoUrl} />
        {botStatus === 'qr' ? (
          <>
            <div className="mt-2 text-md p-25 text-gray-800 dark:text-gray-200">
              Please use your WhatsApp QR scanner to scan the code and proceed.
            </div>
            <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />
            {error && <div className="text-red-500 dark:text-red-400 mt-2">{error}</div>}
            {qrCodeImage && (
              <div className="bg-white p-4 rounded-lg mt-4">
                <img src={qrCodeImage} alt="QR Code" className="max-w-full h-auto" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mt-2 text-xs p-15 text-gray-800 dark:text-gray-200">
              {botStatus === 'authenticated' || botStatus === 'ready' 
                ? 'Authentication successful. Redirecting...' 
                : botStatus === 'initializing'
                  ? 'Initializing WhatsApp connection...'
                  : 'Fetching Data...'}
            </div>
            <div className="mt-4">
              <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
            </div>
          </>
        )}
        
        <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700 p-15" />
        
        <button
          onClick={handleRefresh}
          className="mt-4 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-40"
        >
          Refresh
        </button>
        
        <button
          onClick={handleLogout}
          className="mt-4 px-6 py-3 bg-red-500 text-white text-lg font-semibold rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-40"
        >
          Logout
        </button>
        
        {error && <div className="mt-2 text-red-500 dark:text-red-400">{error}</div>}
      </div>
    </div>
  );
}

export default LoadingPage;