import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import logoImage from '@/assets/images/placeholder.svg';
import { getFirestore,Timestamp,  collection, doc, getDoc, onSnapshot, setDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, arrayRemove,arrayUnion, writeBatch, serverTimestamp, runTransaction, increment } from "firebase/firestore";
import {QueryDocumentSnapshot, DocumentData ,Query,CollectionReference, startAfter,limit,deleteField} from 'firebase/firestore'
import axios, { AxiosError } from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { Link, useParams } from "react-router-dom";
import { FormInput } from "@/components/Base/Form";
import { format } from 'date-fns';
import { access } from "fs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { time } from "console";
import { getStorage, ref, uploadBytes, StorageReference, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onMessage } from "firebase/messaging";
import { getFirebaseToken, messaging } from "../../firebaseconfig";
import { rateLimiter } from '../../utils/rate';
import errorIllustration from "@/assets/images/chat.svg";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useLocation } from "react-router-dom";
import { useContacts } from '../../contact';
import { Pin, PinOff } from "lucide-react";
import LZString from 'lz-string';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import Tippy from "@/components/Base/Tippy";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {  useNavigate } from "react-router-dom";
import noti from "../../assets/audio/noti.mp3";
import { Lock, MessageCircle } from "lucide-react";
import { Transition } from '@headlessui/react';
import { Menu as ContextMenu, Item, Separator, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { updateMonthlyAssignments } from '../DashboardOverview1';
import ReactPaginate from 'react-paginate';
import { getFileTypeFromMimeType } from '../../utils/fileUtils';

interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}
interface Enquiry {
  id: string;
  contact_id: string;
  email: string;
  message: string;
  name:string;
  page_url: string;
  phone: string;
  source: string;
  timestamp: any;
  treatment:string;
  read:boolean;
}
interface Contact {
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string | null;
  businessId?: string | null;
  city?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  country?: string | null;
  customFields?: any[] | null;
  dateAdded?: string | null;
  dateOfBirth?: string | null;
  dateUpdated?: string | null;
  dnd?: boolean | null;
  dndSettings?: any | null;
  email?: string | null;
  firstName?: string | null;
  followers?: string[] | null;
  id?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  source?: string | null;
  state?: string | null;
  tags?: string[] | null;
  type?: string | null;
  website?: string | null;
  chat?: Chat[] | null;
  last_message?: Message | null;
  chat_id?: string | null;
  unreadCount?: number | null;
  pinned?: boolean | null;
  profilePicUrl?:string;
  phoneIndex?:number |null;
  points?:number |null;
}
interface GhlConfig {
  ghl_id: string;
  ghl_secret: string;
  refresh_token: string;
  ghl_accessToken: string;
  ghl_location: string;
  whapiToken: string;
  v2?: boolean;
}
interface Chat {
  id?: string;
  name?: string;
  last_message?: Message | null;
  labels?: Label[];
  contact_id?: string;
  tags?: string[];
}

interface Message {
  chat_id: string;
  dateAdded?: number | 0;
  timestamp: number | 0;
  id: string;
  text?: { body: string | "" ,  context?: any;};
  from_me?: boolean;
  from_name?: string | "";
  createdAt?: number;
  type?: string;
  from?:string|"";
  author?:string;
  phoneIndex:number;
  image?: { link?: string; caption?: string;url?:string ;data?:string;mimetype?:string};
  video?: { link?: string; caption?: string; };
  gif?: { link?: string; caption?: string };
  audio?: { link?: string; caption?: string;data?:string;mimetype?:string };
  ptt?: { link?: string; caption?: string;data?:string;mimetype?:string };
  voice?: { link?: string; caption?: string };
  document?: {
    file_name: string;
    file_size: number;
    filename: string;
    id: string;
    link?: string;
    mime_type: string;
    page_count: number;
    preview: string;
    sha256: string;
    data?:string;
    caption?:string;
  mimetype?: string;
  fileSize?: number;
  };
  link_preview?: { link: string; title: string; description: string ,body:string,preview:string};
  sticker?: { link: string; emoji: string;mimetype:string;data:string };
  location?: { latitude: number; longitude: number; name: string };
  live_location?: { latitude: number; longitude: number; name: string };
  contact?: { name: string; phone: string };
  contact_list?: { contacts: { name: string; phone: string }[] };
  interactive?: any;
  poll?: any;
  userName?: string;
  hsm?: any;
  edited?: boolean;
  system?: any;
  order?: any;
  group_invite?: any;
  admin_invite?: any;
  product?: any;
  catalog?: any;
  product_items?: any;
  action?: any;
  context?: any;
  reactions?: { emoji: string; from_name: string }[];
  name?:string;
  isPrivateNote?: boolean;
}
interface Employee {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  phoneNumber?: string;
  phone?: string;
  quotaLeads?: number;
  assignedContacts?: number;
  // Add other properties as needed
}
interface Tag {
  id: string;
  name: string;
}
interface UserData {
  companyId: string;
  name: string;
  role: string;
  [key: string]: any; // Add other properties as needed
}
// Define the QuickReply interface
interface QuickReply {
  id: string;
  keyword: string;
  text: string;
  type:string;
  document: null;
}
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}
interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: File | null;
  onSend: (file: File, caption: string) => void;
}
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}
type Notification = {
  from: string;
  text: {
    body:string
  }
  from_name: string;
  timestamp: number;
  chat_id: string;
  type: string;
};

interface EditMessagePopupProps {
  editedMessageText: string;
  setEditedMessageText: (value: string) => void;
  handleEditMessage: () => void;
  cancelEditMessage: () => void;
}
const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, document, onSend }) => {
  const [caption, setCaption] = useState('');

  const handleSendClick = () => {
    if (document) {
      onSend(document, caption);
    }
    setCaption('');
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-auto md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Document Preview</h2>
          <button
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 flex justify-center items-center" style={{ height: '90%' }}>
          {document.type === 'application/pdf' ? (
            <iframe
              src={URL.createObjectURL(document)}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <Lucide icon="File" className="w-20 h-20 mb-2 mx-auto text-gray-600 dark:text-gray-400" />
              <p className="text-gray-800 dark:text-gray-200 font-semibold">{document.name}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {(document.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition duration-200"
            onClick={handleSendClick}
          >
            <Lucide icon="Send" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen) return null;

  const handleImageClick = () => {
    setZoomLevel(prevZoomLevel => (prevZoomLevel === 1 ? 2 : 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Modal Content"
          className="rounded-md cursor-pointer"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s', maxWidth: '100%', maxHeight: '100%' }}
          onClick={handleImageClick}
        />
        <a
          href={imageUrl}
          download
          className="mt-2 block text-center text-blue-500 hover:underline"
        >
          Save Image
        </a>
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};
const PDFModal: React.FC<PDFModalProps> = ({ isOpen, onClose, pdfUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg w-full max-w-5xl h-4/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-white bg-gray-800 hover:bg-gray-900 rounded-full p-2"
          onClick={onClose}
        >
          <Lucide icon="X" className="w-6 h-6" />
        </button>
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          title="PDF Document"
          className="border rounded"
        />
      </div>
    </div>
  );
};



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
const auth = getAuth(app);

function Main() {
  const { contacts: initialContacts, isLoading } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
   const [numPages, setNumPages] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading2, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stopBotLabelCheckedState, setStopBotLabelCheckedState] = useState<boolean[]>([]);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [selectedMessage2, setSelectedMessage2] = useState(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [isTagged, setIsTagged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const baseMessageClass = "flex flex-col max-w-[auto] min-w-[auto] p-1 text-white";

  const myMessageClass = `${baseMessageClass} bg-primary self-end ml-auto text-left mb-1 mr-6 group`;
  const otherMessageClass = `${baseMessageClass} bg-gray-700 self-start text-left mt-1 ml-2 group`;

  const myFirstMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mt-4`;
  const myMiddleMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl`;
  const myLastMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mb-4`;

  const otherFirstMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mt-4`;
  const otherMiddleMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl`;
  const otherLastMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mb-4`;
  const [messageMode, setMessageMode] = useState('reply');
  const [isEmployeeMentionOpen, setIsEmployeeMentionOpen] = useState(false);
  const myMessageTextClass = "text-white"
  const otherMessageTextClass = "text-white"
  const [activeTags, setActiveTags] = useState<string[]>(['all']);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [ghlConfig, setGhlConfig] = useState<GhlConfig | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedMessageForForwarding, setSelectedMessageForForwarding] = useState<Message | null>(null);
  const [selectedContactsForForwarding, setSelectedContactsForForwarding] = useState<Contact[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newQuickReply, setNewQuickReply] = useState<string>('');
  const [newQuickReplyKeyword, setNewQuickReplyKeyword] = useState('');
  const [filteredContactsForForwarding, setFilteredContactsForForwarding] = useState<Contact[]>(contacts);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [total, setTotal] = useState(0);
  const prevNotificationsRef = useRef<number | null>(null);
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const isInitialMount = useRef(true);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [isGroupFilterActive, setIsGroupFilterActive] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedMessageText, setEditedMessageText] = useState<string>("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isPDFModalOpen, setPDFModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isImageModalOpen2, setImageModalOpen2] = useState(false);
  const [pastedImageUrl, setPastedImageUrl] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [contactsPerPage] = useState(50);
  const contactListRef =useRef<HTMLDivElement>(null);
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [isAllBotsEnabled, setIsAllBotsEnabled] = useState(true);
  const [pinnedTags, setPinnedTags] = useState<string[]>([]);
  const [employeeTags, setEmployeeTags] = useState<string[]>([]);
  const [otherTags, setOtherTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isV2User, setIsV2User] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [visibleTags, setVisibleTags] = useState<typeof tagList>([]);
  const [companySubstring, setCompanyId] = useState<string | null>(null);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [contactsFetchProgress, setContactsFetchProgress] = useState(0);
  const [totalContactsToFetch, setTotalContactsToFetch] = useState(0);
  const [fetchedContactsCount, setFetchedContactsCount] = useState(0);
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [privateNotes, setPrivateNotes] = useState<Record<string, Array<{ id: string; text: string; timestamp: number }>>>({});
  const [isPrivateNotesExpanded, setIsPrivateNotesExpanded] = useState(false);
  const privateNoteRef = useRef<HTMLDivElement>(null);
  const [newPrivateNote, setNewPrivateNote] = useState('');
  const [isPrivateNotesMentionOpen, setIsPrivateNotesMentionOpen] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(true);
  const [showUnreadContacts, setShowUnreadContacts] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'privateNotes'>('messages');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatActive, setIsChatActive] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState('');
  const [showMineContacts, setShowMineContacts] = useState(false);
  const [showGroupContacts, setShowGroupContacts] = useState(false);
  const [showUnassignedContacts, setShowUnassignedContacts] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderText, setReminderText] = useState('');
  const currentUserName = userData?.name || '';
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]);
  const messageSearchInputRef = useRef<HTMLInputElement>(null);
  const [showSnoozedContacts, setShowSnoozedContacts] = useState(false);
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [blastStartDate, setBlastStartDate] = useState<Date>(new Date());
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeQuickReplyTab, setActiveQuickReplyTab] = useState<'all' | 'self'>('all');
  const [newQuickReplyType, setNewQuickReplyType] = useState<'all' | 'self'>('all');
  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');
  const [phoneNames, setPhoneNames] = useState<Record<number, string>>({});
  const [userPhone, setUserPhone] = useState<number | null>(null);
  const [activeNotifications, setActiveNotifications] = useState<(string | number)[]>([]);
  const [isAssistantAvailable, setIsAssistantAvailable] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);


  const filteredContactsSearch = useMemo(() => {
    return contacts.filter((contact) => {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      const contactName = (contact.contactName || '').toLowerCase();
      const firstName = (contact.firstName || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      const tags = (contact.tags || []).map(tag => tag.toLowerCase());
  
      const matchesSearch = searchTerms.every(term => 
        contactName.includes(term) || 
        firstName.includes(term) || 
        phone.includes(term) || 
        tags.some(tag => tag.includes(term))
      );
  
      const matchesTagFilters = activeTags.length === 0 || 
                                activeTags.includes('all') || 
                                activeTags.some(tag => tags.includes(tag.toLowerCase()));
  
      return matchesSearch && matchesTagFilters;
    });
  }, [contacts, searchQuery, activeTags]);

  const uploadDocument = async (file: File): Promise<string> => {
    const storage = getStorage(); // Correctly initialize storage
    const storageRef = ref(storage, `quickReplies/${file.name}`); // Use the initialized storage
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleMessageSearchClick = () => {
    setIsMessageSearchOpen(!isMessageSearchOpen);
    if (!isMessageSearchOpen) {
      setTimeout(() => {
        messageSearchInputRef.current?.focus();
      }, 0);
    }
  };

  const handleMessageSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageSearchQuery(e.target.value);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user && userData) {
      const companyId = userData.companyId;
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const q = query(contactsRef, orderBy("last_message.timestamp", "desc"));
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedContacts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
        setContacts(updatedContacts);
      });
  
      return () => unsubscribe();
    }
  }, [userData]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
          setCompanyId(companyId);

          const companyRef = doc(firestore, 'companies', companyId);
          const companySnapshot = await getDoc(companyRef);
          if (companySnapshot.exists()) {
            const companyData = companySnapshot.data();
            if (companyData) {
              setIsAssistantAvailable(!!companyData.assistantId);
            }
            setStopbot(companyData.stopbot)
            const phoneCount = companyData.phoneCount || 0;
            const newPhoneNames: Record<number, string> = {};
            for (let i = 0; i < phoneCount; i++) {
              newPhoneNames[i] = companyData[`phone${i + 1}`] || `Phone ${i + 1}`;
            }
            setPhoneNames(newPhoneNames);
            setPhoneCount(phoneCount);
          }
        }
      }
    };
  
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (messageSearchQuery) {
      const results = messages.filter(message => 
        message.type === 'text' && 
        message.text?.body.toLowerCase().includes(messageSearchQuery.toLowerCase())
      );
      setMessageSearchResults(results);
    } else {
      setMessageSearchResults([]);
    }
  }, [messageSearchQuery, messages]);

  const scrollToMessage = (messageId: string) => {
    if (messageListRef.current) {
      const messageElement = messageListRef.current.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight-message');
        setTimeout(() => {
          messageElement.classList.remove('highlight-message');
        }, 2000);
      }
    }
    setIsMessageSearchOpen(false); // Close the search panel after clicking a result
  };

  useEffect(() => {
    if (selectedContact) {
      setEditedName(selectedContact.contactName || selectedContact.firstName || '');
    }
  }, [selectedContact]);



  useEffect(() => {
    updateEmployeeAssignedContacts();
    const initializeActiveTags = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
  
          if (companyId !== '042') {
        
            filterTagContact('all');
          } else {
            // Keep the existing logic for bot042
          
            filterTagContact('mine');
          }
        }
      }
    };
  
    initializeActiveTags();
  }, []); 

  const handleBack = () => {
    navigate("/"); // or wherever you want to navigate to
    setIsChatActive(false);
    setSelectedChatId(null);
    setMessages([]);
  };
  

  useEffect(() => {
    updateVisibleTags();
  }, [contacts, tagList, isTagsExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (privateNoteRef.current && !privateNoteRef.current.contains(event.target as Node)) {
        setIsPrivateNotesExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [privateNoteRef]);

  const updateVisibleTags = () => {
    const nonGroupContacts = contacts.filter(contact => 
      contact.chat_id && !contact.chat_id.includes('@g.us')
    );
  
    const allUnreadTags = [
      { 
        id: 'all', 
        name: 'All', 
        count: nonGroupContacts.length
      },
      { 
        id: 'unread', 
        name: 'Unread', 
        count: nonGroupContacts.filter(contact => (contact.unreadCount || 0) > 0).length
      },
    ];
  
    const updatedTagList = tagList.map(tag => ({
      ...tag,
      count: nonGroupContacts.filter(contact => 
        contact.tags?.includes(tag.name) && (contact.unreadCount || 0) > 0
      ).length
    }));
  
    if (isTagsExpanded) {
      setVisibleTags([...allUnreadTags, ...updatedTagList]);
    } else {
      const containerWidth = 300; // Adjust this based on your container width
      const tagWidth = 100; // Approximate width of each tag button
      const tagsPerRow = Math.floor(containerWidth / tagWidth);
      const visibleTagsCount = tagsPerRow * 2 - 3; // Two rows, minus All, Unread, and Group
      setVisibleTags([...allUnreadTags, ...updatedTagList.slice(0, visibleTagsCount)]);
    }
  };

  const toggleTagsExpansion = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };
  const [stopbot, setStopbot] = useState(false);

  const handlePrivateNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
  
    // Check for @ symbol to trigger mentions
    const lastAtSymbolIndex = value.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex === value.length - 1) {
      setIsPrivateNotesMentionOpen(true);
      console.log('Private note mention open');
    } else {
      setIsPrivateNotesMentionOpen(false);
    }
  };

  // Update the textarea onChange handler
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    adjustHeight(e.target);

    if (value.startsWith('/')) {
      setIsQuickRepliesOpen(true);
      setQuickReplyFilter(value.slice(1));
    } else {
      setIsQuickRepliesOpen(false);
      setQuickReplyFilter('');
    }

    // Check for quick reply keyword
    if (value.startsWith('/') && value.endsWith(' ')) {
      const keyword = value.slice(1, -1).toLowerCase();
      const quickReply = quickReplies.find(qr => qr.keyword.toLowerCase() === keyword);
      if (quickReply) {
        setNewMessage(quickReply.text);
      }
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    const lastAtSymbolIndex = newMessage.lastIndexOf('@');
    const newValue = newMessage.slice(0, lastAtSymbolIndex) + `@${employee.name} `;
    setNewMessage(newValue);
    setShowEmployeeList(false);
  };

  const handlePrivateNoteMentionSelect = (employee: Employee) => {
    const mentionText = `@${employee.name} `;
    const newValue = newMessage.replace(/@[^@]*$/, mentionText);
    setNewMessage(newValue);
    setIsPrivateNotesMentionOpen(false);
  };

  useEffect(() => {
    console.log('Initial contacts:', initialContacts);
  }, []);

  const filterContactsByUserRole = (contacts: Contact[], userRole: string, userName: string) => {
    switch (userRole) {
      case '1':
        return contacts; // Admin sees all contacts
      case '2':
        // Sales sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '3':
        // Observer sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '4':
        // Manager sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      default:
        return [];
    }
  };

  const filterAndSetContacts = useCallback((contactsToFilter: Contact[]) => {
    console.log('Filtering contacts', { 
      contactsLength: contactsToFilter.length, 
      userRole, 
      userName: userData?.name,
      activeTags,
      phoneCount,
      phoneNames,
      userPhone: userData?.phone,
    });
  
    // Apply role-based filtering first
    let filtered = filterContactsByUserRole(contactsToFilter, userRole, userData?.name || '');
    console.log('After role-based filtering:', { filteredCount: filtered.length });

  // Filter out group chats
  filtered = filtered.filter(contact => 
    contact.chat_id && !contact.chat_id.includes('@g.us')
  );
  console.log('Filtered out group chats:', { filteredCount: filtered.length });

  // Filter by user's phone if set
  if (userData?.phone !== null) {

    filtered = filtered.filter(contact => contact.phoneIndex === parseInt(userData?.phone));
    console.log(`Filtered contacts for user's phone (${phoneNames[userData?.phone]}):`, { filteredCount: filtered.length });
  }

  // Apply tag-based filtering
  if (activeTags.includes('all')) {
    console.log('Showing all contacts');
  } else if (activeTags.includes('unread')) {
    filtered = filtered.filter(contact => (contact.unreadCount || 0) > 0);
    console.log('Filtered unread contacts:', { filteredCount: filtered.length });
  } else if (activeTags.includes('mine')) {
    filtered = filtered.filter((contact) => 
      contact.tags?.some(tag => tag.toLowerCase() === currentUserName.toLowerCase())
    );
    console.log('Filtered "mine" contacts:', { filteredCount: filtered.length });
  } else if (userData?.role !== '1') {
    // Get the user's assigned phone from the employee document
    const userPhoneNames = userData?.phone && phoneNames[userData.phone] ? [phoneNames[userData.phone]] : [];
    
    if (userPhoneNames.length > 0 && userData?.phone !== undefined) {
      // Only display contacts for the user's assigned phone
      filtered = filtered.filter(contact => contact.phoneIndex === userData.phone);
      console.log(`Filtered contacts for ${userPhoneNames[0]}:`, { filteredCount: filtered.length });
    } else {
      console.log('User has no assigned phone');
    }
  } else if (Object.values(phoneNames).includes(activeTags[0])) {
    // For role '1', display contacts for the selected phone
    const phoneIndex = Object.entries(phoneNames).find(([_, name]) => name === activeTags[0])?.[0];
    if (phoneIndex !== undefined) {
      filtered = filtered.filter(contact => contact.phoneIndex === parseInt(phoneIndex));
      console.log(`Filtered contacts for ${activeTags[0]}:`, { filteredCount: filtered.length });
    }
    } else {
      filtered = filtered.filter(contact => 
        activeTags.some(tag => contact.tags?.includes(tag))
      );
      console.log('Filtered by active tags:', { filteredCount: filtered.length, activeTags });
    }
  
    setFilteredContacts(filtered);
    console.log('Final filtered contacts set:', { filteredCount: filtered.length });
  }, [userRole, userData, activeTags, currentUserName, phoneCount, phoneNames]);

  useEffect(() => {
    if (initialContacts.length > 0) {
      const filteredContacts = filterContactsByUserRole(initialContacts, userRole, userData?.name || '');
      console.log('Filtered contacts:', { count: filteredContacts.length });
      setContacts(filteredContacts.slice(0, 200));
      filterAndSetContacts(filteredContacts.slice(0, 200));
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(filteredContacts)));
      sessionStorage.setItem('contactsFetched', 'true');
    }
  }, [initialContacts, userRole, userData]);




useEffect(() => {
  const handleScroll = () => {
    if (
      contactListRef.current &&
      contactListRef.current.scrollTop + contactListRef.current.clientHeight >=
        contactListRef.current.scrollHeight
    ) {
      // loadMoreContacts();
    }
  };

  if (contactListRef.current) {
    contactListRef.current.addEventListener('scroll', handleScroll);
  }

  return () => {
    if (contactListRef.current) {
      contactListRef.current.removeEventListener('scroll', handleScroll);
    }
  };
}, [contacts]);

useEffect(() => {
  try {
    const pinned = activeTags.filter(tag => tag === 'pinned');
    const employees = activeTags.filter(tag => 
      employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    );
    const others = activeTags.filter(tag => 
      tag !== 'pinned' && !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    );

    setPinnedTags(pinned);
    setEmployeeTags(employees);
    setOtherTags(others);
    setTagsError(false);
  } catch (error) {
    console.error("Error processing tags:", error);
    setTagsError(true);
  }
}, [activeTags, employeeList]);

