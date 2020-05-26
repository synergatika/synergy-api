import { object } from "prop-types";

//const imagesLocation = '/mnt/c/Users/Dimitris Sociality/Desktop/Synargy Demo Images';
const imagesLocation = '/mnt/c/Users/dmytakis/Documents/MyDocuments/Software Engineering (Projects)/Synergy/Synergy Demo Images';

var defaultAdmin = {
  name: "Admin",
  email: "admin@gmail.com",
  password: "admin",
  authToken: '',
  _id: '',
};

var partner_a = {
  name: "Partner A",
  email: "partner_a@email.gr",
  password: "partner_a",
  tempPass: '',
  sector: "Durables (Technology)",
  imageFile: "partner_a.png",
  subtitle: "This is subtitle for partner a!",
  description: "This is description for partner a! This is description for partner a! This is description for partner a! This is description for partner a!",
  timetable: "Monday to Friday 10.00 - 18.00",
  contact: {
    phone: 2101021010,
    websiteURL: "http://partner_a.gr"
  },
  address: {
    street: "Street A",
    city: "Athens",
    postCode: 10677,
    coordinates: ['37.985560', '23.732720']
  },
  payments: [{
    bic: 'PIRBGRAA',
    name: 'PiraeusBank',
    value: 'GR9701168245531283734574714'
  }],
  authToken: '',
  _id: '',
  updatedImageFile: "updated_partner_a.png",
  updatedDescription: "This is an updated description for partner a! This is description for partner a! This is description for partner a! This is description for partner a!",
  updatedAddress: {
    street: "Updated Street A",
    city: "Updated City",
    postCode: 10677,
    coordinates: ['37.985560', '23.732720']
  },
};

var partner_b = {
  name: "Partner B",
  email: "partner_b@email.gr",
  password: "partner_b",
  tempPass: '',
  subtitle: "This is subtitle for partner b!",
  description: "This is description for partner b! This is description for partner b! This is description for partner b! This is description for partner b!",
  timetable: "Μonday, Tuesday, Thursday, Friday 9.00-21.00 <br>Wednesday 9.00-16.00 <br>Saturday 10.00-16.00",
  sector: "Recreation and Culture",
  imageFile: "partner_b.png",
  contact: {
    phone: 2102021020,
    websiteURL: "https://www.merchnat_b.gr/"
  },
  address: {
    street: "Street B",
    city: "Athens",
    postCode: 10439,
    coordinates: ['37.990800', '23.725320']
  },
  payments: [{
    bic: 'PIRBGRAA',
    name: 'PiraeusBank',
    value: 'GR9701168245531283734666951'
  }, {
    bic: 'CRBAGRAA',
    name: 'AlphaBankAE',
    value: 'GR7901047254398567169456321'
  }],
  authToken: '',
  _id: '',
};

var partner_c = {
  name: "Partner C",
  email: "partner_c@email.gr",
  password: "partner_c",
  subtitle: "This is subtitle for partner c!",
  description: "This is description for partner c! This is description for partner c! This is description for partner c! This is description for partner c!",
  timetable: "Μonday, Tuesday, Thursday, Friday 9.00-21.00 <br>Wednesday 9.00-16.00 <br>Saturday 10.00-16.00",
  sector: "Recreation and Culture",
  imageFile: "partner_c.png",
  payments: [{
    bic: 'PIRBGRAA',
    name: 'PiraeusBank',
    value: 'GR9715968245559633797851234'
  }],
  oneClickToken: ''
}

var user_a = { // Auto Registered
  name: "Member 1",
  email: "member1@email.com",
  password: 'member1',
  verificationToken: '',
  restorationToken: '',
  authToken: '',
  imageFile: "user_a.jpg",
  tempPass: '',
  _id: ''
};

var user_b = { // Registerd by Partner
  name: "Member 2",
  email: "member2@email.com",
  password: 'member2',
  authToken: '',
  verificationToken: '',
  restorationToken: '',
  tempPass: '',
  _id: ''
};

var user_c = { // Registerd by Partner
  name: "Member 3",
  email: "member3@email.com",
  password: 'member3',
  card: '3412341278567856',
  authToken: '',
  verificationToken: '',
  restorationToken: '',
  tempPass: ''
};

var user_d = { // Registerd by Partner
  name: "Member 4",
  email: "member4@email.com",
  password: 'member4',
  card: '4123412385678567',
  authToken: '',
  verificationToken: '',
  restorationToken: '',
  tempPass: ''
};

var user_e = { // Registerd by Partner
  name: "Member 5",
  email: "member5@email.com",
  password: 'member5',
  card: '5678567812341234',
  authToken: '',
  verificationToken: '',
  restorationToken: '',
  tempPass: ''
};

var user_f = {
  email: "member6@email.com",
  oneClickToken: '',
  tempPass: ''
};

var offer_a = {
  title: 'First Offer',
  subtitle: 'This is subtitle for offer A',
  description: 'This is description for offer A! This is description for offer A! This is description for offer A!',
  cost: 80,
  expiresAt: '',
  imageFile: 'offer_a.png',
  updatedImageFile: 'updated_offer_a.png'
}

var offer_b = {
  title: 'Second Offer',
  subtitle: 'This is subtitle for offer B',
  description: 'This is description for offer B! This is description for offer B! This is description for offer B!',
  cost: 120,
  expiresAt: '',
  imageFile: 'offer_b.jpg',
}

