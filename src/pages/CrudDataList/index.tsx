import _ from "lodash";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Dialog, Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import axios from "axios";
// Assuming 'app' is your Firebase app instance
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

const auth = getAuth(app);
const firestore = getFirestore(app);
let companyId='014';
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  refresh_token:'',
};

// Example usage:
interface Contact {
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string | null;
  businessId: string | null;
  city: string | null;
  companyName: string | null;
  contactName: string;
  country: string;
  customFields: any[]; // Adjust the type if custom fields have a specific structure
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any; // Adjust the type if DND settings have a specific structure
  email: string | null;
  firstName: string;
  followers: string[]; // Assuming followers are represented by user IDs
  id: string;
  lastName: string;
  locationId: string;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[]; // Assuming tags are strings
  type: string;
  website: string | null;
  // Add more properties as needed
}
interface Employee {
  id: string;
  name: string;
  role: string;
  // Add other properties as needed
}
function Main() {
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false); // Loading state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  async function refreshAccessToken() {
    const encodedParams = new URLSearchParams();
    encodedParams.set('client_id', ghlConfig.ghl_id);
    encodedParams.set('client_secret', ghlConfig.ghl_secret);
    encodedParams.set('grant_type', 'refresh_token');
    encodedParams.set('refresh_token', ghlConfig.refresh_token);
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

    return newTokenData;
  }
  const toggleContactSelection = (contact: Contact) => {
    const isSelected = selectedContacts.some((c) => c.id === contact.id);
    if (isSelected) {
      // If selected, remove it from the selectedContacts array
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      // If not selected, add it to the selectedContacts array
      setSelectedContacts([...selectedContacts, contact]);
    }
   
  };
  

  const isContactSelected = (contact: Contact) => {
    return selectedContacts.some((c) => c.id === contact.id);
  };
  async function fetchCompanyData() {
    const user = auth.currentUser;
 
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
     
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
 
      // Assuming ghlConfig, setToken, and fetchChatsWithRetry are defined elsewhere
  ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };

      // Assuming refreshAccessToken is defined elsewhere
      const newTokenData = await refreshAccessToken();
  console.log(newTokenData)
      // Update Firestore document with new token data
      await setDoc(doc(firestore, 'companies', companyId), {
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
      }, { merge: true });
      await searchContacts(newTokenData.access_token,newTokenData.locationId);
    
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });
console.log(employeeListData);
setEmployeeList(employeeListData);

    } catch (error) {
      console.error('Error fetching company data:', error);
    }

  }
  const handleAddTagToSelectedContacts = async (selectedEmployee:string) => {
    const user = auth.currentUser;
 
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      // Assuming ghlConfig, setToken, and fetchChatsWithRetry are defined elsewhere
  ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };
      // Assuming refreshAccessToken is defined elsewhere
      const newTokenData = await refreshAccessToken();
  console.log(newTokenData)
      // Update Firestore document with new token data
      await setDoc(doc(firestore, 'companies', companyId), {
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
      }, { merge: true });
    if (selectedEmployee) {
      const tagName = selectedEmployee;
      const selectedContactsCopy = [...selectedContacts];// Copy selectedContacts array
   

      // Loop through each selected contact and add the tag
      for (const contact of selectedContactsCopy) {
        const success = await updateContactTags(contact.id, newTokenData.access_token, [tagName]);
     
        if (!success) {
          console.error(`Failed to add tag "${tagName}" to contact with ID ${contact.id}`);
        }else{
          console.log(`Tag "${tagName}" added to contact with ID ${contact.id}`);
   
        }
      }
      await searchContacts(newTokenData.access_token,newTokenData.locationId);

    }
  };
  async function updateContactTags(contactId: any, accessToken: any, tags: any) {
    try {
        const options = {
            method: 'PUT',
            url: `https://services.leadconnectorhq.com/contacts/${contactId}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Version: '2021-07-28',
                'Content-Type': 'application/json'
            },
            data: {
                tags: tags
            }
        };

        const response = await axios.request(options);
console.log(response);
        if (response.status === 200) {
            console.log('Contact tags updated successfully');
            return true;
        } else {
            console.error('Failed to update contact tags:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error updating contact tags:', error);
        return false;
    }
}

  async function searchContacts(accessToken: any, locationId: any) {
    setLoading(true);
    try {
        let allContacts: any[] = [];
        let page = 1;

        while (true) {
            const options = {
                method: 'GET',
                url: 'https://services.leadconnectorhq.com/contacts/',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Version: '2021-07-28',
                },
                params: {
                    locationId: locationId,
                    page: page
                }
            };

            const response = await axios.request(options);
            console.log('Search Conversation Response:', response.data);

            const contacts = response.data.contacts;

            // Concatenate contacts to allContacts array
            allContacts = [...allContacts, ...contacts];
     
            if (contacts.length === 0) {
                // If no contacts received in the current page, we've reached the end
                break;
            }

            // Increment page for the next request
            page++;
        }

        // Filter contacts where phone number is not null
        const filteredContacts = allContacts.filter(contact => contact.phone !== null);

        setContacts(filteredContacts);
        setLoading(false);
        console.log('Search Conversation Response:', filteredContacts);
    } catch (error) {
        console.error('Error searching conversation:', error);
    }
}

  useEffect(() => {
    fetchCompanyData();
  }, []);
  return (
    <>
     
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap">
        
       
         
          <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
            <div className="relative w-56 text-slate-500">
              <FormInput
                type="text"
                className="w-56 pr-10 !box"
                placeholder="Search..."
              />
              <Lucide
                icon="Search"
                className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
              />
            </div>
            
          </div>
          <Menu>
  <Menu.Button as={Button} className="px-2 !box">
    <span className="flex items-center justify-center w-5 h-5">
      <Lucide icon="Forward" className="w-4 h-4" />
    </span>
  </Menu.Button>
  <Menu.Items className="w-40">
    {employeeList.map((employee) => (
      <Menu.Item key={employee.id}>
        <span
          className="flex items-center"
          onClick={() => handleAddTagToSelectedContacts(employee.name)}
        >
          <Lucide icon="User" className="w-4 h-4 mr-2" />
          {employee.name}
        </span>
      </Menu.Item>
    ))}
  </Menu.Items>
</Menu>
        </div>
        {/* BEGIN: Data List */}

        <div className="col-span-12 overflow-auto intro-y lg:overflow-visible">
          <Table className="border-spacing-y-[10px] border-separate -mt-2">
          <Table.Tbody>
  {contacts.map((contact, index) => (
    <Table.Tr 
      key={index} 
      className={`intro-x ${isContactSelected(contact) ? 'bg-blue-800' : ''}`}
      onClick={(event) => {
        toggleContactSelection(contact);
      }}
    >
      <Table.Td 
        className={clsx(
          "box rounded-l-none rounded-r-none border-x-0 shadow-[5px_3px_5px_#00000005]",
          {
            'bg-gray-300': isContactSelected(contact), // Change to your desired color class when selected
            'first:rounded-l-[0.6rem] first:border-l last:rounded-r-[0.6rem] last:border-r dark:bg-darkmode-600':
              true, // Keep other classes unchanged
          }
        )}
      >
        <div className="font-medium whitespace-nowrap">{contact.firstName ?? "No Name"}</div>
        <div className="text-slate-500 text-xs whitespace-nowrap mt-0.5">
          {/* Additional contact info if needed */}
        </div>
      </Table.Td>
      <Table.Td 
        className={clsx(
          "box rounded-l-none rounded-r-none border-x-0 text-center shadow-[5px_3px_5px_#00000005]",
          {
            'bg-gray-300': isContactSelected(contact), // Change to your desired color class when selected
            'first:rounded-l-[0.6rem] first:border-l last:rounded-r-[0.6rem] last:border-r dark:bg-darkmode-600':
              true, // Keep other classes unchanged
          }
        )}
      >
        {contact.phone}
      </Table.Td>
      <Table.Td 
        className={clsx(
          "box rounded-l-none rounded-r-none border-x-0 text-center shadow-[5px_3px_5px_#00000005]",
          {
            'bg-gray-300': isContactSelected(contact), // Change to your desired color class when selected
            'first:rounded-l-[0.6rem] first:border-l last:rounded-r-[0.6rem] last:border-r dark:bg-darkmode-600':
              true, // Keep other classes unchanged
          }
        )}
      >
        {contact.tags && contact.tags.length > 0 ? contact.tags.filter(tag => employeeList.some(employee => employee.name === tag)).join(', ') : "Unassigned"}
      </Table.Td>
    </Table.Tr>
  ))}
</Table.Tbody>
          </Table>
        </div>
        {/* END: Data List */}
        {/* BEGIN: Pagination */}
   
        {/* END: Pagination */}
      </div>
      {/* BEGIN: Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmationModal}
        onClose={() => {
          setDeleteConfirmationModal(false);
        }}
        initialFocus={deleteButtonRef}
      >
        <Dialog.Panel>
          <div className="p-5 text-center">
            <Lucide
              icon="XCircle"
              className="w-16 h-16 mx-auto mt-3 text-danger"
            />
            <div className="mt-5 text-3xl">Are you sure?</div>
            <div className="mt-2 text-slate-500">
              Do you really want to delete these records? <br />
              This process cannot be undone.
            </div>
          </div>
          <div className="px-5 pb-8 text-center">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => {
                setDeleteConfirmationModal(false);
              }}
              className="w-24 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              className="w-24"
              ref={deleteButtonRef}
            >
              Delete
            </Button>
          </div>
          
        </Dialog.Panel>
      </Dialog>
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50 ">
          <div className=" items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
          <div role="status">
        <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
       
    </div>
  
          </div>
        </div>
      )}
      {/* END: Delete Confirmation Modal */}
    </>
  );
}

export default Main;
