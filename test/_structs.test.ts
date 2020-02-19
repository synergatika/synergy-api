import { object } from "prop-types";

const imagesLocation = '/mnt/c/Users/Dimitris Sociality/Downloads/';

var defaultAdmin = {
  name: "Admin",
  email: "admin@gmail.com",
  password: "admin",
  authToken: '',
  _id: '',
};

var defaultMerchant_1 = {
  name: "Sociality",
  email: "contact@sociality.gr",
  password: "sociality",
  tempPass: '',
  sector: "Durables (Technology)",
  imageFile: "sociality.png",
  contact: {
    phone: 2103606616,
    websiteURL: "http://socaility.gr"
  },
  address: {
    street: "Solonos 136",
    city: "Athens",
    postCode: 10677,
    coordinates: ['37.985560', '23.732720']
  },
  payments: {
    nationalBank: 'GR5001415913618373112749987',
    pireausBank: 'GR9701168245531283734574714',
    eurobank: 'GR6201018963613623796349221',
    alphaBank: 'GR7901047254398567169526453',
    paypal: '/sociality'
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_2 = {
  name: "Commonspace",
  email: "info@commonspace.gr",
  password: "commonspace",
  tempPass: '',
  sector: "Recreation and Culture",
  imageFile: "commonspace.png",
  contact: {
    phone: 2130434085,
    websiteURL: "https://www.commonspace.gr/"
  },
  address: {
    street: "Akakiou 1 - 3 & Ipeirou 60",
    city: "Athens",
    postCode: 10439,
    coordinates: ['37.990800', '23.725320']
  },
  payments: {
    nationalBank: 'GR5001415913454543543543534',
    pireausBank: 'GR9701168245531283734575555',
    eurobank: 'GR6201018963613623796373661',
    alphaBank: 'GR7901047254398567169512345',
    paypal: '/com'
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_3 = {
  name: "Syn Allois",
  email: "info@synallois.org",
  password: "synallois",
  tempPass: '',
  sector: "Food",
  imageFile: "synallois.jfif",
  contact: {
    phone: 2103456681,
    websiteURL: "https://synallois.org"
  },
  address: {
    street: "Nileos 35",
    city: "Athens",
    postCode: 11851,
    coordinates: ['37.975040', '23.716560']
  },
  payments: {
    nationalBank: 'GR5001415913618373112123456',
    pireausBank: 'GR9701168245531283734574725',
    eurobank: 'GR6201018963613623796349216',
    alphaBank: 'GR7901047254398567169526883',
    paypal: '/syna'
  },
  authToken: '',
  _id: '',
};

var newUser = { // Auto Registered
  name: "Demo User",
  email: "demo@email.com",
  password: "demo_2020",
  verificationToken: '',
  restorationToken: '',
  authToken: '',
  imageFile: "face1.png"
};

var newCustomer_1 = { // Registerd by Merchant
  name: "Customer 1",
  email: "customer1@email.com",
  password: 'customer1',
  authToken: '',
  restorationToken: '',
  tempPass: ''
};

var newCustomer_2 = { // Registerd by Merchant
  name: "Customer 2",
  email: "customer2@email.com",
  password: 'customer2',
  authToken: '',
  restorationToken: '',
  tempPass: ''
};

var newMerchant = { // Registered by Admin
  name: "Merchant Random",
  email: "merchant11@gmail.com",
  password: 'newMerchant',
  authToken: '',
  tempPass: ''
};

type Offer = {
  merchant_id: '',
  merchant_imageURL: '',
  merchant_name: '',
  offer_id: '',
  imageURL: '',
  title: '',
  description: '',
  cost: '',
  expiresAt: '',
  createdAt: ''
}

type Post = {
  merchant_id: '',
  merchant_imageURL: '',
  merchant_name: '',
  post_id: '',
  imageURL: '',
  title: '',
  content: '',
  type: '',
  access: '',
  createdAt: ''
}

type Event = {
  merchant_id: '',
  merchant_imageURL: '',
  merchant_name: '',
  event_id: '',
  imageURL: '',
  title: '',
  description: '',
  location: '',
  dateTime: '',
  access: '',
  createdAt: ''
}

var offers: Offer[] = new Array();
var posts: Post[] = new Array();
var events: Event[] = new Array();

export {
  imagesLocation,
  defaultMerchant_1,
  defaultMerchant_2,
  defaultMerchant_3,
  defaultAdmin,
  newUser,
  newCustomer_1,
  newCustomer_2,
  newMerchant,
  offers, posts, events
}
