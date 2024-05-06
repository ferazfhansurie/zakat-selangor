import { ClassicEditor } from "@/components/Base/Ckeditor";
import TomSelect from "@/components/Base/TomSelect";
import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/Base/Button";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, getDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';

import {
  FormInput,
  FormLabel,
  FormSwitch,
  InputGroup,
} from "@/components/Base/Form";
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
const [categories, setCategories] = useState(["1"]);
  const [userData, setUserData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role:"",
    companyId:""
  });
  let companyId='014';
  let ghlConfig ={
    ghl_id:'',
    ghl_secret:'',
    refresh_token:'',
  };
  useEffect(() => {
    fetchCompanyData();
  }, []);
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
  console.log(companyId);
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
      const docEmployeeRef = doc(firestore,`companies/${companyId}/employee`);
      const docEmployeeSnapshot = await getDoc(docEmployeeRef);
      if (!docEmployeeSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const employeeData = docEmployeeSnapshot.data();
    console.log(employeeData);
   
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }
  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData((prevUserData) => ({
      ...prevUserData,
      [name]: value
    }));
  };

  const saveUser = async () => {
    try {
      setIsLoading(true); // Set isLoading to true before user creation
      const userOri = auth.currentUser;
      const docUserRef = doc(firestore, 'user', userOri?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      
      if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
      } else {
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser.companyId;
  
        // Prepare user data to be sent to the server
        const userDataToSend = {
          name: userData.name,
          phoneNumber: userData.phoneNumber,
          email: userData.email,
          role: categories,
          companyId: companyId
          // Add any other required fields here
        };
  
        // Make API call to create user
        const response = await fetch(`https://buds-359313.et.r.appspot.com/api/create-user/${userData.email}/+60${userData.phoneNumber}/${userData.password}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
        });
  
        if (!response.ok) {
          throw new Error('Failed to create user');
        }
  
        // Parse response data if needed
        const responseData = await response.json();
  console.log("respon"+responseData);
        // Handle success response
        await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
        await setDoc(doc(firestore,  `companies/${companyId}/employee`, userData.email), userDataToSend);
        console.log("User created successfully");
   
        setUserData({
          name: "",
          phoneNumber: "",
          email: "",
          password: "",
          role: "",
          companyId: ""
        }); // Clear form fields after successful user creation
      }
  
      setIsLoading(false); // Set isLoading to false after successful user creation
    } catch (error) {
      console.error("Error creating user:", error);
      setErrorMessage('An error occurred while creating the user. Please try again.');
      setIsLoading(false); // Set isLoading to false if an error occurs
    }
  };
  const editorConfig = {
    toolbar: {
      items: ["bold", "italic", "link"],
    },
  };
  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);
  return (
    <>
      <div className="flex items-center mt-8 intro-y">
        <h2 className="mr-auto text-lg font-medium">Add User</h2>
      </div>
      <div className="grid grid-cols-12 gap-6 mt-5">
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
            <div className="mt-3">
            <span className="ml-1">+60</span>
              <FormInput
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
              />
            </div>
            <div className="mt-3">
              <FormInput
                name="email"
                type="text"
                value={userData.email}
                onChange={handleChange}
                placeholder="Email"
              />
            </div>
            <div className="mt-3">
    <FormLabel htmlFor="crud-form-2">Role</FormLabel>
    <TomSelect
        id="crud-form-2"
        value={categories}
        onChange={setCategories}
        className="w-full"
    >
        <option value="1">Admin</option>
        <option value="2">Sales</option>
        <option value="3">Others</option>
    </TomSelect>
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
            <div className="mt-5 text-right">
              <Button
                type="button"
                variant="outline-secondary"
                className="w-24 mr-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="w-24"
                onClick={saveUser} // Call saveUser function on button click
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