const loadMoreContacts = () => {
  if (initialContacts.length <= contacts.length) return;

  const nextPage = currentPage + 1;
  const newContacts = initialContacts.slice(
    contacts.length,
    nextPage * contactsPerPage
  );

  setContacts((prevContacts) => {
    const updatedContacts = [...prevContacts, ...newContacts];
    return filterContactsByUserRole(updatedContacts, userRole, userData?.name || '');
  });
  setCurrentPage(nextPage);
};

const handleEmojiClick = (emojiObject: EmojiClickData) => {
  setNewMessage(prevMessage => prevMessage + emojiObject.emoji);
};
const handlereplyMessage = async () => {
  if (!newMessage.trim() || !selectedChatId) return;
  
  // Your existing send message logic

  if (replyToMessage) {
    // Logic to handle replying to a specific message
    // Use replyToMessage.id to send the reply
  }

  // Clear the reply state after sending the message
  setReplyToMessage(null);
};

const detectMentions = (message: string) => {
  const mentionRegex = /@(\w+)/g;
  const atSymbolRegex = /@$/;
  return message.match(mentionRegex) || (message.match(atSymbolRegex) ? ['@'] : []);
};

const sendWhatsAppAlert = async (employeeName: string, chatId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) return;

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) return;

    const companyData = docSnapshot.data();

    // Fetch employee's WhatsApp number
    const employeesRef = collection(firestore, 'companies', companyId, 'employee');
    const q = query(employeesRef, where("name", "==", employeeName));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No employee found with name ${employeeName}`);
      return; 
    }

    const employeeData = querySnapshot.docs[0].data();
    const employeePhone = employeeData.phoneNumber;
    const temp = employeePhone.split('+')[1];
    const employeeId = temp+`@c.us`;

    console.log(employeeId);
    console.log(selectedChatId);

    // Send WhatsApp alert using the ngrok URL
    const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/${companyId}/${employeeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `You've been mentioned in a chat. Click here to view: https://web.jutasoftware.co/chat?chatId=${chatId}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp alert: ${response.statusText}`);
    }

    console.log(`WhatsApp alert sent to ${employeeName}`);
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error);
  }
};

const openPDFModal = (url: string) => {
  setPdfUrl(url);
  setPDFModalOpen(true);
};

const closePDFModal = () => {
  setPDFModalOpen(false);
  setPdfUrl('');
};
  let companyId = "";
  let user_name = '';
  let user_role='2';
  let totalChats = 0;
  const getQueryParams = (query: string | string[][] | Record<string, string> | URLSearchParams | undefined) => {
    return new URLSearchParams(query);
  };


  const openDeletePopup = () => {
    setIsDeletePopupOpen(true);
  };
  const closeDeletePopup = () => {
    setIsDeletePopupOpen(false);
  };

  const deleteMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      for (const message of selectedMessages) {
        try {
          const response = await axios.delete(
            `https://mighty-dane-newly.ngrok-free.app/api/v2/messages/${companyId}/${selectedChatId}/${message.id}`,
            {
              data: { deleteForEveryone: true } // Set this to false if you want to delete only for the current user
            }
          );
  
          if (response.data.success) {
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== message.id));
          } else {
            console.error(`Failed to delete message: ${message.id}`);
          }
        } catch (error) {
          console.error('Error deleting message:', error);
          if (axios.isAxiosError(error) && error.response) {
            console.error('Error details:', error.response.status, error.response.data);
          }
        }
      }
  
      toast.success('Messages deleted successfully');
      setSelectedMessages([]);
      closeDeletePopup();
    } catch (error) {
      console.error('Error in delete operation:', error);
      toast.error('Failed to delete messages');
    }
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  useEffect(() => {
   fetchConfigFromDatabase().catch(error => {
     console.error('Error in fetchConfigFromDatabase:', error);
     // Handle the error appropriately (e.g., show an error message to the user)
   });
    fetchQuickReplies();
    
  }, []);
  const fetchQuickReplies = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Fetch company quick replies
      const companyQuickReplyRef = collection(firestore, `companies/${companyId}/quickReplies`);
      const companyQuery = query(companyQuickReplyRef, orderBy('createdAt', 'desc'));
      const companySnapshot = await getDocs(companyQuery);
  
      // Fetch user's personal quick replies
      const userQuickReplyRef = collection(firestore, `user/${user.email}/quickReplies`);
      const userQuery = query(userQuickReplyRef, orderBy('createdAt', 'desc'));
      const userSnapshot = await getDocs(userQuery);
  
      const fetchedQuickReplies: QuickReply[] = [
        ...companySnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'all',
          document: doc.data().document || null,
        })),
        ...userSnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'self',
          document: doc.data().document || null,
        }))
      ];
  
      setQuickReplies(fetchedQuickReplies);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };
  const addQuickReply = async () => {
    if (newQuickReply.trim() === '') return;
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const newQuickReplyData = {
        text: newQuickReply,
        keyword: newQuickReplyKeyword,
        type: newQuickReplyType,
        createdAt: serverTimestamp(),
        createdBy: user.email,
        document: selectedDocument ? await uploadDocument(selectedDocument) : null,
      };
  
      if (newQuickReplyType === 'self') {
        // Add to user's personal quick replies
        const userQuickReplyRef = collection(firestore, `user/${user.email}/quickReplies`);
        await addDoc(userQuickReplyRef, newQuickReplyData);
      } else {
        // Add to company's quick replies
        const companyQuickReplyRef = collection(firestore, `companies/${companyId}/quickReplies`);
        await addDoc(companyQuickReplyRef, newQuickReplyData);
      }
  
      setNewQuickReply('');
      setSelectedDocument(null);
      setNewQuickReplyKeyword('');
      setNewQuickReplyType('all');
      fetchQuickReplies();
    } catch (error) {
      console.error('Error adding quick reply:', error);
    }
  };
  const updateQuickReply = async (id: string, keyword: string, text: string, type: 'all' | 'self') => {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      let quickReplyDoc;
      if (type === 'self') {
        quickReplyDoc = doc(firestore, `user/${user.email}/quickReplies`, id);
      } else {
        quickReplyDoc = doc(firestore, `companies/${companyId}/quickReplies`, id);
      }
  
      await updateDoc(quickReplyDoc, { text, keyword });
      setEditingReply(null);
      fetchQuickReplies(); // Refresh quick replies
    } catch (error) {
      console.error('Error updating quick reply:', error);
    }
  };
  const deleteQuickReply = async (id: string, type: 'all' | 'self') => {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      let quickReplyDoc;
      if (type === 'self') {
        quickReplyDoc = doc(firestore, `user/${user.email}/quickReplies`, id);
      } else {
        quickReplyDoc = doc(firestore, `companies/${companyId}/quickReplies`, id);
      }
  
      await deleteDoc(quickReplyDoc);
      fetchQuickReplies(); // Refresh quick replies
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };
  const handleQR = () => {
    setIsQuickRepliesOpen(!isQuickRepliesOpen);
    if (!isQuickRepliesOpen) {
      fetchQuickReplies(); // Fetch quick replies when opening the dropdown
    }
  };

  const handleQRClick = (keyword: string) => {
    const quickReply = quickReplies.find(qr => qr.keyword.toLowerCase() === keyword.toLowerCase());
    if (quickReply) {
      setNewMessage(quickReply.text);
      if (quickReply.document) {
        setSelectedDocument(quickReply.document);
      }
      setIsQuickRepliesOpen(false);
    }
  };

  const filteredQuickReplies = quickReplies.filter(reply =>
    reply.text.toLowerCase().includes(quickReplyFilter.toLowerCase())
  );

  
  // Modify the notification listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'user', auth.currentUser?.email!, 'notifications'),
      async (snapshot) => {
        const currentNotifications = snapshot.docs.map(doc => doc.data() as Notification);

        // Prevent running on initial mount
        if (isInitialMount.current) {
          isInitialMount.current = false;
          prevNotificationsRef.current = currentNotifications.length;
          return;
        }

        // Check if a new notification has been added
        if (prevNotificationsRef.current !== null && currentNotifications.length > prevNotificationsRef.current) {
          // Sort notifications by timestamp to ensure the latest one is picked
          currentNotifications.sort((a, b) => b.timestamp - a.timestamp);
          const latestNotification = currentNotifications[0];

          // Update the contact's last_message
          updateContactLastMessage(latestNotification);

          // ... rest of the existing notification handling code ...
        }

        // Update the previous notifications count
        prevNotificationsRef.current = currentNotifications.length;
      }
    );

    return () => unsubscribe();
  }, [companyId, selectedChatId, whapiToken]);

  const updateContactLastMessage = async (notification: Notification) => {
    if (!userData?.companyId) return;
  
    const contactRef = doc(firestore, `companies/${userData.companyId}/contacts`, notification.chat_id);
    
    await updateDoc(contactRef, {
      last_message: {
        text: { body: notification.text.body },
        timestamp: notification.timestamp,
        from_me: false,
        type: notification.type
      }
    });
  };
  
  let params :URLSearchParams;
  let chatId: any ;
  if(location != undefined){
    params = new URLSearchParams(location.search);
    chatId = params.get("chatId");
    if (chatId && !chatId.endsWith('@g.us')) {
      chatId += '@c.us';
    }
  }

  const handleNotificationClick = (chatId: string, index: number) => {
    selectChat(chatId);
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

// Update the showNotificationToast function
const showNotificationToast = (notification: Notification, index: number) => {
  // Check if a notification with the same chat_id and timestamp already exists
  const isDuplicate = activeNotifications.some(id => {
    const existingToast = toast.isActive(id);
    if (existingToast) {
      const content = document.getElementById(`toast-${id}`)?.textContent;
      return content?.includes(notification.from) && content?.includes(notification.text.body);
    }
    return false;
  });

  if (isDuplicate) {
    console.log('Duplicate notification, not showing toast');
    return;
  }

  let displayText = 'New message';

  switch (notification.type) {
    case 'text':
      displayText = notification.text?.body?.substring(0, 100) || 'New message'; // Truncate text to 100 characters
      break;
      case 'image':
        displayText = 'Image';
        break;
      case 'video':
        displayText = 'Video';
        break;
      case 'audio':
        displayText = 'Audio';
        break;
      case 'document':
        displayText = 'Document';
        break;
      case 'location':
        displayText = 'Location';
        break;
      case 'contact':
        displayText = 'Contact';
        break;
      default:
        displayText = 'New message';
  }
  const toastId = toast(
    <div id={`toast-${Date.now()}`} className="flex flex-col mr-2 pr-2">
      <strong className="font-semibold capitalize">{notification?.from}</strong>
      <p className="truncate max-w-xs pr-6">{displayText}</p>
    </div>,
    {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      onClick: () => handleNotificationClick(notification.chat_id, index),
      onClose: () => {
        setActiveNotifications(prev => prev.filter(id => id !== toastId));
      },
      closeButton: <button onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}><Lucide icon="X" className="absolute top-1 right-1 w-5 h-5 text-black" /></button>
    }
  );

  setActiveNotifications(prev => [...prev, toastId]);
};

// Update the useEffect for notifications
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(firestore, 'user', auth.currentUser?.email!, 'notifications'),
    async (snapshot) => {
      const currentNotifications = snapshot.docs.map(doc => doc.data() as Notification);

      // Prevent running on initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        prevNotificationsRef.current = currentNotifications.length;
        return;
      }

      // Check if a new notification has been added
      if (prevNotificationsRef.current !== null && currentNotifications.length > prevNotificationsRef.current) {
        // Sort notifications by timestamp to ensure the latest one is picked
        currentNotifications.sort((a, b) => b.timestamp - a.timestamp);
        const latestNotification = currentNotifications[0];

        // Check for duplicate notifications
        setNotifications(prev => {
          const isDuplicate = prev.some(notification => notification.timestamp === latestNotification.timestamp && notification.from === latestNotification.from);
          if (isDuplicate) {
            return prev;
          }
          return [...prev, latestNotification];
        });
        
        // Play notification sound
        if (audioRef.current) {
          audioRef.current.play();
        }

        // Show toast notification
        showNotificationToast(latestNotification, notifications.length);
      }

      // Update the previous notifications count
      prevNotificationsRef.current = currentNotifications.length;
    }
  );

  return () => unsubscribe();
}, [companyId, selectedChatId, whapiToken]);


// New separate useEffect for message listener
useEffect(() => {
  let unsubscribeMessages: (() => void) | null = null;

  const setupMessageListener = async () => {
    if (selectedChatId && auth.currentUser) {
   
      const phone = "+"+selectedChatId.split('@')[0];
      console.log('listing to messages' + phone);
      const userDocRef = doc(firestore, 'user', auth.currentUser.email!);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        console.log('No such user document!');
        return;
      }
      
      const dataUser = userDocSnapshot.data();
      const newCompanyId = dataUser.companyId;
      
      const companyDocRef = doc(firestore, 'companies', newCompanyId);
      const companyDocSnapshot = await getDoc(companyDocRef);
      
      if (!companyDocSnapshot.exists()) {
        console.log('No such company document!');
        return;
      }
      
      const data = companyDocSnapshot.data();
      console.log('Setting up message listener for company:', newCompanyId);

      let prevMessagesCount = 0;

      unsubscribeMessages = onSnapshot(
        collection(firestore, `companies/${newCompanyId}/contacts/${phone}/messages`),
        async (snapshot) => {
          const currentMessages = snapshot.docs;
          
          // Check if new messages have been added
          if (currentMessages.length > prevMessagesCount) {
            console.log('New message(s) detected');
            fetchMessagesBackground(selectedChatId, data.whapiToken);
          }

          // Update the previous messages count
          prevMessagesCount = currentMessages.length;
        }
      );
    }
  };

  if (selectedChatId) {
    setupMessageListener();
  }

  return () => {
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
  };
}, [selectedChatId]); 

  useEffect(() => {
    const fetchContact = async () => {
      const params = new URLSearchParams(location.search);
      const chatIdFromUrl = params.get('chatId');
  
      if (!chatIdFromUrl || !auth.currentUser) return;
  
      setLoading(true);
      try {
        const userDocRef = doc(firestore, 'user', auth.currentUser.email!);
        const userDocSnapshot = await getDoc(userDocRef);
        if (!userDocSnapshot.exists()) throw new Error('No user document found');
  
        const userData = userDocSnapshot.data() as UserData;
        if (!userData.companyId) throw new Error('Invalid user data or companyId');
  
        setUserData(userData);
        user_role = userData.role;
        companyId = userData.companyId;
  
        const companyDocRef = doc(firestore, 'companies', companyId);
        const companyDocSnapshot = await getDoc(companyDocRef);
        if (!companyDocSnapshot.exists()) throw new Error('No company document found');
  
        const companyData = companyDocSnapshot.data();
        const phone = "+" + chatIdFromUrl.split('@')[0];
  
        let contact;
        if (companyData.v2) {
          contact = initialContacts.find(c => c.phone === phone || c.chat_id === chatIdFromUrl);
          if (!contact) throw new Error('Contact not found in initialContacts');
        } else {
          contact = await fetchDuplicateContact(phone, companyData.ghl_location, companyData.ghl_accessToken);
        }
  
        setSelectedContact(contact);
        setSelectedChatId(chatIdFromUrl);
      } catch (error) {
        console.error('Error fetching contact:', error);
        // Handle error (e.g., show error message to user)
      } finally {
        setLoading(false);
      }
    };
  
    fetchContact();
  }, [location.search]);