var offer_c = {
  title: 'Third Offer',
  subtitle: 'This is subtitle for offer C',
  description: 'This is description for offer C! This is description for offer C! This is description for offer C!',
  cost: 100,
  expiresAt: '',
  imageFile: ''
}

var post_a = {
  access: 'public',
  title: 'First Post (Public)',
  subtitle: 'This is subtitle for post A',
  content: 'This is content for post A! This is content for post A! This is content for post A!',
  imageFile: 'post_a.png'
}

var post_b = {
  access: 'private',
  title: 'Second Post (Private)',
  subtitle: 'This is subtitle for post B',
  content: 'This is content for post B! This is content for post B! This is content for post B!',
  imageFile: 'post_b.png'
}

var event_a = {
  access: 'partners',
  title: 'First Event (Partners)',
  subtitle: 'This is subtitle for event A',
  description: 'This is description for event A! This is description for event A! This is description for event A!',
  dateTime: '',
  location: 'Location Event A',
  imageFile: 'event_a.jpg'
}

var event_b = {
  access: 'public',
  title: 'Second Event (Public)',
  subtitle: 'This is subtitle for event B',
  description: 'This is description for event B! This is description for event B! This is description for event B!',
  dateTime: '',
  location: 'Location Event B',
  imageFile: 'event_b.jpg',
  updatedImageFile: 'updated_event_b.jpg'
}

var microcredit_a = {
  _id: '',
  title: 'First Microcredit Campaign',
  terms: 'These are terms for microcredit A',
  access: 'public',
  description: 'This is description for microcredit A! This is description for microcredit A! This is description for microcredit A!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: true,
  stepAmount: 1,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 3000,
  redeemStarts: '',
  redeemEnds: '',
  startsAt: '',
  expiresAt: '',
  imageFile: 'microcredit_a.png',
  updatedDescription: 'This is updated description for microcredit A! This is description for microcredit A! This is description for microcredit A!',
}

var microcredit_b = {
  _id: '',
  title: 'Second Microcredit Campaign',
  terms: 'These are terms for microcredit B',
  access: 'private',
  description: 'This is description for microcredit B! This is description for microcredit B! This is description for microcredit B!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: false,
  stepAmount: 1,
  minAllowed: 5,
  maxAllowed: 0,
  maxAmount: 45,
  redeemStarts: '',
  redeemEnds: '',
  startsAt: '',
  expiresAt: '',
  imageFile: 'microcredit_b.jpg'
}

var microcredit_c = {
  _id: '',
  title: 'Third Microcredit Campaign',
  terms: 'These are terms for microcredit C',
  access: 'public',
  description: 'This is description for microcredit C! This is description for microcredit C! This is description for microcredit C!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: false,
  stepAmount: 1,
  minAllowed: 5,
  maxAllowed: 0,
  maxAmount: 45,
  redeemStarts: '',
  redeemEnds: '',
  startsAt: '',
  expiresAt: '',
  imageFile: 'microcredit_b.jpg'
}

var content_a = {
  name: 'Test Content',
  el_title: 'Ελληνικός Τίτλος',
  en_title: 'English Title',
  el_content: 'Ελληνικό Περιεχόμενο',
  en_content: 'English Content',
  updated_en_content: 'Updated English Content'
};

type Offer = {
  partner_id: '',
  partner_imageURL: '',
  partner_name: '',
  partner_slug: '',
  offer_id: '',
  offer_imageURL: '',
  title: '',
  offer_slug: '',
  subtitle: '',
  description: '',
  cost: 0,
  expiresAt: 0,
  createdAt: ''
}

type Post = {
  partner_id: '',
  partner_imageURL: '',
  partner_name: '',
  partner_slug: '',
  post_id: '',
  post_imageURL: '',
  title: '',
  post_slug: '',
  subtitle: '',
  content: '',
  type: '',
  access: '',
  createdAt: ''
}

type Event = {
  partner_id: '',
  partner_imageURL: '',
  partner_name: '',
  partner_slug: '',
  event_id: '',
  event_imageURL: '',
  title: '',
  event_slug: '',
  subtitle: '',
  description: '',
  location: '',
  dateTime: 0,
  access: '',
  createdAt: ''
}

type MicrocreditCampaign = {
  partner_id: '',
  partner_imageURL: '',
  partner_name: '',
  merchnat_slug: '',
  campaign_id: '',
  campaign_imageURL: '',
  title: '',
  campaign_slug: '',
  terms: '',
  access: '',
  description: '',
  category: '',
  subtitle: '',
  quantitative: false,
  stepAmount: 0,
  minAllowed: 0,
  maxAllowed: 0,
  maxAmount: 0,
  redeemStarts: 0,
  redeemEnds: 0,
  startsAt: 0,
  expiresAt: 0,
  createdAt: ''
}

type Content = {
  _id: '',
  name: '',
  el_title: '',
  en_title: '',
  el_content: '',
  en_content: ''
}

var offers: Offer[] = new Array();
var posts: Post[] = new Array();
var events: Event[] = new Array();
var microcreditCampaigns: MicrocreditCampaign[] = new Array();
var content: Content[] = new Array();

export {
  imagesLocation,
  defaultAdmin,
  partner_a, partner_b, partner_c,
  user_a, user_b, user_c, user_d, user_e, user_f,
  offer_a, offer_b, offer_c,
  post_a, post_b,
  event_a, event_b,
  microcredit_a, microcredit_b, microcredit_c,
  content_a,
  offers, posts, events, microcreditCampaigns, content
}
