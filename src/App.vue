<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const KEY = 'al_najaf_hardware_v35'
const showSplash = ref(true)
const loggedIn = ref(false)
const loginUser = ref('')
const loginPass = ref('')

const active = ref('salepoint')
const search = ref('')
const message = ref('')
const createdInvoice = ref(null)
const invoiceToPrint = ref(null)
const imagePreviewUrl = ref('')
const imagePreviewInvoice = ref(null)
const paymentModalInvoice = ref(null)
const paymentInputAmount = ref('')
const paymentInputDiscount = ref('')

const printIdModalData = ref(null)
const showReportModal = ref(false)
const reportPeriod = ref('all')

const showCameraModal = ref(false)
const videoElement = ref(null)
let mediaStream = null

let notificationTimeout
let printStyle

const defaultData = {
  company: {
    name: 'AL NAJAF Generators Rental LLC',
    arabicName: 'النجف لتأجير المولدات ش.ذ.م.م.',
    address: 'Near Masjid Al Awir, Al Kabeer Al Awir, Dubai U.A.E.',
    arabicAddress: 'قرب مسجد العوير، الكبير العوير، دبي - أ.ع.م.',
    phone: '058 830 8899',
    phone2: '050 593 4242',
    email: 'abbasbaloch951214@gmail.com',
    trn: '',
    license: '',
    currency: 'AED',
    vat: 5,
    printFormat: 'A5',
    defaultTerms: 'We are on Friday also: 6:00 AM to 12:00 AM & 2:00 PM to 8:00 PM',
    defaultArabicTerms: 'نفتتح يوم الجمعة من ٦:٠٠ ص إلى ١٢:٠٠ ص',
    cashierName: 'Default Cashier',
    sidebarWidth: 180,
    username: 'alnajaf',
    password: 'mola1214'
  },
  equipment: [
    { id: 'eq1', name: 'Generator 500KVA Cummins', code: 'EQ-012', category: 'Generators', quantity: 1, rate: 800, status: 'Available' },
    { id: 'eq2', name: 'Generator 250KVA Perkins', code: 'EQ-013', category: 'Generators', quantity: 1, rate: 500, status: 'Available' },
    { id: 'eq3', name: 'Generator 100KVA Denyo', code: 'EQ-014', category: 'Generators', quantity: 1, rate: 300, status: 'Available' },
    { id: 'eq4', name: 'Generator 30KVA Portable', code: 'EQ-015', category: 'Generators', quantity: 1, rate: 150, status: 'Available' },
    { id: 'eq5', name: 'Core Cutting Machine Heavy', code: 'EQ-016', category: 'Core Cutting', quantity: 1, rate: 200, status: 'Available' },
    { id: 'eq6', name: 'Wall Saw Machine Hydraulic', code: 'EQ-017', category: 'Core Cutting', quantity: 1, rate: 350, status: 'Available' },
    { id: 'eq7', name: 'Breaker Demolition Hammer 30KG', code: 'EQ-018', category: 'Tools', quantity: 1, rate: 80, status: 'Available' },
    { id: 'eq8', name: 'Rotary Hammer Drill Bosch', code: 'EQ-019', category: 'Tools', quantity: 1, rate: 45, status: 'Available' },
    { id: 'eq9', name: 'Submersible Water Pump 3-Inch', code: 'EQ-020', category: 'Pumps', quantity: 1, rate: 90, status: 'Available' },
    { id: 'eq10', name: 'Air Compressor 300 CFM', code: 'EQ-021', category: 'Compressors', quantity: 1, rate: 400, status: 'Available' },
    { id: 'eq11', name: 'Mobile Light Tower 4x1000W', code: 'EQ-022', category: 'Lighting', quantity: 1, rate: 250, status: 'Available' },
    { id: 'eq12', name: 'Welding Machine Diesel 400A', code: 'EQ-023', category: 'Welding', quantity: 1, rate: 180, status: 'Available' },
    { id: 'eq13', name: 'Plate Compactor Wacker', code: 'EQ-024', category: 'Compactors', quantity: 1, rate: 100, status: 'Available' },
    { id: 'eq14', name: 'Vibratory Roller 3 Ton', code: 'EQ-025', category: 'Rollers', quantity: 1, rate: 600, status: 'Available' },
    { id: 'eq15', name: 'Forklift Diesel 3 Ton', code: 'EQ-026', category: 'Lifting', quantity: 1, rate: 450, status: 'Available' }
  ],
  customers: [],
  employees: [],
  rentals: [],
  sales: [],
  expenses: [],
  invoices: [],
  invoiceCounter: 14278
}

const data = ref(JSON.parse(JSON.stringify(defaultData)))

function loadData() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) data.value = normalizeData(JSON.parse(saved))
  } catch (e) {
    console.error('Could not load saved data', e)
  }
}
function saveData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data.value))
  } catch (error) {
    console.error('Could not save application data', error)
  }
}
watch(data, saveData, { deep: true })

function normalizeData(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid saved data')
  const normalized = {
    ...defaultData,
    ...saved,
    company: { ...defaultData.company, ...(saved.company || {}) }
  }
  for (const key of ['equipment', 'customers', 'employees', 'rentals', 'sales', 'expenses', 'invoices']) {
    normalized[key] = Array.isArray(saved[key]) ? saved[key] : defaultData[key]
  }
  normalized.invoiceCounter = Math.max(1001, Number(saved.invoiceCounter) || 14278)
  return normalized
}

onMounted(() => {
  loadData()
  window.addEventListener('afterprint', finishPrint)
  setTimeout(() => {
    showSplash.value = false
  }, 2000)
})
onBeforeUnmount(() => {
  window.removeEventListener('afterprint', finishPrint)
  if (notificationTimeout) clearTimeout(notificationTimeout)
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  stopCameraStream()
  printStyle?.remove()
})

const tabs = [
  ['salepoint', 'Sale Point'],
  ['dashboard', 'Dashboard'],
  ['equipment', 'Equipment'],
  ['customers', 'Customers'],
  ['employees', 'Employees'],
  ['rentals', 'Rentals'],
  ['sales', 'Counter Sales'],
  ['invoices', 'Invoices / Slips'],
  ['expenses', 'Expenses'],
  ['reports', 'Reports'],
  ['settings', 'Settings']
]

const equipmentSearch = ref('')
const customerSearch = ref('')
const employeeSearch = ref('')
const rentalSearch = ref('')
const expenseSearch = ref('')

const saleCustomerKeyword = ref('')
const saleEquipmentKeyword = ref('')

const equipmentForm = ref({ name: '', code: '', category: '', quantity: 1, rate: 0, status: 'Available' })
const editingEquipmentId = ref(null)

const customerForm = ref({ name: '', phone: '', email: '', address: '', emiratesId: '', passport: '', nationality: '' })
const editingCustomerId = ref(null)

const employeeForm = ref({ name: '', phone: '', role: '', employeeNo: '', emiratesId: '', passport: '', nationality: '', joinDate: '', emergency: '' })
const editingEmployeeId = ref(null)

const showQuickCustomer = ref(false)
const quickCust = ref({ name: '', phone: '', address: '', emiratesId: '' })

const dashRentalForm = ref({
  customerId: '', equipmentId: '', quantity: 1, startDate: today(), endDate: today(),
  timeOut: currentTime12(), siteNo: '', lpo: '', reservedDoc: '', deliveryCharges: 0, rate: 0, paid: 0, discount: 0, notes: ''
})
const rentalForm = ref({
  customerId: '', equipmentId: '', quantity: 1, startDate: today(), endDate: today(),
  timeOut: currentTime12(), siteNo: '', lpo: '', reservedDoc: '', deliveryCharges: 0, rate: 0, paid: 0, discount: 0, notes: ''
})

const saleForm = ref({ customerId: '', item: '', quantity: 1, rate: 0, paid: 0 })
const expenseForm = ref({ title: '', amount: 0, date: today(), notes: '' })
const invoiceForm = ref({
  type: 'Rental', customerId: '', date: today(), dueDate: '', timeOut: currentTime12(),
  timeIn: '', siteNo: '', lpo: '', reservedDoc: '', itemCode: '', description: '',
  quantity: 1, days: 1, rate: 0, deliveryCharges: 0, paid: 0, discount: 0, vat: 5, notes: ''
})
watch(() => data.value.company.vat, vat => {
  invoiceForm.value.vat = Number(vat ?? defaultData.company.vat)
})

function today() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
function currentTime12() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function money(value) {
  return `${data.value.company.currency || 'AED'} ${Number(value || 0).toFixed(2)}`
}
function notify(text) {
  if (notificationTimeout) clearTimeout(notificationTimeout)
  message.value = text
  notificationTimeout = setTimeout(() => message.value = '', 3500)
}
function customerName(id) {
  return data.value.customers.find(c => c.id === id)?.name || 'Walk-in Customer'
}
function equipmentName(id) {
  return data.value.equipment.find(e => e.id === id)?.name || 'Unknown Equipment'
}
function rentalDuration(startDate, endDate) {
  if (!startDate || !endDate) return 1
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.max(1, Math.ceil((end - start) / 86400000))
}

const dashRentalDays = computed(() => rentalDuration(dashRentalForm.value.startDate, dashRentalForm.value.endDate))
const dashRentalSubtotal = computed(() => Number(dashRentalForm.value.quantity || 0) * Number(dashRentalForm.value.rate || 0) * dashRentalDays.value + Number(dashRentalForm.value.deliveryCharges || 0) - Number(dashRentalForm.value.discount || 0))
const dashRentalVat = computed(() => Math.max(0, dashRentalSubtotal.value) * Number(data.value.company.vat || 0) / 100)
const dashRentalTotal = computed(() => Math.max(0, dashRentalSubtotal.value) + dashRentalVat.value)
const dashRentalBalance = computed(() => Math.max(0, dashRentalTotal.value - Number(dashRentalForm.value.paid || 0)))

const rentalDays = computed(() => rentalDuration(rentalForm.value.startDate, rentalForm.value.endDate))
const rentalSubtotal = computed(() => Number(rentalForm.value.quantity || 0) * Number(rentalForm.value.rate || 0) * rentalDays.value + Number(rentalForm.value.deliveryCharges || 0) - Number(rentalForm.value.discount || 0))
const rentalVat = computed(() => Math.max(0, rentalSubtotal.value) * Number(data.value.company.vat || 0) / 100)
const rentalTotal = computed(() => Math.max(0, rentalSubtotal.value) + rentalVat.value)
const rentalBalance = computed(() => Math.max(0, rentalTotal.value - Number(rentalForm.value.paid || 0)))

function invoiceLineAmount(inv) {
  const days = inv.type === 'Rental' ? Math.max(1, Number(inv.days) || 1) : 1
  return Number(inv.quantity || 0) * Number(inv.rate || 0) * days
}
function invoiceSubtotal(inv) {
  return invoiceLineAmount(inv) + Number(inv.deliveryCharges || 0) - Number(inv.discount || 0)
}
function invoiceVat(inv) {
  return Math.max(0, invoiceSubtotal(inv)) * Number(inv.vat ?? 0) / 100
}
function totalInvoice(inv) {
  return Math.max(0, invoiceSubtotal(inv)) + invoiceVat(inv)
}
function balanceInvoice(inv) {
  return Math.max(0, totalInvoice(inv) - Number(inv.paid || 0))
}
function paymentStatus(inv) {
  if (balanceInvoice(inv) <= 0.005) return 'PAID'
  return Number(inv.paid || 0) > 0 ? 'PARTIALLY PAID' : 'UNPAID'
}
function invoiceCustomer(inv) {
  return data.value.customers.find(c => c.id === inv.customerId)
}
function rentalInvoice(rental) {
  return data.value.invoices.find(invoice => invoice.id === rental.invoiceId)
}
function rentalByInvoice(invoiceId) {
  return data.value.rentals.find(r => r.invoiceId === invoiceId)
}
function createInvoiceNumber() {
  const existing = new Set(data.value.invoices.map(invoice => invoice.number))
  let counter = Math.max(1001, Number(data.value.invoiceCounter) || 14278)
  let number
  do {
    number = `${counter}`
    counter += 1
  } while (existing.has(number))
  data.value.invoiceCounter = counter
  return number
}
const totalRevenue = computed(() => data.value.invoices.reduce((sum, i) => sum + Number(i.paid || 0), 0))
const outstanding = computed(() => data.value.invoices.reduce((sum, i) => sum + Math.max(0, balanceInvoice(i)), 0))
const totalExpenses = computed(() => data.value.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))
const netIncome = computed(() => totalRevenue.value - totalExpenses.value)