async function fetchConfigFromDatabase() {
  const user = auth.currentUser;

  if (!user) {
    console.error('No user is authenticated');
    return;
  }

  try {
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No such document for user!');
      return;
    }
    const dataUser = docUserSnapshot.data() as UserData;
    setUserData(dataUser);
    user_role = dataUser.role;
    companyId = dataUser.companyId;
    setUserRole(dataUser.role);
    if (!dataUser || !dataUser.companyId) {
      console.error('Invalid user data or companyId');
      return;
    }

    console.log('Company ID:', companyId);

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('No such document for company!');
      return;
    }
    const data = docSnapshot.data();

    console.log('Company Data:', data);

    if (!data) {
      console.error('Company data is missing');
      return;
    }
    setPhoneCount(data.phoneCount);
    if(data.phoneCount >=2){
      setMessageMode('phone1');
    }
    console.log(messageMode);
    setGhlConfig({
      ghl_id: data.ghl_id,
      ghl_secret: data.ghl_secret,
      refresh_token: data.refresh_token,
      ghl_accessToken: data.ghl_accessToken,
      ghl_location: data.ghl_location,
      whapiToken: data.whapiToken,
      v2: data.v2,
    });

    console.log('Tags:', data.tags);

    setToken(data.whapiToken);
    user_name = dataUser.name;

    // Set wallpaper URL if available
    if (dataUser.wallpaper_url) {
      setWallpaperUrl(dataUser.wallpaper_url);
    }

    const employeeRef = doc(firestore, `companies/${companyId}/employee`, dataUser.name);
    const employeeDoc = await getDoc(employeeRef);
    if (employeeDoc.exists()) {
      const employeeData = employeeDoc.data();
      setUserPhone(employeeData.phone || null);
    }

    const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
    const employeeSnapshot = await getDocs(employeeCollectionRef);

    const employeeListData: Employee[] = [];
    employeeSnapshot.forEach((doc) => {
      employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
    });

    setEmployeeList(employeeListData);
    console.log('Employee List:', employeeListData);
    const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());

    // Check if the company is using v2
    if (data.v2) {
      console.log('Company is using v2, fetching tags from Firebase');
      // For v2, fetch tags from Firebase
      const tagsRef = collection(firestore, `companies/${companyId}/tags`);
      const tagsSnapshot = await getDocs(tagsRef);
      const tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      const filteredTags = tags.filter((tag: Tag) => !employeeNames.includes(tag.name.toLowerCase()));
      console.log('Fetched Tags:', filteredTags);
      setTagList(filteredTags);
    } else {
      console.log('Company is not using v2, fetching tags from GHL');
      // For non-v2, fetch from GHL API
      await fetchTags(data.ghl_accessToken, data.ghl_location, employeeNames);
    }

    console.log('User Role:', userRole);
    console.log('User Name:', userData?.name);
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}
  const updateConversation = async (conversationId: string, token: string, locationId: string,) => {
    const url = `https://services.leadconnectorhq.com/conversations/${conversationId}`;
    const options = {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-04-15',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: {
        locationId: locationId,
        unreadCount: 0,
      },
    };
  
    try {
      const response = await axios(url, options);
      console.log(response.data);
      const data = response.data;
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotifications = async (chatId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }
  
      const notificationsRef = collection(firestore, 'user', user.email!, 'notifications');
      const q = query(notificationsRef, where('chat_id', '==', chatId));
      const querySnapshot = await getDocs(q);
  
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
  
      await batch.commit();
      console.log(`Deleted notifications for chat: ${chatId}`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const selectChat = async (chatId: string, contactId?: string, contactSelect?: Contact) => {
    console.log('Attempting to select chat:', { chatId, userRole, userName: userData?.name });
    if (userRole === "3" && contactSelect && contactSelect.assignedTo?.toLowerCase() !== userData?.name.toLowerCase()) {
      console.log('Permission denied for role 3 user');
      toast.error("You don't have permission to view this chat.");
      return;
    }

    const updatedContacts = contacts.map(contact =>
      contact.chat_id === chatId ? { ...contact, unreadCount: 0 } : contact
    );
    console.log('Updated Contacts:', updatedContacts);
    setContacts(updatedContacts);
  
    console.log('Updating local storage');
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
    sessionStorage.setItem('contactsFetched', 'true');

    let contact = contacts.find(contact => contact.chat_id === chatId || contact.id === contactId);
    console.log('Selected Contact:', contact);

    if(contactSelect){
      contact = contactSelect;
      console.log('Using provided contactSelect:', contact);
    }
    
    if (contact) {
      // Update unreadCount in Firebase
      try {
        const user = auth.currentUser;
        if (user) {
          const docUserRef = doc(firestore, 'user', user.email!);
          const docUserSnapshot = await getDoc(docUserRef);
          if (docUserSnapshot.exists()) {
            const userData = docUserSnapshot.data();
            const companyId = userData.companyId;
            
            const contactRef = doc(firestore, `companies/${companyId}/contacts`, contact.id!);
            await updateDoc(contactRef, { unreadCount: 0 });
            console.log('Updated unreadCount in Firebase for contact:', contact.id);
          }
        }

        setContacts(prevContacts => {
          const updatedContacts = prevContacts.map(c =>
            c.chat_id === chatId ? { ...c, unreadCount: 0 } : c
          );
          
          // Sort contacts: pinned first, then by last message timestamp
          return updatedContacts.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            
            const timestampA = getTimestamp(a.last_message?.timestamp || a.last_message?.createdAt);
            const timestampB = getTimestamp(b.last_message?.timestamp || b.last_message?.createdAt);
            
            return timestampB - timestampA;
          });
        });

        console.log('Setting state variables');
        setSelectedContact(contact);
        setSelectedChatId(chatId);
        setIsChatActive(true);

        console.log('Deleting notifications');
        deleteNotifications(chatId);
      } catch (error) {
        console.error('Error updating unreadCount in Firebase:', error);
      }
    }

    setSelectedContact(contact);
    setSelectedChatId(chatId);
    setIsChatActive(true);
    setSelectedChatId(chatId);
    
    try {
      const user = auth.currentUser;
      if (user) {
        console.log('Fetching notifications for user:', user.email);
        const notificationsRef = collection(firestore, 'user', user.email!, 'notifications');
        console.log('Notifications Reference Path:', notificationsRef.path);
  
        const notificationsSnapshot = await getDocs(notificationsRef);
        if (notificationsSnapshot.empty) {
          console.log('No notifications found for user:', user.email);
        } else {
          const notifications = notificationsSnapshot.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
          }));
          console.log('Fetched Notifications:', notifications);
  
          const notificationsToDelete = notifications.filter((notification: any) => notification.chat_id === chatId);
  
          // Delete each notification document in the subcollection
          for (const notification of notificationsToDelete) {
            const notificationDocRef = doc(firestore, 'user', user.email!, 'notifications', notification.docId);
            await deleteDoc(notificationDocRef);
            console.log('Deleted notification:', notification.docId);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };
  
  const fetchTags = async (token: string, location: string, employeeList: string[]) => {
    const maxRetries = 5;
    const baseDelay = 1000;

    const fetchData = async (url: string, retries: number = 0): Promise<any> => {
      const options = {
        method: 'GET',
        url: url,
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
        },
      };
      await rateLimiter();
      try {
        const response = await axios.request(options);
        return response;
      } catch (error: any) {
        if (error.response && error.response.status === 429 && retries < maxRetries) {
          const delay = baseDelay * Math.pow(2, retries);
          console.warn(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchData(url, retries + 1);
        } else {
          throw error;
        }
      }
    };

    try {
      const url = `https://services.leadconnectorhq.com/locations/${location}/tags`;
      const response = await fetchData(url);
      const filteredTags = response.data.tags.filter((tag: Tag) => !employeeList.includes(tag.name));
      setTagList(filteredTags);

      // Store tags in Firebase
      const batch = writeBatch(firestore);
      const tagsRef = collection(firestore, `companies/${companyId}/tags`);
      filteredTags.forEach((tag: Tag) => {
        const tagRef = doc(tagsRef);
        batch.set(tagRef, { name: tag.name });
      });
      await batch.commit();

      return filteredTags;
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  };
async function createContact(name: string, number: string): Promise<Contact> {
  const options = {
    method: 'POST',
    url: 'https://services.leadconnectorhq.com/contacts/',
    headers: {
      Authorization: `Bearer ${ghlConfig!.ghl_accessToken}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      firstName: name,
      name: name,
      locationId: ghlConfig!.ghl_location,
      phone: number,
    },
  };

  try {
    const response = await axios.request(options);
    const data = response.data;
    return {
      chat_id: data.id,
      id: data.id,
      firstName: name,
      phone: number,
      unreadCount: 0,
      conversation_id: '', // Default values
      additionalEmails: [],
      address1: null,
      assignedTo: null,
      businessId: null,
      city: null,
      companyName: null,
      contactName: name,
      country: '',
      customFields: [],
      dateAdded: new Date().toISOString(),
      dateOfBirth: null,
      dateUpdated: new Date().toISOString(),
      dnd: false,
      dndSettings: {},
      email: null,
      followers: [],
      lastName: '',
      locationId: ghlConfig!.ghl_location,
      postalCode: null,
      source: null,
      state: null,
      tags: [],
      type: '',
      website: null,
      chat: [],
      last_message: null,
      pinned: false,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create contact');
  }
}
const fetchDuplicateContact = async (phone: string, locationId: string, accessToken: string) => {
  const url = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&number=${phone}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });
    return response.data.contact;
  } catch (err) {
    const error = err as AxiosError;
    if (error.response && error.response.status === 429) {
      // Handle rate limit error gracefully
      return null;
    } else if (axios.isCancel(error)) {
      console.warn('Fetch cancelled:', error.message);
    } else {
      console.error('Error fetching duplicate contact:', error);
      throw error;
    }
  }
};

const fetchContacts = async (whapiToken: any, locationId: any, ghlToken: any, user_name: string, role: string, userEmail: string, callback?: Function) => {
  console.log('Fetching contacts:', { user_name, role, userEmail });
  try {
    console.log('Initial contacts:', { count: initialContacts.length });
    const filteredInitialContacts = filterContactsByUserRole(initialContacts, role, user_name);
    console.log('Filtered initial contacts:', { count: filteredInitialContacts.length });
    setContacts(filteredInitialContacts);
    setFilteredContacts(filteredInitialContacts);
    setFilteredContactsForForwarding(filteredInitialContacts);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
  }
};


const getTimestamp = (timestamp: any): number => {
  if (typeof timestamp === 'number') {
    return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  } else if (typeof timestamp === 'object' && timestamp.seconds) {
    return timestamp.seconds * 1000;
  } else if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  } else {
    return 0;
  }
};

const fetchContactsBackground = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string, role: string, userEmail: string | null | undefined) => {
  try {
    if (!userEmail) throw new Error("User email is not provided.");
    
    const docUserRef = doc(firestore, 'user', userEmail);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('User document not found');
      return;
    }

    const dataUser = docUserSnapshot.data();
    const companyId = dataUser?.companyId;
    if (!companyId) {
      console.log('Company ID not found');
      return;
    }

    // Pagination settings
    const batchSize = 4000;
    let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;
    const phoneSet = new Set<string>();
    let allContacts: Contact[] = [];

    // Fetch contacts in batches
    const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
    while (true) {
      let queryRef: Query<DocumentData> = lastVisible
        ? query(contactsCollectionRef, startAfter(lastVisible), limit(batchSize))
        : query(contactsCollectionRef, limit(batchSize));

      const contactsSnapshot = await getDocs(queryRef);
      if (contactsSnapshot.empty) break;

      contactsSnapshot.docs.forEach(doc => {
        const contact = { ...doc.data(), id: doc.id } as Contact;
        if (contact.phone && !phoneSet.has(contact.phone)) {
          phoneSet.add(contact.phone);
          allContacts.push(contact);
        }
      });

      lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
    }

    // Fetch pinned chats
    const pinnedChatsRef = collection(firestore, `user/${userEmail}/pinned`);
    const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
    const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);

    // Update pinned status in Firebase and local contacts
    const updatePromises = allContacts.map(async contact => {
      const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
      if (isPinned !== contact.pinned) {
        const contactDocRef = doc(contactsCollectionRef, contact.id!);
        await updateDoc(contactDocRef, { pinned: isPinned });
        contact.pinned = isPinned;
      }
    });

    await Promise.all(updatePromises);

    // Sort contacts by pinned status and last_message timestamp
    allContacts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      const timestampA = getTimestamp(a.last_message?.timestamp || a.last_message?.createdAt);
      const timestampB = getTimestamp(b.last_message?.timestamp || b.last_message?.createdAt);
      return timestampB - timestampA;
    });

    console.log('Active tag:', activeTags[0]);
    console.log('Total contacts:', allContacts.length);

    setContacts(allContacts.slice(0, 200));
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
    sessionStorage.setItem('contactsFetched', 'true');
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
  }
};

useEffect(() => {
  const fetchUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (docUserSnapshot.exists()) {
        const userData = docUserSnapshot.data();
        setUserRole(userData.role);
        console.log('User role set:', userData.role);
      }
    }
  };
  fetchUserRole();
}, []);


  async function fetchConversationMessages(conversationId: string,contact:any) {
    if (!conversationId) return;
    console.log(contact);
    console.log(selectedIcon);
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data2 = docSnapshot.data();
      await updateConversation(conversationId,data2.ghl_accessToken,data2.ghl_location)
      setToken(data2.whapiToken);
      const leadConnectorResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${data2.ghl_accessToken}`,
          Version: '2021-04-15',
          Accept: 'application/json'
        }
      });
      const leadConnectorData = leadConnectorResponse.data;
      setMessages(
        leadConnectorData.messages.messages.map((message: any) => ({
          id: message.id,
          text: { body: message.body },
          from_me: message.direction === 'outbound' ? true : false,
          createdAt: message.dateAdded,
          type: 'text',
          image: message.image ? message.image : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }
  const handleWhatsappClick = (iconId: string) => {
    setSelectedIcon(iconId);
    fetchMessages(selectedChatId!, whapiToken!);
  };
  useEffect(() => {
    if (selectedChatId) {
      console.log(selectedContact);
      console.log(selectedChatId);
      fetchMessages(selectedChatId, whapiToken!);
    }
  }, [selectedChatId]);
  async function fetchMessages(selectedChatId: string, whapiToken: string) {
    setLoading(true);
    setSelectedIcon('ws');
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    try {
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (!docUserSnapshot.exists()) {
            console.log('No such document!');
            return;
        }
        const dataUser = docUserSnapshot.data();
        
        const companyId = dataUser.companyId;
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
            console.log('No such document!');
            return;
        }
        const data2 = docSnapshot.data();
        
        setToken(data2.whapiToken);
        console.log('fetching messages');
        let messages;
        if (data2.v2) {
            messages = await fetchMessagesFromFirebase(companyId, selectedChatId);
            console.log('messages');
            console.log(messages);
        } else {
            messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken, dataUser?.email);
            // If no messages, try with whapiToken2
            if (!messages.length && data2.whapiToken2) {
                messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken2, dataUser?.email);
            }
        }
        
        const formattedMessages: any[] = [];
        const reactionsMap: Record<string, any[]> = {};

        messages.forEach(async (message: any) => {
            if (message.type === 'action' && message.action.type === 'reaction') {
                const targetMessageId = message.action.target;
                if (!reactionsMap[targetMessageId]) {
                    reactionsMap[targetMessageId] = [];
                }
                reactionsMap[targetMessageId].push({
                    emoji: message.action.emoji,
                    from_name: message.from_name
                });
            } else {
              const formattedMessage: any = {
                id: message.id,
                from_me: message.from_me,
                from_name: message.from_name,
                from: message.from,
                chat_id: message.chat_id,
                type: message.type,
                author: message.author,
                name: message.name,
                phoneIndex: message.phoneIndex,
                userName: message.userName,
                edited: message.edited // Add this line to include phoneIndex
              };
    
            // Handle timestamp based on message type
            if (message.type === 'privateNote') {
              if (message.timestamp && message.timestamp.seconds) {
                  // Firestore Timestamp
                  formattedMessage.createdAt = new Date(message.timestamp.seconds * 1000).toISOString();
              } else if (typeof message.timestamp === 'string') {
                  // String timestamp
                  const parsedDate = new Date(message.timestamp);
                  if (!isNaN(parsedDate.getTime())) {
                      formattedMessage.createdAt = parsedDate.toISOString();
                  } else {
                      console.warn('Invalid date string for private note:', message.timestamp);
                      formattedMessage.createdAt = message.timestamp; // Keep the original string
                  }
              } else if (message.timestamp instanceof Date) {
                  // Date object
                  formattedMessage.createdAt = message.timestamp.toISOString();
              } else if (typeof message.timestamp === 'number') {
                  // Unix timestamp (milliseconds)
                  formattedMessage.createdAt = new Date(message.timestamp).toISOString();
              } else {
                  console.warn('Unexpected timestamp format for private note:', message.timestamp);
                  formattedMessage.createdAt = message.timestamp; // Keep the original value
              }
          }else {
                // For regular messages, multiply timestamp by 1000
                formattedMessage.createdAt = new Date(message.timestamp * 1000).toISOString();
            }
        
                // Include message-specific content
                switch (message.type) {
                    case 'text':
                      formattedMessage.text = {
                          body: message.text ? message.text.body : '', // Include the message body
                          context: message.text && message.text.context ? {
                              quoted_author: message.text.context.quoted_author,
                              quoted_content: {
                                  body: message.text.context.quoted_content?.body || ''
                              }
                          } : null
                        };                
                        break;
                    case 'image':
                        formattedMessage.image = message.image ? message.image : undefined;
                        break;
                    case 'video':
                        formattedMessage.video = message.video ? message.video : undefined;
                        break;
                    case 'gif':
                        formattedMessage.gif = message.gif ? message.gif : undefined;
                        break;
                    case 'audio':
                        formattedMessage.audio = message.audio ? message.audio : undefined;
                        break;
                    case 'voice':
                        formattedMessage.voice = message.voice ? message.voice : undefined;
                        break;
                    case 'document':
                        formattedMessage.document = message.document ? message.document : undefined;
                        break;
                    case 'link_preview':
                        formattedMessage.link_preview = message.link_preview ? message.link_preview : undefined;
                        break;
                    case 'sticker':
                        formattedMessage.sticker = message.sticker ? message.sticker : undefined;
                        break;
                    case 'location':
                        formattedMessage.location = message.location ? message.location : undefined;
                        break;
                    case 'live_location':
                        formattedMessage.live_location = message.live_location ? message.live_location : undefined;
                        break;
                    case 'contact':
                        formattedMessage.contact = message.contact ? message.contact : undefined;
                        break;
                    case 'contact_list':
                        formattedMessage.contact_list = message.contact_list ? message.contact_list : undefined;
                        break;
                    case 'interactive':
                        formattedMessage.interactive = message.interactive ? message.interactive : undefined;
                        break;
                    case 'ptt':
                        formattedMessage.ptt = message.ptt ? message.ptt : undefined;
                        break;
                    case 'poll':
                        formattedMessage.poll = message.poll ? message.poll : undefined;
                        break;
                    case 'hsm':
                        formattedMessage.hsm = message.hsm ? message.hsm : undefined;
                        break;
                    case 'system':
                        formattedMessage.system = message.system ? message.system : undefined;
                        break;
                    case 'order':
                        formattedMessage.order = message.order ? message.order : undefined;
                        break;
                    case 'group_invite':
                        formattedMessage.group_invite = message.group_invite ? message.group_invite : undefined;
                        break;
                    case 'admin_invite':
                        formattedMessage.admin_invite = message.admin_invite ? message.admin_invite : undefined;
                        break;
                    case 'product':
                        formattedMessage.product = message.product ? message.product : undefined;
                        break;
                    case 'catalog':
                        formattedMessage.catalog = message.catalog ? message.catalog : undefined;
                        break;
                    case 'product_items':
                        formattedMessage.product_items = message.product_items ? message.product_items : undefined;
                        break;
                    case 'action':
                        formattedMessage.action = message.action ? message.action : undefined;
                        break;
                    case 'context':
                        formattedMessage.context = message.context ? message.context : undefined;
                        break;
                    case 'reactions':
                        formattedMessage.reactions = message.reactions ? message.reactions : undefined;
                        break;
                        case 'privateNote':
    console.log('Private note data:', message);
    formattedMessage.text = typeof message.text === 'string' ? message.text : message.text?.body || '';
    console.log('Formatted private note text:', formattedMessage.text);
    formattedMessage.from_me = true;
    formattedMessage.from_name = message.from;
    break;
                    default:
                        console.warn(`Unknown message type: ${message.type}`);
                }
        
                formattedMessages.push(formattedMessage);
            }
        });
        
        // Add reactions to the respective messages
        formattedMessages.forEach(message => {
            if (reactionsMap[message.id]) {
                message.reactions = reactionsMap[message.id];
            }
        });
        
        setMessages(formattedMessages);
        fetchContactsBackground(
          data2.whapiToken,
          data2.ghl_location,
          data2.ghl_accessToken,
          user_name,
          dataUser.role,
          dataUser.email
        );
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    } finally {
        setLoading(false);
    }
}

const togglePrivateNotes = () => {
  const newExpandedState = !isPrivateNotesExpanded;
  console.log('Toggling private notes. New state:', newExpandedState);
  setIsPrivateNotesExpanded(newExpandedState);
  if (newExpandedState) {
    console.log('Expanding private notes, calling fetchPrivateNotes');
    fetchPrivateNotes();
  }
};

async function fetchMessagesFromFirebase(companyId: string, chatId: string): Promise<any[]> {
  const number = '+' + chatId.split('@')[0];
  console.log(number);
  const messagesRef = collection(firestore, `companies/${companyId}/contacts/${number}/messages`);
  const messagesSnapshot = await getDocs(messagesRef);
  
  const messages = messagesSnapshot.docs.map(doc => doc.data());

  // Sort messages by timestamp in descending order (latest first)
  return messages.sort((a, b) => {
    const timestampA = a.timestamp?.seconds || a.timestamp || 0;
    const timestampB = b.timestamp?.seconds || b.timestamp || 0;
    return timestampB - timestampA;
  });
}

  
  async function  fetchMessagesFromApi(chatId: string, token: string, userEmail: string) {
    const response = await axios.get(`https://mighty-dane-newly.ngrok-free.app/api/messages/${chatId}/${token}/${userEmail}`);
    console.log(response);
    return response.data.messages;
  }
async function fetchMessagesBackground(selectedChatId: string, whapiToken: string) {
  setSelectedIcon('ws');
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  try {
    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    
    if (!docUserSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const dataUser = docUserSnapshot.data();
    
    const companyId = dataUser.companyId;
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const data2 = docSnapshot.data();
    
    setToken(data2.whapiToken);
    
    let messages;
    if (data2.v2) {
      messages = await fetchMessagesFromFirebase(companyId, selectedChatId);
      console.log('messages');
      console.log(messages);
    } else {
      messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken, dataUser?.email);
      // If no messages, try with whapiToken2
      if (!messages.length && data2.whapiToken2) {
        messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken2, dataUser?.email);
      }
    }
    
    const formattedMessages: any[] = [];
    const reactionsMap: Record<string, any[]> = {};

    messages.forEach(async (message: any) => {
      if (message.type === 'action' && message.action.type === 'reaction') {
        const targetMessageId = message.action.target;
        if (!reactionsMap[targetMessageId]) {
          reactionsMap[targetMessageId] = [];
        }
        reactionsMap[targetMessageId].push({
          emoji: message.action.emoji,
          from_name: message.from_name
        });
      } else {
        const formattedMessage: any = {
          id: message.id,
          from_me: message.from_me,
          from_name: message.from_name,
          from: message.from,
          chat_id: message.chat_id,
          createdAt: new Date(message.timestamp * 1000).toISOString(), // Ensure the timestamp is correctly formatted
          type: message.type,
          author:message.author,
          name: message.name,
          phoneIndex: message.phoneIndex,
          userName: message.userName,
          edited: message.edited // Add this line to include phoneIndex
        };
        if (message.type === 'privateNote') {
          if (message.timestamp && message.timestamp.seconds) {
              // Firestore Timestamp
              formattedMessage.createdAt = new Date(message.timestamp.seconds * 1000).toISOString();
          } else if (typeof message.timestamp === 'string') {
              // String timestamp
              const parsedDate = new Date(message.timestamp);
              if (!isNaN(parsedDate.getTime())) {
                  formattedMessage.createdAt = parsedDate.toISOString();
              } else {
                  console.warn('Invalid date string for private note:', message.timestamp);
                  formattedMessage.createdAt = message.timestamp; // Keep the original string
              }
          } else if (message.timestamp instanceof Date) {
              // Date object
              formattedMessage.createdAt = message.timestamp.toISOString();
          } else if (typeof message.timestamp === 'number') {
              // Unix timestamp (milliseconds)
              formattedMessage.createdAt = new Date(message.timestamp).toISOString();
          } else {
              console.warn('Unexpected timestamp format for private note:', message.timestamp);
              formattedMessage.createdAt = message.timestamp; // Keep the original value
          }
      }else {
          // For regular messages, multiply timestamp by 1000
          formattedMessage.createdAt = new Date(message.timestamp * 1000).toISOString();
      }
  
        // Include message-specific content
        switch (message.type) {
          case 'text':
            formattedMessage.text = {
                body: message.text ? message.text.body : '', // Include the message body
                context: message.text && message.text.context ? {
                    quoted_author: message.text.context.quoted_author,
                    quoted_content: {
                        body: message.text.context.quoted_content?.body || ''
                    }
                } : null // Include the context with quoted content
            };
            break;
          case 'image':
            formattedMessage.image = message.image ? message.image : undefined;
            break;
          case 'video':
            formattedMessage.video = message.video ? message.video : undefined;
            break;
          case 'gif':
            formattedMessage.gif = message.gif ? message.gif : undefined;
            break;
          case 'audio':
            formattedMessage.audio = message.audio ? message.audio : undefined;
            break;
          case 'voice':
            formattedMessage.voice = message.voice ? message.voice : undefined;
            break;
          case 'document':
            formattedMessage.document = message.document ? message.document : undefined;
            break;
          case 'link_preview':
            formattedMessage.link_preview = message.link_preview ? message.link_preview : undefined;
            break;
          case 'sticker':
            formattedMessage.sticker = message.sticker ? message.sticker : undefined;
            break;
          case 'location':
            formattedMessage.location = message.location ? message.location : undefined;
            break;
          case 'live_location':
            formattedMessage.live_location = message.live_location ? message.live_location : undefined;
            break;
          case 'contact':
            formattedMessage.contact = message.contact ? message.contact : undefined;
            break;
          case 'contact_list':
            formattedMessage.contact_list = message.contact_list ? message.contact_list : undefined;
            break;
          case 'interactive':
            formattedMessage.interactive = message.interactive ? message.interactive : undefined;
            break;
          case 'poll':
            formattedMessage.poll = message.poll ? message.poll : undefined;
            break;
          case 'hsm':
            formattedMessage.hsm = message.hsm ? message.hsm : undefined;
            break;
          case 'ptt':
            formattedMessage.ptt = message.ptt ? message.ptt : undefined;
            break;
          case 'system':
            formattedMessage.system = message.system ? message.system : undefined;
            break;
          case 'order':
            formattedMessage.order = message.order ? message.order : undefined;
            break;
          case 'group_invite':
            formattedMessage.group_invite = message.group_invite ? message.group_invite : undefined;
            break;
          case 'admin_invite':
            formattedMessage.admin_invite = message.admin_invite ? message.admin_invite : undefined;
            break;
          case 'product':
            formattedMessage.product = message.product ? message.product : undefined;
            break;
          case 'catalog':
            formattedMessage.catalog = message.catalog ? message.catalog : undefined;
            break;
          case 'product_items':
            formattedMessage.product_items = message.product_items ? message.product_items : undefined;
            break;
          case 'action':
            formattedMessage.action = message.action ? message.action : undefined;
            break;
          case 'context':
            formattedMessage.context = message.context ? message.context : undefined;
            break;
          case 'reactions':
            formattedMessage.reactions = message.reactions ? message.reactions : undefined;
            break;
            case 'privateNote':
              console.log('Private note data:', message);
              formattedMessage.text = typeof message.text === 'string' ? message.text : message.text?.body || '';
              console.log('Formatted private note text:', formattedMessage.text);
              formattedMessage.from_me = true;
              formattedMessage.from_name = message.from;
              break;
          default:
            console.warn(`Unknown message type: ${message.type}`);
        }
  
        formattedMessages.push(formattedMessage);
      }
    });
    
    // Add reactions to the respective messages
    formattedMessages.forEach(message => {
      if (reactionsMap[message.id]) {
        message.reactions = reactionsMap[message.id];
      }
    });

    // Fetch private notes for the selected chat
    const privateNotesRef = collection(firestore, 'companies', companyId, 'contacts', selectedChatId, 'privateNotes');
    const privateNotesSnapshot = await getDocs(privateNotesRef);
    const chatPrivateNotes = privateNotesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().getTime(),
      type: 'privateNote'
    }));

    // Combine regular messages and private notes
    const allMessages = [...formattedMessages, ...chatPrivateNotes].sort((a, b) => 
      a.timestamp - b.timestamp
    );

    setMessages(allMessages);
    
    // Update private notes state
    setPrivateNotes(prevNotes => ({
      ...prevNotes,
      [selectedChatId]: chatPrivateNotes.map(note => ({
        id: note.id,
        text: 'text' in note && typeof note.text === 'string' ? note.text : '',
        timestamp: note.timestamp
      }))
    }));
    
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
}
  async function sendTextMessage(selectedChatId: string, newMessage: string,contact:any): Promise<void> {
    if (!newMessage.trim() || !selectedChatId) return;
  console.log(selectedChatId)
    const user = auth.currentUser;
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
  
    const dataUser = docUserSnapshot.data();
     companyId = dataUser.companyId;
  
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
  
    const data2 = docSnapshot.data();
    const accessToken = data2.ghl_accessToken;
  
    try {
      const options = {
        method: 'POST',
        url: 'https://services.leadconnectorhq.com/conversations/messages',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-04-15',
        },
        data: {
          type: (selectedIcon =='fb')?'FB':'IG',
          contactId: selectedChatId,
          message: newMessage
        }
      };
  
      const response = await axios.request(options);
      console.log(response.data);
  
      console.log('Message sent successfully:', response.data);
      fetchConversationMessages(contact.conversation_id,selectedContact);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  const fetchPrivateNotes = async () => {
    if (!selectedChatId) {
      console.log('fetchPrivateNotes: Missing selectedChatId', { selectedChatId });
      return;
    }
  
    console.log('Fetching private notes for:', selectedChatId);
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      if (!companyId) {
        console.log('No companyId found for user');
        return;
      }
  
      // Convert selectedChatId to numericChatId
      const numericChatId = '+' + selectedChatId.split('@')[0];
      console.log('Numeric Chat ID:', numericChatId);
      
      const privateNotesRef = collection(firestore, 'companies', companyId, 'contacts', numericChatId, 'privateNotes');
      console.log('Firestore path:', `companies/${companyId}/contacts/${numericChatId}/privateNotes`);
  
      const q = query(privateNotesRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
  
      console.log('Number of private notes fetched:', querySnapshot.size);
  
      const fetchedNotes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Note data:', data);
        return {
          id: doc.id,
          text: data.text,
          from: data.from,
          timestamp: data.timestamp?.toDate().getTime(),
          type: 'privateNote'
        };
      });
  
      console.log('Processed fetched notes:', fetchedNotes);
  
      setPrivateNotes(prevNotes => {
        const updatedNotes = {
          ...prevNotes,
          [selectedChatId]: fetchedNotes
        };
        console.log('Updated privateNotes state:', updatedNotes);
        return updatedNotes;
      });
  
    } catch (error) {
      console.error('Error fetching private notes:', error);
      toast.error('Failed to fetch private notes');
    }
  };



  const handleAddPrivateNote = async (newMessage: string) => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      
      const numericChatId = '+' + selectedChatId.split('').filter(char => /\d/.test(char)).join('');
      console.log('Numeric Chat ID:', numericChatId);
  
      const privateNoteRef = collection(firestore, 'companies', companyId, 'contacts', numericChatId, 'privateNotes');
      const currentTimestamp = new Date();
      const newPrivateNote = {
        text: newMessage,
        from: userData.name,
        timestamp: currentTimestamp,
        type: 'privateNote'
      };
  
      console.log('Adding private note:', newPrivateNote);
      console.log('Private note ref:', privateNoteRef);
  
      const docRef = await addDoc(privateNoteRef, newPrivateNote);
      console.log('Private note added with ID:', docRef.id);
  
      const messageData = {
        chat_id: numericChatId,
        from: user.email ?? "",
        from_me: true,
        id: docRef.id,
        source: "web",
        status: "delivered",
        text: {
          body: newMessage
        },
        timestamp: currentTimestamp,
        type: "privateNote",
      };
  
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', numericChatId);
      const messagesRef = collection(contactRef, 'messages');
      const messageDoc = doc(messagesRef, docRef.id);
      await setDoc(messageDoc, messageData);
  
      console.log('Private note added to messages collection');
  
      const mentions = detectMentions(newMessage);
      console.log('Mentions:', mentions); 
      for (const mention of mentions) {
        const employeeName = mention.slice(1);
        console.log(employeeName);
        console.log('Adding notification for:', employeeName);
        await addNotificationToUser(companyId, employeeName, {
          chat_id: selectedChatId,
          from: userData.name,
          timestamp: currentTimestamp,
          from_me: false,
          text: {
            body: newMessage
          },
          type: "privateNote"
        });
        await sendWhatsAppAlert(employeeName, selectedChatId);
      }
  
      setPrivateNotes(prevNotes => ({
        ...prevNotes,
        [selectedChatId]: [
          ...(prevNotes[selectedChatId] || []),
          { id: docRef.id, text: newMessage, timestamp: currentTimestamp.getTime() }
        ]
      }));
  
      fetchMessages(selectedChatId, "");
  
      setNewMessage('');
      toast.success("Private note added successfully!");
    } catch (error) {
      console.error('Error adding private note:', error);
      toast.error("Failed to add private note");
    }
  };
  const deletePrivateNote = async (noteId: string) => {
    if (!selectedChatId) {
      console.error('No chat selected');
      return;
    }
  
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Convert selectedChatId to numericChatId
      const numericChatId = '+' + selectedChatId.split('@')[0];
  
      const privateNoteRef = doc(firestore, 'companies', companyId, 'contacts', numericChatId, 'privateNotes', noteId);
  
      await deleteDoc(privateNoteRef);
  
      // Update local state
      setPrivateNotes(prevNotes => ({
        ...prevNotes,
        [selectedChatId]: prevNotes[selectedChatId].filter(note => note.id !== noteId)
      }));
  
      // Update messages state to remove the deleted note
      setMessages(prevMessages => prevMessages.filter(message => message.id !== noteId));
  
      toast.success("Private note deleted successfully!");
    } catch (error) {
      console.error('Error deleting private note:', error);
      toast.error("Failed to delete private note");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;
      
    setNewMessage('');
    setReplyToMessage(null);
    const user = auth.currentUser;
    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const dataUser = docUserSnapshot.data();
    companyId = dataUser.companyId;
    let phoneIndex;
    if (dataUser?.phone !== undefined) {
        if (dataUser.phone === 0) {
            // Handle case for phone index 0
            phoneIndex = 0;
        } else if (dataUser.phone === -1) {
            // Handle case for phone index -1
            phoneIndex = 0;
        } else {
            // Handle other cases
            console.log(`User phone index is: ${dataUser.phone}`);
            phoneIndex = dataUser.phone;
        }
    } else {
        console.error('User phone is not defined');
        phoneIndex = 0; // Default value if phone is not defined
    }
    
    const userName = dataUser.name || dataUser.email || ''; // Get the user's name
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const data2 = docSnapshot.data();
  
    if (messageMode === 'privateNote') {
      handleAddPrivateNote(newMessage);
    } else {
      try {
        let response;
        if (data2.v2 === true) {
          console.log("v2 is true");
          // Use the new API
        
          response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/${companyId}/${selectedChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: newMessage,
              quotedMessageId: replyToMessage?.id || null,
              phoneIndex: phoneIndex,
              userName: userName
            }),
          });
        } else {
          // Use the original method
          setToken(data2.whapiToken);
          console.log("v2 is false");
          response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/text/${selectedChatId!}/${data2.whapiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: newMessage,
              quotedMessageId: replyToMessage?.id || null,
              userName: userName
            }),
          });
        }
  
        await sendTextMessage(selectedChatId, newMessage, selectedContact);
  
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        const now = new Date();
        const data = await response.json();
        // Update the local state
        setContacts(prevContacts => 
          prevContacts.map(contact => 
            contact.id === selectedContact.id 
              ? updateContactWithNewMessage(contact, newMessage, now,phoneIndex)
              : contact
          )
        );
        const contactRef = doc(firestore, `companies/${companyId}/contacts`, selectedContact.id);
        const updatedLastMessage: Message = {
          text: { body: newMessage },
          chat_id: selectedContact.chat_id || '',
          timestamp:  Math.floor(now.getTime() / 1000),
          id: selectedContact.last_message?.id || `temp_${now.getTime()}`,
          from_me: true,
          type: 'text',
          phoneIndex: phoneIndex,
        };
        
        await updateDoc(contactRef, {
          last_message: updatedLastMessage
        });
        console.log('Message sent successfully:', data);
        fetchMessagesBackground(selectedChatId!, data2.apiToken);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error("Failed to send message");
      }
    }

  };

  
  const updateContactWithNewMessage = (contact: Contact, newMessage: string, now: Date,phoneIndex: number): Contact => {
    const updatedLastMessage: Message = {
      text: { body: newMessage },
      chat_id: contact.chat_id || '',
      timestamp:  Math.floor(now.getTime() / 1000),
      id: contact.last_message?.id || `temp_${now.getTime()}`,
      from_me: true,
      type: 'text',
      from_name: contact.last_message?.from_name || '',
      phoneIndex: phoneIndex,
      // Add any other required fields with appropriate default values
    };
  
    return {
      ...contact,
      last_message: updatedLastMessage
    };
  };
  const openNewChatModal = () => {
    setIsNewChatModalOpen(true);
  };

  const closeNewChatModal = () => {
    setIsNewChatModalOpen(false);
    setNewContactNumber('');
  };

  const handleCreateNewChat = async () => {
    console.log('Attempting to create new chat:', { userRole });
    if (userRole === "3") {
      console.log('Permission denied for role 3 user');
      toast.error("You don't have permission to create new chats.");
      return;
    }
  
    if (!newContactNumber) return;
  
    try {
      const chatId = `${newContactNumber}@c.us`;
      const contactId = `+${newContactNumber}`; // This will be used as the document ID
      console.log('contactId:', contactId);
      const newContact: Contact = {
        id: contactId, // Ensure the id is set here
        chat_id: chatId,
        contactName: contactId,
        phone: newContactNumber,
        tags: [],
        unreadCount: 0,
      };
  
      // Add the new contact to Firestore
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Use setDoc with merge option to add or update the document with the specified ID
      await setDoc(doc(firestore, 'companies', companyId, 'contacts', contactId), newContact, { merge: true });
  
      // Update local state
      setContacts(prevContacts => {
        const updatedContacts = [...prevContacts, newContact];
        // Update local storage
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
        return updatedContacts;
      });
  
      // Close the modal and reset the input
      closeNewChatModal();
  
      // Select the new chat
      selectChat(chatId, contactId, newContact);
  
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
  };
  const actionPerformedRef = useRef(false);
  const toggleStopBotLabel = useCallback(async (contact: Contact, index: number, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();
  
    if (actionPerformedRef.current) return;
    actionPerformedRef.current = true;
  
    console.log('Toggling stop bot label for contact:', contact.id);
    if (userRole === "3") {
      toast.error("You don't have permission to control the bot.");
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      if (companyId && contact.id) {
        const docRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for contact!');
          return;
        }
  
        const hasLabel = contact.tags?.includes('stop bot') || false;
        const newHasLabel = !hasLabel;
  
        // Update Firestore
        await updateDoc(docRef, {
          tags: newHasLabel ? arrayUnion('stop bot') : arrayRemove('stop bot')
        });
  
        // Update both contacts and filteredContacts states
        const updateContactsList = (prevContacts: Contact[]) => 
          prevContacts.map(c => 
            c.id === contact.id
              ? {
                  ...c,
                  tags: newHasLabel
                    ? [...(c.tags || []), "stop bot"]
                    : (c.tags || []).filter(tag => tag !== "stop bot")
                }
              : c
          );
    
        setContacts(updateContactsList);
        setFilteredContacts(prevFilteredContacts => updateContactsList(prevFilteredContacts));
  
        // Update localStorage
        const updatedContacts = updateContactsList(contacts);
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));

        sessionStorage.setItem('contactsFetched', 'true');

        // Show a success toast
        toast.success(`Bot ${newHasLabel ? 'disabled' : 'enabled'} for ${contact.contactName || contact.firstName || contact.phone}`);
      } else {
        console.error('companyId or contact.id is null or undefined');
      }
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('Failed to toggle bot status');
    } finally {
      setTimeout(() => {
        actionPerformedRef.current = false;
      }, 100);
    }
  }, [contacts, userRole]);
  
  // Add this useEffect to update filteredContacts when contacts change
  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);

  const handleBinaTag = async (requestType: string, phone: string, first_name: string) => {
    console.log('Request Payload:', JSON.stringify({ requestType, phone, first_name }));
    
    try {
        const response = await fetch('https://mighty-dane-newly.ngrok-free.app/api/bina/tag', {
            method: 'POST', // Ensure this is set to POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestType,
                phone,
                first_name,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
    } catch (error) {
        console.error('Error:', error);
    }
};

  const addTagBeforeQuote = (contact: Contact) => {
    console.log('Adding tag before quote for contact:', contact.phone);
    console.log('Adding tag before quote for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addBeforeQuote', contact.phone, contact.contactName);
  };
  
  const addTagAfterQuote = (contact: Contact) => {
    console.log('Adding tag after quote for contact:', contact.phone);
    console.log('Adding tag after quote for contact:', contact.contactName);
    if (contact.phone && contact.contactName) {
      handleBinaTag('addAfterQuote', contact.phone, contact.contactName);
    } else {
      console.error('Phone or firstname is null or undefined');
    }
  };
  
  const removeTagBeforeQuote = (contact: Contact) => {
    console.log('Removing tag before quote for contact:', contact.phone);
    console.log('Removing tag before quote for contact:', contact.contactName);
    if (contact.phone && contact.contactName) {
      handleBinaTag('removeBeforeQuote', "60135186862", contact.contactName);
    } else {
      console.error('Phone or firstname is null or undefined');
    }
  };
  
  const removeTagAfterQuote = (contact: Contact) => {
    console.log('Removing tag after quote for contact:', contact.phone);
    console.log('Removing tag after quote for contact:', contact.contactName);
    if (contact.phone && contact.contactName) {
      handleBinaTag('removeAfterQuote', contact.phone, contact.contactName);
    } else {
      console.error('Phone or firstname is null or undefined');
    }
  };


  const handleAddTagToSelectedContacts = async (tagName: string, contact: Contact) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      console.log(`Adding tag: ${tagName} to contact: ${contact.id}`);
  
      // Update contact's tags
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id!);
      const contactDoc = await getDoc(contactRef);
  
      if (!contactDoc.exists()) {
        console.error(`Contact document does not exist: ${contact.id}`);
        toast.error(`Failed to add tag: Contact not found`);
        return;
      }

      const currentTags = contactDoc.data().tags || [];

      if (!currentTags.includes(tagName)) {
        await updateDoc(contactRef, {
          tags: arrayUnion(tagName)
        });
  
        // Update local state
        setContacts(prevContacts =>
          prevContacts.map(c =>
            c.id === contact.id
              ? { ...c, tags: [...(c.tags || []), tagName] }
              : c
          )
        );

  
        console.log(`Tag ${tagName} added to contact ${contact.id}`);
        toast.success(`Tag "${tagName}" added to contact`);

        // Handle specific tags
        if (tagName === 'Before Quote Follow Up') {
          addTagBeforeQuote(contact);
        } else if (tagName === 'After Quote Follow Up') {
          addTagAfterQuote(contact);
        }


      } else {
        console.log(`Tag ${tagName} already exists for contact ${contact.id}`);
        toast.info(`Tag "${tagName}" already exists for this contact`);
      }
  
    } catch (error) {
      console.error('Error adding tag to contact:', error);
      toast.error('Failed to add tag to contact');
    }
  };

