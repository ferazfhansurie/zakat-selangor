import _ from "lodash";
import clsx from "clsx";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState, useMemo, useCallback } from "react";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import ReportDonutChart from "@/components/ReportDonutChart";
import ReportLineChart from "@/components/ReportLineChart";
import ReportPieChart from "@/components/ReportPieChart";
import ReportDonutChart1 from "@/components/ReportDonutChart1";
import SimpleLineChart1 from "@/components/SimpleLineChart1";
import LeafletMap from "@/components/LeafletMap";
import { Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import axios from 'axios';
import { getFirebaseToken, messaging } from "../../firebaseconfig";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentData, DocumentReference, getDoc,where, query, limit,getDocs, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getFirestore, collection, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { onMessage } from "firebase/messaging";
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ChartData, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User, ChevronRight } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay, eachHourOfInterval, eachDayOfInterval } from 'date-fns';


// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

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

export const updateMonthlyAssignments = async (employeeName: string, incrementValue: number) => {
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

    // Check if the employee exists
    const employeeRef = doc(firestore, 'companies', companyId, 'employee', employeeName);
    const employeeDoc = await getDoc(employeeRef);

    if (!employeeDoc.exists()) {
      console.error(`Employee ${employeeName} does not exist`);
      return;
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Update existing employee document
    await updateDoc(employeeRef, {
      assignedContacts: increment(incrementValue)
    });

    // Update or create the monthly assignment document
    const monthlyAssignmentRef = doc(employeeRef, 'monthlyAssignments', currentMonthKey);
    await setDoc(monthlyAssignmentRef, {
      assignments: increment(incrementValue),
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log(`Updated monthly assignments for employee ${employeeName}`);
  } catch (error) {
    console.error('Error updating monthly assignments:', error);
  }
};

let companyId = "";
let total_contacts = 0;
let role = 2;

function EmployeeSearch({ 
  employees,
  onSelect,
  currentUser
}: {
  employees: Array<{ id: string; name: string; assignedContacts?: number }>;
  onSelect: (employee: { id: string; name: string; assignedContacts?: number }) => void;
  currentUser: { id: string } | null;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: { target: Node | null; }) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => document.removeEventListener("mousedown", handleClickOutside as EventListener);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <FormInput
        type="text"
        placeholder="Search employees..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full"
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                employee.id === currentUser?.id ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              onClick={() => {
                onSelect(employee);
                setIsOpen(false);
                setSearchQuery(employee.name);
              }}
            >
                           <span className="text-gray-900 dark:text-gray-100">{employee.name}</span>
                           <span className="text-gray-600 dark:text-gray-400"> ({employee.assignedContacts || 0} assigned contacts)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Main() {

  interface Contact {
    ic: string | null;
    additionalEmails: string[];
    address1: string | null;
    assignedTo: string | null;
    businessId: string | null;
    city: string | null;
    companyName: string | null;
    contactName: string;
    country: string;
    customFields: any[];
    dateAdded: string;
    dateOfBirth: string | null;
    dateUpdated: string;
    dnd: boolean;
    dndSettings: any;
    email: string | null;
    firstName: string;
    followers: string[];
    id: string;
    lastName: string;
    locationId: string;
    phone: string | null;
    postalCode: string | null;
    source: string | null;
    state: string | null;
    tags: string[];
    type: string;
    website: string | null;
    zakatData?: ZakatData[];
  }

  type ZakatType = 
  | 'Simpanan' 
  | 'PerniagaanOrganisasi' 
  | 'PerniagaanIndividu' 
  | 'Perak' 
  | 'Pendapatan' 
  | 'Pelaburan' 
  | 'Padi' 
  | 'KWSP' 
  | 'Fitrah' 
  | 'Emas' 
  | 'Ternakan' 
  | 'Qadha' 
  | 'Unknown';

  interface ZakatData {
    type: ZakatType;
    paymentStatus: string | null;
    paymentDate: string | null;
    paymentAmount: number | null;
    transactionId: string | null;
    entryDate: string | null;
    dateUpdated: string | null;
    sourceUrl: string | null;
    total: number | null;
    productName: string | null;
    productPrice: string | null;
    productQuantity: string | null;
    consent: string | null;
    consentText: string | null;
    consentDescription: string | null;
    createdBy: string | null;
    entryId: string | null;
    postId: string | null;
    userAgent: string | null;
    userIp: string | null;
    timestamp: Timestamp | null;
    
    // Type-specific fields
    totalSavings: number | null;
    businessProfit: number | null;
    companyName: string | null;
    ssmNumber: string | null;
    orgPhone: string | null;
    officerName: string | null;
    officerPhone: string | null;
    officeAddress: {
      street: string | null;
      addressLine2: string | null;
      city: string | null;
      state: string | null;
      postcode: string | null;
      country: string | null;
    } | null;
    silverValue: number | null;
    monthlyIncome: number | null;
    otherAnnualIncome: number | null;
    monthlyZakat: number | null;
    annualZakat: number | null;
    paymentOption: string | null;
    investmentTotal: number | null;
    year: string | null;
    epfAmount: number | null;
    riceType: string | null;
    dependents: number | null;
    goldValue: number | null;
    zakatAmount: number | null;
  }
  interface Employee {
    id: string;
    name: string;
    role: string;
    uid: string;
    email: string;
    assignedContacts: number;
    company: string;
    companyId: string;
    phoneNumber: string;
    monthlyAssignments?: { [key: string]: number };
    closedContacts?: number;
  }
  interface Appointment {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address: string;
    appointmentStatus: string;
    staff: string[];
    tags: Tag[];
    color: string;
    packageId: string | null;
    dateAdded: string;
    contacts: { id: string, name: string, session: number }[];
  }

interface Tag {
  id: string;
  name: string;
}
  const importantNotesRef = useRef<TinySliderElement>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { contacts: initialContacts} = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [closed, setClosed] = useState(0);
  const [unclosed, setUnclosed] = useState(0);
  const [numReplies, setReplies] = useState(0);
  const [abandoned, setAbandoned] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [contactsOverTime, setContactsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [contactsTimeFilter, setContactsTimeFilter] = useState<'today' | '7days' | '1month' | '3months' | 'all'>('7days');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [totalAppointments, setTotalAppointments] = useState(0);
  // Add these new state variables
  const [responseRate, setResponseRate] = useState(0);
  const [averageRepliesPerLead, setAverageRepliesPerLead] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  // Add this new state variable for the search query
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [monthlyTokens, setMonthlyTokens] = useState<number>(0);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [monthlySpendData, setMonthlySpendData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
    );
  }, [employees, employeeSearchQuery]);
  useEffect(() => {
    fetchMonthlyTokens();
  }, []);
  const [totalZakatAmount, setTotalZakatAmount] = useState<number>(0);
  const [totalContributors, setTotalContributors] = useState<number>(0);
  const [monthlyZakatAmount, setMonthlyZakatAmount] = useState<number>(0);
  const [avgZakatAmount, setAvgZakatAmount] = useState<number>(0);
  const [zakatTypeDistribution, setZakatTypeDistribution] = useState<ChartData<'doughnut'>>({
    labels: [],
    datasets: []
  });
  const [zakatTrends, setZakatTrends] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [timeFilter, setTimeFilter] = useState<'7days' | '1month' | '3months' | 'all'>('1month');
  const [paidZakat, setPaidZakat] = useState<number>(0);
  const [pendingZakat, setPendingZakat] = useState<number>(0);
  const [failedZakat, setFailedZakat] = useState<number>(0);
  const [collectionRate, setCollectionRate] = useState<number>(0);
  const [topContributors, setTopContributors] = useState<Array<{
    name: string;
    totalAmount: number;
    contributions: number;
  }>>([]);
  const [regionalDistribution, setRegionalDistribution] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: []
  });
  // Add these functions after your state declarations
const calculateZakatMetrics = async () => {
  try {
    const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsRef);
    
    let totalAmount = 0;
    let monthlyAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    
    // Initialize payment methods tracking
    const paymentMethods: { [key: string]: { count: number; amount: number } } = {
      'Tahunan': { count: 0, amount: 0 },
      'Bulanan': { count: 0, amount: 0 },
      'One-time': { count: 0, amount: 0 }
    };

    // Use Set to track unique contributors by IC
    const uniqueContributors = new Set<string>();
    
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Initialize type distribution
    const typeDistribution: { [key in ZakatType]: number } = {
      'Simpanan': 0,
      'PerniagaanOrganisasi': 0,
      'PerniagaanIndividu': 0,
      'Perak': 0,
      'Pendapatan': 0,
      'Pelaburan': 0,
      'Padi': 0,
      'KWSP': 0,
      'Fitrah': 0,
      'Emas': 0,
      'Ternakan': 0,
      'Qadha': 0,
      'Unknown': 0
    };
    
    contactsSnapshot.forEach((doc) => {
      const contactData = doc.data() as Contact;
      
      if (contactData.zakatData && contactData.zakatData.length > 0) {
        // Add to unique contributors if they have IC
        if (contactData.ic) {
          uniqueContributors.add(contactData.ic);
        }

        contactData.zakatData.forEach((zakatEntry) => {
          const amount = zakatEntry.zakatAmount || 0;
          const paymentOption = zakatEntry.paymentOption || 'One-time';
          
          // Count by payment status
          if (zakatEntry.paymentStatus === 'Paid') {
            paidCount++;
            totalAmount += amount;
            
            // Track payment method
            if (!paymentMethods[paymentOption]) {
              paymentMethods[paymentOption] = { count: 0, amount: 0 };
            }
            paymentMethods[paymentOption].count++;
            paymentMethods[paymentOption].amount += amount;

            // Track monthly amount
            if (zakatEntry.paymentDate) {
              const paymentDate = new Date(zakatEntry.paymentDate);
              if (paymentDate >= firstDayOfMonth) {
                monthlyAmount += amount;
              }
            }
          } else if (zakatEntry.paymentStatus === 'Failed') {
            failedCount++;
          } else  if (zakatEntry.paymentStatus === 'Processing'){
            pendingCount++;
          }
          
          // Count zakat types
          if (zakatEntry.type) {
            typeDistribution[zakatEntry.type as ZakatType]++;
          }
        });
      }
    });

    // Update states
    setTotalZakatAmount(totalAmount);
    setMonthlyZakatAmount(monthlyAmount);
    setTotalContributors(paidCount + pendingCount + failedCount); // Changed this line
    setAvgZakatAmount(uniqueContributors.size > 0 ? totalAmount / uniqueContributors.size : 0);
    setPaidZakat(paidCount);
    setPendingZakat(pendingCount);
    setFailedZakat(failedCount);
    setCollectionRate(paidCount + pendingCount + failedCount > 0 ? (paidCount / (paidCount + pendingCount + failedCount)) * 100 : 0);
    
    // Update payment method stats
    setPaymentMethodStats(
      Object.entries(paymentMethods)
        .filter(([_, stats]) => stats.count > 0)
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          amount: stats.amount
        }))
    );

    // Update zakat type distribution
    const activeTypes = Object.entries(typeDistribution)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    setZakatTypeDistribution({
      labels: activeTypes.map(([type]) => type),
      datasets: [{
        data: activeTypes.map(([_, count]) => count),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40', '#4BC0C0'
        ]
      }]
    });

  } catch (error) {
    console.error('Error calculating zakat metrics:', error);
  }
};
  const zakatTypeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, index: number) => {
                const count = data.datasets[0].data[index];
                return {
                  text: `${label} (${count})`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  hidden: false,
                  lineCap: undefined,
                  lineDash: undefined,
                  lineDashOffset: undefined,
                  lineJoin: undefined,
                  lineWidth: undefined,
                  strokeStyle: undefined,
                  pointStyle: 'circle',
                  rotation: undefined
                };
              });
            }
            return [];
          }
        }
      }
    }
  };
  const calculateZakatTrends = async () => {
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      // Create a map to store daily totals
      const dailyTotals = new Map<string, number>();
      
      // Determine date range based on timeFilter
      const now = new Date();
      let startDate = new Date();
      switch (timeFilter) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1); // Or your preferred start date
          break;
      }
  
      // Initialize all dates in range with 0
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyTotals.set(dateKey, 0);
      }
  
      // Aggregate zakat amounts by date
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data() as Contact;
        if (contactData.zakatData && contactData.zakatData.length > 0) {
          contactData.zakatData.forEach((zakatEntry) => {
            if (zakatEntry.paymentDate && zakatEntry.zakatAmount) {
              const paymentDate = new Date(zakatEntry.paymentDate);
              if (paymentDate >= startDate && paymentDate <= now) {
                const dateKey = paymentDate.toISOString().split('T')[0];
                const currentAmount = dailyTotals.get(dateKey) || 0;
                dailyTotals.set(dateKey, currentAmount + zakatEntry.zakatAmount);
              }
            }
          });
        }
      });
  
      // Convert to sorted arrays for chart
      const sortedDates = Array.from(dailyTotals.keys()).sort();
      const amounts = sortedDates.map(date => dailyTotals.get(date) || 0);
  
      // Format dates for display
      const formattedDates = sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-MY', {
          month: 'short',
          day: 'numeric'
        });
      });
  
      console.log('Zakat Trends Data:', {
        dates: formattedDates,
        amounts: amounts
      });
  
      setZakatTrends({
        labels: formattedDates,
        datasets: [{
          label: 'Daily Zakat Collection',
          data: amounts,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.1,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      });
  
    } catch (error) {
      console.error('Error calculating zakat trends:', error);
    }
  };

  const getTopContributors = async (limit: number = 10) => {
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const contributorData: Array<{
        name: string;
        totalAmount: number;
        contributions: number;
      }> = [];
  
      // Helper function to validate IC
      const isValidIC = (ic: string): boolean => {
        if (!ic) return false;
        
        // Malaysian IC format: YYMMDD-PB-XXXX
        const icRegex = /^(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-?([0-9]{2})-?([0-9]{4})$/;
        if (!icRegex.test(ic.replace(/-/g, ''))) return false;
        
        // Extract date components
        const year = parseInt(ic.substring(0, 2));
        const month = parseInt(ic.substring(2, 4));
        const day = parseInt(ic.substring(4, 6));
        
        // Validate date
        const currentYear = new Date().getFullYear() % 100;
        const fullYear = year <= currentYear ? 2000 + year : 1900 + year;
        const date = new Date(fullYear, month - 1, day);
        
        return date.getMonth() === month - 1 && date.getDate() === day;
      };
  
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data() as Contact;
        
        // Skip contacts without valid IC
        if (!contactData.ic || !isValidIC(contactData.ic)) {
          return;
        }
  
        if (contactData.zakatData && contactData.zakatData.length > 0) {
          const totalAmount = contactData.zakatData.reduce((sum, entry) => 
            entry.paymentStatus?.toLowerCase() === 'paid' ? sum + (entry.zakatAmount || 0) : sum, 0);
          
          if (totalAmount > 0) {
            contributorData.push({
              name: contactData.contactName || 'Unknown',
              totalAmount,
              contributions: contactData.zakatData.filter(entry => 
                entry.paymentStatus?.toLowerCase() === 'paid' && 
                entry.zakatAmount && 
                entry.zakatAmount > 0
              ).length
            });
          }
        }
      });
  
      setTopContributors(
        contributorData
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, limit)
      );
  
    } catch (error) {
      console.error('Error getting top contributors:', error);
    }
  };