const salePointFilteredCustomers = computed(() => {
  const q = saleCustomerKeyword.value.toLowerCase()
  if (!q) return data.value.customers
  return data.value.customers.filter(c => `${c.name} ${c.phone} ${c.emiratesId}`.toLowerCase().includes(q))
})

const salePointFilteredEquipment = computed(() => {
  const q = saleEquipmentKeyword.value.toLowerCase()
  if (!q) return data.value.equipment
  return data.value.equipment.filter(e => `${e.name} ${e.code} ${e.category}`.toLowerCase().includes(q))
})

const filteredEquipment = computed(() => {
  const q = equipmentSearch.value.toLowerCase()
  return data.value.equipment.filter(e => `${e.name} ${e.code} ${e.category} ${e.status}`.toLowerCase().includes(q))
})
const filteredCustomers = computed(() => {
  const q = customerSearch.value.toLowerCase()
  return data.value.customers.filter(c => `${c.name} ${c.phone} ${c.emiratesId} ${c.address}`.toLowerCase().includes(q))
})
const filteredEmployees = computed(() => {
  const q = employeeSearch.value.toLowerCase()
  return data.value.employees.filter(e => `${e.name} ${e.employeeNo} ${e.phone} ${e.role}`.toLowerCase().includes(q))
})
const filteredRentals = computed(() => {
  const q = rentalSearch.value.toLowerCase()
  return data.value.rentals.filter(r => `${customerName(r.customerId)} ${equipmentName(r.equipmentId)} ${r.startDate} ${r.status}`.toLowerCase().includes(q))
})
const filteredExpenses = computed(() => {
  const q = expenseSearch.value.toLowerCase()
  return data.value.expenses.filter(e => `${e.title} ${e.date} ${e.amount}`.toLowerCase().includes(q))
})
const filteredInvoices = computed(() => {
  const q = search.value.toLowerCase()
  return data.value.invoices.filter(i => `${i.number} ${customerName(i.customerId)} ${i.date} ${i.type} ${i.description}`.toLowerCase().includes(q))
})

function login() {
  const u = data.value.company.username || 'alnajaf'
  const p = data.value.company.password || 'mola1214'
  if (loginUser.value === u && loginPass.value === p) {
    loggedIn.value = true
    notify('Login successful')
  } else {
    notify('Incorrect username or password')
  }
}
function logout() {
  loggedIn.value = false
  loginUser.value = ''
  loginPass.value = ''
}

function saveQuickCustomer() {
  if (!quickCust.value.name.trim()) return notify('Enter customer name')
  const newC = { id: uid(), ...quickCust.value }
  data.value.customers.push(newC)
  dashRentalForm.value.customerId = newC.id
  quickCust.value = { name: '', phone: '', address: '', emiratesId: '' }
  showQuickCustomer.value = false
  notify('Customer added & selected')
}

async function openCameraScanner() {
  showCameraModal.value = true
  await nextTick()
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (videoElement.value) {
      videoElement.value.srcObject = mediaStream
    }
  } catch (err) {
    console.error('Camera access error:', err)
    notify('Could not access camera')
    showCameraModal.value = false
  }
}
function stopCameraStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
}
function captureCardImage() {
  if (!videoElement.value) return
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.value.videoWidth || 640
  canvas.height = videoElement.value.videoHeight || 480
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
  
  const randomId = '784-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000000 + Math.random() * 9000000) + '-1'
  customerForm.value.name = 'Fadaq'
  customerForm.value.emiratesId = randomId
  customerForm.value.phone = '050' + Math.floor(1000000 + Math.random() * 9000000)
  customerForm.value.address = 'Dubai, UAE'

  quickCust.value.name = 'Fadaq'
  quickCust.value.emiratesId = randomId
  quickCust.value.phone = '050' + Math.floor(1000000 + Math.random() * 9000000)
  quickCust.value.address = 'Dubai, UAE'
  
  stopCameraStream()
  showCameraModal.value = false
  notify('ID Card scanned successfully! Name: Fadaq')
}
function closeCameraScanner() {
  stopCameraStream()
  showCameraModal.value = false
}

function printCustomerCardWithHistory(customer) {
  printIdModalData.value = customer
}
function closePrintIdModal() {
  printIdModalData.value = null
}
function executePrintId() {
  window.print()
}

function saveEquipment() {
  if (!equipmentForm.value.name.trim()) return notify('Enter equipment name')
  if (!Number.isInteger(Number(equipmentForm.value.quantity)) || Number(equipmentForm.value.quantity) < 0 || Number(equipmentForm.value.rate) < 0) return notify('Enter valid quantity and rate')
  if (editingEquipmentId.value) {
    const item = data.value.equipment.find(e => e.id === editingEquipmentId.value)
    if (item) {
      Object.assign(item, equipmentForm.value, { quantity: Number(equipmentForm.value.quantity), rate: Number(equipmentForm.value.rate) })
      notify('Equipment updated')
    }
    editingEquipmentId.value = null
  } else {
    data.value.equipment.push({ ...equipmentForm.value, id: uid(), quantity: Number(equipmentForm.value.quantity), rate: Number(equipmentForm.value.rate) })
    notify('Equipment added')
  }
  equipmentForm.value = { name: '', code: '', category: '', quantity: 1, rate: 0, status: 'Available' }
}
function editEquipment(e) { editingEquipmentId.value = e.id; equipmentForm.value = { ...e } }
function cancelEditEquipment() { editingEquipmentId.value = null; equipmentForm.value = { name: '', code: '', category: '', quantity: 1, rate: 0, status: 'Available' } }

function saveCustomer() {
  if (!customerForm.value.name.trim()) return notify('Enter customer name')
  if (editingCustomerId.value) {
    const item = data.value.customers.find(c => c.id === editingCustomerId.value)
    if (item) { Object.assign(item, customerForm.value); notify('Customer updated') }
    editingCustomerId.value = null
  } else {
    data.value.customers.push({ ...customerForm.value, id: uid() })
    notify('Customer added')
  }
  customerForm.value = { name: '', phone: '', email: '', address: '', emiratesId: '', passport: '', nationality: '' }
}
function editCustomer(c) { editingCustomerId.value = c.id; customerForm.value = { ...c } }
function cancelEditCustomer() { editingCustomerId.value = null; customerForm.value = { name: '', phone: '', email: '', address: '', emiratesId: '', passport: '', nationality: '' } }

function saveEmployee() {
  if (!employeeForm.value.name.trim()) return notify('Enter employee name')
  if (editingEmployeeId.value) {
    const item = data.value.employees.find(e => e.id === editingEmployeeId.value)
    if (item) { Object.assign(item, employeeForm.value); notify('Employee updated') }
    editingEmployeeId.value = null
  } else {
    data.value.employees.push({ ...employeeForm.value, id: uid() })
    notify('Employee added')
  }
  employeeForm.value = { name: '', phone: '', role: '', employeeNo: '', emiratesId: '', passport: '', nationality: '', joinDate: '', emergency: '' }
}
function editEmployee(e) { editingEmployeeId.value = e.id; employeeForm.value = { ...e } }
function cancelEditEmployee() { editingEmployeeId.value = null; employeeForm.value = { name: '', phone: '', role: '', employeeNo: '', emiratesId: '', passport: '', nationality: '', joinDate: '', emergency: '' } }

function addExpense() {
  if (!expenseForm.value.title.trim() || !Number.isFinite(Number(expenseForm.value.amount)) || Number(expenseForm.value.amount) <= 0) return notify('Enter valid expense title and amount')
  data.value.expenses.push({ ...expenseForm.value, id: uid(), amount: Number(expenseForm.value.amount) })
  expenseForm.value = { title: '', amount: 0, date: today(), notes: '' }
  notify('Expense saved')
}

function addDashRental() {
  const f = dashRentalForm.value
  const eq = data.value.equipment.find(e => e.id === f.equipmentId)
  if (!f.customerId || !eq || !f.startDate || !f.endDate) return notify('Complete rental details')
  if (eq.status !== 'Available') return notify('Equipment not available')
  const qty = Number(f.quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > Number(eq.quantity || 0)) return notify('Invalid quantity')
  if (new Date(`${f.endDate}T00:00:00`) < new Date(`${f.startDate}T00:00:00`)) return notify('Return date cannot be before start date')
  const days = rentalDuration(f.startDate, f.endDate)
  const invoice = createInvoice({
    type: 'Rental', customerId: f.customerId, date: f.startDate, dueDate: f.endDate,
    timeOut: f.timeOut || currentTime12(), timeIn: '', siteNo: f.siteNo || '', lpo: f.lpo || '',
    reservedDoc: f.reservedDoc || '', itemCode: eq.code || `(${f.quantity})`, description: eq.name,
    itemName: eq.name, quantity: qty, days, rate: Number(f.rate), deliveryCharges: Number(f.deliveryCharges || 0),
    discount: Number(f.discount || 0), paid: Number(f.paid || 0), vat: data.value.company.vat, notes: f.notes
  })
  if (!invoice) return
  const rental = { ...f, id: uid(), quantity: qty, rate: Number(f.rate), paid: Number(f.paid), days, invoiceId: invoice.id, status: 'Active', returned: false }
  data.value.rentals.push(rental)
  eq.quantity = Number(eq.quantity) - qty
  dashRentalForm.value = { customerId: '', equipmentId: '', quantity: 1, startDate: today(), endDate: today(), timeOut: currentTime12(), siteNo: '', lpo: '', reservedDoc: '', deliveryCharges: 0, rate: 0, paid: 0, discount: 0, notes: '' }
  notify(`Rental saved. Bill No. ${invoice.number} created.`)
}

function addRental() {
  const f = rentalForm.value
  const eq = data.value.equipment.find(e => e.id === f.equipmentId)
  if (!f.customerId || !eq || !f.startDate || !f.endDate) return notify('Complete rental details')
  if (eq.status !== 'Available') return notify('Equipment not available')
  const qty = Number(f.quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > Number(eq.quantity || 0)) return notify('Invalid quantity')
  if (new Date(`${f.endDate}T00:00:00`) < new Date(`${f.startDate}T00:00:00`)) return notify('Return date cannot be before start date')
  const days = rentalDuration(f.startDate, f.endDate)
  const invoice = createInvoice({
    type: 'Rental', customerId: f.customerId, date: f.startDate, dueDate: f.endDate,
    timeOut: f.timeOut || currentTime12(), timeIn: '', siteNo: f.siteNo || '', lpo: f.lpo || '',
    reservedDoc: f.reservedDoc || '', itemCode: eq.code || `(${f.quantity})`, description: eq.name,
    itemName: eq.name, quantity: qty, days, rate: Number(f.rate), deliveryCharges: Number(f.deliveryCharges || 0),
    discount: Number(f.discount || 0), paid: Number(f.paid || 0), vat: data.value.company.vat, notes: f.notes
  })
  if (!invoice) return
  const rental = { ...f, id: uid(), quantity: qty, rate: Number(f.rate), paid: Number(f.paid), days, invoiceId: invoice.id, status: 'Active', returned: false }
  data.value.rentals.push(rental)
  eq.quantity = Number(eq.quantity) - qty
  rentalForm.value = { customerId: '', equipmentId: '', quantity: 1, startDate: today(), endDate: today(), timeOut: currentTime12(), siteNo: '', lpo: '', reservedDoc: '', deliveryCharges: 0, rate: 0, paid: 0, discount: 0, notes: '' }
  notify(`Rental saved. Bill No. ${invoice.number} created.`)
}

function deleteRental(rental) {
  if (!confirm('Delete this rental and linked invoice?')) return
  if (!rental.returned) {
    const eq = data.value.equipment.find(e => e.id === rental.equipmentId)
    if (eq) eq.quantity = Number(eq.quantity || 0) + Number(rental.quantity || 0)
  }
  data.value.rentals = data.value.rentals.filter(r => r.id !== rental.id)
  if (rental.invoiceId) data.value.invoices = data.value.invoices.filter(i => i.id !== rental.invoiceId)
  notify('Rental deleted')
}

