var defaultCustomer = {
    name: "Customer 10",
    email: "customer10@gmail.com",
    password: "customer10",
    authToken: '',
    _id: ''
};

var defaultMerchant = {
    name: "Merchant 10",
    email: "merchant10@gmail.com",
    password: "merchant10",
    authToken: '',
    _id: ''
};
var defaultAdmin = {
    name: "Admin 10",
    email: "admin10@gmail.com",
    password: "admin10",
    authToken: '',
    _id: ''
};
var newUser = { // Auto Registered
    name: "Customer El",
    email: "customer11@gmail.com",
    password: "customer11",
    verificationToken: '',
    restorationToken: '',
    authToken: ''
};
var newCustomer = { // Registerd by Merchant
    name: "Invited Customer",
    email: "customer12@gmail.com",
    password: ''
};
var newMerchant = { // Registered by Admin
    name: "Merchant El",
    email: "merchant11@gmail.com",
    password: ''
};

export {
    defaultCustomer,
    defaultMerchant,
    defaultAdmin,
    newUser,
    newCustomer,
    newMerchant
}