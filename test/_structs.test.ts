// import { object } from "prop-types";

//const imagesLocation = '/mnt/c/Users/Dimitris Sociality/Documents/Notes (Projects)/Synergy/Synargy Demo Images/Demo Images';
const imagesLocation = '/mnt/c/Users/dmytakis/Documents/MyDocuments/Software Engineering (Projects)/Synergy/Synergy Demo Images';
const lang = 'en-En';

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
  phone: 2101021010,
  address: {
    street: "Street A",
    city: "Athens",
    postCode: 10677,
    coordinates: ['37.985560', '23.732720']
  },
  contacts: [{
    slug: 'WEB',
    name: 'Website',
    value: 'www.partner_c.gr'
  }, {
    slug: 'YT',
    name: 'Youtube',
    value: 'youtube.com/partner_c'
  }],
  payments: [{
    bic: 'PIRBGRAA',
    name: 'PiraeusBank',
    value: 'GR9701168245531283734574714'
  }, {
    bic: 'PAYPAL.ME',
    name: 'Paypal',
    value: 'partner@synergy.io'
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
  phone: 2102021020,
  address: {
    street: "Street B",
    city: "Athens",
    postCode: 10439,
    coordinates: ['37.990800', '23.725320']
  },
  contacts: [{
    slug: 'FB',
    name: 'Facebook',
    value: 'facebook.com/partner_a'
  }, {
    slug: 'TW',
    name: 'Twitter',
    value: 'twitter.com/partner_a'
  }],
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
  contacts: [{
    slug: 'FB',
    name: 'Facebook',
    value: 'facebook.com/partner_b'
  }, {
    slug: 'IG',
    name: 'Instagram',
    value: 'instagram.com/partner_b'
  }],
  payments: [{
    bic: 'PIRBGRAA',
    name: 'PiraeusBank',
    value: 'GR9715968245559633797851234'
  }, {
    bic: 'PAYPAL.ME',
    name: 'PayPal.Me',
    value: 'paypal.me/partner_c'
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

var _date1 = new Date();
var _newDate1 = (_date1.setDate(_date1.getDate() - 20)).toString();
var _date2 = new Date();
var _newDate2 = (_date2.setDate(_date2.getDate() - 10)).toString();
var _date3 = new Date();
var _newDate3 = (_date3.setDate(_date3.getDate() + 10)).toString();
var _date4 = new Date();
var _newDate4 = (_date4.setDate(_date4.getDate() + 20)).toString();
var _date5 = new Date();
var _newDate5 = (_date5.setDate(_date5.getDate() + 100)).toString();
var _date6 = new Date();
var _newDate6 = (_date6.setDate(_date6.getDate() + 200)).toString();

var offer_a = {
  title: 'First Offer',
  subtitle: 'This is subtitle for offer A',
  description: 'This is description for offer A! This is description for offer A! This is description for offer A!',
  instructions: 'Instructions how to receive offer A!',
  cost: 80,
  expiresAt: _newDate4,
  imageFile: 'offer_a.png',
  updatedImageFile: 'updated_offer_a.png'
}

var offer_b = {
  title: 'Second Offer',
  subtitle: 'This is subtitle for offer B',
  description: 'This is description for offer B! This is description for offer B! This is description for offer B!',
  instructions: 'Instructions how to receive offer B!',
  cost: 120,
  expiresAt: _newDate5,
  imageFile: 'offer_b.jpg',
}

var offer_c = {
  title: 'Third Offer',
  subtitle: 'This is subtitle for offer C',
  description: 'This is description for offer C! This is description for offer C! This is description for offer C!',
  instructions: 'Instructions how to receive offer C!',
  cost: 100,
  expiresAt: _newDate5,
  imageFile: ''
}

var offer_d = {
  title: 'Expired Offer D',
  subtitle: 'This is subtitle for offer C',
  description: 'This is description for offer C! This is description for offer C! This is description for offer C!',
  instructions: 'Instructions how to receive offer C!',
  cost: 100,
  expiresAt: _newDate2,
  imageFile: 'offer_a.png'
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

var post_c = {
  access: 'public',
  title: 'Rich Editor Post',
  subtitle: 'A subtitle for Post',
  content: `<h2>What is Lorem Ipsum?</h2><figure class="image image-style-side"><img src="http://localhost:3000/assets/content/post_1607530836341.jpg"><figcaption>Image Subtitle</figcaption></figure><p><strong>Lorem Ipsum</strong> is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</p><ul><li>One</li><li>Two</li><li>Three</li></ul><h2>Why do we use it?</h2><p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of&nbsp;</p><ol><li>One</li><li>Two&nbsp;</li><li>Three</li></ol><p>using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).</p><figure class="image"><img src="http://localhost:3000/assets/content/post_1607530836372.jpg"></figure><h2>Where does it come from?</h2><p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</p><figure class="table"><table><tbody><tr><td>Name</td><td>Phone</td><td>Address</td></tr><tr><td>Chris Lorem</td><td>222222222</td><td>Here &amp; There 50, Athens 11111</td></tr></tbody></table></figure><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>&nbsp;</p><blockquote><p>There are many variations of passages of Lorem Ipsum available, but the majority</p></blockquote>`,
  contentFiles: ['http://localhost:3000/assets/content/post_1607530836341.jpg', 'http://localhost:3000/assets/content/post_1607530836372.jpg'],
  imageFile: 'post_b.png'
}

var event_a = {
  access: 'partners',
  title: 'First Event (Partners)',
  subtitle: 'This is subtitle for event A',
  content: 'This is content for event A! This is content for event A! This is content for event A!',
  dateTime: _newDate3,
  location: 'Location Event A',
  imageFile: 'event_a.jpg'
}

var event_b = {
  access: 'public',
  title: 'Second Event (Public)',
  subtitle: 'This is subtitle for event B',
  content: 'This is content for event B! This is content for event B! This is content for event B!',
  dateTime: _newDate4,
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
  stepAmount: 5,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 3000,
  redeemStarts: _newDate2,
  redeemEnds: _newDate6,
  startsAt: _newDate2,
  expiresAt: _newDate5,
  imageFile: 'microcredit_a.png',
  updatedDescription: 'This is updated description for microcredit A! This is description for microcredit A! This is description for microcredit A!',
}

var microcredit_b = {
  _id: '',
  title: 'Second Microcredit Campaign',
  terms: 'These are terms for microcredit B',
  access: 'public',
  description: 'This is description for microcredit B! This is description for microcredit B! This is description for microcredit B!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: false,
  stepAmount: 0,
  minAllowed: 15,
  maxAllowed: 15,
  maxAmount: 40,
  redeemStarts: _newDate3,
  redeemEnds: _newDate6,
  startsAt: _newDate1,
  expiresAt: _newDate6,
  imageFile: 'microcredit_b.jpg'
}

var microcredit_c = {
  _id: '',
  title: 'Expired Microcredit Campaign',
  terms: 'These are terms for microcredit C',
  access: 'public',
  description: 'This is description for microcredit C! This is description for microcredit C! This is description for microcredit C!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: true,
  stepAmount: 0,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 100,
  redeemStarts: _newDate3,
  redeemEnds: _newDate6,
  startsAt: _newDate1,
  expiresAt: _newDate2,
  imageFile: 'microcredit_a.png',
}

var microcredit_d = {
  _id: '',
  title: 'Draft Microcredit Campaign D',
  terms: 'These are terms for microcredit D',
  access: 'public',
  description: 'This is description for microcredit D! This is description for microcredit D! This is description for microcredit D!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: true,
  stepAmount: 0,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 100,
  redeemStarts: _newDate4,
  redeemEnds: _newDate6,
  startsAt: _newDate3,
  expiresAt: _newDate6,
  imageFile: 'microcredit_b.jpg'
}

var microcredit_e = {
  _id: '',
  title: 'Expired Microcredit Campaign E',
  terms: 'These are terms for microcredit E',
  access: 'public',
  description: 'This is description for microcredit E! This is description for microcredit E! This is description for microcredit E!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: true,
  stepAmount: 0,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 100,
  redeemStarts: '',
  redeemEnds: '',
  startsAt: '',
  expiresAt: '',
  imageFile: 'microcredit_b.jpg'
}

var microcredit_f = {
  _id: '',
  title: 'Expected Microcredit Campaign F',
  terms: 'These are terms for microcredit F',
  access: 'public',
  description: 'This is description for microcredit F! This is description for microcredit F! This is description for microcredit F!',
  category: 'Technology',
  subtitle: 'This is subtitle',
  quantitative: true,
  stepAmount: 0,
  minAllowed: 10,
  maxAllowed: 50,
  maxAmount: 100,
  redeemStarts: _newDate4,
  redeemEnds: _newDate6,
  startsAt: _newDate3,
  expiresAt: _newDate6,
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
  instructions: '',
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
  offer_a, offer_b, offer_c, offer_d,
  post_a, post_b, post_c,
  event_a, event_b,
  microcredit_a, microcredit_b, microcredit_c, microcredit_d, microcredit_e, microcredit_f,
  content_a,
  offers, posts, events, microcreditCampaigns, content
}