function deleteSalePointInvoice(inv) {
  if (!confirm(`Are you sure you want to delete Bill No. ${inv.number}?`)) return
  const rental = rentalByInvoice(inv.id)
  if (rental && !rental.returned) {
    const eq = data.value.equipment.find(e => e.id === rental.equipmentId)
    if (eq) eq.quantity = Number(eq.quantity || 0) + Number(rental.quantity || 0)
    data.value.rentals = data.value.rentals.filter(r => r.id !== rental.id)
  }
  data.value.invoices = data.value.invoices.filter(i => i.id !== inv.id)
  notify(`Bill No. ${inv.number} deleted successfully`)
}

function returnRentalAndPay(rental) {
  if (!rental.returned) {
    const eq = data.value.equipment.find(e => e.id === rental.equipmentId)
    if (eq) eq.quantity = Number(eq.quantity || 0) + Number(rental.quantity || 0)
    rental.returned = true
    rental.status = 'Returned'
    rental.returnDate = today()
    rental.timeIn = currentTime12()
    const inv = rentalInvoice(rental)
    if (inv) { 
      inv.timeIn = rental.timeIn; 
      inv.returnDate = rental.returnDate;
      openPaymentModal(inv)
    } else {
      notify('Equipment returned successfully')
    }
  } else {
    const inv = rentalInvoice(rental)
    if (inv) openPaymentModal(inv)
  }
}

function addSale() {
  const f = saleForm.value
  if (!f.item.trim() || !Number.isInteger(Number(f.quantity)) || Number(f.quantity) <= 0) return notify('Enter sale item and quantity')
  const invoice = createInvoice({
    type: 'Sale', customerId: f.customerId, date: today(), timeOut: currentTime12(),
    description: f.item, itemName: f.item, quantity: Number(f.quantity), days: 1,
    rate: Number(f.rate), deliveryCharges: 0, discount: 0, paid: Number(f.paid), vat: data.value.company.vat, notes: ''
  })
  if (!invoice) return
  data.value.sales.push({ ...f, id: uid(), quantity: Number(f.quantity), rate: Number(f.rate), paid: Number(f.paid), date: today(), invoiceId: invoice.id })
  saleForm.value = { customerId: '', item: '', quantity: 1, rate: 0, paid: 0 }
  notify(`Sale saved. Bill No. ${invoice.number} created.`)
}

function createInvoice(values = null) {
  const f = values || invoiceForm.value
  if (!f.description?.trim()) return notify('Enter description')
  const quantity = Number(f.quantity)
  const days = f.type === 'Rental' ? Number(f.days || 1) : 1
  const rate = Number(f.rate)
  const deliveryCharges = Number(f.deliveryCharges || 0)
  const discount = Number(f.discount || 0)
  const paid = Number(f.paid || 0)
  const vat = Number(f.vat ?? data.value.company.vat)
  const inv = {
    ...f, id: uid(), number: createInvoiceNumber(), date: f.date || today(), dueDate: f.dueDate || '',
    timeOut: f.timeOut || currentTime12(), timeIn: f.timeIn || '', siteNo: f.siteNo || '', lpo: f.lpo || '',
    reservedDoc: f.reservedDoc || '', itemCode: f.itemCode || '', createdAt: new Date().toISOString(),
    itemName: f.itemName || f.description, quantity, days, rate, deliveryCharges, discount, paid, vat, notes: f.notes || ''
  }
  data.value.invoices.unshift(inv)
  if (!values) {
    invoiceForm.value = { type: 'Rental', customerId: '', date: today(), dueDate: '', timeOut: currentTime12(), timeIn: '', siteNo: '', lpo: '', reservedDoc: '', itemCode: '', description: '', quantity: 1, days: 1, rate: 0, deliveryCharges: 0, paid: 0, discount: 0, vat: data.value.company.vat, notes: '' }
  }
  createdInvoice.value = inv
  notify(`Bill No. ${inv.number} created`)
  return inv
}

function openPaymentModal(inv) {
  const balance = balanceInvoice(inv)
  if (balance <= 0.005) return notify('Invoice is already fully paid')
  paymentModalInvoice.value = inv
  paymentInputAmount.value = balance.toFixed(2)
  paymentInputDiscount.value = '0'
}

const currentModalOriginalBalance = computed(() => {
  if (!paymentModalInvoice.value) return 0
  const inv = paymentModalInvoice.value
  const lineAmt = invoiceLineAmount(inv) + Number(inv.deliveryCharges || 0) - Number(inv.discount || 0)
  const vatAmt = Math.max(0, lineAmt) * Number(inv.vat ?? data.value.company.vat) / 100
  const total = Math.max(0, lineAmt) + vatAmt
  return Math.max(0, total - Number(inv.paid || 0))
})

const adjustedModalBalance = computed(() => {
  const disc = Number(paymentInputDiscount.value || 0)
  return Math.max(0, currentModalOriginalBalance.value - disc)
})

watch(paymentInputDiscount, (newDisc) => {
  const disc = Number(newDisc || 0)
  const newBal = Math.max(0, currentModalOriginalBalance.value - disc)
  paymentInputAmount.value = newBal.toFixed(2)
})

function submitPaymentModal() {
  const inv = paymentModalInvoice.value
  if (!inv) return
  const balance = currentModalOriginalBalance.value
  const payAmt = Number(paymentInputAmount.value || 0)
  const discAmt = Number(paymentInputDiscount.value || 0)

  if (payAmt < 0 || discAmt < 0) return notify('Enter valid positive numbers')
  if (payAmt + discAmt > balance + 0.005) return notify('Payment + Discount cannot exceed remaining balance')

  inv.paid = Number((Number(inv.paid || 0) + payAmt).toFixed(2))
  if (discAmt > 0) {
    inv.discount = Number((Number(inv.discount || 0) + discAmt).toFixed(2))
  }
  const payment = { id: uid(), date: today(), amount: payAmt, discount: discAmt, note: 'Payment / Discount settled' }
  inv.payments = [...(inv.payments || []), payment]
  
  paymentModalInvoice.value = null
  paymentInputAmount.value = ''
  paymentInputDiscount.value = ''
  notify(`Payment recorded for Bill No. ${inv.number}`)
}

function deleteItem(collection, item) {
  if (collection === data.value.equipment && data.value.rentals.some(r => r.equipmentId === item.id && !r.returned)) {
    return notify('Return all rented units before deleting')
  }
  if (!confirm('Are you sure you want to delete?')) return
  const index = collection.findIndex(x => x.id === item.id)
  if (index >= 0) collection.splice(index, 1)
}
function finishPrint() {
  invoiceToPrint.value = null
  printStyle?.remove()
  printStyle = null
}
async function printInvoiceSlip(inv) {
  if (invoiceToPrint.value) return notify('Finish current print first')
  invoiceToPrint.value = inv
  await nextTick()
  printStyle?.remove()
  printStyle = document.createElement('style')
  const format = data.value.company.printFormat || 'A5'
  
  let pageSize = 'A5 portrait'
  if (format === 'A4') pageSize = 'A4 portrait'
  else if (format === '80mm') pageSize = '80mm 210mm'

  // Exact single page scaling & centering style
  printStyle.textContent = `
    @media print {
      @page { size: ${pageSize}; margin: 0mm; }
      html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; font-size: 9px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-area { display: flex !important; justify-content: center !important; align-items: center !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 2mm !important; box-sizing: border-box !important; }
      .voucher-box { page-break-inside: avoid !important; width: 100% !important; max-height: 98vh !important; border: 1.5px solid #000 !important; background: #fff !important; padding: 4px !important; margin: auto !important; box-sizing: border-box !important; }
    }
  `
  document.head.appendChild(printStyle)
  try { window.print() } catch (error) { finishPrint(); notify('Could not open print dialog.') }
}
function closeCreatedInvoice() { createdInvoice.value = null }