// Add this function to handle adding notifications
const addNotificationToUser = async (companyId: string, employeeName: string, notificationData: any) => {
  try {
    // Find the user with the specified companyId and name
    const usersRef = collection(firestore, 'user');
    const q = query(usersRef, 
      where('companyId', '==', companyId),
      where('name', '==', employeeName)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No matching user found for:', employeeName);
      return;
    }

    // Add the new notification to the notifications subcollection of the user's document
    querySnapshot.forEach(async (doc) => {
      const userRef = doc.ref;
      const notificationsRef = collection(userRef, 'notifications');
      await addDoc(notificationsRef, notificationData);
      console.log(`Notification added for user: ${employeeName}`);
    });
  } catch (error) {
    console.error('Error adding notification: ', error);
  }
};

const sendAssignmentNotification = async (assignedEmployeeName: string, contact: Contact) => {
  try {

    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No user document found');
      return;
    }

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    if (!companyId || typeof companyId !== 'string') {
      console.error('Invalid companyId:', companyId);
      throw new Error('Invalid companyId');
    }
    

    // Check if notification has already been sent
    const notificationRef = doc(firestore, 'companies', companyId, 'assignmentNotifications', `${contact.id}_${assignedEmployeeName}`);
    const notificationSnapshot = await getDoc(notificationRef);
    
    if (notificationSnapshot.exists()) {
      console.log('Notification already sent for this assignment');
      return;
    }

    // Find the employee in the employee list
    const assignedEmployee = employeeList.find(emp => emp.name.toLowerCase() === assignedEmployeeName.toLowerCase());
    if (!assignedEmployee) {
      console.error(`Employee not found: ${assignedEmployeeName}`);
      toast.error(`Failed to send assignment notification: Employee ${assignedEmployeeName} not found`);
      return;
    }

    if (!assignedEmployee.phoneNumber) {
      console.error(`Phone number missing for employee: ${assignedEmployeeName}`);
      toast.error(`Failed to send assignment notification: Phone number missing for ${assignedEmployeeName}`);
      return;
    }

    // Format the phone number for WhatsApp chat_id
    const employeePhone = `${assignedEmployee.phoneNumber.replace(/[^\d]/g, '')}@c.us`;
    console.log('Formatted employee chat_id:', employeePhone);

    if (!employeePhone || !/^\d+@c\.us$/.test(employeePhone)) {
      console.error('Invalid employeePhone:', employeePhone);
      throw new Error('Invalid employeePhone');
    }

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('No company document found');
      return;
    }
    const companyData = docSnapshot.data();

    let message = `Hello ${assignedEmployee.name}, a new contact has been assigned to you:\n\nName: ${contact.contactName || contact.firstName || 'N/A'}\nPhone: ${contact.phone}\n\nPlease follow up with them as soon as possible.`;
    if(companyId == '042'){
      message = `Hi ${assignedEmployee.employeeId || assignedEmployee.phoneNumber} ${assignedEmployee.name}.\n\nAnda telah diberi satu prospek baharu\n\nSila masuk ke https://web.jutasoftware.co/login untuk melihat perbualan di antara Zahin Travel dan prospek.\n\nTerima kasih.\n\nIkhlas,\nZahin Travel Sdn. Bhd. (1276808-W)\nNo. Lesen Pelancongan: KPK/LN 9159\nNo. MATTA: MA6018\n\n#zahintravel - Nikmati setiap detik..\n#diyakini\n#responsif\n#budibahasa`;
    }

    let url;
    let requestBody;
    if (companyData.v2 === true) {
      console.log("v2 is true");
      url = `https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/${companyId}/${employeePhone}`;
      requestBody = { message };
      } else {
      console.log("v2 is false");
      url = `https://mighty-dane-newly.ngrok-free.app/api/messages/text/${employeePhone}/${companyData.whapiToken}`;
      requestBody = { message };
    }

    console.log('Sending request to:', url);
    console.log('Request body:', JSON.stringify(requestBody));

    console.log('Full request details:', {
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Send WhatsApp message to the employee
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Assignment notification response:', responseData);
    console.log('Sent to phone number:', employeePhone);

    // Mark notification as sent
    await setDoc(notificationRef, {
      sentAt: serverTimestamp(),
      employeeName: assignedEmployeeName,
      contactId: contact.id
    });

    toast.success("Assignment notification sent successfully!");
  } catch (error) {
    console.error('Error sending assignment notification:', error);
    
    // Instead of throwing the error, we'll handle it here
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      toast.error('Network error. Please check your connection and try again.');
    } else {
      toast.error('Failed to send assignment notification. Please try again.');
    }
    
    // Log additional information that might be helpful
    console.log('Assigned Employee Name:', assignedEmployeeName);
    console.log('Contact:', contact);
    console.log('Employee List:', employeeList);
    console.log('Company ID:', companyId);
  }
};
  
  async function updateContactTags(contactId: string, tags: string[], addTag: boolean) {
    try {
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
    
       companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const docSnapshot = await getDoc(docRef);
  
      if (!docSnapshot.exists()) {
        console.error(`No document to update: companies/${companyId}/contacts/${contactId}`);
        return false;
      }
  
      if (addTag) {
        await updateDoc(docRef, {
          tags: arrayUnion(...tags)
        });
      } else {
        await updateDoc(docRef, {
          tags: arrayRemove(...tags)
        });
      }
    
      console.log('Contact tags updated successfully');
   
      return true;
    } catch (error) {
      console.error('Error updating contact tags:', error);
      return false;
    }
  }

const formatText = (text: string) => {
  const parts = text.split(/(\*[^*]+\*|\*\*[^*]+\*\*)/g);
  return parts.map((part: string, index: any) => {
 if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    } else {
      return part;
    }
  });
};
const openEditMessage = (message: Message) => {
  setEditingMessage(message);
  setEditedMessageText(message.text?.body || "");
};

function formatDate(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };

// Helper function to handle different timestamp formats
const getTimestamp2 = (timestamp: any): number => {
  if (typeof timestamp === 'number') {
    return timestamp;
  } else if (timestamp && timestamp.seconds) {
    return timestamp.seconds * 1000;
  } else if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  return 0;
};
  
const handlePageChange = ({ selected }: { selected: number }) => {
  setCurrentPage(selected);
};

const [paginatedContacts, setPaginatedContacts] = useState<Contact[]>([]);

useEffect(() => {
  let filtered = contacts;

  // Apply tag filter
  if (activeTags.length > 0) {
    filtered = filtered.filter((contact) => {
      if (activeTags.includes('Mine')) {
        return contact.tags?.includes(currentUserName);
      }
      if (activeTags.includes('Unassigned')) {
        return !contact.tags?.some(tag => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()));
      }
      if (activeTags.includes('All')) {
        return true;
      }
      return activeTags.some(tag => contact.tags?.includes(tag));
    });
  }

  // Apply search filter
  if (searchQuery.trim() !== '') {
    filtered = filtered.filter((contact) =>
      (contact.contactName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.firstName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.phone?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }

  setFilteredContacts(filtered);
  if (searchQuery.trim() !== '') {
    setCurrentPage(0); // Reset to first page when searching
  }

  console.log('Filtered contacts updated:', filtered);
}, [contacts, searchQuery, activeTags, currentUserName, employeeList]);

// Update the pagination logic
useEffect(() => {
  const startIndex = currentPage * contactsPerPage;
  const endIndex = startIndex + contactsPerPage;
  setPaginatedContacts(filteredContacts.slice(startIndex, endIndex));
}, [currentPage, contactsPerPage, filteredContacts]);

const getSortedContacts = useCallback((contactsToSort: Contact[]) => {
  return [...contactsToSort].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    const timestampA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
    const timestampB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
    
    return timestampB - timestampA;
  });
}, []);

useEffect(() => {
  const sortedAndFilteredContacts = getSortedContacts(filteredContactsSearch);
  setFilteredContacts(sortedAndFilteredContacts);
}, [filteredContactsSearch, getSortedContacts]);

