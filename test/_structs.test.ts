import { object } from "prop-types";

const imagesLocation = '/mnt/c/Users/Dimitris Sociality/Desktop/Synargy Demo Images';

var defaultAdmin = {
  name: "Admin",
  email: "admin@gmail.com",
  password: "admin",
  authToken: '',
  _id: '',
};

var defaultMerchant_1 = {
  name: "Sociality",
  email: "contact@_sociality.gr",
  password: "sociality",
  tempPass: '',
  sector: "Durables (Technology)",
  imageFile: "sociality.png",
  subtitle: "Structures should serve people and not the other way around",
  description: "We empower the online presences of organizations and companies in a wide range of the digital spectrum. " +
    "We design and develop custom digital tools that make everyday work easier, more efficient and effective." +
    "We organize open and private wokrshops and provide courses on digital expertise." +
    "We contribute to the community with our research work in user research, prototype development and by participating in social projects.",
  timetable: "Monday to Friday 10.00 - 18.00",
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
    nationalBank: '',
    pireausBank: 'GR9701168245531283734574714',
    eurobank: '',
    alphaBank: '',
    paypal: ''
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_2 = {
  name: "Commonspace",
  email: "info@_commonspace.gr",
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
    nationalBank: '',
    pireausBank: 'GR9701168245531283734666951',
    eurobank: '',
    alphaBank: 'GR7901047254398567169456321',
    paypal: ''
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_3 = {
  name: "Syn Allois",
  email: "info@_synallois.org",
  password: "synallois",
  tempPass: '',
  sector: "Food",
  subtitle: "Our core business is alternative and solidarity trade, mainly in the food sector!",
  description: "The Solidarity Economy Cooperative Syn Allois started operating in Athens in the fall of 2011. We have chosen to work collectively, applying alternative economic practices that aim at meeting human needs, solidarity and equal relations. <br>Our core business is alternative and solidarity trade, mainly in the food sector. A commercial process, that aims to meet the needs of all involved in the supply chain: The decent reward of producers' value, the provision of quality products in the best possible way accessible to consumers, the sustainable and democratic functioning of trafficking organizations, and the concern for the protection of the natural environment. <br>It is not a utopia, but a reality that engages millions of people across the globe and achieves its goals to the extent that it manages to create long-lasting relationships of reciprocity and trust. <br>In our store you can find: coffee, cocoa-chocolate, sugar, tea-mate, pasta rice - quinoa, cereal-muesli-fruit and fruit products, organic spices-sauces, detergents essences, detergents, natural cosmetics.",
  timetable: "Μonday, Tuesday, Thursday, Friday 9.00-21.00 <br>Wednesday 9.00-16.00 <br>Saturday 10.00-16.00",
  imageFile: "synallois.png",
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
    nationalBank: 'GR5001415913618373112121112',
    pireausBank: '',
    eurobank: '',
    alphaBank: '',
    paypal: '/synallois'
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_4 = {
  name: "Bread & Roses",
  email: "info@_breadandroses.gr",
  password: "breadandroses",
  tempPass: '',
  sector: "Hotels, cafes and restaurants",
  subtitle: "Bread & Roses is the common secret of those who live and work in Omonia and the wider center of Athens, looking for quality but at the same time affordable food. A colorful cooperative restaurant!",
  description: "Bread & Roses is the common secret of those who live and work in Omonia and the wider center of Athens, looking for quality but at the same time affordable food. A colorful cooperative restaurant! <br>Our philosophy for food is simple. Our menu is all in one dish: main course, salad and side dish, all in one plate that changes daily and you find it every morning at 10am on the store's media. That is to say, you will eat a delicious and economical full meal and you will be more than satisfied. <br>If you want to have a snack, just take the small portion. If you can't get out of work or just get bored getting out of the couch, you can order and deliver exactly the same procedure.<br>And don’t forget! When spring comes the cooler rooftop in Athens opens, offering the best scenery for events and parties!",
  timetable: "Monday to Friday 10.00-20.00",
  imageFile: "breadandroses.png",
  contact: {
    phone: 2103802898,
    websiteURL: "https://breadandroses.gr/"
  },
  address: {
    street: "Panepistimiou 64",
    city: "Athens",
    postCode: 10677,
    coordinates: ['37.984086', '23.7275963']
  },
  payments: {
    nationalBank: '',
    pireausBank: '',
    eurobank: '',
    alphaBank: 'GR7901047254398567169526883',
    paypal: '/breadandroses'
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_5 = {
  name: "Cooperative Publications",
  email: "syneditions@_gmail.com",
  password: "cooperativepublications",
  tempPass: '',
  sector: "Recreation and Culture",
  subtitle: "We publish books with love and diligence, so that everyone can have access to good books.",
  description: "We are a self-managed book space project that started in 2009 as an editorial initiative and gradually evolved into a self-managed community to promote a different culture and a different relationship with books. Cooperative Publications operate anti-hierarchically, without directors and directors, deciding - in the spirit of consensus - collectively.<br>Our publishing philosophy consists in the admittedly optimistic (and for some controversial) assumption that the book can not only be a commodity but primarily a social good and that the reader is not just a consumer but a book lover.<br>With love and diligence, we print books that we consider economically feasible, tasteful and remarkable (hopefully) so that everyone can have access to good books. <br>Beyond the publishing of books, our cooperative is also active in the field of distribution and sale of books. Our self-managed bookstore is already operating at 35 Eressou Street in Exarchia, where one can find books from small, alternative publishing houses that are not 'hosted' on the shelves of bigger bookstores. We have gathered a selected literature collection of rare books, as well as an offer section.",
  imageFile: "cooperativepublications.jpg",
  contact: {
    phone: 2103818840,
    websiteURL: "https://ekdoseisynadelfwn.wordpress.com/"
  },
  address: {
    street: "Kallidromiou 30",
    city: "Athens",
    postCode: 11473,
    coordinates: ['37.9860737', '23.738737']
  },
  payments: {
    nationalBank: '',
    pireausBank: 'GR9301720800005080065297711',
    eurobank: '',
    alphaBank: '',
    paypal: ''
  },
  authToken: '',
  _id: '',
};

var defaultMerchant_6 = {
  name: "Action Plus",
  email: "info@_action-plus.gr",
  password: "actionplus",
  tempPass: '',
  sector: "Education",
  subtitle: "We publish books with love and diligence, so that everyone can have access to good books.",
  description: "ACTION PLUS Social Cooperative Enterprise was established in 2014 with the vision to create favorable conditions for an open access to the cultural, leisure and community life of Athens. In that context, we: organize quality guided tours at a low fee and with a special policy for families and for disabled persons.<br>Each of the ACTION PLUS activities is designed by our experts’ team and our group of certified tour guides. Our aim is to offer a unique experience that goes beyond the usual track.<br>ACTION PLUS profits are used for the creation  of new jobs, the broadening of our scope of activities and the increase of our social impact. Feel free to contact us for further information about our activities!",
  imageFile: "actionplus.jpg",
  contact: {
    phone: 2103818840,
    websiteURL: "https://ekdoseisynadelfwn.wordpress.com/"
  },
  address: {
    street: "Solonos 69",
    city: "Athens",
    postCode: 10679,
    coordinates: ['37.9860737', '23.738737']
  },
  payments: {
    nationalBank: "GR1301100800000008000681794",
    pireausBank: "GR3401720320005032092204585",
    eurobank: '',
    alphaBank: "GR7901404410441002002010207",
    paypal: ''
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
  defaultMerchant_4,
  defaultMerchant_5,
  defaultMerchant_6,
  defaultAdmin,
  newUser,
  newCustomer_1,
  newCustomer_2,
  newMerchant,
  offers, posts, events
}