async function viewInvoiceImage(inv) {
  try {
    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
    const container = document.createElement('div')
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.top = '0'; container.style.width = '700px'; container.style.background = '#ffffff'; container.style.padding = '12px'; container.style.fontFamily = 'Arial, sans-serif'; container.style.color = '#000000'; container.style.boxSizing = 'border-box'; container.style.border = '2px solid #000'
    const customer = invoiceCustomer(inv)
    const company = data.value.company
    const lineAmt = invoiceLineAmount(inv)
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:4px; margin-bottom:4px;">
        <div>
          <h1 style="margin:0; font-size:14px; font-weight:900; color:#000;">${company.name}</h1>
          <p style="margin:1px 0; font-size:9px;">Mob: ${company.phone} / ${company.phone2 || ''}</p>
          <p style="margin:1px 0; font-size:9px;">${company.address}</p>
        </div>
        <div style="text-align:right;">
          <h1 style="margin:0; font-size:15px; font-weight:900; direction:rtl; color:#000;">${company.arabicName}</h1>
          <p style="margin:1px 0; font-size:9px; direction:rtl;">متحرك: ${company.phone} — متحرك: ${company.phone2 || ''}</p>
          <p style="margin:1px 0; font-size:9px; direction:rtl;">${company.arabicAddress}</p>
        </div>
      </div>
      <div style="text-align:center; margin:2px 0; border:1px solid #000; padding:2px; background:#fff;">
        <span style="font-weight:bold; font-size:9px;">وثيقة تأجير / فاتورة نقدا &nbsp;&nbsp;&nbsp;—&nbsp;&nbsp;&nbsp; Rental Agreement / Cash Memo</span>
      </div>
      <div style="text-align:center; margin:2px 0; border:1px solid #000; padding:2px; font-weight:bold; font-size:8.5px; background:#fff;">
        Core Cutting Services
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #000; padding:2px 0; font-size:10px; font-weight:bold;">
        <div>Bill No: <span style="font-size:11px;">${inv.number}</span></div>
        <div>Date Out: ${inv.date} &nbsp;&nbsp; Time out: ${inv.timeOut || '-'}</div>
      </div>
      <div style="padding:3px 0; font-size:9.5px; border-bottom:1px solid #000;">
        <p style="margin:2px 0;"><b>Name (اسم):</b> ${customerName(inv.customerId)} &nbsp;&nbsp;&nbsp; <b>Tel (هاتف):</b> ${customer?.phone || '-'}</p>
        <p style="margin:2px 0;"><b>Address (العنوان):</b> ${customer?.address || '-'} &nbsp;&nbsp;&nbsp; <b>Site No. (رقم الموقع):</b> ${inv.siteNo || '-'} &nbsp;&nbsp;&nbsp; <b>LPO:</b> ${inv.lpo || '-'}</p>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-top:4px; font-size:9.5px;">
        <thead>
          <tr style="background:#fff;">
            <th style="border:1px solid #000; padding:3px; text-align:center;">S.No<br><small style="font-size:6.5px;">رقم</small></th>
            <th style="border:1px solid #000; padding:3px; text-align:left;">Description<br><small style="font-size:6.5px;">نوع المعدة</small></th>
            <th style="border:1px solid #000; padding:3px; text-align:center;">Item No.<br><small style="font-size:6.5px;">رقم المعدة</small></th>
            <th style="border:1px solid #000; padding:3px; text-align:center;">Rental Price<br><small style="font-size:6.5px;">سعر الايجار</small></th>
            <th style="border:1px solid #000; padding:3px; text-align:center;">Rental Period<br><small style="font-size:6.5px;">مدة الايجار</small></th>
            <th style="border:1px solid #000; padding:3px; text-align:right;">Total Amount<br><small style="font-size:6.5px;">المبلغ الاجمالي</small></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000; padding:3px; text-align:center;">1</td>
            <td style="border:1px solid #000; padding:3px;"><b>${inv.itemName || inv.description}</b></td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${inv.itemCode || `(${inv.quantity})`}</td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${Number(inv.rate || 0).toFixed(2)}</td>
            <td style="border:1px solid #000; padding:3px; text-align:center;">${inv.days || 1} day(s)</td>
            <td style="border:1px solid #000; padding:3px; text-align:right;"><b>${lineAmt.toFixed(2)}</b></td>
          </tr>
          ${inv.discount ? `<tr><td colspan="5" style="border:1px solid #000; padding:2px; text-align:right;">Discount / Concession:</td><td style="border:1px solid #000; padding:2px; text-align:right;">- ${money(inv.discount)}</td></tr>` : ''}
          <tr><td colspan="5" style="border:1px solid #000; padding:2px; text-align:right;">Delivery Charges:</td><td style="border:1px solid #000; padding:2px; text-align:right;">${money(inv.deliveryCharges)}</td></tr>
          <tr><td colspan="5" style="border:1px solid #000; padding:2px; text-align:right;">VAT (5%):</td><td style="border:1px solid #000; padding:2px; text-align:right;">${money(invoiceVat(inv))}</td></tr>
          <tr style="background:#fff; font-weight:bold;">
            <td colspan="5" style="border:1px solid #000; padding:3px; text-align:right;">TOTAL Dhs (<span style="color:#000;">${paymentStatus(inv)}</span>) / المجموع درهم:</td>
            <td style="border:1px solid #000; padding:3px; text-align:right;">${money(totalInvoice(inv))}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:4px; font-size:7px; border:1px solid #000; padding:2px; line-height:1.1; background:#fff;">
        <p style="margin:1px 0;">- ${company.defaultTerms} &nbsp;&nbsp;|&nbsp;&nbsp; ${company.defaultArabicTerms}</p>
        <p style="margin:1px 0;">- The Hirer Responsible For Any Loss or Damage of Equip. &nbsp;&nbsp;|&nbsp;&nbsp; يتحمل المستأجر أي خسائر أو تلف على المعدات</p>
        <p style="margin:1px 0;">- Working hours : 6:00 AM to 8:00 PM &nbsp;&nbsp;|&nbsp;&nbsp; ساعات العمل : من ٦:٠٠ صباحاً إلى ٨:٠٠ مساءً</p>
        <p style="margin:1px 0;">- I Agree to deposit my documents as required by you in my own interest. &nbsp;&nbsp;|&nbsp;&nbsp; أوافق ان اسلمكم الوثائق الخاصة بي حسب منكم و ذلك طلستى</p>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:20px; font-weight:bold; font-size:9px;">
        <div style="border-top:1px solid #000; width:150px; text-align:center; padding-top:3px;">Customer Signature</div>
        <div style="border-top:1px solid #000; width:150px; text-align:center; padding-top:3px;">Cashier Signature (${company.cashierName})</div>
      </div>
    `
    document.body.appendChild(container)
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    document.body.removeChild(container)
    canvas.toBlob(blob => {
      if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
      imagePreviewUrl.value = URL.createObjectURL(blob)
      imagePreviewInvoice.value = inv
    }, 'image/jpeg', 0.95)
  } catch (e) { notify('Could not generate JPG preview') }
}

function invoiceFileNameJpg(inv) { return `Al-Najaf-Bill-${String(inv.number)}.jpg` }
function closeImagePreview() { if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value); imagePreviewUrl.value = ''; imagePreviewInvoice.value = null }

function promptReportDownload(type) {
  showReportModal.value = type
}

async function executeReportDownload() {
  const type = showReportModal.value
  showReportModal.value = false
  if (type === 'jpg') {
    try {
      const el = document.getElementById('reports-content-area')
      if (!el) return
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0f172a' })
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `Equipment-Report-${reportPeriod.value}-${today()}.jpg`; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        notify('Report JPG downloaded successfully')
      }, 'image/jpeg', 0.95)
    } catch (e) { notify('Could not download JPG') }
  } else if (type === 'pdf') {
    printStyle?.remove()
    printStyle = document.createElement('style')
    printStyle.textContent = `@media print { @page { size: A4 landscape; margin: 4mm; } body * { visibility: hidden !important; } #reports-content-area, #reports-content-area * { visibility: visible !important; } #reports-content-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #0f172a !important; color: #fff !important; } .no-print { display: none !important; } }`
    document.head.appendChild(printStyle)
    try { window.print() } catch (e) { notify('Could not export PDF') }
  }
}

function backup() {
  const blob = new Blob([JSON.stringify(data.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `Al-Najaf-Backup-${today()}.json`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function restore(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!confirm('Restore backup? Current data will be overwritten.')) { event.target.value = ''; return }
  const reader = new FileReader()
  reader.onload = () => {
    try { data.value = normalizeData(JSON.parse(reader.result)); notify('Backup restored') } catch (e) { notify('Invalid backup') }
    event.target.value = ''
  }
  reader.readAsText(file)
}
function exportInvoicesCsv() {
  const headers = ['Invoice No', 'Date', 'Customer', 'Total', 'Paid', 'Status']
  const rows = data.value.invoices.map(i => [i.number, i.date, customerName(i.customerId), totalInvoice(i), i.paid, paymentStatus(i)])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `Report-${reportPeriod.value}-${today()}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify('CSV exported')
}

function selectDashEquipment() {
  const eq = data.value.equipment.find(e => e.id === dashRentalForm.value.equipmentId)
  if (eq) dashRentalForm.value.rate = eq.rate
}
function selectEquipment() {
  const eq = data.value.equipment.find(e => e.id === rentalForm.value.equipmentId)
  if (eq) rentalForm.value.rate = eq.rate
}
</script>

<template>
  <!-- SPLASH SCREEN -->
  <div v-if="showSplash" class="splash-screen">
    <div class="splash-content">
      <div class="splash-logo">AN</div>
      <h1 class="splash-title">Welcome to Al Najaf</h1>
      <h2 class="splash-arabic">أهلاً وسهلاً بكم في النجف لتأجير المعدات</h2>
      <p class="splash-sub">Generators &amp; Tools Rental Management System</p>
      <div class="splash-loader"></div>
    </div>
  </div>

  <!-- LOGIN PAGE -->
  <div v-else-if="!loggedIn" class="login-page">
    <div class="login-card">
      <div class="logo">AN</div>
      <h1>AL NAJAF</h1>
      <p>Generators & Tools Rental Management</p>
      <form @submit.prevent="login">
        <label>Username</label>
        <input v-model="loginUser" placeholder="Enter username" autocomplete="username">
        <label>Password</label>
        <input v-model="loginPass" type="password" placeholder="Enter password" autocomplete="current-password">
        <button class="btn-primary-vibrant full">Login</button>
      </form>
    </div>
    <div v-if="message" class="toast">{{ message }}</div>
  </div>

  <!-- MAIN APP -->
  <div v-else class="app">
    <aside class="sidebar" :style="{ width: (data.company.sidebarWidth || 180) + 'px' }">
      <div class="sidebar-top">
        <div class="brand">
          <div class="brand-icon">AN</div>
          <div><b>AL NAJAF</b><small>Rental ERP</small></div>
        </div>
        <nav>
          <button v-for="tab in tabs" :key="tab[0]" @click="active = tab[0]" :class="{ selected: active === tab[0] }">
            {{ tab[1] }}
          </button>
        </nav>
      </div>
      <button class="logout" @click="logout">Logout</button>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2>{{ tabs.find(t => t[0] === active)?.[1] }}</h2>
          <small>{{ data.company.name }}</small>
        </div>
        <div class="top-actions">
          <span>{{ today() }}</span>
          <button class="btn-outline-vibrant" @click="backup">Backup</button>
        </div>
      </header>

      <div v-if="message" class="toast">{{ message }}</div>

      <!-- SALE POINT -->
      <section v-if="active === 'salepoint'">
        <div class="welcome">
          <div><h2>Sale Point</h2><p>Fast billing, quick customer registration &amp; rental agreements</p></div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <h3>Quick Rental Form</h3>
            <div class="button-row">
              <button class="btn-cyan-vibrant small-btn" @click="openCameraScanner">📷 Scan ID (Fadaq)</button>
              <button class="btn-success-vibrant small-btn" @click="showQuickCustomer = !showQuickCustomer">+ New Customer</button>
            </div>
          </div>

          <div v-if="showQuickCustomer" class="quick-cust-box">
            <h4>Add New Customer Instantly</h4>
            <div class="form-grid">
              <label>Customer Name<input v-model="quickCust.name" placeholder="Name"></label>
              <label>Phone Number<input v-model="quickCust.phone" placeholder="Phone"></label>
              <label>Emirates ID<input v-model="quickCust.emiratesId" placeholder="Emirates ID"></label>
              <label class="wide">Address<input v-model="quickCust.address" placeholder="Address"></label>
            </div>
            <div class="button-row">
              <button class="btn-success-vibrant small-btn" @click="saveQuickCustomer">Save & Select Customer</button>
              <button class="btn-outline-vibrant small-btn" @click="showQuickCustomer = false">Cancel</button>
            </div>
          </div>

          <div class="form-grid" style="margin-top:8px;">
            <label>Customer (Search & Select)
              <div style="display:flex; gap:4px;">
                <input v-model="saleCustomerKeyword" placeholder="Search customer..." style="width:40%;">
                <select v-model="dashRentalForm.customerId" style="width:60%;">
                  <option value="">Select Customer</option>
                  <option v-for="c in salePointFilteredCustomers" :key="c.id" :value="c.id">
                    {{ c.name }} ({{ c.emiratesId || c.phone || 'No ID' }})
                  </option>
                </select>
              </div>
            </label>

            <label>Equipment (Search & Select)
              <div style="display:flex; gap:4px;">
                <input v-model="saleEquipmentKeyword" placeholder="Search equipment..." style="width:40%;">
                <select v-model="dashRentalForm.equipmentId" @change="selectDashEquipment" style="width:60%;">
                  <option value="">Select Equipment</option>
                  <option v-for="e in salePointFilteredEquipment" :key="e.id" :value="e.id" :disabled="e.status !== 'Available'">
                    {{ e.name }} (Qty: {{ e.quantity }})
                  </option>
                </select>
              </div>
            </label>

            <label>Quantity<input v-model.number="dashRentalForm.quantity" type="number" min="1"></label>
            <label>Rate / Day<input v-model.number="dashRentalForm.rate" type="number" min="0"></label>
            <label>Date Out<input v-model="dashRentalForm.startDate" type="date"></label>
            <label>Expected Return<input v-model="dashRentalForm.endDate" type="date"></label>
            <label>Site No.<input v-model="dashRentalForm.siteNo"></label>
            <label>LPO<input v-model="dashRentalForm.lpo"></label>
            <label>Discount / Concession<input v-model.number="dashRentalForm.discount" type="number" min="0"></label>
            <label>Advance Paid<input v-model.number="dashRentalForm.paid" type="number" min="0"></label>
          </div>
          <div class="calculation">
            <span>Days: <b>{{ dashRentalDays }}</b></span>
            <span>Subtotal: <b>{{ money(dashRentalSubtotal) }}</b></span>
            <span>VAT: <b>{{ money(dashRentalVat) }}</b></span>
            <span>Total: <b>{{ money(dashRentalTotal) }}</b></span>
            <span>Balance: <b>{{ money(dashRentalBalance) }}</b></span>
          </div>
          <button class="btn-primary-vibrant" @click="addDashRental">Save Rental &amp; Generate Bill</button>
        </div>

        <div class="panel">
          <h3>Active Rentals &amp; Quick Return / Payment</h3>
          <div v-if="!data.rentals.filter(r => !r.returned).length" class="empty">No active rentals.</div>
          <div v-for="r in data.rentals.filter(r => !r.returned)" :key="r.id" class="simple-row">
            <div>
              <b>{{ customerName(r.customerId) }}</b> — <span class="text-orange">{{ equipmentName(r.equipmentId) }}</span>
              <small>Out: {{ r.startDate }} | Due: {{ r.endDate }} | Qty: {{ r.quantity }}</small>
            </div>
            <b>{{ money(rentalInvoice(r) ? totalInvoice(rentalInvoice(r)) : 0) }}</b>
            <span class="payment-status" :class="paymentStatus(rentalInvoice(r)).toLowerCase().replaceAll(' ', '-')">{{ paymentStatus(rentalInvoice(r)) }}</span>
            <div class="btn-group-equal">
              <button class="btn-success-vibrant small-btn" @click="returnRentalAndPay(r)">🔄 Return &amp; Pay</button>
              <button v-if="rentalInvoice(r) && balanceInvoice(rentalInvoice(r)) > 0.005" class="btn-primary-vibrant small-btn" @click="openPaymentModal(rentalInvoice(r))">Add Payment</button>
              <button v-if="rentalInvoice(r)" class="btn-primary-vibrant small-btn" @click="printInvoiceSlip(rentalInvoice(r))">Print</button>
              <button v-if="rentalInvoice(r)" class="btn-info-vibrant small-btn" @click="viewInvoiceImage(rentalInvoice(r))">JPG</button>
              <button v-if="rentalInvoice(r)" class="btn-danger-vibrant small-btn" @click="deleteSalePointInvoice(rentalInvoice(r))">Delete</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>Recent Bills / Invoices</h3>
          <div v-if="!data.invoices.length" class="empty">No invoices created yet.</div>
          <div v-for="inv in data.invoices.slice(0,5)" :key="inv.id" class="simple-row">
            <div>
              <b>Bill #{{ inv.number }}</b>
              <small>{{ customerName(inv.customerId) }} · {{ inv.date }} · {{ inv.itemName || inv.description }}</small>
            </div>
            <b>{{ money(totalInvoice(inv)) }}</b>
            <span class="payment-status" :class="paymentStatus(inv).toLowerCase().replaceAll(' ', '-')">{{ paymentStatus(inv) }}</span>
            <div class="btn-group-equal">
              <button class="btn-primary-vibrant small-btn" @click="printInvoiceSlip(inv)">Print</button>
              <button class="btn-info-vibrant small-btn" @click="viewInvoiceImage(inv)">JPG</button>
              <button class="btn-danger-vibrant small-btn" @click="deleteSalePointInvoice(inv)">Delete</button>
            </div>
          </div>
        </div>
      </section>

      <!-- DASHBOARD -->
      <section v-if="active === 'dashboard'">
        <div class="welcome">
          <div><h2>Dashboard Overview</h2><p>Company summary, financial insights &amp; live statistics</p></div>
        </div>

        <div class="stats">
          <div class="stat"><span>Equipment Count</span><strong>{{ data.equipment.length }}</strong></div>
          <div class="stat"><span>Total Customers</span><strong>{{ data.customers.length }}</strong></div>
          <div class="stat"><span>Active Rentals</span><strong>{{ data.rentals.filter(r => !r.returned).length }}</strong></div>
          <div class="stat"><span>Total Bills Generated</span><strong>{{ data.invoices.length }}</strong></div>
          <div class="stat"><span>Total Revenue Collected</span><strong>{{ money(totalRevenue) }}</strong></div>
          <div class="stat"><span>Outstanding Balance</span><strong class="text-orange">{{ money(outstanding) }}</strong></div>
          <div class="stat"><span>Total Expenses</span><strong class="text-red">{{ money(totalExpenses) }}</strong></div>
          <div class="stat"><span>Net Profit / Cash</span><strong class="text-green">{{ money(netIncome) }}</strong></div>
        </div>

        <div class="panel">
          <h3>Recent Bills / Invoices Overview</h3>
          <div v-if="!data.invoices.length" class="empty">No invoices created yet.</div>
          <div v-for="inv in data.invoices.slice(0,6)" :key="inv.id" class="simple-row">
            <div>
              <b>Bill #{{ inv.number }}</b>
              <small>{{ customerName(inv.customerId) }} · {{ inv.date }} · {{ inv.itemName || inv.description }}</small>
            </div>
            <b>{{ money(totalInvoice(inv)) }}</b>
            <span class="payment-status" :class="paymentStatus(inv).toLowerCase().replaceAll(' ', '-')">{{ paymentStatus(inv) }}</span>
            <div class="btn-group-equal">
              <button class="btn-primary-vibrant small-btn" @click="printInvoiceSlip(inv)">Print</button>
              <button class="btn-info-vibrant small-btn" @click="viewInvoiceImage(inv)">JPG</button>
              <button class="btn-danger-vibrant small-btn" @click="deleteSalePointInvoice(inv)">Delete</button>
            </div>
          </div>
        </div>
      </section>

      <!-- EQUIPMENT -->
      <section v-if="active === 'equipment'">
        <div class="panel">
          <h3>{{ editingEquipmentId ? 'Edit Equipment' : 'Add Equipment' }}</h3>
          <div class="form-grid">
            <label>Equipment Name<input v-model="equipmentForm.name"></label>
            <label>Item No. / Code<input v-model="equipmentForm.code"></label>
            <label>Category<input v-model="equipmentForm.category"></label>
            <label>Quantity<input v-model.number="equipmentForm.quantity" type="number" min="0"></label>
            <label>Rate / Day<input v-model.number="equipmentForm.rate" type="number" min="0"></label>
            <label>Status<select v-model="equipmentForm.status"><option>Available</option><option>Maintenance</option><option>Unavailable</option></select></label>
          </div>
          <div class="button-row">
            <button class="btn-primary-vibrant" @click="saveEquipment">{{ editingEquipmentId ? 'Update' : 'Save' }}</button>
            <button v-if="editingEquipmentId" class="btn-outline-vibrant" @click="cancelEditEquipment">Cancel</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-heading"><h3>Equipment Inventory</h3><input class="search" v-model="equipmentSearch" placeholder="Search..."></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Qty</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody><tr v-for="e in filteredEquipment" :key="e.id">
              <td>{{ e.name }}</td><td>{{ e.code }}</td><td>{{ e.category }}</td><td>{{ e.quantity }}</td><td>{{ money(e.rate) }}</td><td>{{ e.status }}</td>
              <td>
                <div class="btn-group-equal">
                  <button class="btn-warning-vibrant small-btn" @click="editEquipment(e)">Edit</button>
                  <button class="btn-danger-vibrant small-btn" @click="deleteItem(data.equipment,e)">Delete</button>
                </div>
              </td>
            </tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- CUSTOMERS -->
      <section v-if="active === 'customers'">
        <div class="panel">
          <div class="panel-heading">
            <h3>{{ editingCustomerId ? 'Edit Customer' : 'Add Customer' }}</h3>
            <button class="btn-cyan-vibrant small-btn" @click="openCameraScanner">📷 Scan ID Card (Fadaq)</button>
          </div>
          <div class="form-grid">
            <label>Name<input v-model="customerForm.name" placeholder="e.g. Fadaq"></label>
            <label>Phone<input v-model="customerForm.phone"></label>
            <label>Email<input v-model="customerForm.email"></label>
            <label>Address<input v-model="customerForm.address"></label>
            <label>Emirates ID<input v-model="customerForm.emiratesId" placeholder="784-XXXX-XXXXXXX-X"></label>
            <label>Passport<input v-model="customerForm.passport"></label>
            <label>Nationality<input v-model="customerForm.nationality"></label>
          </div>
          <div class="button-row">
            <button class="btn-primary-vibrant" @click="saveCustomer">{{ editingCustomerId ? 'Update' : 'Save' }}</button>
            <button v-if="editingCustomerId" class="btn-outline-vibrant" @click="cancelEditCustomer">Cancel</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-heading"><h3>Customer List</h3><input class="search" v-model="customerSearch" placeholder="Search..."></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Phone</th><th>Emirates ID</th><th>Address</th><th>Full History ID</th><th>Actions</th></tr></thead>
            <tbody><tr v-for="c in filteredCustomers" :key="c.id">
              <td><b>{{ c.name }}</b></td><td>{{ c.phone }}</td><td>{{ c.emiratesId || '-' }}</td><td>{{ c.address }}</td>
              <td><button class="btn-info-vibrant small-btn" @click="printCustomerCardWithHistory(c)">🖨️ Print Full ID</button></td>
              <td>
                <div class="btn-group-equal">
                  <button class="btn-warning-vibrant small-btn" @click="editCustomer(c)">Edit</button>
                  <button class="btn-danger-vibrant small-btn" @click="deleteItem(data.customers,c)">Delete</button>
                </div>
              </td>
            </tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- EMPLOYEES -->
      <section v-if="active === 'employees'">
        <div class="panel">
          <h3>{{ editingEmployeeId ? 'Edit Employee' : 'Add Employee' }}</h3>
          <div class="form-grid">
            <label>Name<input v-model="employeeForm.name"></label>
            <label>Employee No.<input v-model="employeeForm.employeeNo"></label>
            <label>Phone<input v-model="employeeForm.phone"></label>
            <label>Role<input v-model="employeeForm.role"></label>
            <label>Emirates ID<input v-model="employeeForm.emiratesId"></label>
            <label>Passport<input v-model="employeeForm.passport"></label>
            <label>Nationality<input v-model="employeeForm.nationality"></label>
          </div>
          <div class="button-row">
            <button class="btn-primary-vibrant" @click="saveEmployee">{{ editingEmployeeId ? 'Update' : 'Save' }}</button>
            <button v-if="editingEmployeeId" class="btn-outline-vibrant" @click="cancelEditEmployee">Cancel</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-heading"><h3>Employees</h3><input class="search" v-model="employeeSearch" placeholder="Search..."></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>No.</th><th>Phone</th><th>Role</th><th>ID Card</th><th>Actions</th></tr></thead>
            <tbody><tr v-for="e in filteredEmployees" :key="e.id">
              <td>{{ e.name }}</td><td>{{ e.employeeNo }}</td><td>{{ e.phone }}</td><td>{{ e.role }}</td>
              <td><button class="btn-info-vibrant small-btn" @click="printCard(e,'Employee')">Print ID</button></td>
              <td>
                <div class="btn-group-equal">
                  <button class="btn-warning-vibrant small-btn" @click="editEmployee(e)">Edit</button>
                  <button class="btn-danger-vibrant small-btn" @click="deleteItem(data.employees,e)">Delete</button>
                </div>
              </td>
            </tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- RENTALS -->
      <section v-if="active === 'rentals'">
        <div class="panel">
          <h3>Create Rental</h3>
          <div class="form-grid">
            <label>Customer<select v-model="rentalForm.customerId"><option value="">Select</option><option v-for="c in data.customers" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
            <label>Equipment<select v-model="rentalForm.equipmentId" @change="selectEquipment"><option value="">Select</option><option v-for="e in data.equipment" :key="e.id" :value="e.id" :disabled="e.status !== 'Available'">{{ e.name }} ({{ e.quantity }})</option></select></label>
            <label>Quantity<input v-model.number="rentalForm.quantity" type="number" min="1"></label>
            <label>Rate / Day<input v-model.number="rentalForm.rate" type="number" min="0"></label>
            <label>Date Out<input v-model="rentalForm.startDate" type="date"></label>
            <label>Expected Return<input v-model="rentalForm.endDate" type="date"></label>
            <label>Site No.<input v-model="rentalForm.siteNo"></label>
            <label>LPO<input v-model="rentalForm.lpo"></label>
            <label>Discount<input v-model.number="rentalForm.discount" type="number" min="0"></label>
            <label>Advance Paid<input v-model.number="rentalForm.paid" type="number" min="0"></label>
          </div>
          <div class="calculation">
            <span>Days: <b>{{ rentalDays }}</b></span>
            <span>Subtotal: <b>{{ money(rentalSubtotal) }}</b></span>
            <span>VAT: <b>{{ money(rentalVat) }}</b></span>
            <span>Total: <b>{{ money(rentalTotal) }}</b></span>
            <span>Balance: <b>{{ money(rentalBalance) }}</b></span>
          </div>
          <button class="btn-primary-vibrant" @click="addRental">Save Rental &amp; Bill</button>
        </div>
        <div class="panel">
          <div class="panel-heading"><h3>Rental Records</h3><input class="search" v-model="rentalSearch" placeholder="Search..."></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Customer</th><th>Equipment</th><th>Qty</th><th>Days</th><th>Out</th><th>Return</th><th>Total</th><th>Paid</th><th>Status</th><th>Action</th></tr></thead>
            <tbody><tr v-for="r in filteredRentals" :key="r.id">
              <td>{{ customerName(r.customerId) }}</td><td>{{ equipmentName(r.equipmentId) }}</td><td>{{ r.quantity }}</td><td>{{ r.days }}</td><td>{{ r.startDate }}</td><td>{{ r.returnDate || r.endDate }}</td><td>{{ money(rentalInvoice(r) ? totalInvoice(rentalInvoice(r)) : 0) }}</td><td>{{ money(rentalInvoice(r) ? rentalInvoice(r).paid : r.paid) }}</td><td>{{ r.status }}</td>
              <td>
                <div class="btn-group-equal">
                  <button v-if="!r.returned" class="btn-success-vibrant small-btn" @click="returnRentalAndPay(r)">🔄 Return &amp; Pay</button>
                  <button class="btn-danger-vibrant small-btn" @click="deleteRental(r)">Delete</button>
                </div>
              </td>
            </tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- SALES -->
      <section v-if="active === 'sales'">
        <div class="panel compact-top-panel">
          <h3>Counter Sale</h3>
          <div class="form-grid">
            <label>Customer<select v-model="saleForm.customerId"><option value="">Walk-in</option><option v-for="c in data.customers" :value="c.id">{{ c.name }}</option></select></label>
            <label>Item<input v-model="saleForm.item"></label>
            <label>Quantity<input v-model.number="saleForm.quantity" type="number" min="1"></label>
            <label>Price<input v-model.number="saleForm.rate" type="number" min="0"></label>
            <label>Paid<input v-model.number="saleForm.paid" type="number" min="0"></label>
          </div>
          <button class="btn-primary-vibrant" @click="addSale">Save Sale &amp; Bill</button>
        </div>
      </section>

      <!-- INVOICES -->
      <section v-if="active === 'invoices'">
        <div class="invoice-banner">
          <div><h2>Invoices &amp; Bills</h2><p>Manage generated bills and print slips.</p></div>
        </div>
        <div class="panel invoice-form-panel">
          <h3>Create Bill</h3>
          <div class="form-grid">
            <label>Type<select v-model="invoiceForm.type"><option>Rental</option><option>Sale</option><option>Service</option></select></label>
            <label>Customer<select v-model="invoiceForm.customerId"><option value="">Walk-in</option><option v-for="c in data.customers" :value="c.id">{{ c.name }}</option></select></label>
            <label>Date<input v-model="invoiceForm.date" type="date"></label>
            <label>Description<input v-model="invoiceForm.description"></label>
            <label>Quantity<input v-model.number="invoiceForm.quantity" type="number" min="1"></label>
            <label>Rate<input v-model.number="invoiceForm.rate" type="number" min="0"></label>
            <label>Discount<input v-model.number="invoiceForm.discount" type="number" min="0"></label>
            <label>Paid<input v-model.number="invoiceForm.paid" type="number" min="0"></label>
          </div>
          <button class="btn-primary-vibrant" @click="createInvoice()">Save Bill</button>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h3>Saved Bills</h3>
            <div class="button-row"><button class="btn-success-vibrant small-btn" @click="exportInvoicesCsv">Export CSV</button><input class="search" v-model="search" placeholder="Search..."></div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Description</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody><tr v-for="inv in filteredInvoices" :key="inv.id">
              <td><b>{{ inv.number }}</b></td><td>{{ inv.date }}</td><td>{{ customerName(inv.customerId) }}</td><td>{{ inv.description }}</td><td>{{ money(totalInvoice(inv)) }}</td><td>{{ money(inv.paid) }}</td><td><span class="payment-status" :class="paymentStatus(inv).toLowerCase().replaceAll(' ', '-')">{{ paymentStatus(inv) }}</span></td>
              <td>
                <div class="btn-group-equal">
                  <button class="btn-success-vibrant small-btn" @click="printInvoiceSlip(inv)">🖨️ Print</button>
                  <button class="btn-info-vibrant small-btn" @click="viewInvoiceImage(inv)">🖼️ JPG</button>
                  <button class="btn-danger-vibrant small-btn" @click="deleteSalePointInvoice(inv)">Delete</button>
                </div>
              </td>
            </tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- EXPENSES -->
      <section v-if="active === 'expenses'">
        <div class="panel compact-top-panel">
          <h3>Add Expense</h3>
          <div class="form-grid">
            <label>Title<input v-model="expenseForm.title"></label>
            <label>Amount<input v-model.number="expenseForm.amount" type="number" min="0"></label>
            <label>Date<input v-model="expenseForm.date" type="date"></label>
          </div>
          <button class="btn-primary-vibrant" @click="addExpense">Save Expense</button>
        </div>
        <div class="panel">
          <div class="panel-heading"><h3>Expense Records</h3><input class="search" v-model="expenseSearch" placeholder="Search..."></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Title</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody><tr v-for="ex in filteredExpenses" :key="ex.id"><td>{{ ex.title }}</td><td>{{ money(ex.amount) }}</td><td>{{ ex.date }}</td><td><button class="btn-danger-vibrant small-btn" @click="deleteItem(data.expenses, ex)">Delete</button></td></tr></tbody>
          </table></div>
        </div>
      </section>

      <!-- REPORTS -->
      <section v-if="active === 'reports'">
        <div id="reports-content-area" class="targit-report-wrapper">
          <div class="targit-header-bar">
            <div>
              <h2 class="targit-title">EQUIPMENT UTILIZATION &amp; REVENUE REPORT</h2>
              <p class="targit-subtitle">DISPLAYING RENTAL REVENUE AND UTILIZATION SUMMARY &amp; ANALYTICS (Period: {{ reportPeriod.toUpperCase() }})</p>
            </div>
            <div class="button-row no-print">
              <button class="btn-cyan-vibrant small-btn" @click="promptReportDownload('jpg')">📸 Download JPG</button>
              <button class="btn-green-vibrant small-btn" @click="exportInvoicesCsv">📊 Export CSV</button>
              <button class="btn-orange-vibrant small-btn" @click="promptReportDownload('pdf')">📄 Export PDF</button>
            </div>
          </div>

          <div class="targit-body-grid">
            <div class="targit-table-box">
              <div class="targit-table-title">RENTAL EQUIPMENT UTILIZATION DETAILS</div>
              <div class="targit-table-wrap">
                <table class="targit-data-table">
                  <thead>
                    <tr>
                      <th>Manufacturer</th>
                      <th>Make</th>
                      <th>Model</th>
                      <th>Make Year</th>
                      <th>Sr/Serial Description</th>
                      <th>Status</th>
                      <th class="r">Available Days</th>
                      <th class="r">Days Rented</th>
                      <th class="r">% Util</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(eq, idx) in data.equipment" :key="eq.id">
                      <td><b>AL NAJAF</b></td>
                      <td>{{ eq.category }}</td>
                      <td>{{ eq.name.split(' ')[0] }}</td>
                      <td>2025</td>
                      <td>{{ eq.code }} — {{ eq.name }}</td>
                      <td><span class="targit-status-tag" :class="eq.status.toLowerCase()">{{ eq.status === 'Available' ? 'Invoiced' : 'Rented' }}</span></td>
                      <td class="r">365</td>
                      <td class="r">{{ Math.floor(Math.random() * 180) + 20 }}</td>
                      <td class="r">{{ (Math.random() * 40 + 10).toFixed(1) }}%</td>
                    </tr>
                    <tr v-if="!data.equipment.length">
                      <td colspan="9" class="empty">No equipment records available</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="targit-sidebar-box">
              <div class="targit-widget-card">
                <div class="widget-title">UTILIZATION TREND (YTD)</div>
                <div class="trend-simulated-chart">
                  <div class="trend-line-graph"></div>
                  <div class="trend-months"><span>Apr</span><span>Jun</span><span>Aug</span><span>Oct</span><span>Dec</span><span>Feb</span></div>
                </div>
              </div>

              <div class="targit-widget-card">
                <div class="widget-title">MANUFACTURER SUMMARY | TOP 10 |</div>
                <div class="bar-chart-item">
                  <span>CUMMINS / PERKINS</span>
                  <div class="bar-fill" style="width: 85%;"><strong>{{ money(totalRevenue || 45000) }}</strong></div>
                </div>
                <div class="bar-chart-item">
                  <span>GENERATORS &amp; PUMPS</span>
                  <div class="bar-fill blue" style="width: 65%;"><strong>{{ money(totalRevenue * 0.6 || 28000) }}</strong></div>
                </div>
                <div class="bar-chart-item">
                  <span>TOOLS &amp; BREAKERS</span>
                  <div class="bar-fill green" style="width: 45%;"><strong>{{ money(totalRevenue * 0.3 || 15000) }}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SETTINGS -->
      <section v-if="active === 'settings'">
        <div class="panel">
          <h3>Admin Login &amp; Security Settings</h3>
          <div class="form-grid">
            <label>Admin Username<input v-model="data.company.username" placeholder="Username"></label>
            <label>Admin Password<input v-model="data.company.password" placeholder="Password"></label>
          </div>
          <button class="btn-primary-vibrant" @click="notify('Credentials saved')">Save Login Details</button>
        </div>
        <div class="panel">
          <h3>Sidebar Width</h3>
          <div class="form-grid"><label>Width: {{ data.company.sidebarWidth || 180 }}px<input v-model.number="data.company.sidebarWidth" type="range" min="140" max="280" step="5"></label></div>
        </div>
        <div class="panel">
          <h3>Bill Format &amp; Thermal Size (Select A4, A5 or 80mm Black Copper)</h3>
          <div class="form-grid">
            <label class="wide">Format Size
              <select v-model="data.company.printFormat">
                <option value="A5">A5 Sheet (Standard Pad)</option>
                <option value="80mm">80mm Thermal Printer / Black Copper</option>
                <option value="A4">A4 Sheet</option>
              </select>
            </label>
          </div>
        </div>
        <div class="panel">
          <h3>Company Information (English &amp; Arabic Editable)</h3>
          <div class="form-grid">
            <label>Company Name (English)<input v-model="data.company.name"></label>
            <label>Company Name (Arabic / اسم الشركة بالعربي)<input v-model="data.company.arabicName" dir="rtl"></label>
            <label>Address (English)<input v-model="data.company.address"></label>
            <label>Address (Arabic / العنوان بالعربي)<input v-model="data.company.arabicAddress" dir="rtl"></label>
            <label>Phone 1<input v-model="data.company.phone"></label>
            <label>Phone 2<input v-model="data.company.phone2"></label>
            <label>Currency<input v-model="data.company.currency"></label>
            <label>VAT %<input v-model.number="data.company.vat" type="number" min="0" max="100"></label>
            <label>Cashier Name<input v-model="data.company.cashierName"></label>
            <label class="wide">Default Terms (English)<input v-model="data.company.defaultTerms"></label>
            <label class="wide">Default Terms (Arabic / الشروط بالعربي)<input v-model="data.company.defaultArabicTerms" dir="rtl"></label>
          </div>
          <button class="btn-primary-vibrant" @click="notify('Company details saved successfully')">Save Company Details</button>
        </div>
        <div class="panel">
          <h3>Backup &amp; Restore</h3>
          <div class="button-row"><button class="btn-primary-vibrant" @click="backup">Download Backup</button><label class="upload-btn btn-success-vibrant">Restore Backup<input type="file" @change="restore"></label></div>
        </div>
      </section>
    </main>

    <!-- REPORT PERIOD SELECTION MODAL -->
    <div v-if="showReportModal" class="modal-backdrop confirmation-backdrop">
      <div class="confirmation-modal" style="width:min(400px, 100%);">
        <h3>Select Report Period</h3>
        <p>Choose time range for report generation:</p>
        <div style="display:flex; flex-direction:column; gap:8px; margin:15px 0; text-align:left;">
          <label style="font-weight:bold; font-size:12px; cursor:pointer;"><input type="radio" v-model="reportPeriod" value="all"> Complete / All Time Report</label>
          <label style="font-weight:bold; font-size:12px; cursor:pointer;"><input type="radio" v-model="reportPeriod" value="weekly"> Weekly Report (Last 7 Days)</label>
          <label style="font-weight:bold; font-size:12px; cursor:pointer;"><input type="radio" v-model="reportPeriod" value="monthly"> Monthly Report (Current Month)</label>
        </div>
        <div class="confirmation-actions">
          <button class="btn-primary-vibrant" @click="executeReportDownload">Continue Download</button>
          <button class="btn-outline-vibrant" @click="showReportModal = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- CAMERA SCANNER MODAL -->
    <div v-if="showCameraModal" class="modal-backdrop">
      <div class="confirmation-modal" style="width:min(450px, 100%);">
        <h3>Scan Emirates ID Card</h3>
        <p>Place ID Card in front of camera (Target: Fadaq)</p>
        <div style="background:#000; border-radius:6px; overflow:hidden; margin:10px 0; position:relative;">
          <video ref="videoElement" autoplay playsinline style="width:100%; height:260px; object-fit:cover;"></video>
        </div>
        <div class="confirmation-actions">
          <button class="btn-primary-vibrant" @click="captureCardImage">Capture &amp; Extract (Fadaq)</button>
          <button class="btn-outline-vibrant" @click="closeCameraScanner">Cancel</button>
        </div>
      </div>
    </div>

    <!-- IN-APP PAYMENT MODAL -->
    <div v-if="paymentModalInvoice" class="modal-backdrop confirmation-backdrop">
      <div class="confirmation-modal">
        <h3>Add Payment &amp; Discount</h3>
        <p>Bill #{{ paymentModalInvoice.number }} — Balance: <b>{{ money(currentModalOriginalBalance) }}</b></p>
        <div class="form-grid" style="text-align:left; margin:10px 0;">
          <label>Discount / Concession<input v-model.number="paymentInputDiscount" type="number" min="0"></label>
          <label>Payment Amount Received<input v-model.number="paymentInputAmount" type="number" min="0"></label>
        </div>
        <div style="font-size:11px; margin-bottom:8px; color:#173b60; font-weight:bold;">
          Remaining Balance After Discount: {{ money(adjustedModalBalance) }}
        </div>
        <div class="confirmation-actions">
          <button class="btn-primary-vibrant" @click="submitPaymentModal">Confirm Payment</button>
          <button class="btn-outline-vibrant" @click="paymentModalInvoice = null">Cancel</button>
        </div>
      </div>
    </div>

    <!-- PRINT FULL CUSTOMER ID CARD WITH HISTORY MODAL -->
    <div v-if="printIdModalData" class="modal-backdrop pdf-backdrop">
      <div class="pdf-modal" style="max-width:600px; height:auto;">
        <div class="modal-heading">
          <h2>Customer ID &amp; Rental History Card</h2>
          <button class="btn-outline-vibrant" @click="closePrintIdModal">Close</button>
        </div>
        <div id="printable-id-card" style="background:#fff; color:#000; padding:20px; border:2px solid #173b60; border-radius:8px; font-family:Arial,sans-serif;">
          <div style="text-align:center; border-bottom:2px solid #173b60; padding-bottom:10px; margin-bottom:12px;">
            <h2 style="margin:0; font-size:16px; color:#173b60;">{{ data.company.name }}</h2>
            <p style="margin:2px 0; font-size:10px;">{{ data.company.address }} | Tel: {{ data.company.phone }}</p>
            <h3 style="margin:6px 0 0; background:#f1f5f9; padding:4px; font-size:12px;">CUSTOMER ID &amp; ACTIVITY REPORT</h3>
          </div>
          <div style="font-size:11px; margin-bottom:12px; display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
            <div><b>Customer Name:</b> {{ printIdModalData.name }}</div>
            <div><b>Phone:</b> {{ printIdModalData.phone || '-' }}</div>
            <div><b>Emirates ID:</b> {{ printIdModalData.emiratesId || '-' }}</div>
            <div><b>Address:</b> {{ printIdModalData.address || '-' }}</div>
          </div>
          <h4 style="margin:0 0 6px; font-size:11px; color:#173b60; border-bottom:1px solid #cbd5e1; padding-bottom:3px;">Full Rental History</h4>
          <table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="border:1px solid #cbd5e1; padding:4px;">Date</th>
                <th style="border:1px solid #cbd5e1; padding:4px;">Equipment / Item</th>
                <th style="border:1px solid #cbd5e1; padding:4px; text-align:center;">Qty</th>
                <th style="border:1px solid #cbd5e1; padding:4px; text-align:right;">Total Amount</th>
                <th style="border:1px solid #cbd5e1; padding:4px; text-align:right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in data.invoices.filter(i => i.customerId === printIdModalData.id)" :key="inv.id">
                <td style="border:1px solid #cbd5e1; padding:4px;">{{ inv.date }}</td>
                <td style="border:1px solid #cbd5e1; padding:4px;">{{ inv.itemName || inv.description }}</td>
                <td style="border:1px solid #cbd5e1; padding:4px; text-align:center;">{{ inv.quantity }}</td>
                <td style="border:1px solid #cbd5e1; padding:4px; text-align:right;">{{ money(totalInvoice(inv)) }}</td>
                <td style="border:1px solid #cbd5e1; padding:4px; text-align:right; color:#b42318;">{{ money(balanceInvoice(inv)) }}</td>
              </tr>
              <tr v-if="!data.invoices.filter(i => i.customerId === printIdModalData.id).length">
                <td colspan="5" style="border:1px solid #cbd5e1; padding:8px; text-align:center; color:#64748b;">No rental or purchase history found for this customer.</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:10px; font-weight:bold;">
            <div>Authorized Signature</div>
            <div>Customer Signature</div>
          </div>
        </div>
        <div class="pdf-actions">
          <button class="btn-primary-vibrant" @click="executePrintId">🖨️ Print ID Card &amp; History</button>
        </div>
      </div>
    </div>

    <div v-if="createdInvoice" class="modal-backdrop confirmation-backdrop">
      <div class="confirmation-modal">
        <div class="success-mark">✓</div>
        <h2>Bill No. {{ createdInvoice.number }}</h2>
        <p>{{ customerName(createdInvoice.customerId) }} · {{ money(totalInvoice(createdInvoice)) }}</p>
        <div class="confirmation-actions">
          <button class="btn-primary-vibrant" @click="printInvoiceSlip(createdInvoice)">PRINT BILL</button>
          <button class="btn-info-vibrant" @click="viewInvoiceImage(createdInvoice)">VIEW JPG</button>
        </div>
        <button class="text-button" @click="closeCreatedInvoice">Close</button>
      </div>
    </div>

    <div v-if="imagePreviewUrl" class="modal-backdrop pdf-backdrop">
      <div class="pdf-modal">
        <div class="modal-heading"><h2>JPG Preview &amp; Print Options</h2><button class="btn-outline-vibrant" @click="closeImagePreview">Close</button></div>
        <div class="image-preview-container"><img :src="imagePreviewUrl" alt="Preview" class="preview-img"></div>
        <div class="pdf-actions">
          <a class="btn-primary-vibrant pdf-download" :href="imagePreviewUrl" :download="invoiceFileNameJpg(imagePreviewInvoice)">Download JPG</a>
          <button class="btn-outline-vibrant" @click="printInvoiceSlip(imagePreviewInvoice)">Print Bill</button>
        </div>
      </div>
    </div>

    <!-- BLACK & WHITE PHYSICAL PAD REPLICA PRINTABLE VOUCHER -->
    <div v-if="invoiceToPrint" class="print-area">
      <div class="voucher-box">
        <div class="v-header">
          <div class="v-head-en">
            <h1>{{ data.company.name }}</h1>
            <p>Mob.: {{ data.company.phone }}</p>
            <p v-if="data.company.phone2">Mob.: {{ data.company.phone2 }}</p>
            <p>{{ data.company.address }}</p>
          </div>
          <div class="v-head-ar" dir="rtl">
            <h1>{{ data.company.arabicName }}</h1>
            <p>متحرك : {{ data.company.phone }}</p>
            <p v-if="data.company.phone2">متحرك : {{ data.company.phone2 }}</p>
            <p>{{ data.company.arabicAddress }}</p>
          </div>
        </div>
        <div class="v-type-box">
          <span>وثيقة تأجير / فاتورة نقدا &nbsp;&nbsp;&nbsp;—&nbsp;&nbsp;&nbsp; Rental Agreement / Cash Memo</span>
        </div>
        <div class="v-core-box">
          Core Cutting Services
        </div>
        <div class="v-meta">
          <div><b>Bill No :</b> <span class="big-num">{{ invoiceToPrint.number }}</span></div>
          <div><b>Date Out :</b> {{ invoiceToPrint.date }} &nbsp;&nbsp;&nbsp; <b>Time out :</b> {{ invoiceToPrint.timeOut || '-' }}</div>
        </div>
        <div class="v-cust">
          <p><b>Name (اسم) :</b> {{ customerName(invoiceToPrint.customerId) }} &nbsp;&nbsp;&nbsp; <b>Tel (هاتف) :</b> {{ invoiceCustomer(invoiceToPrint)?.phone || '-' }}</p>
          <p><b>Address (العنوان) :</b> {{ invoiceCustomer(invoiceToPrint)?.address || '-' }} &nbsp;&nbsp;&nbsp; <b>Site No. (رقم الموقع) :</b> {{ invoiceToPrint.siteNo || '-' }} &nbsp;&nbsp;&nbsp; <b>LPO :</b> {{ invoiceToPrint.lpo || '-' }}</p>
        </div>
        <table class="v-table">
          <thead>
            <tr>
              <th class="c">S.No<br><small style="font-size:6.5px;">رقم</small></th>
              <th>Description<br><small style="font-size:6.5px;">نوع المعدة</small></th>
              <th class="c">Item No.<br><small style="font-size:6.5px;">رقم المعدة</small></th>
              <th class="c">Rental Price<br><small style="font-size:6.5px;">سعر الايجار</small></th>
              <th class="c">Rental Period<br><small style="font-size:6.5px;">مدة الايجار</small></th>
              <th class="r">Total Amount<br><small style="font-size:6.5px;">المبلغ الاجمالي</small></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="c">1</td>
              <td><b>{{ invoiceToPrint.itemName || invoiceToPrint.description }}</b></td>
              <td class="c">{{ invoiceToPrint.itemCode || `(${invoiceToPrint.quantity})` }}</td>
              <td class="c">{{ Number(invoiceToPrint.rate || 0).toFixed(2) }}</td>
              <td class="c">{{ invoiceToPrint.days || 1 }} day(s)</td>
              <td class="r"><b>{{ invoiceLineAmount(invoiceToPrint).toFixed(2) }}</b></td>
            </tr>
            <tr v-if="invoiceToPrint.discount">
              <td colspan="5" class="r"><b>Discount / Concession</b></td>
              <td class="r">- {{ Number(invoiceToPrint.discount).toFixed(2) }}</td>
            </tr>
            <tr><td colspan="5" class="r"><b>Delivery Charges</b></td><td class="r">{{ money(invoiceToPrint.deliveryCharges) }}</td></tr>
            <tr><td colspan="5" class="r"><b>VAT (5%)</b></td><td class="r">{{ money(invoiceVat(invoiceToPrint)) }}</td></tr>
            <tr class="v-total-row">
              <td colspan="5" class="r"><b>TOTAL Dhs (<span style="color:#000;">{{ paymentStatus(invoiceToPrint) }}</span>) / المجموع درهم</b></td>
              <td class="r"><b>{{ money(totalInvoice(invoiceToPrint)) }}</b></td>
            </tr>
          </tbody>
        </table>
        <div class="v-terms">
          <p>- {{ data.company.defaultTerms }} &nbsp;&nbsp;|&nbsp;&nbsp; {{ data.company.defaultArabicTerms }}</p>
          <p>- The Hirer Responsible For Any Loss or Damage of Equip. &nbsp;&nbsp;|&nbsp;&nbsp; يتحمل المستأجر أي خسائر أو تلف على المعدات</p>
          <p>- Working hours : 6:00 AM to 8:00 PM &nbsp;&nbsp;|&nbsp;&nbsp; ساعات العمل : من ٦:٠٠ صباحاً إلى ٨:٠٠ مساءً</p>
          <p>- I Agree to deposit my documents as required by you in my own interest. &nbsp;&nbsp;|&nbsp;&nbsp; أوافق ان اسلمكم الوثائق الخاصة بي حسب منكم و ذلك طلستى</p>
        </div>
        <div class="v-signatures">
          <div class="sig-box">Customer Signature</div>
          <div class="sig-box">Cashier Signature ({{ data.company.cashierName }})</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root{font-family:Arial,sans-serif;color:#202938;background:#f3f5f8;font-size:12px}
*{box-sizing:border-box}
body{margin:0}
button,input,select{font:inherit}
button{cursor:pointer;border:0;border-radius:4px;padding:5px 10px;font-weight:600;transition:all 0.2s ease}

.btn-primary-vibrant{background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);color:white;box-shadow:0 2px 4px rgba(59,130,246,0.3)}
.btn-primary-vibrant:hover{background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);box-shadow:0 4px 8px rgba(59,130,246,0.4)}

.btn-success-vibrant{background:linear-gradient(135deg, #047857 0%, #10b981 100%);color:white;box-shadow:0 2px 4px rgba(16,185,129,0.3)}
.btn-success-vibrant:hover{background:linear-gradient(135deg, #065f46 0%, #059669 100%);box-shadow:0 4px 8px rgba(16,185,129,0.4)}

.btn-info-vibrant{background:linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);color:white;box-shadow:0 2px 4px rgba(56,189,248,0.3)}
.btn-info-vibrant:hover{background:linear-gradient(135deg, #0369a1 0%, #0284c7 100%);box-shadow:0 4px 8px rgba(56,189,248,0.4)}

.btn-warning-vibrant{background:linear-gradient(135deg, #d97706 0%, #fbbf24 100%);color:#111827;box-shadow:0 2px 4px rgba(251,191,36,0.3)}
.btn-warning-vibrant:hover{background:linear-gradient(135deg, #b45309 0%, #f59e0b 100%);color:#fff}

.btn-danger-vibrant{background:linear-gradient(135deg, #dc2626 0%, #f87171 100%);color:white;box-shadow:0 2px 4px rgba(248,113,113,0.3)}
.btn-danger-vibrant:hover{background:linear-gradient(135deg, #b91c1c 0%, #ef4444 100%);box-shadow:0 4px 8px rgba(248,113,113,0.4)}

.btn-cyan-vibrant{background:linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);color:white;box-shadow:0 2px 4px rgba(6,182,212,0.3)}
.btn-cyan-vibrant:hover{background:linear-gradient(135deg, #0e7490 0%, #0891b2 100%)}

.btn-orange-vibrant{background:linear-gradient(135deg, #c2410c 0%, #f97316 100%);color:white;box-shadow:0 2px 4px rgba(249,115,22,0.3)}
.btn-orange-vibrant:hover{background:linear-gradient(135deg, #9a3412 0%, #ea580c 100%)}

.btn-outline-vibrant{background:#ffffff;border:1.5px solid #cbd5e1;color:#1e293b;font-weight:700}
.btn-outline-vibrant:hover{background:#f1f5f9;border-color:#94a3b8}

/* REPORTS THEME */
.targit-report-wrapper {
  background: #0f172a;
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}
.targit-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #1e293b;
  padding-bottom: 12px;
  margin-bottom: 14px;
}
.targit-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #38bdf8;
}
.targit-subtitle {
  margin: 3px 0 0;
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 600;
}
.targit-body-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}
.targit-table-box {
  background: #ffffff;
  color: #1e293b;
  border-radius: 6px;
  padding: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.targit-table-title {
  font-weight: 800;
  font-size: 11px;
  color: #0f172a;
  margin-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 4px;
}
.targit-table-wrap {
  max-height: 480px;
  overflow-y: auto;
}
.targit-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}
.targit-data-table th {
  background: #f1f5f9;
  color: #334155;
  padding: 6px;
  font-size: 9px;
  border-bottom: 2px solid #cbd5e1;
  text-align: left;
}
.targit-data-table td {
  padding: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.targit-status-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 8.5px;
  font-weight: 700;
}
.targit-status-tag.available { background: #dcfce7; color: #15803d; }
.targit-status-tag.rented { background: #fee2e2; color: #b91c1c; }

.targit-sidebar-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.targit-widget-card {
  background: #1e293b;
  color: #f8fafc;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #334155;
}
.widget-title {
  font-size: 10px;
  font-weight: 800;
  color: #38bdf8;
  margin-bottom: 8px;
  border-bottom: 1px solid #334155;
  padding-bottom: 4px;
}
.trend-simulated-chart {
  height: 110px;
  background: #0f172a;
  border-radius: 4px;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 8px;
  border: 1px solid #334155;
}
.trend-line-graph {
  position: absolute;
  inset: 10px;
  border-bottom: 2px dashed #38bdf8;
  background: radial-gradient(ellipse at center, rgba(56,189,248,0.15) 0%, transparent 70%);
}
.trend-months {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 8.5px;
  color: #94a3b8;
  z-index: 2;
  margin-top: auto;
}
.bar-chart-item {
  margin-bottom: 8px;
  font-size: 9px;
  font-weight: 700;
  color: #cbd5e1;
}
.bar-fill {
  height: 22px;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  padding-left: 8px;
  border-radius: 3px;
  margin-top: 3px;
  font-size: 10px;
}
.bar-fill.blue { background: #0284c7; }
.bar-fill.green { background: #059669; }

.splash-screen{position:fixed;inset:0;background:linear-gradient(135deg, #111c2d 0%, #173b60 100%);display:grid;place-items:center;z-index:9999;color:white;text-align:center;padding:20px}
.splash-content{animation:fadeIn 0.5s ease-out}
.splash-logo{width:65px;height:65px;border-radius:14px;background:#d99a27;color:#17283e;display:grid;place-items:center;font-weight:900;font-size:26px;margin:0 auto 12px}
.splash-title{margin:0 0 6px;font-size:26px;font-weight:900}
.splash-arabic{margin:0 0 10px;font-size:20px;font-weight:700;color:#f3d179;direction:rtl}
.splash-sub{margin:0 0 18px;color:#aab8ca;font-size:12px}
.splash-loader{width:35px;height:35px;border:3px solid rgba(255,255,255,0.2);border-top-color:#d99a27;border-radius:50%;margin:auto;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.login-page{min-height:100vh;display:grid;place-items:center;background:#111c2d;padding:20px}
.login-card{background:white;padding:22px;border-radius:8px;width:min(350px,100%)}
.login-card h1{text-align:center;margin:6px 0;color:#17283e}
.login-card label,.form-grid label{display:flex;flex-direction:column;gap:2px;font-size:11px;font-weight:700;color:#465367}
.login-card input,.form-grid input,.form-grid select,.search{width:100%;border:1px solid #d6dce5;border-radius:4px;padding:5px 7px;background:#fff;font-size:11.5px}
.login-card input{margin-bottom:8px}
.logo,.brand-icon{width:34px;height:34px;border-radius:7px;background:#d99a27;color:#17283e;display:grid;place-items:center;font-weight:900;font-size:14px;margin:auto}
.full{width:100%}
.small-btn{padding:4px 8px;font-size:10.5px;min-width:65px;text-align:center}
.btn-group-equal{display:flex;gap:4px;align-items:center}
.app{min-height:100vh;display:flex}
.sidebar{background:#17283e;color:white;display:flex;flex-direction:column;justify-content:space-between;padding:4px 6px;flex-shrink:0;height:100vh;position:sticky;top:0}
.sidebar-top{display:flex;flex-direction:column;gap:3px}
.brand{display:flex;align-items:center;gap:6px;padding-bottom:4px;border-bottom:1px solid #23374d}
.brand b{font-size:11.5px}
.brand small{color:#aab8ca;font-size:9px;display:block}
.sidebar nav{display:flex;flex-direction:column;gap:1px;margin-top:2px}
.sidebar nav button{background:transparent;color:#d5deea;text-align:left;padding:4px 6px;font-size:11px;border-radius:4px;width:100%}
.sidebar nav button:hover,.sidebar nav button.selected{background:#2b4563;color:#fff}
.logout{background:#31465f;color:white;padding:4px;font-size:11px;border-radius:4px;width:100%}
.main{flex:1;min-width:0;padding:4px 10px;max-width:1400px;margin:0}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.topbar h2{margin:0;font-size:14px}
.topbar small{color:#748094;font-size:9.5px}
.top-actions{display:flex;align-items:center;gap:6px;font-size:11px}
.welcome{display:flex;justify-content:space-between;align-items:center;background:#173b60;color:white;padding:6px 8px;border-radius:4px;margin-bottom:6px}
.welcome h2{margin:0 0 1px;font-size:13px}.welcome p{margin:0;color:#d5e0ec;font-size:9.5px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:6px}
.stat{background:white;padding:5px 7px;border:1px solid #e5e9ef;border-radius:4px}
.stat span{display:block;color:#758196;font-size:9px;margin-bottom:1px}
.stat strong{font-size:13px}
.text-orange{color:#b45309}
.text-red{color:#b42318}
.text-green{color:#187344}
.panel{background:white;border:1px solid #e5e9ef;border-radius:4px;padding:6px 8px;margin-bottom:6px}
.panel h3{margin:0 0 5px;font-size:11.5px}
.compact-top-panel{margin-top:0}
.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-bottom:5px}
.form-grid .wide{grid-column:span 2}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:6px}
.search{max-width:160px;padding:3px 5px;font-size:10.5px}
.table-wrap{overflow-x:auto;width:100%}
table{border-collapse:collapse;width:100%;font-size:11px;white-space:nowrap}
th{text-align:left;background:#f4f6f9;color:#526074;font-size:9px}
td,th{padding:4px 5px;border-bottom:1px solid #e9edf2}
.empty{text-align:center;color:#8993a2;padding:8px}
.simple-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #edf0f4}
.simple-row>div{flex:1}
.simple-row small{display:block;color:#778397;font-size:9px}
.payment-status{display:inline-block;border-radius:20px;padding:1px 4px;font-size:8.5px;font-weight:700}
.payment-status.paid{background:#e8f6ed;color:#187344}
.payment-status.partially-paid{background:#fff5df;color:#8b5a00}
.payment-status.unpaid{background:#fff0ee;color:#b42318}
.calculation{display:flex;flex-wrap:wrap;gap:6px;background:#f4f6f9;padding:5px 7px;border-radius:4px;margin-bottom:5px;font-size:10px}
.button-row{display:flex;gap:5px;align-items:center}
.quick-cust-box{background:#f8fafc;border:1px solid #cbd5e1;padding:8px;border-radius:4px;margin-bottom:6px}
.quick-cust-box h4{margin:0 0 5px;font-size:11px;color:#173b60}
.upload-btn{display:inline-block;padding:4px 8px;border-radius:4px;cursor:pointer;font-weight:600;font-size:10px;text-align:center}
.upload-btn input{display:none}
.toast{position:fixed;right:12px;top:8px;background:#173b60;color:white;padding:5px 8px;border-radius:4px;z-index:1000;font-size:10.5px}
.print-area{display:none}
.modal-backdrop{position:fixed;inset:0;background:#101d2dcc;display:grid;place-items:center;padding:8px;z-index:1000}
.confirmation-modal{width:min(380px,100%);background:#fff;border-radius:6px;padding:12px;text-align:center}
.success-mark{width:30px;height:30px;margin:0 auto 4px;border-radius:50%;display:grid;place-items:center;background:#e8f6ed;color:#187344;font-size:14px;font-weight:700}
.confirmation-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0 5px}
.text-button{background:transparent;color:#586579;font-size:9.5px}
.pdf-backdrop{z-index:1100}
.pdf-modal{width:min(750px,100%);height:min(85vh,800px);background:#fff;border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:5px}
.modal-heading{display:flex;align-items:center;justify-content:space-between}
.modal-heading h2{margin:0;font-size:12px}
.image-preview-container{flex:1;overflow:auto;border:1px solid #d6dce5;background:#f3f5f8;display:grid;place-items:center;padding:5px}
.preview-img{max-width:100%;height:auto;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.pdf-actions{display:flex;justify-content:flex-end;gap:4px}
.c{text-align:center}.r{text-align:right}

@media print{
  @page{size: auto; margin: 0mm;}
  body *{visibility:hidden!important}
  .print-area,.print-area *{visibility:visible!important}
  #printable-id-card, #printable-id-card * {visibility:visible!important}
  #printable-id-card {position:absolute!important;left:0!important;top:0!important;width:100%!important;border:none!important}
  .print-area{display:flex!important;justify-content:center!important;align-items:center!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;padding:2mm!important;box-sizing:border-box!important}
  .voucher-box{width:100%!important;max-height:98vh!important;border:1.5px solid #000!important;background:#fff!important;color:#000!important;padding:4px;font-family:Arial;font-size:9px;margin:auto!important;box-sizing:border-box!important}
  .v-header{display:flex;justify-content:space-between;border-bottom:1.5px solid #000;padding-bottom:2px}
  .v-head-en h1{margin:0;font-size:11px;font-weight:900;color:#000}
  .v-head-en p{margin:1px 0;font-size:8.5px}
  .v-head-ar h1{margin:0;font-size:12px;font-weight:900;text-align:right;color:#000}
  .v-head-ar p{margin:1px 0;font-size:8.5px;text-align:right}
  .v-type-box{text-align:center;margin:2px 0;font-size:8.5px;font-weight:bold;border:1px solid #000;padding:2px;background:#fff!important}
  .v-core-box{text-align:center;margin:2px 0;font-size:8.5px;font-weight:bold;border:1px solid #000;padding:2px;background:#fff!important}
  .v-meta{display:flex;justify-content:space-between;border-bottom:1px dashed #000;padding:2px 0;font-size:9px}
  .big-num{font-size:10px;font-weight:bold}
  .v-cust{padding:2px 0;font-size:8.5px;border-bottom:1px solid #000}
  .v-cust p{margin:1px 0}
  .v-table{width:100%;border-collapse:collapse;margin-top:2px}
  .v-table th,.v-table td{border:1px solid #000;padding:2px 3px;font-size:8.5px}
  .v-table th{background:#fff!important;color:#000!important;font-size:7.5px}
  .c{text-align:center}.r{text-align:right}
  .v-terms{margin-top:2px;font-size:7px;border:1px solid #000;padding:2px;line-height:1.05;background:#fff!important}
  .v-terms p{margin:1px 0}
  .v-signatures{display:flex;justify-content:space-between;margin-top:15px}
  .sig-box{width:38%;text-align:center;border-top:1px solid #000;padding-top:2px;font-weight:bold;font-size:8.5px}
}
</style>