const sortContacts = (contacts: Contact[]) => {
  let fil = contacts;
  const activeTag = activeTags[0].toLowerCase();
  
  // Check if the user has a selected phone
  let userPhoneIndex = userData?.phone !== undefined ? parseInt(userData.phone, 10) : 0;
  if (userPhoneIndex === -1) {
    userPhoneIndex = 0;
  }
  console.log("userPhoneIndex", userPhoneIndex);
  // Filter by user's selected phone first
  if (userPhoneIndex !== -1) {
    fil = fil.filter(contact => contact.phoneIndex === userPhoneIndex);
  }

  // Check if the active tag matches any of the phone names
  const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => 
    name.toLowerCase() === activeTag
  );

  if (phoneIndex !== -1) {
    fil = fil.filter(contact => contact.phoneIndex === phoneIndex);
  }

  // Apply search filter
  if (searchQuery.trim() !== '') {
    fil = fil.filter((contact) =>
      (contact.contactName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.firstName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.phone?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }

  const getDate = (contact: Contact) => {
    if (contact.last_message?.timestamp) {
      return typeof contact.last_message.timestamp === 'number'
        ? contact.last_message.timestamp
        : new Date(contact.last_message.timestamp).getTime() / 1000;
    } else {
      return 0;
    }
  };

  return fil.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    const timestampA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
    const timestampB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
    
    return timestampB - timestampA;
  });
};

  const filterTagContact = (tag: string) => {
    setActiveTags([tag.toLowerCase()]);
    setSearchQuery('');
    console.log('active1:' + activeTags[0]);

  };

  // useEffect(() => {
  //   console.log('Filtered contacts updated:', filteredContacts);
  // }, [filteredContacts]);


  // Update this function
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    // We'll handle the filtering in the useEffect
  };

  const handleSearchChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery2(query);
  
    const filtered = contacts.filter((contact) => {
      const name = (contact.contactName || contact.firstName || contact.phone || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      const tags = (contact.tags || []).join(' ').toLowerCase();
  
      return name.includes(query) || phone.includes(query) || tags.includes(query);
    });
  
    setFilteredContactsForForwarding(filtered);
  };

  // Update the pagination logic
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContactsSearch.slice(indexOfFirstContact, indexOfLastContact);

  // Update the total pages calculation
  const totalPages = Math.ceil(filteredContactsSearch.length / contactsPerPage);
  
  useEffect(() => {
    const tag = activeTags[0].toLowerCase();
    let filteredContacts = filterContactsByUserRole(contacts, userRole, userData?.name || '');
    setMessageMode('reply');

    // First, filter contacts based on the employee's assigned phone
    if (userData?.phone !== undefined && userData.phone !== -1) {
      const userPhoneIndex = parseInt(userData.phone, 10);
      setMessageMode(`phone${userPhoneIndex + 1}`);
    }
  
    // Filtering logic
    if (Object.values(phoneNames).map(name => name.toLowerCase()).includes(tag)) {
      const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => 
        name.toLowerCase() === tag
      );
      if (phoneIndex !== -1) {
        setMessageMode(`phone${phoneIndex + 1}`);
        filteredContacts = filteredContacts.filter(contact => 
          contact.phoneIndex === phoneIndex
        );
      }
    } else {
      // Existing filtering logic for other tags
      switch (tag) {
        case 'all':
          if(companySubstring?.includes('042')){
            filteredContacts = filteredContacts.filter(contact => 
              !contact.chat_id?.endsWith('@g.us') && 
              !contact.tags?.includes('snooze')
            );
          }else{
            filteredContacts = filteredContacts.filter(contact => 
              !contact.tags?.includes('snooze')
            );
          }
          break;
        case 'unread':
          filteredContacts = filteredContacts.filter(contact => contact.unreadCount && contact.unreadCount > 0 && 
          !contact.tags?.includes('snooze'));
          break;
        case 'mine':
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.some(t => t.toLowerCase() === currentUserName.toLowerCase())&& 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'unassigned':
          filteredContacts = filteredContacts.filter(contact => 
            !contact.tags?.some(t => employeeList.some(e => e.name.toLowerCase() === t.toLowerCase())) && 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'snooze':
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.includes('snooze')
          );
          break;
        case 'group':
          filteredContacts = filteredContacts.filter(
            (contact) =>
              contact.chat_id?.endsWith("@g.us") && !contact.tags?.includes("snooze")
          );
          break;
        case "stop bot":
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.includes('stop bot') && 
            !contact.tags?.includes('snooze')
          );
          break;
        default:
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.some(t => t.toLowerCase() === tag.toLowerCase()) && 
            !contact.tags?.includes('snooze')
          );
      }
    }
    filteredContacts = sortContacts(filteredContacts);
    console.log("MESSAGE MODE", messageMode)
    let filtered = filteredContacts;
  
    if (searchQuery) {
      filtered = filteredContacts.filter((contact) => {
        const name = (contact.contactName || contact.firstName || '').toLowerCase();
        const phone = (contact.phone || '').toLowerCase();
        const tags = (contact.tags || []).join(' ').toLowerCase();
        
        return name.includes(searchQuery.toLowerCase()) || 
              phone.includes(searchQuery.toLowerCase()) || 
              tags.includes(searchQuery.toLowerCase());
      });
    }

    const filteredAndSortedContacts = sortContacts(filteredContacts);
    setFilteredContacts(filteredAndSortedContacts);
    // Don't reset the current page here
  }, [contacts, searchQuery, activeTags, showAllContacts, showUnreadContacts, showMineContacts, showUnassignedContacts, showSnoozedContacts, showGroupContacts, currentUserName, employeeList, userData, userRole]);
  
  const handleSnoozeContact = async (contact: Contact) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayUnion('snooze')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: [...(c.tags || []), 'snooze'] }
            : c
        )
      );
  
      toast.success('Contact snoozed successfully');
    } catch (error) {
      console.error('Error snoozing contact:', error);
      toast.error('Failed to snooze contact');
    }
  };
  const handleUnsnoozeContact = async (contact: Contact) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayRemove('snooze')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: c.tags?.filter(tag => tag !== 'snooze') }
            : c
        )
      );
  
      toast.success('Contact unsnoozed successfully');
    } catch (error) {
      console.error('Error unsnoozing contact:', error);
      toast.error('Failed to unsnooze contact');
    }
  };
  const handleSelectMessage = (message: Message) => {
    setSelectedMessages(prevSelectedMessages =>
        prevSelectedMessages.includes(message)
            ? prevSelectedMessages.filter(m => m.id !== message.id)
            : [...prevSelectedMessages, message]
    );
  };