useEffect(() => {
  if (companyId) {
    calculateZakatMetrics();
    calculateZakatTrends();
    getTopContributors();
  }
}, [companyId, timeFilter]); // Add timeFilter as dependency
  const fetchMonthlyTokens = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('User document does not exist');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;

      // Fetch all usage documents for the company
      const usageCollectionRef = collection(firestore, 'companies', companyId, 'usage');
      const usageSnapshot = await getDocs(usageCollectionRef);

      const labels: string[] = [];
      const data: number[] = [];

      usageSnapshot.forEach(doc => {
        const usageData = doc.data();
        const tokens = usageData.total_tokens || 0;
        const price = (tokens / 1000) * 0.003;

        console.log('Document ID:', doc.id);
        console.log('Tokens:', tokens);
        console.log('Price:', price);

        labels.push(doc.id); // Assuming doc.id is in the format 'YYYY-MM'
        data.push(price);
      });

      console.log('Labels:', labels);
      console.log('Data:', data);

      if (labels.length === 0) {
        console.warn('No usage data available');
      }

      setMonthlySpendData({
        labels,
        datasets: [
          {
            label: 'Monthly Spend',
            data,
            backgroundColor: '#82ca9d',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching monthly tokens:', error);
    }
  };


  const calculateMonthlyPrice = (tokens: number) => {
    const price = (tokens / 1000) * 0.003;
    console.log(price);
    setMonthlyPrice(price);
  };


  useEffect(() => {
    fetchCompanyData();
    fetchEmployees();
  }, []);
  async function fetchAppointments() {
    try {
      let totalAppointments = 0;

      for (const employee of employees) {
        const userRef = doc(firestore, 'user', employee.email);
        const appointmentsCollectionRef = collection(userRef, 'appointments');

        // Fetch all appointments for this employee
        const querySnapshot = await getDocs(appointmentsCollectionRef);
        totalAppointments += querySnapshot.size;
      }

      setTotalAppointments(totalAppointments);
      console.log('Total Appointments:', totalAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  }
  // Add a new useEffect to fetch appointments after employees are loaded
  useEffect(() => {
    if (employees.length > 0) {
      fetchAppointments();
    }
  }, [employees]);
  const filteredNotifications = notifications.filter((notification) => {
    return (
      notification.from_name.toLowerCase().includes(searchQuery) ||
      (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
    );
  });

  const saveTokenToFirestore = async (userId: string, token: string) => {
    try {
      await setDoc(doc(firestore, "user", userId), {
        fcmToken: token
      }, { merge: true });
      
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  };

  const handleGetFirebaseToken = (userId: string) => {
    getFirebaseToken().then(async (firebaseToken: string | undefined) => {
      if (firebaseToken) {
        
        await saveTokenToFirestore(userId, firebaseToken);
      }
    });
  };


  useEffect(() => {
    fetchConfigFromDatabase();

    const unsubscribe = onSnapshot(doc(firestore, "user", auth.currentUser?.email!), (doc) => {
      const data = doc.data();
      if (data?.notifications) {
        setNotifications(data.notifications);
      }
    });

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        payload.notification,
      ]);
    });

    return () => {
      unsubscribe();
      unsubscribeMessage();
    };
  }, []);

  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user is currently authenticated.");
      return;
    }
  
    const userEmail = user.email;
  
    if (!userEmail) {
      console.error("Authenticated user has no email.");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', userEmail);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.log('User document exists but has no data!');
        return;
      }
  
      companyId = dataUser.companyId;
      role = dataUser.role;
  
      if (!companyId) {
        console.log('No company ID found for user!');
        return;
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        console.log('Company document exists but has no data!');
        return;
      }
  
      // Fetch the number of contacts with replies
      const contactsRef = collection(firestore, 'companies', companyId, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);
      
      let contactsWithReplies = 0;
  
      const checkRepliesPromises = contactsSnapshot.docs.map(async (contactDoc) => {
        const contactData = contactDoc.data();
        // Skip if it's a group
        if (contactData.type === 'group') {
          return false;
        }
  
        const messagesRef = collection(contactDoc.ref, 'messages');
        const q = query(messagesRef, where('id', '>=', ''), limit(1));
        const messageSnapshot = await getDocs(q);
        
        return !messageSnapshot.empty;
      });
  
      const results = await Promise.all(checkRepliesPromises);
      contactsWithReplies = results.filter(Boolean).length;
  
      setReplies(contactsWithReplies);
      console.log('Contacts with replies:', contactsWithReplies);
  
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  
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

    
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
 

      // Assuming refreshAccessToken is defined elsewhere
      console.log(companyData);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }

  }

  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
  
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
  
      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        const employeeData = doc.data() as Employee;
        employeeListData.push({
          ...employeeData,
          id: doc.id,
          assignedContacts: employeeData.assignedContacts || 0
        });
      });

      // Find current user
      const currentUserData = employeeListData.find(emp => emp.email === user?.email);
      if (currentUserData) {
        setCurrentUser(currentUserData);
        setSelectedEmployee(currentUserData);
      }

      // Sort employees by number of assigned contacts (descending order)
      employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));

      // Take top 10 employees for the leaderboard
      const topEmployees = employeeListData;
      
      setEmployees(topEmployees);
    
    } catch (error) {
      console.error('Error fetching employees and chats:', error);
    }
  }

  async function fetchEmployeeData(employeeId: string): Promise<Employee | null> {
    try {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
      const employeeSnapshot = await getDoc(employeeRef);
  
      if (employeeSnapshot.exists()) {
        const employeeData = employeeSnapshot.data() as Employee;
        
        // Fetch monthly assignments
        const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
        const monthlyAssignmentsSnapshot = await getDocs(monthlyAssignmentsRef);
        
        const monthlyAssignments: { [key: string]: number } = {};
        monthlyAssignmentsSnapshot.forEach((doc) => {
          monthlyAssignments[doc.id] = doc.data().assignments;
        });
  
        // Fetch closed contacts
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        const closedContacts = contactsSnapshot.docs.filter(doc => {
          const tags = doc.data().tags || [];
          return tags.includes('closed') && tags.includes(employeeData.name);
        }).length;
  
        return {
          ...employeeData,
          id: employeeSnapshot.id,
          monthlyAssignments: monthlyAssignments,
          closedContacts: closedContacts
        };
      } else {
        console.log('No such employee!');
        return null;
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  }

  // Add this useEffect to log the selected employee
  useEffect(() => {
    if (selectedEmployee) {
      console.log("Selected Employee:", selectedEmployee);
      console.log("Monthly Assignments:", selectedEmployee.monthlyAssignments);
    }
  }, [selectedEmployee]);

  // Modify the existing useEffect for selectedEmployee
  useEffect(() => {
    if (selectedEmployee) {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${selectedEmployee.id}`);
      const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
      
      const unsubscribe = onSnapshot(monthlyAssignmentsRef, (snapshot) => {
        const updatedMonthlyAssignments: { [key: string]: number } = {};
        snapshot.forEach((doc) => {
          updatedMonthlyAssignments[doc.id] = doc.data().assignments;
        });
        
        setSelectedEmployee(prevState => ({
          ...prevState!,
          monthlyAssignments: updatedMonthlyAssignments
        }));
      });

      return () => unsubscribe();
    }
  }, [selectedEmployee?.id, companyId]);
  
  // Usage in your component
  useEffect(() => {
    async function loadEmployeeData() {
      if (currentUser) {
        const employeeData = await fetchEmployeeData(currentUser.uid);
        if (employeeData) {
          setSelectedEmployee(employeeData);
        }
      }
    }
  
    if (currentUser) {
      loadEmployeeData();
    }
  }, [currentUser]);

  const getLast12MonthsData = (monthlyAssignments: { [key: string]: number } = {}) => {
    const last12Months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      last12Months.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        assignments: monthlyAssignments[monthKey] || 0
      });
    }
    return last12Months;
  };

  // Update the chartData useMemo with logging
  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;
    const last12MonthsData = getLast12MonthsData(selectedEmployee.monthlyAssignments);
    console.log("Chart data calculated:", last12MonthsData);
    return {
      labels: last12MonthsData.map(d => `${d.month} ${d.year}`),
      datasets: [
        {
          label: 'Assigned Contacts',
          data: last12MonthsData.map(d => d.assignments),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Closed Contacts',
          data: Array(12).fill(selectedEmployee.closedContacts || 0),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
          fill: false
        }
      ]
    };
  }, [selectedEmployee, selectedEmployee?.monthlyAssignments]);

  const lineChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: 'Number of Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
        },
        title: {
          display: true,
          text: `Contact Metrics for ${selectedEmployee?.name || 'Employee'}`,
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, [selectedEmployee]);

  // Add these new state variables
  const [closedContacts, setClosedContacts] = useState(0);
  const [openContacts, setOpenContacts] = useState(0);
  const [todayContacts, setTodayContacts] = useState(0);
  const [weekContacts, setWeekContacts] = useState(0);
  const [monthContacts, setMonthContacts] = useState(0);

  // Update this function
  async function fetchContactsData() {
    if (!companyId) {
      console.error('CompanyId is not set. Unable to fetch contacts data.');
      return;
    }
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      let total = 0;
      let closed = 0;
      let today = 0;
      let week = 0;
      let month = 0;

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;

        total++;
        if (contactData.tags && contactData.tags.includes('closed')) {
          closed++;
        }

        if (dateAdded) {
          if (dateAdded >= startOfDay) {
            today++;
          }
          if (dateAdded >= startOfWeek) {
            week++;
          }
          if (dateAdded >= startOfMonth) {
            month++;
          }
        }
      });

      const open = total - closed;

      // Log the contacts data
      console.log('Contacts Data:', {
        totalContacts: total,
        closedContacts: closed,
        openContacts: open,
        todayContacts: today,
        weekContacts: week,
        monthContacts: month,
        numReplies: numReplies,
      });

      setTotalContacts(total);
      setClosedContacts(closed);
      setOpenContacts(open);
      setTodayContacts(today);
      setWeekContacts(week);
      setMonthContacts(month);
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    }
  }

  // Add this function to calculate additional stats
  const calculateAdditionalStats = useCallback(() => {
    // Response Rate (percentage of contacts that have replied)
    const newResponseRate = totalContacts > 0 ? (numReplies / totalContacts) * 100 : 0;
    setResponseRate(Number(newResponseRate.toFixed(1))); // Use 1 decimal place for percentage
  
    // Average Replies per Lead
   // const newAverageRepliesPerLead = totalContacts > 0 ? numReplies / totalContacts : 0;
   // setAverageRepliesPerLead(Number(newAverageRepliesPerLead.toFixed(2))); // Use 2 decimal places
    const newBookAppointmentsRate = totalContacts > 0 ? (totalAppointments / totalContacts) * 100 : 0;
    setAverageRepliesPerLead(Number(newBookAppointmentsRate.toFixed(2)));
 // Engagement Score (weighted sum of response rate and booking appointments rate)
  // Adjust weights as needed; the sum should be 1 for better scaling
  const responseWeight = 0.15; // weight for response rate
  const appointmentWeight = 0.35; // weight for booking appointments rate
  const closedContactsWeight = 0.5;
  const newClosedContactsRate = totalContacts > 0 ? (closedContacts / totalContacts) * 100 : 0;

  const newEngagementScore = (newResponseRate * responseWeight) + 
  (newBookAppointmentsRate * appointmentWeight) + 
  (newClosedContactsRate * closedContactsWeight);

setEngagementScore(Number(newEngagementScore.toFixed(2)));
  }, [numReplies, totalContacts, totalAppointments]);

  // Update useEffect to call calculateAdditionalStats
  useEffect(() => {
    if (companyId) {
      fetchContactsData();
      calculateAdditionalStats();
      fetchClosedContactsByEmployee();
    }
  }, [companyId, calculateAdditionalStats]);

  // Modify the handleEmployeeSelect function
  const handleEmployeeSelect = async (employee: Employee) => {
    console.log("Employee selected:", employee);
    const fullEmployeeData = await fetchEmployeeData(employee.id);
    if (fullEmployeeData) {
      setSelectedEmployee(fullEmployeeData);
    }
  };

  const fetchContactsOverTime = async (filter: 'today' | '7days' | '1month' | '3months' | 'all') => {
    if (!companyId) {
        console.error('CompanyId is not set. Unable to fetch contacts data.');
        return;
    }

    const now = new Date();
    let startDate: Date;

    let interval: 'hour' | 'day' | 'month';


    try {
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        let firstContactDate = now;
        const contactsData: { [date: string]: number } = {};
        
        contactsSnapshot.forEach((doc) => {
          const contactData = doc.data();
          const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;
  
          if (dateAdded) {
            if (dateAdded < firstContactDate) {
              firstContactDate = dateAdded;
            }
          }
        });
  
        switch (filter) {
          case 'today':
            startDate = startOfDay(now);
            interval = 'hour';
            break;
          case '7days':
          case '1month':
            startDate = filter === '7days' ? subDays(now, 7) : subDays(now, 30);
            interval = 'day';
            break;
          case '3months':
            startDate = subMonths(now, 3);
            interval = 'month';
            break;
          default: // 'all'
            startDate = firstContactDate;
            interval = 'month';
            break;
        }
  

        contactsSnapshot.forEach((doc) => {
          const contactData = doc.data();
          const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;
  

          if (dateAdded && dateAdded >= startDate && dateAdded <= now) {
            const dateKey = interval === 'hour' 
              ? format(dateAdded, 'yyyy-MM-dd HH:00')
              : format(dateAdded, 'yyyy-MM-dd');
              contactsData[dateKey] = (contactsData[dateKey] || 0) + 1;
            }
          });
            

          let timePoints: Date[];
          if (interval === 'hour') {
            timePoints = eachHourOfInterval({ start: startOfDay(now), end: endOfDay(now) });
          } else {
            timePoints = eachDayOfInterval({ start: startDate, end: now });
          }

          const sortedData = timePoints.map(date => {
            const dateKey = interval === 'hour'
              ? format(date, 'yyyy-MM-dd HH:00')
              : format(date, 'yyyy-MM-dd');
            return { 
              date: interval === 'hour' ? format(date, 'HH:mm') : format(date, 'MMM dd'),
              count: contactsData[dateKey] || 0 
            };
          });    

        setContactsOverTime(sortedData);
    } catch (error) {
        console.error('Error fetching contacts over time data:', error);
    }
};

// Helper function to get the earliest contact added date
const getEarliestContactDate = async () => {
    const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsRef);
    let earliestDate: Date | null = null;

    contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;

        if (dateAdded) {
            if (!earliestDate || dateAdded < earliestDate) {
                earliestDate = dateAdded;
            }
        }
    });

    return earliestDate;
};

  useEffect(() => {
    if (companyId) {
      fetchContactsOverTime(contactsTimeFilter);
    }
  }, [companyId, contactsTimeFilter]);

  const totalContactsChartData = useMemo(() => {
    return {
      labels: contactsOverTime.map(d => d.date),
      datasets: [{
        label: 'Total Contacts',
        data: contactsOverTime.map(d => d.count),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }]
    };
  }, [contactsOverTime]);

  const totalContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: 'Number of Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: Math.max(1, Math.ceil(Math.max(...contactsOverTime.map(d => d.count)) / 10)),
          },
        },
        x: {
          title: {
            display: true,
            text: contactsTimeFilter === 'today' ? 'Hour' : 'Date',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            maxTicksLimit: contactsTimeFilter === 'today' ? 24 : 10, // Show all hours for 'today', limit to 10 for other filters
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Total Contacts Over Time',
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, [contactsOverTime, contactsTimeFilter]);

  const [closedContactsByEmployee, setClosedContactsByEmployee] = useState<{ [key: string]: number }>({});

  async function fetchClosedContactsByEmployee() {
    if (!companyId) {
      console.error('CompanyId is not set. Unable to fetch closed contacts data.');
      return;
    }
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const closedContacts: { [key: string]: number } = {};

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && contactData.tags.includes('closed') && contactData.assignedTo) {
          closedContacts[contactData.assignedTo] = (closedContacts[contactData.assignedTo] || 0) + 1;
        }
      });

      setClosedContactsByEmployee(closedContacts);
    } catch (error) {
      console.error('Error fetching closed contacts data:', error);
    }
  }

  const closedContactsChartData = useMemo(() => {
    if (!employees || !closedContactsByEmployee) return null;

    const labels = employees.map(emp => emp.name);
    const data = employees.map(emp => closedContactsByEmployee[emp.id] || 0);

    return {
      labels: labels,
      datasets: [{
        label: 'Closed Contacts',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };
  }, [employees, closedContactsByEmployee]);

  const closedContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Closed Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Employees',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Closed Contacts by Employee',
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, []);

  // Add these new interfaces and types
  interface ZakatProfile {
    ageGroup: string;
    occupation: string;
    income: number;
    zakatHistory: number;
    preferredPaymentMethod: string;
  }

  interface RegionalData {
    state: string;
    totalAmount: number;
    contributors: number;
    collectionRate: number;
  }

  // Add these new state variables
  const [ageDistribution, setAgeDistribution] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: []
  });

  const [occupationDistribution, setOccupationDistribution] = useState<ChartData<'pie'>>({
    labels: [],
    datasets: []
  });

  const [seasonalTrends, setSeasonalTrends] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

  const [paymentMethodStats, setPaymentMethodStats] = useState<{
    method: string;
    count: number;
    amount: number;
  }[]>([]);

  const [regionalStats, setRegionalStats] = useState<RegionalData[]>([]);


  // Modify the calculateProfileMetrics function
  const calculateProfileMetrics = async () => {
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const ageGroups: { [key: string]: number } = {
        '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0
      };
      
      const occupations: { [key: string]: number } = {};
      const paymentMethods: { [key: string]: { count: number; amount: number } } = {};
      const regions: { [key: string]: RegionalData } = {};
  
      let totalPayments = 0;
      let totalContributors = 0;
  
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data() as Contact;
        if (contactData.zakatData && contactData.zakatData.length > 0) {
          // Extract IC number and calculate age
          const icNumber = contactData.ic;
          if (icNumber) {
            const birthDate = getBirthDateFromIC(icNumber);
            if (birthDate) {
              const age = calculateAge(birthDate);
              const ageGroup = getAgeGroup(age);
              ageGroups[ageGroup]++;
            }
          }
  
          // Track unique contributors
          totalContributors++;
  
          // Process each zakat entry
          contactData.zakatData.forEach(entry => {
            if (entry.paymentStatus === 'Paid') {
              totalPayments++;
              
              // Payment method statistics
              if (entry.paymentOption) {
                const normalizedPaymentOption = entry.paymentOption.trim();
                if (!paymentMethods[normalizedPaymentOption]) {
                  paymentMethods[normalizedPaymentOption] = { count: 0, amount: 0 };
                }
                paymentMethods[normalizedPaymentOption].count++;
                paymentMethods[normalizedPaymentOption].amount += entry.zakatAmount || 0;
              }
  
              // Regional statistics with normalization
              if (contactData.state) {
                const normalizedState = contactData.state.trim().toUpperCase();
                if (!regions[normalizedState]) {
                  regions[normalizedState] = {
                    state: contactData.state, // Keep original formatting
                    totalAmount: 0,
                    contributors: 0,
                    collectionRate: 0
                  };
                }
                regions[normalizedState].totalAmount += entry.zakatAmount || 0;
                regions[normalizedState].contributors++;
              }
            }
          });
        }
      });
  
      // Calculate collection rates for regions
      Object.values(regions).forEach(region => {
        region.collectionRate = (region.contributors / totalContributors) * 100;
      });
  
      // Update age distribution chart
      setAgeDistribution({
        labels: Object.keys(ageGroups),
        datasets: [{
          label: 'Contributors by Age Group',
          data: Object.values(ageGroups),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ]
        }]
      });
  
      // Update payment methods stats
      const sortedPaymentMethods = Object.entries(paymentMethods)
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          amount: stats.amount
        }))
        .sort((a, b) => b.amount - a.amount); // Sort by amount in descending order
  
      setPaymentMethodStats(sortedPaymentMethods);
  
      // Filter and sort regional stats
      const filteredRegions = Object.values(regions)
      .filter(region => {
        const averageAmount = region.totalAmount / region.contributors;
        // Remove regions with 0 contributors or 0 average amount
        return region.contributors > 0 && averageAmount > 0;
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map(region => ({
        ...region,
        averageAmount: region.totalAmount / region.contributors
      }));
  
      setRegionalStats(filteredRegions);
  
      // Log summary for debugging
      console.log('Profile Metrics Summary:', {
        totalContributors,
        totalPayments,
        regionsCount: filteredRegions.length,
        paymentMethodsCount: sortedPaymentMethods.length,
        ageGroups
      });
  
    } catch (error) {
      console.error('Error calculating profile metrics:', error);
      // Optionally set an error state here
    }
  };

  // Improved getBirthDateFromIC function with better validation
  const getBirthDateFromIC = (ic: string): Date | null => {
    try {
      // Extract the first 6 digits (YYMMDD)
      const birthDateStr = ic.substring(0, 6);
      
      const year = parseInt(birthDateStr.substring(0, 2));
      const month = parseInt(birthDateStr.substring(2, 4)) - 1; // JS months are 0-based
      const day = parseInt(birthDateStr.substring(4, 6));
      
      // Determine century
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const fullYear = year + (year + currentCentury > currentYear ? currentCentury - 100 : currentCentury);
      
      const date = new Date(fullYear, month, day);
      
      // Validate the date is real and not in the future
      if (date.getTime() > new Date().getTime()) {
        console.warn(`Invalid birth date (future date) from IC: ${ic.substring(0, 6)}XXXXXX`);
        return null;
      }
      
      // Validate the date components match what we parsed
      if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== fullYear) {
        console.warn(`Invalid date components from IC: ${ic.substring(0, 6)}XXXXXX`);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error(`Error parsing birth date from IC: ${ic.substring(0, 6)}XXXXXX`, error);
      return null;
    }
  };

  // Helper function to calculate age
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Helper function to determine age group
  const getAgeGroup = (age: number): string => {
    if (age < 26) return '18-25';
    if (age < 36) return '26-35';
    if (age < 46) return '36-45';
    if (age < 56) return '46-55';
    return '55+';
  };

  // Update useEffect to include new calculations
  useEffect(() => {
    if (companyId) {
      calculateZakatMetrics();
      calculateZakatTrends();
      calculateProfileMetrics();
      getTopContributors();
    }
  }, [companyId, timeFilter]);

  const dashboardCards = [
    {
      id: 'zakat-overview',
      title: 'Zakat Collection Overview',
      content: [
        { 
          icon: "DollarSign", 
          label: "Total Zakat Amount", 
          value: totalZakatAmount.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })
        },
        { 
          icon: "Users", 
          label: "Total Contributors", 
          value: totalContributors 
        },
        { 
          icon: "Calendar", 
          label: "This Month Collections", 
          value: monthlyZakatAmount.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })
        },
        { 
          icon: "TrendingUp", 
          label: "Average Zakat Amount", 
          value: avgZakatAmount.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })
        },
      ]
    },
    {
      id: 'payment-status',
      title: 'Payment Status Overview',
      content: [
        { 
          icon: "CheckCircle",
          label: "Paid", 
          value: paidZakat,
          color: "text-green-500"
        },
        { 
          icon: "Clock",
          label: "Processing", 
          value: pendingZakat,
          color: "text-yellow-500"
        },
        { 
          icon: "XCircle",
          label: "Failed", 
          value: failedZakat,
          color: "text-red-500"
        },
        { 
          icon: "Percent",
          label: "Collection Rate", 
          value: `${collectionRate.toFixed(1)}%`,
          color: "text-blue-500"
        },
      ]
    },
    {
      id: 'zakat-trends',
      title: 'Zakat Collection Trends',
      content: (
        <div className="h-full">
          <div className="mb-4">
            <FormSelect
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
              className="w-40"
            >
              <option value="7days">Last 7 Days</option>
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="all">All Time</option>
            </FormSelect>
          </div>
          <div className="h-[300px]">
            <Line data={zakatTrends} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Daily Zakat Collections'
                }
              }
            }} />
          </div>
        </div>
      )
    },
    {
      id: 'zakat-types',
      title: 'Zakat Types Distribution',
      content: (
        <div className="h-[300px]">
          <Doughnut 
            data={zakatTypeDistribution}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    boxWidth: 12
                  }
                }
              }
            }}
          />
        </div>
      )
    },
    {
      id: 'top-contributors',
      title: 'Top Contributors',
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contributions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topContributors.map((contributor, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contributor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contributor.totalAmount.toLocaleString('en-MY', { 
                      style: 'currency', 
                      currency: 'MYR' 
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contributor.contributions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
     
    )
    },
    {
      id: 'contributor-demographics',
      title: 'Contributor Demographics',
      content: (
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500">Age Distribution</h4>
          </div>
          <div className="h-[300px]">
            <Bar 
              data={ageDistribution}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `Contributors: ${context.raw}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Contributors'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )
    },
   
    {
      id: 'regional-analysis',
      title: 'Regional Collection Analysis',
      content: (
        <div className="flex flex-col h-full">
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-500">Collection by Region</h4>
          </div>
          <div className="h-[300px]">
            <Bar 
              data={{
                labels: regionalStats.map(r => r.state),
                datasets: [
                  {
                    label: 'Total Amount',
                    data: regionalStats.map(r => r.totalAmount),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    yAxisID: 'y'
                  },
                  {
                    label: 'Contributors',
                    data: regionalStats.map(r => r.contributors),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const datasetLabel = context.dataset.label;
                        const value = context.raw as number;
                        if (datasetLabel === 'Total Amount') {
                          return `${datasetLabel}: ${value.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}`;
                        }
                        return `${datasetLabel}: ${value}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Total Amount (MYR)'
                    }
                  },
                  y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Number of Contributors'
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                }
              }}
            />
          </div>
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Collection Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Avg. per Contributor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {regionalStats.map((region, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {region.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {region.collectionRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(region.totalAmount / region.contributors).toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden overflow-y-auto">
      <div className="flex-grow p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {dashboardCards.map((card) => (
            <div 
              key={card.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full"
            >
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{card.title}</h3>
                  {card.id === 'zakat-trends' && (
                    <FormSelect
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
                      className="w-40"
                    >
                      <option value="7days">Last 7 Days</option>
                      <option value="1month">Last Month</option>
                      <option value="3months">Last 3 Months</option>
                      <option value="all">All Time</option>
                    </FormSelect>
                  )}
                </div>
                <div className="flex-grow">
                  {(card.id === 'zakat-overview' || card.id === 'payment-status') ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.isArray(card.content) && card.content.map((item, index) => (
                        <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex justify-center mb-2">
                            {item.icon && (
                              <span className={`text-2xl ${('color' in item) ? item.color : 'text-blue-500'}`}>
                                <i className={`feather icon-${item.icon.toLowerCase()}`}></i>
                              </span>
                            )}
                          </div>
                          <div className={`text-2xl font-bold ${('color' in item) ? item.color : 'text-blue-500'} dark:text-blue-400`}>
                            {!loading ? item.value : <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />}
                          </div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : card.id === 'zakat-trends' ? (
                    <div className="h-[300px]">
                      <Line 
                        data={zakatTrends} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: true,
                              text: 'Daily Zakat Collections'
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Amount (MYR)',
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  ) : card.id === 'zakat-types' ? (
                    <div className="h-[300px]">
                      <Doughnut 
                        data={zakatTypeDistribution}
                         options={zakatTypeOptions}
                      />
                    </div>
                  ) : card.id === 'top-contributors' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Total Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Contributions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                          {topContributors.map((contributor, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contributor.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contributor.totalAmount.toLocaleString('en-MY', { 
                                  style: 'currency', 
                                  currency: 'MYR' 
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contributor.contributions}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : card.id === 'contributor-demographics' ? (
                    <div className="flex flex-col h-full">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500">Age Distribution</h4>
                      </div>
                      <div className="h-[300px]">
                        <Bar 
                          data={ageDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    return `Contributors: ${context.raw}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Number of Contributors'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : card.id === 'payment-methods' ? (
                    <div className="flex flex-col h-full">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Method
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Usage
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Total Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Avg. Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                            {paymentMethodStats.map((stat, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {stat.method}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {stat.count} ({((stat.count / paymentMethodStats.reduce((acc, curr) => acc + curr.count, 0)) * 100).toFixed(1)}%)
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {stat.amount.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {(stat.amount / stat.count).toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : card.id === 'regional-analysis' ? (
                    <div className="flex flex-col h-full">
                      <div className="mb-4 flex justify-between items-center">
                        <h4 className="text-sm font-medium text-gray-500">Collection by Region</h4>
                      </div>
                      <div className="h-[300px]">
                        <Bar 
                          data={{
                            labels: regionalStats.map(r => r.state),
                            datasets: [
                              {
                                label: 'Total Amount',
                                data: regionalStats.map(r => r.totalAmount),
                                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                yAxisID: 'y'
                              },
                              {
                                label: 'Contributors',
                                data: regionalStats.map(r => r.contributors),
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                yAxisID: 'y1'
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top'
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const datasetLabel = context.dataset.label;
                                    const value = context.raw as number;
                                    if (datasetLabel === 'Total Amount') {
                                      return `${datasetLabel}: ${value.toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}`;
                                    }
                                    return `${datasetLabel}: ${value}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                  display: true,
                                  text: 'Total Amount (MYR)'
                                }
                              },
                              y1: {
                                type: 'linear',
                                position: 'right',
                                title: {
                                  display: true,
                                  text: 'Number of Contributors'
                                },
                                grid: {
                                  drawOnChartArea: false
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                State
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Collection Rate
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Avg. per Contributor
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                            {regionalStats.map((region, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {region.state}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {region.collectionRate.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {(region.totalAmount / region.contributors).toLocaleString('en-MY', { style: 'currency', currency: 'MYR' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 dark:text-gray-400">No data available</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Main;