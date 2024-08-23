import { ClassicEditor } from "@/components/Base/Ckeditor";

import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { FormInput, FormLabel } from "@/components/Base/Form";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from "firebase/auth";

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

function Main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState(["1"]);
  const [groups, setGroups] = useState<string[]>([]);
  const location = useLocation();
  const { contactId, contact } = location.state ?? {};

  const [companyId, setCompanyId] = useState("");
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'user', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCompanyId(userData.companyId);
            console.log("Fetched companyId:", userData.companyId);
          } else {
            console.log("No user document found");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.log("No user signed in");
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  useEffect(() => {
    if (companyId) {
      fetchGroups();
    }
  }, [companyId]);

  const [userData, setUserData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: "",
    group: "",
    employeeId: "",
    notes: "",
  });

  useEffect(() => {
    if (contact) {
      setUserData({
        name: contact.name || "",
        phoneNumber: contact.phoneNumber ? contact.phoneNumber.split('+6')[1] ?? "" : "",
        email: contact.id || "",
        password: "",
        role: contact.role || "",
        companyId: companyId || "",
        group: contact.group || "",
        employeeId: contact.employeeId || "",
        notes: contact.notes || ""
      });
      setCategories([contact.role]);
    }
    fetchGroups();
  }, [contact, companyId]);

  const fetchGroups = async () => {
    if (!companyId) {
      console.log("No companyId available");
      return;
    }
    console.log("Fetching groups for company:", companyId);
    try {
      const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeCollectionRef);
      const uniqueGroups = new Set<string>();
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.group) {
          uniqueGroups.add(data.group);
        }
      });
      const groupsArray = Array.from(uniqueGroups);
      console.log("Fetched groups:", groupsArray);
      setGroups(groupsArray);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNewGroup = () => {
    setIsAddingNewGroup(true);
  };

  const handleCancelNewGroup = () => {
    setIsAddingNewGroup(false);
    setNewGroup("");
  };

  const handleSaveNewGroup = () => {
    if (newGroup.trim()) {
      setGroups(prev => [...prev, newGroup.trim()]);
      setUserData(prev => ({ ...prev, group: newGroup.trim() }));
      setIsAddingNewGroup(false);
      setNewGroup("");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleEditorChange = (data: string) => {
    setUserData(prev => ({ ...prev, notes: data }));
  };

  const saveUser = async () => {
    try {
      setIsLoading(true);
      const userOri = auth.currentUser;
      if (!userOri || !userOri.email) {
        throw new Error("No authenticated user found");
      }

      const docUserRef = doc(firestore, 'user', userOri.email);
      const docUserSnapshot = await getDoc(docUserRef);
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser!.companyId;
      const company = dataUser!.company;

      const formatPhoneNumber = (phoneNumber: string) => {
        return phoneNumber && !phoneNumber.startsWith('+') ? "+6" + phoneNumber : phoneNumber;
      };

      const userDataToSend = {
        name: userData.name,
        phoneNumber: formatPhoneNumber(userData.phoneNumber),
        email: userData.email,
        role: userData.role,
        companyId: companyId,
        company: company,
        group: userData.group,
        employeeId: userData.employeeId || null,
        notes: userData.notes || null
      };

      if (contactId) {
        // Updating existing user
        await updateDoc(doc(firestore, `companies/${companyId}/employee`, contactId), userDataToSend);
        await updateDoc(doc(firestore, 'user', userData.email), userDataToSend);
        toast.success("User updated successfully");
      } else {
        // Adding new user
        const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/create-user/${userData.email}/${formatPhoneNumber(userData.phoneNumber)}/${userData.password}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        const responseData = await response.json();
        
        if (responseData.message === 'User created successfully') {
          await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
          await setDoc(doc(firestore, `companies/${companyId}/employee`, userData.email), userDataToSend);
          toast.success("User created successfully");
          setUserData({
            name: "",
            phoneNumber: "",
            email: "",
            password: "",
            role: "",
            companyId: "",
            group: "",
            employeeId: "",
            notes: ""
          });
        } else {
          throw new Error(responseData.error);
        }
      }

      setSuccessMessage(contactId ? "User updated successfully" : "User created successfully");
      setErrorMessage('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error saving user:", error);
      setErrorMessage('An error occurred while saving the user');
      setIsLoading(false);
    }
  };

  const editorConfig = {
    toolbar: {
      items: [
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "insertTable",
        "undo",
        "redo",
        "heading",
        "alignment",
        "fontColor",
        "fontSize",
      ],
    },
  };

  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <div className="flex items-center mt-5 intro-y">
        <h2 className="mr-auto text-lg font-semibold">
          {contactId ? "Update User" : "Add User"}
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-6 mt-2">
        <div className="col-span-12 intro-y lg:col-span-6">
          <div className="p-5 intro-y box">
            <div>
              <FormInput
                name="name"
                type="text"
                value={userData.name}
                onChange={handleChange}
                placeholder="Name"
              />
            </div>
            <div className="mt-3 flex shrink items-center">
              <FormInput
                type="text"
                value="+6"
                readOnly
                className="w-12 mr-2"
              />
              <FormInput
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
                className="flex-grow"
              />
            </div>
            <div className="mt-3">
              <FormInput
                name="email"
                type="text"
                value={userData.email}
                onChange={handleChange}
                placeholder="Email"
                readOnly={!!contactId}
              />
            </div>
            <div className="mt-3">
            <FormLabel htmlFor="group">Group</FormLabel>
            {isAddingNewGroup ? (
              <div className="flex items-center">
                <FormInput
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Enter new group name"
                  className="w-full mr-2"
                />
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="mr-2"
                  onClick={handleCancelNewGroup}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveNewGroup}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <select
                  id="group"
                  name="group"
                  value={userData.group}
                  onChange={handleChange}
                  className="text-black dark:text-white-dark border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full mr-2 p-2.5"
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={handleAddNewGroup}
                  className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 inline-flex items-center whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add New Group
                </Button>
              </div>
            )}
          </div>
            <div className="mt-3">
            <FormLabel htmlFor="crud-form-2" className="dark:text-gray-200">Role</FormLabel>
              <select
              id="crud-form-2"
              name="role"
              value={userData.role}
              onChange={(e) => {
                handleChange(e);
                setCategories([e.target.value]);
              }}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
            >
              <option value="1">Admin</option>
              <option value="2">Sales</option>
              <option value="3">Observer</option>
              <option value="4">Others</option>
            </select>

            </div>
            <div className="mt-3">
              <FormInput
                name="password"
                type="password"
                value={userData.password}
                onChange={handleChange}
                placeholder="Password"
              />
            </div>
            <div className="mt-3">
              <FormInput
                name="employeeId"
                type="text"
                value={userData.employeeId}
                onChange={handleChange}
                placeholder="Employee ID (optional)"
              />
            </div>
            <div className="mt-2">
              <div className="relative rounded-lg focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:border-transparent">
                <ClassicEditor
                  value={userData.notes}
                  onChange={handleEditorChange}
                  config={editorConfig}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                />
                <div className="absolute top-2 right-2">
                  <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {errorMessage && <div className="text-red-500">{errorMessage}</div>}
            {successMessage && <div className="text-green-500">{successMessage}</div>}
            <div className="mt-5 text-right">
              <Button
                type="button"
                variant="outline-secondary"
                className="w-24 mr-1"
                onClick={handleGoBack}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="w-24"
                onClick={async () => {
                  try {
                    await saveUser();
                    toast.success("User saved successfully");
                    handleGoBack();
                  } catch (error) {
                    console.error("Error saving user:", error);
                    toast.error("Failed to save user");
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Main;