const formatTextForSending = (text: string) => {
  // Step 1: Ensure proper spacing between items
  text = text.replace(/- /g, '\n- ');

  // Step 2: Ensure proper new lines between items
  text = text.replace(/(\w)(?=\w*\()|\b\(/g, '$&\n');

  // Step 3: Add asterisks for emphasis
  text = text.replace(/(?:^|\n)-\s*([^\n]+)/g, '- *$1*');

  // Step 4: Add a new line after every sentence
  text = text.replace(/\.(\s)/g, '.\n$1');

  return text.trim();
};
const handleForwardMessage = async () => {
  if (selectedMessages.length === 0 || selectedContactsForForwarding.length === 0) return;

  try {
      for (const contact of selectedContactsForForwarding) {
          for (const message of selectedMessages) {
              let response;
              if (message.type === 'image') {
                  response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/image/${whapiToken}`, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                          chatId: contact.chat_id,
                          imageUrl: message.image?.link,
                          caption: message.image?.caption || '',
                      }),
                  });
              } else if (message.type === 'document') {
                  response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/document/${whapiToken}`, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                          chatId: contact.chat_id,
                          imageUrl: message.document?.link,
                          fileName: message.document?.file_name,
                          mimeType: message.document?.mime_type,
                      }),
                  });
              } else {
                const message_string = message!.text?.body!;
                  response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/text/${contact.chat_id}/${whapiToken}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: message_string,
              
                      }),
                  });
              }
              if (!response.ok) throw new Error('Failed to forward message');
          }
      }

      setIsForwardDialogOpen(false);
      setSelectedMessages([]);
      setSelectedContactsForForwarding([]);
      toast.success('Messages forwarded successfully');
  } catch (error) {
      console.error('Error forwarding messages:', error);
      alert('Failed to forward messages');
  }
};

  const handleOpenForwardDialog = (message: Message) => {
    setSelectedMessageForForwarding(message);
    setIsForwardDialogOpen(true);
  };

  const handleSelectContactForForwarding = (contact: Contact) => {
    setSelectedContactsForForwarding(prevContacts => 
      prevContacts.includes(contact) ? prevContacts.filter(c => c.id !== contact.id) : [...prevContacts, contact]
    );
  };
  const formatTimestamp = (timestamp: number | string | undefined): string => {

    if (!timestamp) {
      return 'Invalid date';
    }
    
    let date: Date;
  
    if (typeof timestamp === 'number') {
      if (isNaN(timestamp)) {
        return 'Invalid date';
      }
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
    } else {
      return 'Invalid date';
    }
  
    try {
      return format(date, 'p');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };
  const handleTagClick = () => {
 
  };
  useEffect(() => {
    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Escape") {
        console.log('escape');
        setSelectedContact(null);
    setSelectedChatId(null);
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  const handleForwardClick = () => {
    setActiveMenu('forward');
  };
  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadFile(file);
        await sendImageMessage(selectedChatId!, imageUrl!, "");
      }
    }
    setLoading(false);
  };
  
  const handleDocumentUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadFile(file);
        await sendDocumentMessage(selectedChatId!, imageUrl!, file.type, file.name, "");
      }
    }
    setLoading(false);
  };
  
  const uploadFile = async (file: any): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `${file.name}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
  
    // Get the file's download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };
  
  
  const sendImageMessage = async (chatId: string, imageUrl: string, caption?: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const phoneIndex = userData.phone || 0;
      const userName = userData.name || userData.email || '';
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const companyData = docSnapshot.data();
  
      let response;
      // Try the new API first
      try {
        response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/v2/messages/image/${companyId}/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            caption: caption || '',
            phoneIndex: phoneIndex, // Assuming default phone index is 0
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`New API failed with status ${response.status}`);
      } catch (newApiError) {
        console.warn('New API failed, falling back to old API', newApiError);
  
        // If the new API fails, fall back to the old API
        response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/image/${companyData.whapiToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            imageUrl: imageUrl,
            caption: caption || '',
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`Old API failed with status ${response.status}`);
      }
  
      const data = await response.json();
      fetchMessages(chatId, companyData.ghl_accessToken);
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
      toast.error(`Failed to send image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  
  const sendDocumentMessage = async (chatId: string, documentUrl: string, mimeType: string, fileName: string, caption?: string, phoneIndex: number = 0) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const userName = userData.name || userData.email || '';
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const companyData = docSnapshot.data();
  
      let response;
      // Try the new API first
      try {
        response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/v2/messages/document/${companyId}/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentUrl: documentUrl,
            filename: fileName,
            caption: caption || '',
            phoneIndex: phoneIndex,
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`New API failed with status ${response.status}`);
      } catch (newApiError) {
        console.warn('New API failed, falling back to old API', newApiError);
  
        // If the new API fails, fall back to the old API
        response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/document/${companyData.whapiToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            imageUrl: documentUrl,
            mimeType: mimeType,
            fileName: fileName,
            caption: caption || '',
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`Old API failed with status ${response.status}`);
      }
  
      const data = await response.json();
      fetchMessages(chatId, companyData.ghl_accessToken);
      console.log('Document message sent successfully:', data);
    } catch (error) {
      console.error('Error sending document message:', error);
      toast.error(`Failed to send document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  
  const handleCloseForwardDialog = () => {
    setIsForwardDialogOpen(false);
    setSearchQuery2(''); // Clear the search query
  };

  const togglePinConversation = async (chatId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      if (!companyId) {
        console.error('Company ID is missing');
        return;
      }
  
      const contactToToggle = contacts.find(contact => contact.chat_id === chatId);
      if (!contactToToggle || !contactToToggle.id) {
        console.error("Contact not found for chatId:", chatId);
        return;
      }
  
      const contactDocRef = doc(firestore, 'companies', companyId, 'contacts', contactToToggle.id);
  
      // Toggle the pinned status
      const newPinnedStatus = !contactToToggle.pinned;
  
      // Update the contact document in Firestore
      await updateDoc(contactDocRef, {
        pinned: newPinnedStatus
      });
  
      // Update the local state
      setContacts(prevContacts => 
        prevContacts.map(contact =>
          contact.id === contactToToggle.id
            ? { ...contact, pinned: newPinnedStatus }
            : contact
        )
      );
  
      console.log(`Chat ${chatId} ${newPinnedStatus ? 'pinned' : 'unpinned'}`);
      toast.success(`Conversation ${newPinnedStatus ? 'pinned' : 'unpinned'}`);
    } catch (error) {
      console.error('Error toggling chat pin state:', error);
      toast.error('Failed to update pin status');
    }
  };

  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user!');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Update Firestore
      await updateDoc(doc(firestore, 'companies', companyId, 'contacts', selectedContact.id), {
        contactName: editedName
      });
  
      // Update local state
      setSelectedContact((prevContact: any) => ({
        ...prevContact,
        contactName: editedName
      }));
  
      // Update contacts in state
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === selectedContact.id 
            ? { ...contact, contactName: editedName } 
            : contact
        )
      );
  
      // Update localStorage
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        const decompressedContacts = JSON.parse(LZString.decompress(storedContacts));
        const updatedContacts = decompressedContacts.map((contact: any) => 
          contact.id === selectedContact.id 
            ? { ...contact, contactName: editedName } 
            : contact
        );
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      }
  
      setIsEditing(false);
      toast.success('Contact name updated successfully!');
    } catch (error) {
      console.error('Error updating contact name:', error);
      toast.error('Failed to update contact name.');
    }
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl('');
  };

  // Handle keydown event
  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === "Escape") {
      setSelectedMessages([]);
    }
  };
  const isSameDay = (date1: Date, date2: Date) => {
  return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };
  
  const formatDateHeader = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleRemoveTag = async (contactId: string, tagName: string) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Update Firestore
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const contactSnapshot = await getDoc(contactRef);
      const contact = contactSnapshot.data() as Contact;
      await updateDoc(contactRef, {
        tags: arrayRemove(tagName)
      });
  
      // Check if the removed tag is an employee name
      const isEmployeeTag = employeeList.some(employee => employee.name.toLowerCase() === tagName.toLowerCase());
      if (isEmployeeTag) {
        const employeeRef = doc(firestore, 'companies', companyId, 'employee', tagName);
        const employeeDoc = await getDoc(employeeRef);
        
        if (employeeDoc.exists()) {
          const currentData = employeeDoc.data();
          const currentQuotaLeads = currentData.quotaLeads || 0;
          
          await updateDoc(employeeRef, {
            assignedContacts: arrayRemove(contactId),
            quotaLeads: currentQuotaLeads + 1 // Increase quota by 1
          });

          await updateDoc(contactRef, {
            assignedTo: deleteField()
          });

          toast.success(`Contact unassigned from ${tagName}. Quota leads updated from ${currentQuotaLeads} to ${currentQuotaLeads + 1}.`);
        } else {
          console.error(`Employee document for ${tagName} does not exist.`);
          console.log('Current employeeList:', employeeList);
          
          // List all documents in the employee collection
          const employeeCollectionRef = collection(firestore, 'companies', companyId, 'employee');
          const employeeSnapshot = await getDocs(employeeCollectionRef);
          console.log('All employee documents:');
          employeeSnapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
          });
        }
      }

      // Handle specific tags
      if (tagName === 'Before Quote Follow Up') {
        removeTagBeforeQuote(contact);
      } else if (tagName === 'After Quote Follow Up') {
        removeTagAfterQuote(contact);
      }
  
      // Update state
      setContacts(prevContacts => {
        if (userData?.role === '3') {
          // For role 3, remove the contact if the removed tag matches their name
          return prevContacts.filter(contact => 
            contact.id !== contactId || 
            (contact.tags && contact.tags.some(tag => tag.toLowerCase() === userData.name.toLowerCase()))
          );
        } else {
          // For other roles, just update the tags
          return prevContacts.map(contact =>
            contact.id === contactId
              ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName), assignedTo: undefined }
              : contact
          );
        }
      });
  
      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? { ...contact, tags: contact.tags!.filter((tag: string) => tag !== tagName), assignedTo: undefined }
          : contact
      );
  
      const updatedSelectedContact = updatedContacts.find(contact => contact.id === contactId);
      if (updatedSelectedContact) {
        setSelectedContact(updatedSelectedContact);
      }
      toast.success('Tag removed successfully!');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag.');
    }
  };

  const adjustHeight = (textarea: HTMLTextAreaElement, reset = false) => {
    if (reset) {
      textarea.style.height = 'auto';
    }
    const lineHeight = 24; // Approximate line height in pixels
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = 'auto';
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  };

  // Adjust height on new message change
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [newMessage]);
  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditedMessageText("");
  };
  
  const handleEditMessage = async () => {
    if (!editedMessageText.trim() || !editingMessage) return;
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No such document for user');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const chatId = editingMessage.id.split('_')[1];
      console.log('editing this chat id', chatId)
      const response = await axios.put(
        `https://mighty-dane-newly.ngrok-free.app/api/v2/messages/${companyId}/${chatId}/${editingMessage.id}`,
        { newMessage: editedMessageText }
      );
  
      if (response.data.success) {
        toast.success('Message edited successfully');
        
        // Update the message locally
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === editingMessage.id 
              ? { ...msg, text: { ...msg.text, body: editedMessageText }, edited: true }
              : msg
          )
        );
  
        setEditingMessage(null);
        setEditedMessageText("");
      } else {
        throw new Error(response.data.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message. Please try again.');
    }
  };
  
  const DeleteConfirmationPopup = () => (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-lg">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">Delete message</h3>
              <p className="text-gray-700 dark:text-gray-300">Are you sure you want to delete this message?</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <Button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-600 sm:ml-3 sm:w-auto sm:text-sm"
           onClick={deleteMessages}
          >
            Delete
          </Button>
          <Button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={closeDeletePopup}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
  const sendDocument = async (file: File, caption: string) => {
    setLoading(true);
    try {
      const uploadedDocumentUrl = await uploadFile(file);
      if (uploadedDocumentUrl) {
        await sendDocumentMessage(selectedChatId!, uploadedDocumentUrl, caption, file.name);
      }
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error('Failed to send document. Please try again.');
    } finally {
      setLoading(false);
      setDocumentModalOpen(false);
    }
  };
  const uploadLocalImageUrl = async (localUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(localUrl);
      const blob = await response.blob();
  
      // Check the blob content
      console.log('Blob type:', blob.type);
      console.log('Blob size:', blob.size);
  
      const storageRef = ref(getStorage(), `${Date.now()}_${blob.type.split('/')[1]}`);
      const uploadResult = await uploadBytes(storageRef, blob);
  
      console.log('Upload result:', uploadResult);
  
      const publicUrl = await getDownloadURL(storageRef);
      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  const sendImage = async (imageUrl: string | null, caption: string) => {
    console.log('Image URL:', imageUrl);
    console.log('Caption:', caption);
    setLoading(true);
    try {
      if (imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        
        const uploadedImageUrl = await uploadFile(file);
        if (uploadedImageUrl) {
          await sendImageMessage(selectedChatId!, uploadedImageUrl, caption);
        }
      }
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  //fetch qrcode
  const fetchQRCode = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setError(null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
      return;
      }

      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
          
      return;
      }
      const companyData = docSnapshot.data();
      const healthresponse = await axios.get('https://gate.whapi.cloud/health?wakeup=true&channel_type=web', {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${companyData.whapiToken}`,
        },
      });
      console.log(healthresponse.data.status)
      if(healthresponse.data.status.text === 'QR' || healthresponse.data.status.text === 'INIT'){
        const QRresponse = await axios.get('https://gate.whapi.cloud/users/login/image?wakeup=true', {
          headers: {
            'accept': 'image/png',
            'authorization': `Bearer ${companyData.whapiToken}`,
            'content-type': 'application/json',
          },data: {
            'size': 264,
            'width': 300,
            'height': 300,
            'color_dark': '#122e31',
            'color_light': '#ffffff',
          }, responseType: 'blob',
        });

        const qrCodeURL = URL.createObjectURL(QRresponse.data); // Create an object URL from the blob
        console.log("qrCodeURL", qrCodeURL)
        console.log("response", response)
        setQrCodeImage(qrCodeURL);
      }else{
      }
    } catch (error) {
      setError('Failed to fetch QR code. Please try again.');
      console.error("Error fetching QR code:", error);
    }
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickRepliesRef.current && !quickRepliesRef.current.contains(event.target as Node)) {
        setIsQuickRepliesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [allBotsStopped, setAllBotsStopped] = useState(false);
  const [botsStatus, setBotsStatus] = useState<'allStopped' | 'allRunning' | 'mixed'>('mixed');

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      const allRunning = contacts.every(contact => !contact.tags?.includes('stop bot'));
      if (allStopped) {
        setBotsStatus('allStopped');
      } else if (allRunning) {
        setBotsStatus('allRunning');
      } else {
        setBotsStatus('mixed');
      }
    };
  
    checkBotsStatus();
  }, [contacts]);

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      const allRunning = contacts.every(contact => !contact.tags?.includes('stop bot'));
      if (allStopped) {
        setBotsStatus('allStopped');
      } else if (allRunning) {
        setBotsStatus('allRunning');
      } else {
        setBotsStatus('mixed');
      }
    };
  
    checkBotsStatus();
  }, [contacts]);


  // Add this new function to toggle all bots
  const toggleAllBots = async () => {
    const newStatus = botsStatus !== 'allRunning';
    setIsAllBotsEnabled(newStatus);

    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user');
      return;
    }
  
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document for user!');
      return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
  
    try {
      const contactsRef = collection(firestore, 'companies', companyId, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);
  
      const batch = writeBatch(firestore);
  
      contactsSnapshot.forEach((doc) => {
        const contactRef = doc.ref;
        if (newStatus) {
          // Remove "stop bot" tag
          batch.update(contactRef, {
            tags: arrayRemove('stop bot')
          });
        } else {
          // Add "stop bot" tag
          batch.update(contactRef, {
            tags: arrayUnion('stop bot')
          });
        }
      });
  
      await batch.commit();

      // Update local state
      setContacts(prevContacts => 
        prevContacts.map(contact => ({
          ...contact,
          tags: newStatus
            ? contact.tags?.filter(tag => tag !== 'stop bot')
            : [...(contact.tags || []), 'stop bot']
        }))
      );
      
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(contacts)));
      sessionStorage.setItem('contactsFetched', 'true');
  
      toast.success(newStatus ? "All bots started" : "All bots stopped");
    } catch (error) {
      console.error('Error toggling all bots:', error);
      toast.error("Failed to toggle all bots");
    }
  };


  const toggleBot = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to control the bot.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        stopbot: !stopbot
      });
      setStopbot(!stopbot);
      toast.success(`Bot ${stopbot ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast.error('Failed to toggle bot status.');
    }
  };

  async function searchContacts(accessToken: string, locationId: string) {
    setIsFetchingContacts(true);
    setContactsFetchProgress(0);
    try {
      let allContacts: Contact[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;

      const maxRetries = 5;
      const baseDelay = 5000;

      const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
        };
        try {
          const response = await axios.request(options);
          return response;
        } catch (error: any) {
          if (error.response && error.response.status === 429 && retries < maxRetries) {
            const delay = baseDelay * Math.pow(2, retries);
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchData(url, retries + 1);
          } else {
            throw error;
          }
        }
      };

      let fetchedContacts = 0;
      let totalContacts = 0;
      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        const contacts = response.data.contacts;
        totalContacts = response.data.meta.total;

        if (contacts.length > 0) {
          allContacts = [...allContacts, ...contacts];
          if (userData?.role === '2') {
            const filteredContacts = allContacts.filter(contact => 
              contact.tags?.some((tag: string) => 
                typeof tag === 'string' && tag.toLowerCase().includes(userData.name.toLowerCase())
              )
            );
            setContacts(filteredContacts);
          } else {
            setContacts(allContacts);
          }

          fetchedContacts = allContacts.length;
          setTotalContactsToFetch(totalContacts);
          setFetchedContactsCount(fetchedContacts);
          setContactsFetchProgress((fetchedContacts / totalContacts) * 100);
        }

        if (response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }

      // Update local storage and session storage
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
      sessionStorage.setItem('contactsFetched', 'true');

    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setIsFetchingContacts(false);
    }
  }

  // Add this function to trigger the contact search
  const handleSearchContacts = async () => {
    if (!ghlConfig) {
      console.error('GHL configuration is not available');
      return;
    }
    await searchContacts(ghlConfig.ghl_accessToken, ghlConfig.ghl_location);
  };

  const { show } = useContextMenu({
    id: 'contact-context-menu',
  });

  const handleContextMenu = (event: React.MouseEvent, contact: Contact) => {
    event.preventDefault();
    show({
      event,
      props: {
        contact,
        onSnooze: () => handleSnoozeContact(contact),
        onUnsnooze: () => handleUnsnoozeContact(contact),
        isSnooze: contact.tags?.includes('snooze'),
      },
    });
  };
  const markAsUnread = async (contact: Contact) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      // Update Firebase
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          unreadCount: increment(1),
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }

      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        )
      );

      // Update local storage
      const storedContacts = JSON.parse(LZString.decompress(localStorage.getItem('contacts') || '') || '[]');
      const updatedStoredContacts = storedContacts.map((c: Contact) =>
        c.id === contact.id ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      );
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedStoredContacts)));

      toast.success('Marked as unread');
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to mark as unread');
    }
  };
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
    }
  };
  

  
  const sendBlastMessage = async () => {
    console.log('Starting sendBlastMessage function');

    // Ensure selectedChatId is valid
    if (!selectedChatId) {
      console.log('No chat selected');
      toast.error("No chat selected!");
      return;
    }

    // Combine date and time
    const scheduledTime = blastStartTime || new Date();
    const now = new Date();
    if (scheduledTime <= now) {
      console.log('Selected time is in the past');
      toast.error("Please select a future time for the blast message.");
      return;
    }

    setIsScheduling(true);

    try {
      let mediaUrl = '';
      let documentUrl = '';
      if (selectedMedia) {
        console.log('Uploading media...');
        mediaUrl = await uploadFile(selectedMedia);
        console.log(`Media uploaded. URL: ${mediaUrl}`);
      }
      if (selectedDocument) {
        console.log('Uploading document...');
        documentUrl = await uploadFile(selectedDocument);
        console.log(`Document uploaded. URL: ${documentUrl}`);
      }

      const user = auth.currentUser;
      console.log(`Current user: ${user?.email}`);

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      console.log(`Company ID: ${companyId}`);

      const chatIds = [selectedChatId]; // Use selectedChatId directly

      const processedMessages = [selectedContact].map(contact => {
        let processedMessage = blastMessage;
        // Replace placeholders
        processedMessage = processedMessage.replace(/@{contactName}/g, contact.contactName || '');
        processedMessage = processedMessage.replace(/@{firstName}/g, contact.firstName || '');
        processedMessage = processedMessage.replace(/@{lastName}/g, contact.lastName || '');
        processedMessage = processedMessage.replace(/@{email}/g, contact.email || '');
        processedMessage = processedMessage.replace(/@{phone}/g, contact.phone || '');
        processedMessage = processedMessage.replace(/@{vehicleNumber}/g, contact.vehicleNumber || '');
        processedMessage = processedMessage.replace(/@{branch}/g, contact.branch || '');
        processedMessage = processedMessage.replace(/@{expiryDate}/g, contact.expiryDate || '');  
        // Add more placeholders as needed
        return { chatId: contact.phone?.replace(/\D/g, '') + "@s.whatsapp.net", message: processedMessage };
      });

      const scheduledMessageData = {
        chatIds: chatIds,
        message: blastMessage,
        messages: processedMessages,
        batchQuantity: batchQuantity,
        companyId: companyId,
        createdAt: Timestamp.now(),
        documentUrl: documentUrl || "",
        fileName: selectedDocument ? selectedDocument.name : null,
        mediaUrl: mediaUrl || "",
        mimeType: selectedMedia ? selectedMedia.type : (selectedDocument ? selectedDocument.type : null),
        repeatInterval: repeatInterval,
        repeatUnit: repeatUnit,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        status: "scheduled",
        v2: true, // Adjust as needed
        whapiToken: null, // Adjust as needed
      };

      console.log('Sending scheduledMessageData:', JSON.stringify(scheduledMessageData, null, 2));

      // Make API call to schedule the message
      const response = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}`, scheduledMessageData);

      console.log(`Scheduled message added. Document ID: ${response.data.id}`);
      toast.success(`Blast message scheduled successfully.`);
      toast.info(`Message will be sent at: ${scheduledTime.toLocaleString()} (local time)`);

      // Close the modal and reset state
      setBlastMessageModal(false);
      setBlastMessage("");
      setBlastStartTime(null);
      setBatchQuantity(10);
      setRepeatInterval(0);
      setRepeatUnit('days');
      setSelectedMedia(null);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error scheduling blast message:', error);
      toast.error("An error occurred while scheduling the blast message. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReminderClick = () => {
    setIsReminderModalOpen(true);
  };
  const authorColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
    '#F06292', '#AED581', '#7986CB', '#4DB6AC', '#9575CD'
  ];
  function getAuthorColor(author: string) {
    const index = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % authorColors.length;
    return authorColors[index];
  }
  const handleSetReminder = async  (text: string)=> {
    if (!reminderDate) {
      toast.error('Please select a date and time for the reminder');
      return;
    }

    if (!selectedContact) {
      toast.error('No contact selected for the reminder');
      return;
    }

    const now = new Date();
    if (reminderDate <= now) {
      toast.error("Please select a future time for the reminder.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        toast.error("User document not found");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        toast.error("Company document not found");
        return;
      }

      const companyData = companySnapshot.data();
      const isV2 = companyData.v2 || false;
      const whapiToken = companyData.whapiToken || '';
      const phone = userData.phoneNumber.split('+')[1];
      const chatId = phone + "@s.whatsapp.net"; // The specific number you want to send the reminder to
      
      console.log(chatId)
      const reminderMessage = `*Reminder for contact:* ${selectedContact.contactName || selectedContact.firstName || selectedContact.phone}\n\n${text}`;

      const scheduledMessageData = {
        batchQuantity: 1,
        chatIds: [chatId],
        companyId: companyId,
        createdAt: Timestamp.now(),
        documentUrl: "",
        fileName: null,
        mediaUrl: "",
        message: reminderMessage,
        mimeType: null,
        repeatInterval: 0,
        repeatUnit: 'days',
        scheduledTime: Timestamp.fromDate(reminderDate),
        status: "scheduled",
        v2: isV2,
        whapiToken: isV2 ? null : whapiToken,
    
      };

      // Make API call to schedule the message
      const response = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}`, scheduledMessageData);

      console.log(`Reminder scheduled. Document ID: ${response.data.id}`);

      toast.success('Reminder set successfully');
      setIsReminderModalOpen(false);
      setReminderDate(null);

    } catch (error) {
      console.error('Error setting reminder:', error);
      toast.error("An error occurred while setting the reminder. Please try again.");
    }
  };
  const handleGenerateAIResponse = async () => {
    if (messages.length === 0) return;
  
    try {
      setIsGeneratingResponse(true);
  console.log(messages);
      // Prepare the context from recent messages
        // Prepare the context from all messages in reverse order
 // Prepare the context from the last 20 messages in reverse order
 const context = messages.slice(0, 10).reverse().map(msg => 
  `${msg.from_me ? "Me" : "User"}: ${msg.text?.body || ""}`
).join("\n");
console.log(context);

const prompt = `
Your goal is to act like you are Me, and generate a response to the last message in the conversation, if the last message is from "Me", continue or add to that message appropriately, maintaining the same language and style. Note that "Me" indicates messages I sent, and "User" indicates messages from the person I'm talking to.

Based on this conversation:
${context}

:`;

console.log(prompt);
  
      // Use the sendMessageToAssistant function
      const aiResponse = await sendMessageToAssistant(prompt);
  
      // Set the AI's response as the new message
      setNewMessage(aiResponse);
  
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error("Failed to generate AI response");
    } finally {
      setIsGeneratingResponse(false);
    }
  };
  const visiblePhoneTags = useMemo(() => {
    if (userData?.role === '1') {
      // Admin users can see all phone tags
      return Object.entries(phoneNames).slice(0, phoneCount).map(([_, name]) => name);
    } else if (userData?.phone && userData.phone !== '0') {
      // Regular users can only see their associated phone tag
      const phoneIndex = Object.keys(phoneNames).findIndex(index => phoneNames[Number(index)] === userData.phone);
      if (phoneIndex !== -1 && phoneIndex < phoneCount) {
        return [phoneNames[phoneIndex]];
      }
    }
    return [];
  }, [userData, phoneNames, phoneCount]);

  const sendMessageToAssistant = async (messageText: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        toast.error("User not authenticated");
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document not found");
        toast.error("User document not found");
        return;
      }
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        console.error("Company document not found");
        toast.error("Company document not found");
        return;
      }
  
      const companyData = companySnapshot.data();
      const assistantId = companyData.assistantId;
  
      const res = await axios.get(`https://mighty-dane-newly.ngrok-free.app/api/assistant-test/`, {
        params: {
          message: messageText,
          email: user.email!,
          assistantid: assistantId
        },
      });
  
      return res.data.answer;
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send message to assistant");
      throw error;
    }
  };

  const NotificationPopup: React.FC<{ notifications: any[] }> = ({ notifications: initialNotifications }) => {
    const [notifications, setNotifications] = useState(initialNotifications);
    const navigate = useNavigate(); // Initialize useNavigate
    const handleDelete = (index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
    };
    const handleNotificationClick = (chatId: string,index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
      navigate(`/chat/?chatId=${chatId}`);
    };
    
    return (
      <div>
        {notifications.slice(-1).map((notification, index) => (
          <div key={index}>
          </div>
        ))}
      </div>
    );
  };
  
  const updateEmployeeAssignedContacts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Get all contacts
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
  
      // Object to store employee assignment counts
      const employeeAssignments: { [key: string]: number } = {};
  
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeList = employeeSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name, 
        quotaLeads: doc.data().quotaLeads || 0 
      }));
  
      // Count assignments
      contactsSnapshot.forEach((doc) => {
        const contact = doc.data();
        if (contact.tags) {
          contact.tags.forEach((tag: string) => {
            const employee = employeeList.find(emp => emp.name.toLowerCase() === tag.toLowerCase());
            if (employee) {
              employeeAssignments[employee.quotaLeads] = (employeeAssignments[employee.quotaLeads] || 0) + 1;
            }
          });
        }
      });
  
      console.log('Employee assignments before update:', employeeAssignments);
  
      // Update employee documents
      const employeeUpdates = Object.entries(employeeAssignments).map(async ([employeeId, count]) => {
        const employeeDocRef = doc(firestore, `companies/${companyId}/employee`, employeeId);
        const employeeDoc = await getDoc(employeeDocRef);
  
        if (employeeDoc.exists()) {
          const currentData = employeeDoc.data();
          const currentQuotaLeads = currentData.quotaLeads || 0;
          const currentAssignedContacts = currentData.assignedContacts || 0;
          
          // Calculate the difference in assigned contacts
          const assignedContactsDiff = count - currentAssignedContacts;
          
          // Calculate new quotaLeads
          const newQuotaLeads = Math.max(0, currentQuotaLeads - assignedContactsDiff);
          
          // Update assigned contacts and quotaLeads
          await updateDoc(employeeDocRef, {
            assignedContacts: count,
            quotaLeads: newQuotaLeads
          });
          console.log(`Updated ${currentData.name}: Assigned contacts from ${currentAssignedContacts} to ${count}, Quota leads from ${currentQuotaLeads} to ${newQuotaLeads}`);
        } else {
          console.error(`Employee document for ID ${employeeId} not found`);
        }
      });
  
      await Promise.all(employeeUpdates);
  
      console.log('Employee assigned contacts and quota leads updated successfully');
    } catch (error) {
      console.error('Error updating employee assigned contacts and quota leads:', error);
      toast.error('Failed to update employee assigned contacts and quota leads.');
    }
  };

  const insertPlaceholder = (field: string) => {
    const placeholder = `@{${field}}`;
    setBlastMessage(prevMessage => prevMessage + placeholder);
  };

  return (
    <div className="flex flex-col md:flex-row overflow-y-auto bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ height: '100vh' }}>
      <audio ref={audioRef} src={noti} />
        <div className={`flex flex-col w-full md:min-w-[35%] md:max-w-[35%] bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between pl-4 pr-4 pt-6 pb-2 sticky top-0 z-10 bg-gray-100 dark:bg-gray-900">
          <div>
            <div className="text-start text-2xl font-semibold capitalize text-gray-800 dark:text-gray-200">
              {userData?.company}
            </div>
            <div className="text-start text-lg font-medium text-gray-600 dark:text-gray-400">
              Total Contacts: {contacts.length}
            </div>
          </div>
          {userData?.phone !== undefined && (
            <div className="flex items-center space-x-2 text-lg font-semibold opacity-75">
              <Lucide icon="Phone" className="w-5 h-5 text-gray-800 dark:text-white" />
              <span className="text-gray-800 dark:text-white">
                {phoneNames[userData.phone] || 'No phone assigned'}
              </span>
            </div>
          )}
        </div>
        <div className="sticky top-20 z-10 bg-gray-100 dark:bg-gray-900 p-2">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900">
            {notifications.length > 0 && <NotificationPopup notifications={notifications} />}
            {isDeletePopupOpen && <DeleteConfirmationPopup />}
            <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-40 text-gray-900 dark:text-white">
                <div className="mb-4 text-lg font-semibold">Schedule Blast Message</div>
                  <textarea
                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Type your message here..."
                    value={blastMessage}
                    onChange={(e) => setBlastMessage(e.target.value)}
                    rows={3}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  ></textarea>
                   <div className="mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-500 hover:text-blue-400"
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                    >
                      {showPlaceholders ? 'Hide Placeholders' : 'Show Placeholders'}
                    </button>
                    {showPlaceholders && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to insert:</p>
                        {['contactName', 'firstName', 'lastName', 'email', 'phone', 'vehicleNumber', 'branch', 'expiryDate'].map(field => (
                          <button
                            key={field}
                            type="button"
                            className="mr-2 mb-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            onClick={() => insertPlaceholder(field)}
                          >
                            @{'{'}${field}{'}'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Media (Image or Video)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleMediaUpload(e)}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(e) => handleDocumentUpload(e)}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date & Time</label>
                    <div className="flex space-x-2">
                      <DatePicker
                        selected={blastStartDate}
                        onChange={(date: Date) => setBlastStartDate(date)}
                        dateFormat="MMMM d, yyyy"
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <DatePicker
                        selected={blastStartTime}
                        onChange={(date: Date) => setBlastStartTime(date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Quantity</label>
                    <input
                      type="number"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(parseInt(e.target.value))}
                      min={1}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Repeat Every</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={repeatInterval}
                        onChange={(e) => setRepeatInterval(parseInt(e.target.value))}
                        min={0}
                        className="w-20 mr-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <select
                        value={repeatUnit}
                        onChange={(e) => setRepeatUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                        className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                      onClick={() => setBlastMessageModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendBlastMessage}
                      disabled={isScheduling}
                    >
                      {isScheduling ? "Scheduling..." : "Send Blast Message"}
                    </button>
                  </div>
                </Dialog.Panel>
              </div>
            </Dialog>
            <PDFModal isOpen={isPDFModalOpen} onClose={closePDFModal} pdfUrl={pdfUrl} />
            {editingMessage && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                  <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 mb-4">Edit message</h3>
                        <textarea
                          className="w-full h-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          placeholder="Edit your message"
                          value={editedMessageText}
                          onChange={(e) => setEditedMessageText(e.target.value)}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleEditMessage}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={cancelEditMessage}
                    >
                      Cancel
                    </Button>
              </div>
              </div>
              </div>
            )}
            {isForwardDialogOpen && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                  <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 mb-4">Forward message to</h3>
                        <div className="relative mb-4">
                          <input
                            type="text"
                            className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            placeholder="Search..."
                            value={searchQuery2}
                            onChange={handleSearchChange2}
                          />
                          <Lucide
                            icon="Search"
                            className="absolute top-2 right-3 w-5 h-5 text-gray-500 dark:text-gray-400"
                          />
                        </div>
                        <div className="sticky top-0 bg-white dark:bg-gray-800 z-20 w-full">
                          <div className="overflow-x-auto whitespace-nowrap pb-2 sticky top-0 z-20">
                            <div className="flex gap-2 sticky top-0" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', position: 'sticky', top: 0 }}>
                              {visibleTags.map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={() => filterTagContact('mine')}
                                  className={`px-3 py-1 rounded-full text-sm flex-shrink-0 ${
                                    activeTags.includes(tag.name)
                                      ? 'bg-primary text-white dark:bg-primary dark:text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                  } transition-colors duration-200`}
                                >
                                  {tag.name}
                                </button>
          ))}
        </div>
      </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredContactsForForwarding.map((contact, index) => (
                            <div
                              key={contact.id || `${contact.phone}-${index}`}
                              className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <input
                                type="checkbox"
                                className="mr-3"
                                checked={selectedContactsForForwarding.includes(contact)}
                                onChange={() => handleSelectContactForForwarding(contact)}
                              />
                              <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-gray-300 dark:bg-gray-600 rounded-full mr-3 text-white">
                                  {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : "?"}
                                </div>
                                <div className="flex-grow">
                                  <div className="font-semibold capitalize">{contact.contactName || contact.firstName || contact.phone}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 mb-2 px-1 h-40 overflow-y-auto">
                          {/* Content goes here */}
                        </div>
                        {tagList.length > 5 && (
                          <div className="sticky bottom-0 bg-white dark:bg-gray-800 py-2 z-10">
                            <div className="flex justify-center">
                              <button
                                onClick={toggleTagsExpansion}
                                className="text-primary dark:text-blue-400 hover:underline focus:outline-none flex items-center"
                              >
                                {isTagsExpanded ? (
                                  <>
                                    <Lucide icon="ChevronUp" className="z-99 w-4 h-4 mr-1" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <Lucide icon="ChevronDown" className="w-4 h-4 mr-1" />
                                    Show More
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
            </div>
          </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleForwardMessage}
                    >
                      Forward
                    </Button>
                    <Button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={() => handleCloseForwardDialog()}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
)} 
{isFetching && (
  <div className="w-full">
    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 relative">
      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
    <div className="text-right mt-1">
      <span className="font-semibold truncate text-gray-800 dark:text-gray-200">{progress.toFixed(2)}%</span>
          </div>
        </div>
)}
{!isFetching && (
  <div className="relative flex-grow">
    <input
      type="text"
      className="!box w-full h-9 py-1 pl-10 pr-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
      placeholder="Search..."
      value={searchQuery}
      onChange={handleSearchChange}
    />
  <Lucide
    icon="Search"
    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400"
  />
</div>
)}
    <div className="flex justify-end space-x-3">
    {isAssistantAvailable && (
      <button 
        className={`flex items-center justify-start p-2 !box ${
          stopbot ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        } ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`} 
        onClick={toggleBot}
        disabled={userRole === "3"}
      >
        <Lucide 
          icon={stopbot ? 'PowerOff' : 'Power'} 
          className={`w-5 h-5 ${
            stopbot ? 'text-red-500' : 'text-green-500'
          }`}
        />                
      </button>
    )}
    <Menu as="div" className="relative inline-block text-left">
      <div className="flex items-right space-x-3">
        <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
          <span className="flex items-center justify-center w-5 h-5">
            <Lucide icon="Users" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </span>
        </Menu.Button>
      </div>
      <Menu.Items className="absolute right-0 mt-2 w-60 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
        {employeeList.sort((a, b) => a.name.localeCompare(b.name)).map((employee) => (
          <Menu.Item key={employee.id}>
            {({ active }) => (
              <button
                className={`flex items-center w-full text-left p-2 rounded-md ${
                  activeTags.includes(employee.name)
                    ? 'bg-primary text-white dark:bg-primary dark:text-white'
                    : active
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
                onClick={() => filterTagContact(employee.name)}
              >
                <span>{employee.name}</span>
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
    <button
      className="p-2 !box m-0 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      onClick={toggleTagsExpansion}
    >
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide 
          icon={isTagsExpanded ? "ChevronUp" : "ChevronDown"} 
          className="w-5 h-5 text-gray-800 dark:text-gray-200" 
        />
      </span>
    </button>
          </div>
          </div>
  <div className="border-b border-gray-300 dark:border-gray-700 mt-4"></div>

</div>
<div className="mt-4 mb-2 px-4 max-h-40 overflow-y-auto">
<div className="flex flex-wrap gap-2">
  {['Mine', 'All', 'Unassigned',
    ...(isTagsExpanded ? [
      'Group', 'Unread', 'Snooze', 'Stop Bot',
      ...(userData?.phone !== undefined && userData.phone !== -1 ? 
        [phoneNames[userData.phone] || `Phone ${userData.phone + 1}`] : 
        Object.values(phoneNames)
      ),
      ...visibleTags.filter(tag => 
        !['All', 'Unread', 'Mine', 'Unassigned', 'Snooze', 'Group', 'stop bot'].includes(tag.name) && 
        !visiblePhoneTags.includes(tag.name)
      )
    ] : [])
  ].map((tag) => {
    const tagName = typeof tag === 'string' ? tag : tag.name || String(tag);
    const tagLower = tagName.toLowerCase();
    let newfilter = contacts;
    if(userData?.phone !== undefined && userData.phone !== -1){
      const userPhoneIndex = parseInt(userData.phone, 10);
      newfilter = contacts.filter(contact => contact.phoneIndex === userPhoneIndex)
    }
    const unreadCount = newfilter.filter(contact => {
      const contactTags = contact.tags?.map(t => t.toLowerCase()) || [];
      const isGroup = contact.chat_id?.endsWith('@g.us');
      const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => name.toLowerCase() === tagLower);
      
      return (
        (tagLower === 'all' ? !isGroup :
        tagLower === 'unread' ? contact.unreadCount && contact.unreadCount > 0 :
        tagLower === 'mine' ? contactTags.includes(currentUserName.toLowerCase()) :
        tagLower === 'unassigned' ? !contactTags.some(t => employeeList.some(e => e.name.toLowerCase() === t)) :
        tagLower === 'snooze' ? contactTags.includes('snooze') :
        tagLower === 'group' ? isGroup :
        tagLower === 'stop bot' ? contactTags.includes('stop bot') :
        phoneIndex !== -1 ? contact.phoneIndex === phoneIndex :
        contactTags.includes(tagLower)) &&
        (tagLower !== 'all' && tagLower !== 'unassigned' ? contact.unreadCount && contact.unreadCount > 0 : true)
      );
    }).length;

    // ... rest of the code

    return (
      <button
        key={typeof tag === 'string' ? tag : tag.id}
        onClick={() => filterTagContact(tagName)}
        className={`px-3 py-1 rounded-full text-sm flex items-center ${
          (tagLower === activeTags[0])
            ? 'bg-primary text-white dark:bg-primary dark:text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        } transition-colors duration-200`}
      >
        <span>{tagName}</span>
        {userData?.role === '1' && unreadCount > 0 && (
          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
            tagName.toLowerCase() === 'stop bot' ? 'bg-red-700' : 'bg-primary'
          } text-white`}>
            {unreadCount}
          </span>
        )}
      </button>
    );
  })}
</div>
</div>
  <span
    className="flex items-center justify-center p-2 cursor-pointer text-primary dark:text-blue-400 hover:underline transition-colors duration-200"
    onClick={toggleTagsExpansion}
  >
    {isTagsExpanded ? "Show Less" : "Show More"}
  </span>
<div className="bg-gray-100 dark:bg-gray-900 flex-1 overflow-y-scroll h-full" ref={contactListRef}>
  {sortContacts(paginatedContacts).map((contact, index) => (
    <React.Fragment key={`${contact.id}-${index}` || `${contact.phone}-${index}`}>
    <div
      className={`m-2 pr-3 pb-2 pt-2 rounded-lg cursor-pointer flex items-center space-x-3 group ${
        contact.chat_id !== undefined
          ? selectedChatId === contact.chat_id
            ? 'bg-slate-300 text-white dark:bg-gray-800 dark:text-gray-200'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
          : selectedChatId === contact.phone
          ? 'bg-slate-300 text-white dark:bg-gray-800 dark:text-gray-200'
          : 'hover:bg-gray-300 dark:hover:bg-gray-700'
      }`}
      onClick={() => selectChat(contact.chat_id!, contact.id!)}
      onContextMenu={(e) => handleContextMenu(e, contact)}
    >
    <div
      key={contact.id}
      className="hidden cursor-pointer"
      onClick={() => selectChat(contact.chat_id!, contact.id!)}
    >
    </div>
    <div className="relative w-14 h-14">
    <div className="w-14 h-14 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-xl overflow-hidden">
    {contact && (
      contact.chat_id && contact.chat_id.includes('@g.us') ? (
        contact.profilePicUrl ? (
          <img 
            src={contact.profilePicUrl} 
            alt={contact.contactName || "Group"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Lucide icon="Users" className="w-8 h-8 text-white dark:text-gray-200" />
        )
      ) : contact.profilePicUrl ? (
        <img 
          src={contact.profilePicUrl} 
          alt={contact.contactName || "Profile"} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-400 dark:bg-gray-600 text-white">
          {<Lucide icon="User" className="w-10 h-10" />}
        </div>
      )
    )}
    </div>
    {(contact.unreadCount ?? 0) > 0 && (
      <span className="absolute -top-1 -right-1 bg-primary text-white dark:bg-blue-600 dark:text-gray-200 text-xs rounded-full px-2 py-1 min-w-[20px] h-[20px] flex items-center justify-center">
        {contact.unreadCount}
      </span>
    )}
  </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-semibold capitalize truncate w-25 text-gray-800 dark:text-gray-200">
              {((contact.contactName ?? contact.firstName ?? contact.phone ?? "").slice(0, 20))}
              {((contact.contactName ?? contact.firstName ?? contact.phone ?? "").length > 20 ? '...' : '')}
            </span>
            {!contact.chat_id?.includes('@g.us') && userData?.role === '1' && (
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate" style={{ 
                visibility: (contact.contactName === contact.phone || contact.firstName === contact.phone) ? 'hidden' : 'visible',
                display: (contact.contactName === contact.phone || contact.firstName === contact.phone) ? 'flex' : 'block',
                alignItems: 'center'
              }}>
                {contact.phone}
              </span>
            )}
          </div>
          <span className="text-xs flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="flex flex-grow items-center">
              {(() => {
                const employeeTags = contact.tags?.filter(tag =>
                  employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
                ) || [];
              
                const otherTags = contact.tags?.filter(tag =>
                  !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
                ) || [];
              
                // Create a unique set of all tags
                const uniqueTags = Array.from(new Set([...otherTags]));
              
                return (
                  <>
                  <button
                    className={`text-md ${
                      contact.pinned ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400 group-hover:font-bold dark:group-hover:font-bold mr-1'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinConversation(contact.chat_id!);
                    }}
                  >
                  {contact.pinned ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="text-gray-800 dark:text-blue-400 fill-current mr-1">
                      <mask id="ipSPin0">
                        <path fill="#fff" stroke="#fff" strokeLinejoin="round" strokeWidth="4" d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"/>
                      </mask>
                      <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPin0)"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="group-hover:block hidden">
                      <path fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"/>
                    </svg>
                  )}
                  </button>
                    {uniqueTags.length > 0 && (
                      <Tippy
                        content={uniqueTags.join(', ')}
                        options={{ 
                          interactive: true,
                          appendTo: () => document.body
                        }}
                      >
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs font-semibold mr-1 px-2.5 py-0.5 rounded-full cursor-pointer">
                          <Lucide icon="Tag" className="w-4 h-4 inline-block" />
                          <span className="ml-1">{uniqueTags.length}</span>
                        </span>
                      </Tippy>
                    )}
                    {employeeTags.length > 0 && (
                      <Tippy
                          content={employeeTags.map(tag => {
                            const employee = employeeList.find(e => e.name.toLowerCase() === tag.toLowerCase());
                            return employee ? employee.name : tag;
                          }).join(', ')}
                        options={{ 
                          interactive: true,  
                          appendTo: () => document.body
                        }}
                      >
                        <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 text-xs font-semibold mr-1 px-2.5 py-0.5 rounded-full cursor-pointer">
                          <Lucide icon="Users" className="w-4 h-4 inline-block" />
                          <span className="ml-1 text-xxs">
                            {employeeTags.length === 1 
                              ? (employeeList.find(e => e.name.toLowerCase() === employeeTags[0].toLowerCase())?.employeeId || 
                                 (employeeTags[0].length > 8 ? employeeTags[0].slice(0, 6) : employeeTags[0]))
                              : employeeTags.length}
                          </span>
                        </span>
                      </Tippy>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex items-center align-top space-x-1">
              <span className={`${
                contact.unreadCount && contact.unreadCount > 0 
                  ? 'text-blue-500 font-medium' 
                  : ''
              }`}>
                {contact.last_message?.createdAt || contact.last_message?.timestamp
                  ? formatDate(contact.last_message.createdAt || (contact.last_message.timestamp && contact.last_message.timestamp * 1000))
                  : 'No Messages'}
              </span>
            </div>
          </span>
    </div>
        <div className="flex justify-between items-center">
          <span className="text-sm truncate text-gray-600 dark:text-gray-400" style={{ width: '200px' }}>
            {contact.last_message ? (
              <>
                {contact.last_message.from_me && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block items-center justify-start w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {contact.last_message.type === "text" ? (
                  contact.last_message.text?.body
                ) : contact.last_message.type === "image" ? (
                  "Photo"
                ) : contact.last_message.type === "document" ? (
                  "Document"
                ) : contact.last_message.type === "audio" ? (
                  "Audio"
                ) : contact.last_message.type === "video" ? (
                  "Video"
                ) : (
                  contact.last_message.from_me ? "You: Message" : "Bot: Message"
                )}
              </>
            ) : (
              "No Messages"
            )}
          </span>
          {isAssistantAvailable && (
            <div onClick={(e) => toggleStopBotLabel(contact, index, e)}
              className="cursor-pointer">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={contact.tags?.includes("stop bot")}
                    readOnly
                  />
                <div className={`mt-1 ml-0 relative w-11 h-6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer ${
                  contact.tags?.includes("stop bot") 
                    ? 'bg-red-500 dark:bg-red-700' 
                    : 'bg-green-500 dark:bg-green-700'
                } peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-400`}>
                </div>
              </label>
            </div>
          )}
        </div>
                  </div>
                </div>
    {index < filteredContacts.length - 1 && <hr className="my-2 border-gray-300 dark:border-gray-700" />}
  </React.Fragment>
))}
              </div>
              <ReactPaginate
                breakLabel="..."
                nextLabel="Next"
                onPageChange={handlePageChange}
                pageRangeDisplayed={2}
                pageCount={Math.ceil(filteredContacts.length / contactsPerPage)}
                previousLabel="Previous"
                renderOnZeroPageCount={null}
                containerClassName="flex justify-center items-center mt-4 mb-4"
                pageClassName="mx-1"
                pageLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                previousClassName="mx-1"
                nextClassName="mx-1"
                previousLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                nextLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="font-bold"
                activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                forcePage={currentPage}
              />
        </div>
      <div className="flex flex-col w-full sm:w-3/4 bg-slate-300 dark:bg-gray-900 relative flext-1 overflow-hidden">
  {selectedChatId ? (
    <>
      <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center">
        <button onClick={handleBack} className="back-button p-2 text-lg">
            <Lucide icon="ChevronLeft" className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3 ml-2">
  {selectedContact?.profilePicUrl ? (
    <img 
      src={selectedContact.profilePicUrl} 
      alt={selectedContact.contactName || "Profile"} 
      className="w-10 h-10 rounded-full object-cover"
    />
  ) : (
    <span className="text-2xl font-bold">
      {selectedContact?.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}
    </span>
  )}
</div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{selectedContact.contactName || selectedContact.firstName || selectedContact.phone}</div>
            {userRole === '1' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{selectedContact.phone}</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex space-x-3">
          <button 
  className="p-2 m-0 !box" 
  onClick={() => {
    if (userRole !== "3") {
      setBlastMessageModal(true);
    } else {
      toast.error("You don't have permission to send blast messages.");
    }
  }}
  disabled={userRole === "3"}
>
  <span className="flex items-center justify-center w-5 h-5">
    <Lucide icon="Send" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
  </span>
</button>
            <button className="p-2 m-0 !box" onClick={handleReminderClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon="BellRing" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button as={Button} className="p-2 !box m-0">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Users" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
  <div className="mb-2">
    <input
      type="text"
      placeholder="Search employees..."
      value={employeeSearch}
      onChange={(e) => setEmployeeSearch(e.target.value)}
      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    />
  </div>
  {employeeList
    .filter(employee => employee.name.toLowerCase().includes(employeeSearch.toLowerCase()))
    .map((employee) => (
      <Menu.Item key={employee.id}>
        <button
          className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          onClick={() => handleAddTagToSelectedContacts(employee.name, selectedContact)}
        >
          <span className="text-gray-800 dark:text-gray-200 truncate flex-grow mr-2" style={{ maxWidth: '70%' }}>
            {employee.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Leads Quota: {employee.quotaLeads}
          </span>
        </button>
      </Menu.Item>
    ))}
</Menu.Items>
            </Menu>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button as={Button} className="p-2 !box m-0">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Tag" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
                {tagList.map((tag) => (
                  <Menu.Item key={tag.id}>
                    <button
                      className={`flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                        activeTags.includes(tag.name) ? 'bg-gray-200 dark:bg-gray-700' : ''
                      }`}
                      onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
                    >
                      <Lucide icon="User" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                      <span className="text-gray-800 dark:text-gray-200">{tag.name}</span>
                    </button>
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Menu>
            <button className="p-2 m-0 !box" onClick={handleEyeClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button>
            <button className="p-2 m-0 !box" onClick={handleMessageSearchClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon={isMessageSearchOpen ? "X" : "Search"} className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button>
          </div>
          <Menu as="div" className="sm:hidden relative inline-block text-left">
            <Menu.Button as={Button} className="p-2 !box m-0">
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon="MoreVertical" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10">
              <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleReminderClick}>
                  <Lucide icon="BellRing" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">Reminder</span>
                </button>
              </Menu.Item>
              <Menu.Item>
  <Menu as="div" className="relative inline-block text-left w-full">
    <Menu.Button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <Lucide icon="Users" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
      <span className="text-gray-800 dark:text-gray-200">Assign Employee</span>
    </Menu.Button>
    <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10">
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search employees..."
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        />
      </div>
      {employeeList
        .filter(employee => employee.name.toLowerCase().includes(employeeSearch.toLowerCase()))
        .map((employee) => (
          <Menu.Item key={employee.id}>
            <button
              className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              onClick={() => handleAddTagToSelectedContacts(employee.name, selectedContact)}
            >
              <span className="text-gray-800 dark:text-gray-200">{employee.name}</span>
            </button>
          </Menu.Item>
        ))}
    </Menu.Items>
  </Menu>
</Menu.Item>
              <Menu.Item>
                <Menu as="div" className="relative inline-block text-left w-full">
                  <Menu.Button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <Lucide icon="Tag" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                    <span className="text-gray-800 dark:text-gray-200">Add Tag</span>
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10">
                    {tagList.map((tag) => (
                      <Menu.Item key={tag.id}>
                        <button
                          className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
                        >
                          <span className="text-gray-800 dark:text-gray-200">{tag.name}</span>
                        </button>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Menu>
              </Menu.Item>
              <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleEyeClick}>
                  <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">{isTabOpen ? "Close" : "View"} Details</span>
                </button>
              </Menu.Item>
              <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleMessageSearchClick}>
                  <Lucide icon={isMessageSearchOpen ? "X" : "Search"} className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">{isMessageSearchOpen ? "Close" : "Open"} Search</span>
                </button>
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2" 
        style={{
          paddingBottom: "150px",
          backgroundColor: selectedContact ? 'transparent' : 'bg-slate-400 dark:bg-gray-800',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
        ref={messageListRef}>
        {isLoading2 && (
          <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
            <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
              <div role="status">
                <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
                  <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
                  <div className="mt-2 text-xs text-center text-gray-800 dark:text-gray-200">Fetching Data...</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedChatId && (
          <>
            {messages
              .filter((message) => message.type !== 'action'&& 
              message.type !== 'e2e_notification' && 
              message.type !== 'notification_template')
              .slice()
              .reverse()
              .map((message, index, array) => {
                const previousMessage = messages[index - 1];
                const showDateHeader =
                  index === 0 ||
                  !isSameDay(
                    new Date(array[index - 1]?.createdAt ?? array[index - 1]?.dateAdded ?? 0),
                    new Date(message.createdAt ?? message.dateAdded ?? 0)
                  );
                  const isMyMessage = message.from_me;
                  const prevMessage = messages[index - 1];
                  const nextMessage = messages[index + 1];
                  
                  const isFirstInSequence = !prevMessage || prevMessage.from_me !== message.from_me;
                  const isLastInSequence = !nextMessage || nextMessage.from_me !== message.from_me;
                  
                  let messageClass;
                  if (isMyMessage) {
                    messageClass = isFirstInSequence ? myFirstMessageClass :
                                   isLastInSequence ? myLastMessageClass :
                                   myMiddleMessageClass;
                  } else {
                    messageClass = isFirstInSequence ? otherFirstMessageClass :
                                   isLastInSequence ? otherLastMessageClass :
                                   otherMiddleMessageClass;
                  }

  return (
                  <React.Fragment key={message.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-4">
                        <div className="inline-block bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold py-1 px-4 rounded-lg shadow-md">
                          {formatDateHeader(message.createdAt?.toString() || message.dateAdded?.toString() || '')}
                        </div>
                      </div>
                    )}

                    <div
                      data-message-id={message.id}
                      className={`p-2 mr-6 ${
                        message.type === 'privateNote'
                          ? "bg-yellow-600 text-black rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl self-end ml-auto text-left mb-1 group"
                          : messageClass
                      }`}
                      style={{
                        maxWidth: message.type === 'document' ? '90%' : '70%',
                        width: `${
                          message.type === 'document'
                            ? '400'
                            : message.type !== 'text'
                            ? '320'
                            : message.text?.body
                            ? Math.min(Math.max(message.text.body.length, message.text?.context?.quoted_content?.body?.length || 0) * 30, 320)
                            : '150'
                        }px`,
                        minWidth: '200px',
                      }}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {message.isPrivateNote && (
                        <div className="flex items-center mb-1">
                          <Lock size={16} className="mr-1" />
                          <span className="text-xs font-semibold">Private Note</span>
                        </div>
                      )}
                      {message.chat_id && message.chat_id.includes('@g') && message.author && (
                        <div 
                          className="pb-0.5 text-sm font-medium capitalize" 
                          style={{ color: getAuthorColor(message.author.split('@')[0]) }}
                        >
                          {message.author.split('@')[0].toLowerCase()}
                        </div>
                      )}
                      {message.type === 'text' && message.text?.context && (
                        <div className="p-2 mb-2 rounded bg-gray-200 dark:bg-gray-800">
                          <div 
                            className="text-sm font-medium" 
                            style={{ color: getAuthorColor(message.text.context.quoted_author) }}
                          >
                            {message.text.context.quoted_author || ''}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{message.text.context.quoted_content?.body || ''}</div>
                        </div>
                      )}
                       {/* {message.chat_id && message.chat_id.includes('@g') && message.phoneIndex != null && phoneCount >= 2 && (
                        <span className="text-sm font-medium pb-0.5 "
                          style={{ color: getAuthorColor(message.phoneIndex.toString() ) }}>
                          {phoneNames[message.phoneIndex] || `Phone ${message.phoneIndex + 1}`}
                        </span>
                      )} */}
                      {message.type === 'privateNote' && (
                        <div className="inline-block whitespace-pre-wrap break-words text-white">
                          {(() => {
                            const text = typeof message.text === 'string' ? message.text : message.text?.body || 'No content';
                            const parts = text.split(/(@\w+)/g);
                            return parts.map((part, index) => 
                              part.startsWith('@') ? (
                                <span key={index} className="underline">{part}</span>
                              ) : (
                                part
                              )
                            );
                          })()}
                        </div>
                      )}
                      {message.type === 'text' && message.text?.body && (
                        <div>
                        {message.from_me && message.userName && message.userName !== '' && (
                          <div className="text-sm text-gray-300 dark:text-gray-300 mb-1 capitalize font-medium">{message.userName}</div>
                        )}
                        <div 
                          className={`whitespace-pre-wrap break-words overflow-hidden ${
                            message.from_me ? myMessageTextClass : otherMessageTextClass
                          }`} 
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {formatText(message.text.body)}
                        </div>
                        {message.edited && (
                          <div className="text-xs text-gray-500 mt-1 italic">Edited</div>
                        )}
                      </div>
                      )}
                      {message.type === 'image' && message.image && (
                        <div className="p-0 message-content image-message">
                          <img
                            src={message.image.data ? `data:${message.image.mimetype};base64,${message.image.data}` : message.image.link || ''}
                            alt="Image"
                            className="rounded-lg message-image cursor-pointer"
                            style={{ maxWidth: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
                            onClick={() => openImageModal(message.image?.data ? `data:${message.image.mimetype};base64,${message.image.data}` : message.image?.link || '')}
                            onError={(e) => {
                              console.error("Error loading image:", e.currentTarget.src);
                              e.currentTarget.src = logoImage; // Replace with your fallback image path
                            }}
                          />
                            {message.image?.caption && (
                <p className="mt-2 text-sm">{message.image.caption}</p>
              )}
                        </div>
                      )}
                      {message.type === 'video' && message.video && (
                        <div className="video-content p-0 message-content image-message">
                          <video
                            controls
                            src={message.video.link}
                            className="rounded-lg message-image cursor-pointer"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
                          />
                        </div>
                      )}
                      {message.type === 'gif' && message.gif && (
                        <div className="gif-content p-0 message-content image-message">
                          <img
                            src={message.gif.link}
                            alt="GIF"
                            className="rounded-lg message-image cursor-pointer"
                            style={{ maxWidth: '300px' }}
                            onClick={() => openImageModal(message.gif?.link || '')}
                          />
                          <div className="caption text-gray-800 dark:text-gray-200">{message.gif.caption}</div>
                        </div>
                      )}
             {(message.type === 'audio' || message.type === 'ptt') && (message.audio || message.ptt) && (
              <div className="audio-content p-0 message-content image-message">
                <audio 
                  controls 
                  className="rounded-lg message-image cursor-pointer"
                  src={(() => {
                    const audioData = message.audio?.data || message.ptt?.data;
                    const mimeType = message.audio?.mimetype || message.ptt?.mimetype;
                    if (audioData && mimeType) {
                      const byteCharacters = atob(audioData);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: mimeType });
                      return URL.createObjectURL(blob);
                    }
                    return '';
                  })()}
                />
                {(message.audio?.caption || message.ptt?.caption) && (
                  <div className="caption text-gray-800 dark:text-gray-200 mt-2">
                    {message.audio?.caption || message.ptt?.caption}
                  </div>
                )}
              </div>
            )}
                      {message.type === 'voice' && message.voice && (
                        <div className="voice-content p-0 message-content image-message w-auto h-auto">
                          <audio controls src={message.voice.link} className="rounded-lg message-image cursor-pointer" />
                        </div>
                      )}
                      {message.type === 'document' && message.document && (
                        <div className="document-content flex flex-col items-center p-4 rounded-md shadow-md bg-white dark:bg-gray-800">
                          {message.document.mimetype && message.document.mimetype.startsWith('video/') ? (
                            <video
                              src={message.document.link || `data:${message.document.mimetype};base64,${message.document.data}`}
                              controls
                              className="w-full max-w-md h-auto rounded cursor-pointer"
                              onClick={() => openPDFModal(message.document?.link ?? `data:${message.document?.mimetype};base64,${message.document?.data}`)}
                            />
                          ) : message.document.link ? (
                            <iframe
                              src={message.document.link}
                              width="auto"
                              height="auto"
                              title="Document"
                              className="border rounded cursor-pointer"
                              onClick={() => openPDFModal(message.document?.link || '')}
                            />
                          ) : message.document.data ? (
                            <iframe
                              src={`data:${message.document.mimetype};base64,${message.document.data}`}
                              width="auto"
                              height="auto"
                              title="Document"
                              className="border rounded cursor-pointer"
                              onClick={() => message.document && openPDFModal(`data:${message.document.mimetype};base64,${message.document.data}`)}
                            />
                          ) : (
                            <div className="text-gray-600 dark:text-gray-400">Document preview not available</div>
                          )}
                          <div className="flex-1 text-justify mt-3 w-full">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {message.document.file_name || message.document.filename || 'Document'}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {message.document.page_count && `${message.document.page_count} page${message.document.page_count > 1 ? 's' : ''} • `}
                              {message.document.mimetype || 'Unknown'} •{' '}
                              {((message.document.file_size || message.document.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                            </div>
                      
                          </div>
                  
                          <button
                            onClick={() => {
                              if (message.document) {
                                openPDFModal(message.document.link || `data:${message.document.mimetype};base64,${message.document.data}`);
                              }
                            }}
                            className="mt-3"
                          >
                            <Lucide icon="ExternalLink" className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                          </button>
                   
                        </div>
                        
                      )}
                             {message.document?.caption && (
                <p className="mt-2 text-sm">{message.document.caption}</p>
              )}
                      {message.type === 'link_preview' && message.link_preview && (
                        <div className="link-preview-content p-0 message-content image-message rounded-lg overflow-hidden text-gray-800 dark:text-gray-200">
                          <a href={message.link_preview.body} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={message.link_preview.preview}
                              alt="Preview"
                              className="w-full"
                            />
                            <div className="p-2">
                              <div className="font-bold text-lg">{message.link_preview.title}</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200">{message.link_preview.description}</div>
                              <div className="text-blue-500 mt-1">{message.link_preview.body}</div>
                            </div>
                          </a>
                        </div>
                      )}
                    {message.type === 'sticker' && message.sticker && (
  <div className="sticker-content p-0 message-content image-message">
    <img
      src={`data:${message.sticker.mimetype};base64,${message.sticker.data}`}
      alt="Sticker"
      className="rounded-lg message-image cursor-pointer"
      style={{ maxWidth: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
      onClick={() => openImageModal(`data:${message.sticker?.mimetype};base64,${message.sticker?.data}`)}
    />
  </div>
)}
                      {message.type === 'location' && message.location && (
                        <div className="location-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">Location: {message.location.latitude}, {message.location.longitude}</div>
                        </div>
                      )}
                      {message.type === 'poll' && message.poll && (
                        <div className="poll-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">Poll: {message.poll.title}</div>
                        </div>
                      )}
                      {message.type === 'hsm' && message.hsm && (
                        <div className="hsm-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">HSM: {message.hsm.title}</div>
                        </div>
                      )}
                      {message.type === 'action' && message.action && (
                        <div className="action-content flex flex-col p-4 rounded-md shadow-md bg-white dark:bg-gray-800">
                          {message.action.type === 'delete' ? (
                            <div className="text-gray-400 dark:text-gray-600">This message was deleted</div>
                          ) : (
                            /* Handle other action types */
                            <div className="text-gray-800 dark:text-gray-200">{message.action.emoji}</div>
                          )}
                        </div>
                      )}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex items-center space-x-2 mt-1">
                          {message.reactions.map((reaction, index) => (
                            <div key={index} className="text-gray-500 dark:text-gray-400 text-sm flex items-center space-x-1">
                              <span
                                className="inline-flex items-center justify-center border border-white rounded-full bg-gray-200 dark:bg-gray-700"
                                style={{ padding: '10px' }}
                              >
                                {reaction.emoji}
                              </span>
            </div>
          ))}
        </div>
                      )}
                      <div className="flex justify-between items-center mt-1">
                      
                        <div className={`message-timestamp text-xs ${message.from_me ? myMessageTextClass : otherMessageTextClass} flex items-center h-6 ml-auto`}>
                          <div className="flex items-center mr-2">
                            {(hoveredMessageId === message.id || selectedMessages.includes(message)) && (
                              <>
                                <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-500 transition duration-150 ease-in-out rounded-full" checked={selectedMessages.includes(message)} onChange={() => handleSelectMessage(message)} />
                                <button className="ml-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 mr-2" onClick={() => setReplyToMessage(message)}><Lucide icon="MessageSquare" className="w-5 h-5 fill-current" /></button>
                                {message.from_me && message.createdAt && new Date().getTime() - new Date(message.createdAt).getTime() < 15 * 60 * 1000 && userRole !== "3" && (
                                  <button className="ml-2 mr-2 text-black hover:text-black dark:text-gray-300 dark:hover:text-black transition-colors duration-200" onClick={() => openEditMessage(message)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg></button>
                                )}
                              </>
                            )}
                            {message.name && <span className="ml-2 text-gray-400 dark:text-gray-600">{message.name}</span>}
                            {formatTimestamp(message.createdAt || message.dateAdded)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            }
            
     
        
          </>
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 w-500px !box m-1 py-1 px-2">
 
        {replyToMessage && (
          <div className="p-2 mb-2 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">{replyToMessage.from_name}</div>
              <div>
                {replyToMessage.type === 'text' && replyToMessage.text?.body}
                {replyToMessage.type === 'link_preview' && replyToMessage.link_preview?.body}
                {replyToMessage.type === 'image' && <img src={replyToMessage.image?.link} alt="Image" style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'video' && <video controls src={replyToMessage.video?.link} style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'gif' && <img src={replyToMessage.gif?.link} alt="GIF" style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'audio' && <audio controls src={replyToMessage.audio?.link} />}
                {replyToMessage.type === 'voice' && <audio controls src={replyToMessage.voice?.link} />}
                {replyToMessage.type === 'document' && <iframe src={replyToMessage.document?.link} width="100%" height="200px" />}
                {replyToMessage.type === 'sticker' && <img src={replyToMessage.sticker?.link} alt="Sticker" style={{ maxWidth: '150px' }} />}
                {replyToMessage.type === 'location' && (
                  <div className="text-gray-800 dark:text-gray-200">
                    Location: {replyToMessage.location?.latitude}, {replyToMessage.location?.longitude}
                  </div>
                )}
                {replyToMessage.type === 'poll' && <div className="text-gray-800 dark:text-gray-200">Poll: {replyToMessage.poll?.title}</div>}
                {replyToMessage.type === 'hsm' && <div className="text-gray-800 dark:text-gray-200">HSM: {replyToMessage.hsm?.title}</div>}
              </div>
            </div>
            <button onClick={() => setReplyToMessage(null)}>
              <Lucide icon="X" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
        )}
         <div className="flex mb-1">
            <button
              className={`px-4 py-2 mr-1 rounded-lg ${
                messageMode === 'reply'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
              onClick={() => {
                const phoneIndex = selectedContact?.phoneIndex || 0;
                setMessageMode(`phone${phoneIndex + 1}`);
              }}
            >
              Reply
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                messageMode === 'privateNote'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
              onClick={() => setMessageMode('privateNote')}
            >
              Private Note
            </button>
          </div>
         {isPrivateNotesMentionOpen && messageMode === 'privateNote' && (
                    <div className="absolute bottom-full left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto mb-1">
                      {employeeList.map((employee) => (
                        <div
                          key={employee.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                          onClick={() => handlePrivateNoteMentionSelect(employee)}
                        >
                          {employee.name}
                        </div>
                      ))}
                    </div>
                  )}
        <div className="flex items-center w-full bg-white dark:bg-gray-800 pl-2 pr-2 rounded-lg">
          <button className="p-2 m-0 !box" onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}>
            <span className="flex items-center justify-center w-5 h-5">
              <Lucide icon="Smile" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </span>
          </button>
          <Menu as="div" className="relative inline-block text-left p-2">
            <div className="flex items-center space-x-3">
              <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Paperclip" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
            </div>
            <Menu.Items className="absolute left-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
            <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
  <label htmlFor="imageUpload" className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full">
    <Lucide icon="Image" className="w-4 h-4 mr-2" />
    Image
    <input
      type="file"
      id="imageUpload"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          setPastedImageUrl(imageUrl);
          setImageModalOpen2(true);
        }
      }}
    />
  </label>
</button>
<button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
  <label htmlFor="documentUpload" className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full">
    <Lucide icon="File" className="w-4 h-4 mr-2" />
    Document
    <input
  type="file"
  id="documentUpload"
  accept="application/pdf"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
      setDocumentModalOpen(true);
    }
  }}
/>
  </label>
</button>
            </Menu.Items>
          </Menu>
          <button className="p-2 m-0 !box" onClick={handleQR}>
            <span className="flex items-center justify-center w-5 h-5">
              <Lucide icon='Zap' className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </span>
          </button>
          {userData?.company === 'Juta Software' && (
        <button 
          className="p-2 m-0 !box ml-2" 
          onClick={handleGenerateAIResponse}
          disabled={isGeneratingResponse}
        >
          <span className="flex items-center justify-center w-5 h-5">
            {isGeneratingResponse ? (
              <Lucide icon="Loader" className="w-5 h-5 text-gray-800 dark:text-gray-200 animate-spin" />
            ) : (
              <Lucide icon="Sparkles" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            )}
          </span>
        </button>
      )}
          <textarea
            ref={textareaRef}
            className={`flex-grow h-10 px-2 py-2 m-1 ml-2 border rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden ${
              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400'
            } border-gray-300 dark:border-gray-700`}
            placeholder={messageMode === 'privateNote' ? "Type a private note..." : "Type a message..."}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              adjustHeight(e.target);
              const lastAtSymbolIndex = e.target.value.lastIndexOf('@');
              if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex === e.target.value.length - 1) {
                setIsPrivateNotesMentionOpen(true);
                console.log('Private note mention open');
              } else {
                setIsPrivateNotesMentionOpen(false);
              }
              if (e.target.value === '\\') {
                handleQR();
                setNewMessage('');
              }
              // Update this condition for quick reply search
              if (e.target.value.startsWith('/')) {
                setIsQuickRepliesOpen(true);
                setQuickReplyFilter(e.target.value.slice(1));
              } else {
                setIsQuickRepliesOpen(false);
                setQuickReplyFilter('');
              }
            }}
            rows={1}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            onKeyDown={(e) => {
              const target = e.target as HTMLTextAreaElement;
              const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    e.preventDefault();
                    setNewMessage((prev) => prev + '\n');
                  } else {
                    e.preventDefault();
                    if (selectedIcon === 'ws') {
                      if (messageMode !== 'privateNote') {
                        handleSendMessage();
                      } else {
                        handleAddPrivateNote(newMessage);
                      }
                    } else {
                      sendTextMessage(selectedContact.id, newMessage, selectedContact);
                    }
                    setNewMessage('');
                    adjustHeight(target, true); // Reset height after sending message
                  }
                }
              };
              handleKeyDown(e);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  const blob = item.getAsFile();
                  if (blob) {
                    const fileType = getFileTypeFromMimeType(item.type);
                    if (fileType === 'Unknown') {
                      console.warn('Unsupported file type:', item.type);
                      continue;
                    }
            
                    const url = URL.createObjectURL(blob);
                    if (['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'].includes(fileType)) {
                      setPastedImageUrl(url);
                      setImageModalOpen2(true);
                    } else {
                      setSelectedDocument(blob);
                      setDocumentModalOpen(true);
                    }
                    return;
                  }
                }
              }
              const text = e.clipboardData?.getData('text');
              if (text) {
                setNewMessage((prev) => prev + text);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
            
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const file = files[0];
                const fileType = getFileTypeFromMimeType(file.type);
                if (fileType === 'Unknown') {
                  console.warn('Unsupported file type:', file.type);
                  return;
                }
            
                const url = URL.createObjectURL(file);
                if (['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'].includes(fileType)) {
                  setPastedImageUrl(url);
                  setImageModalOpen2(true);
                } else {
                  setSelectedDocument(file);
                  setDocumentModalOpen(true);
                }
              }
            }}
            disabled={userRole === "3"}
          />
          {isQuickRepliesOpen && (
            <div ref={quickRepliesRef} className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-gray-100 dark:bg-gray-800 p-2 rounded-md shadow-lg mt-2 z-10">
            <div className="flex justify-between mb-4">
              <button
                className={`px-4 py-2 rounded-lg ${
                  activeQuickReplyTab === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveQuickReplyTab('all')}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-lg ${
                  activeQuickReplyTab === 'self'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveQuickReplyTab('self')}
              >
                Self
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {quickReplies
                .filter(reply => 
                  activeQuickReplyTab === 'all' || reply.type === 'self'
                )
                .filter(reply => 
                  reply.keyword.toLowerCase().includes(quickReplyFilter.toLowerCase()) ||
                  reply.text.toLowerCase().includes(quickReplyFilter.toLowerCase())
                )
                .sort((a, b) => a.keyword.localeCompare(b.keyword))
                .map(reply => (
                  <div key={reply.id} className="flex items-center justify-between mb-2 dark:bg-gray-800">
                    {editingReply?.id === reply.id ? (
                      <>
                        <input
                          className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                          value={editingReply.keyword}
                          onChange={(e) => setEditingReply({ ...editingReply, keyword: e.target.value })}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        />
                        <textarea
                          className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                          value={editingReply.text}
                          onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                          placeholder="Text"
                          rows={1}
                        />
                        <button className="p-2 m-1 !box" onClick={() => updateQuickReply(reply.id, editingReply.keyword, editingReply.text, editingReply.type as "all" | "self")}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Save" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 m-2">
                        {reply.keyword}
                      </span>
                      <span
                        className="px-2 py-1 flex-grow text-lg cursor-pointer text-gray-800 dark:text-gray-200"
                        onClick={() => {
                          handleQRClick(reply.keyword);
                          setNewMessage(reply.text);
                          if (reply.document) {
                            setSelectedDocument(reply.document);
                          }
                        }}
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {reply.text}
                      </span>
                      {reply.document ? (
                        <a href={reply.document} target="_blank" className="p-2 m-1 !box">
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="File" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                          </span>
                        </a>
                      ) : null}
                      <div>
                        <button className="p-2 m-1 !box" onClick={() => setEditingReply(reply)}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Eye" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                          </span>
                        </button>
                        <button className="p-2 m-1 !box text-red-500 dark:text-red-400" onClick={() => deleteQuickReply(reply.id, reply.type as "all" | "self")}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Trash" className="w-5 h-5" />
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center mb-4">
          {(newMessage === '/' || isQuickRepliesOpen) && !quickReplyFilter && (
            <>
              <input
                className="flex-grow px-1 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                placeholder="Add new keyword"
                value={newQuickReplyKeyword}
                onChange={(e) => setNewQuickReplyKeyword(e.target.value)}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}
              />
              <textarea
                className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                placeholder="Add new quick reply"
                value={newQuickReply}
                onChange={(e) => setNewQuickReply(e.target.value)}
                rows={1}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}
              />
              {/* Document Upload 
              <input
                type="file"
                className="hidden"
                id="quickReplyFile"
                onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="quickReplyFile" className="p-2 m-1 !box cursor-pointer">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Paperclip" className="w-5 h-5 text-gray-800 dark:text-gray-200" />  
                </span>
              </label>   */}
            </>
          )}
          <div className="flex flex-col ml-2">
            {!quickReplyFilter && (
              <button className="p-2 m-1 !box" onClick={addQuickReply}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Plus" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    )}
        </div>
        {isEmojiPickerOpen && (
          <div className="absolute bottom-20 left-2 z-10">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="hidden md:flex flex-col w-full h-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 items-center justify-center">
      <div className="flex flex-col items-center justify-center p-8 rounded-lg shadow-lg bg-gray-100 dark:bg-gray-700">
        <Lucide icon="MessageSquare" className="w-16 h-16 text-blue-500 dark:text-blue-400 mb-4" />
        <p className="text-gray-700 dark:text-gray-300 text-lg text-center mb-6">Select a chat to start messaging</p>
        <button
          onClick={openNewChatModal}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          Start New Chat
        </button>
      </div>
    </div>
  )}
</div>

{selectedMessages.length > 0 && (
  <div className="fixed bottom-16 right-2 md:right-10 space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
    <button
      className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={() => setIsForwardDialogOpen(true)}>
      Forward
    </button>
    <button
      className="bg-red-800 dark:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={openDeletePopup}>
      Delete
    </button>
    <button
      className="bg-gray-700 dark:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={() => setSelectedMessages([])}
      onKeyDown={handleKeyDown}>
      Cancel
    </button>
  </div>
)}
{isNewChatModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Start New Chat</h2>
      <div className="mb-4">
        <label htmlFor="newContactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Enter contact number (include country code)
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
            +
          </span>
          <input
            type="text"
            id="newContactNumber"
            value={newContactNumber}
            onChange={(e) => setNewContactNumber(e.target.value)}
            placeholder="60123456789"
            className="w-full p-2 pl-6 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
          />
        </div>
      
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={closeNewChatModal}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateNewChat}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
        >
          Start Chat
        </button>
      </div>
    </div>
  </div>
)}
{isTabOpen && (
  <div className="absolute top-0 right-0 h-full w-full md:w-1/4 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto z-50 shadow-lg transition-all duration-300 ease-in-out">
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
        <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white">
  {selectedContact.profilePicUrl ? (
    <img 
      src={selectedContact.profilePicUrl} 
      alt={selectedContact.contactName || "Profile"} 
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="text-2xl font-bold">
      {selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}
    </span>
  )}
</div>
          <div className="flex flex-col">
            {isEditing ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="font-semibold bg-transparent text-gray-800 dark:text-gray-200 capitalize border-b-2 border-primary dark:border-primary-400 focus:outline-none focus:border-primary-600 dark:focus:border-primary-300 mr-2 px-1 py-0.5 transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  onClick={handleSave}
                  className="p-1 bg-primary hover:bg-primary-600 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <Lucide icon="Save" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                className="font-semibold text-gray-800 dark:text-gray-200 capitalize cursor-pointer hover:text-primary dark:hover:text-primary-400 transition-colors duration-200 flex items-center group"
                onClick={() => setIsEditing(true)}
              >
                <span>{selectedContact?.contactName || selectedContact?.firstName || selectedContact?.phone || ''}</span>
                <Lucide icon="Pencil" className="w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}
            {userRole === '1' && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.phone}</span>
            )}
          </div>
        </div>
        <button onClick={handleEyeClick} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-all duration-200">
          <Lucide icon="X" className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Contact Information</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "First Name", value: selectedContact.contactName ?? selectedContact.firstName },
                { label: "Last Name", value: selectedContact.lastName },
                { label: "Email", value: selectedContact.email },
                { label: "Company", value: selectedContact.companyName },
                { label: "Address", value: selectedContact.address1 },
                { label: "Website", value: selectedContact.website }
              ].map((item, index) => (
                <div key={index} className="col-span-1">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-gray-800 dark:text-gray-200">{item.value || 'N/A'}</p>
                </div>
              ))}      
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 mt-4 pt-4"></div>
            {selectedContact.tags.some((tag: string) => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())) && (
                    <div className="w-full">
                      <h4 className="font-semibold text-gray-500 dark:text-gray-400 inline-block mr-2">Employees Assigned:</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedContact.tags
                          .filter((tag: string) => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()))
                          .map((employeeTag: string, index: number) => (
                            <div key={index} className="inline-flex items-center bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-sm font-semibold px-3 py-1 rounded-full border border-green-400 dark:border-green-600">
                              <span>{employeeTag}</span>
                              <button
                                className="ml-2 focus:outline-none"
                                onClick={() => handleRemoveTag(selectedContact.id, employeeTag)}
                              >
                                <Lucide icon="X" className="w-4 h-4 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="bg-indigo-50 dark:bg-indigo-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tags</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {selectedContact && selectedContact.tags && selectedContact.tags.length > 0 ? (
                <>
                  {selectedContact.tags
                    .filter((tag: string) => !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()))
                    .map((tag: string, index: number) => (
                      <div key={index} className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded-full border border-blue-400 dark:border-blue-600">
                        <span>{tag}</span>
                        <button
                          className="ml-2 focus:outline-none"
                          onClick={() => handleRemoveTag(selectedContact.id, tag)}
                        >
                          <Lucide icon="X" className="w-4 h-4 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100" />
                        </button>
                      </div>
                    ))}
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No tags assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
 {isMessageSearchOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={() => {
        setIsMessageSearchOpen(false);
        setMessageSearchQuery('');
      }}
    >
      <div 
        className="absolute top-16 right-0 w-full md:w-1/3 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 p-4 shadow-lg z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={messageSearchInputRef}
          type="text"
          placeholder="Search messages..."
          value={messageSearchQuery}
          onChange={handleMessageSearchChange}
          className="w-full border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <div className="mt-4 max-h-96 overflow-y-auto">
          {messageSearchResults.map((result) => (
            <div 
              key={result.id} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              onClick={() => scrollToMessage(result.id)}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.from_me ? 'You' : (selectedContact.contactName || selectedContact.firstName || result.from.split('@')[0])}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                {result.text.body.length > 100 
                  ? result.text.body.substring(0, 100) + '...' 
                  : result.text.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

<DocumentModal 
  isOpen={documentModalOpen} 
  onClose={() => setDocumentModalOpen(false)} 
  document={selectedDocument} 
  onSend={sendDocument} 
/>
      <ImageModal isOpen={isImageModalOpen} onClose={closeImageModal} imageUrl={modalImageUrl} />
      <ImageModal2 isOpen={isImageModalOpen2} onClose={() => setImageModalOpen2(false)} imageUrl={pastedImageUrl} onSend={sendImage} />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <ContextMenu id="contact-context-menu">
        <Item onClick={({ props }) => markAsUnread(props.contact)}>
          Mark as Unread
        </Item>
        <Separator />
        <Item 
          onClick={({ props }) => props.isSnooze ? props.onUnsnooze(props.contact) : props.onSnooze(props.contact)}
        >
          Snooze/Unsnooze
        </Item>
      </ContextMenu>
      {isReminderModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsReminderModalOpen(false)}>
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Set Reminder</h2>
      <textarea
        placeholder="Enter reminder message..."
        className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 mb-4"
        rows={3}
        onChange={(e) => setReminderText(e.target.value)}
        value={reminderText}
      />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reminder Date and Time
        </label>
        <DatePicker
          selected={reminderDate}
          onChange={(date: Date) => setReminderDate(date)}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
          placeholderText="Select date and time"
        />
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={() => {
            setIsReminderModalOpen(false);
            setReminderText('');
          }}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSetReminder(reminderText)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
        >
          Set Reminder
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};
interface ImageModalProps2 {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSend: (url: string | null, caption: string) => void;
}

const ImageModal2: React.FC<ImageModalProps2> = ({ isOpen, onClose, imageUrl, onSend }) => {
  const [caption, setCaption] = useState('');


  const handleSendClick = () => {
    setCaption('');
    onSend(imageUrl, caption);
   onClose(); // Close the modal after sending
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400 bg-opacity-75" onClick={onClose}>
      <div
        className="relative bg-slate-400 dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-[90vh] md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
                      <button
            className="text-black hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-400"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-400 dark:bg-gray-800 p-4 rounded-lg mb-4 flex justify-center items-center" style={{ height: '70%' }}>
          <img
            src={imageUrl}
            alt="Modal Content"
            className="rounded-md"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        <div className="flex items-center bg-slate-500 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-primary dark:bg-blue-600 text-white p-2 rounded-lg"
            onClick={handleSendClick}
                      >
                        <Lucide icon="Send" className="w-5 h-5" />
                      </button>
         
                  </div>
                </div>
              </div>
  );
};

export default Main;