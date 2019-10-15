import * as chai from 'chai';
import chaiHttp from 'chai-http';
//import should from 'should';
//chai.should();
chai.use(require('chai').should)
chai.use(require('chai-http'));

const defaultCustomer = {
    email: "customer1@gmail.com",
    password: "customer1",
    authToken: '',
    _id: ''
}

const defaultMerchant = {
    email: "merchant1@gmail.com",
    password: "merchant1",
    authToken: '',
    _id: ''
}

const defaultAdmin = {
    email: "admin1@gmail.com",
    password: "admin1",
    authToken: '',
    _id: ''
}

var newUser = { // Auto Registered
    name: "Customer Ten",
    email: "customer10@gmail.com",
    password: "customer10",
    verificationToken: '',
    restorationToken: '',
    authToken: ''
}

var newCustomer = { // Registerd by Merchant
    name: "Invited Customer",
    email: "customer11@gmail.com",
    password: ''
}

var newMerchant = { // Registered by Admin
    name: "Merchant Ten",
    email: "merchant10@gmail.com",
    password: ''
}

describe("Test All in One", () => {

    before((done) => {
        chai.request("http://localhost:3000")
            .put("/auth/test/delete_users")
            .send(
                {
                    email1: newUser.email,
                    email2: newCustomer.email,
                    email3: newMerchant.email
                }
            )
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                done();
            })
    });

    describe("Customer", () => {

        describe("Customer Auth (/auth)", () => {
            it("1. should create a new user (auto-registration as customer)", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/register")
                    .send(newUser)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        // res.body.should.have.property('message')
                        newUser.verificationToken = res.body.tempData.token;
                        done();
                    })
            });
            it("2. should verify a user's email address", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/verify_email")
                    .send({
                        "token": newUser.verificationToken
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("3. should NOT create user | as there is already user with these email address)", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/register")
                    .send(newUser)
                    .end((err, res) => {
                        res.should.have.status(404);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("4. should NOT send a verfication email | as user has already verified email address", (done) => {
                chai.request("http://localhost:3000")
                    .get("/auth/verify_email/" + newUser.email)
                    .end((err, res) => {
                        res.should.have.status(404);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("5. should NOT authenticate user | due to wrong credentials", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate")
                    .send({
                        email: newUser.email,
                        password: "random_password"
                    })
                    .end((err, res) => {
                        res.should.have.status(404);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("6. should send a restoration email", (done) => {
                chai.request("http://localhost:3000")
                    .get("/auth/forgot_pass/" + newUser.email)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newUser.restorationToken = res.body.tempData.token;
                        done();
                    });
            });
            it("7. should NOT validate restoration token | as it is wrong", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/forgot_pass")
                    .send({
                        token: "random_token"
                    })
                    .end((err, res) => {
                        res.should.have.status(404);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("8. should validate restoration token", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/forgot_pass")
                    .send({
                        token: newUser.restorationToken
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("9. should NOT update/restore password | as does not match with verification password", (done) => {
                chai.request("http://localhost:3000")
                    .put("/auth/forgot_pass")
                    .send({
                        token: newUser.restorationToken,
                        newPassword: "new_password",
                        verPassword: "random_password"
                    })
                    .end((err, res) => {
                        res.should.have.status(404);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("10. should update/restore password", (done) => {
                chai.request("http://localhost:3000")
                    .put("/auth/forgot_pass")
                    .send({
                        token: newUser.restorationToken,
                        newPassword: "new_password",
                        verPassword: "new_password"
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newUser.password = 'new_password'
                        done();
                    });
            });
            it("11. should authenticate user", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate")
                    .send({
                        email: newUser.email,
                        password: newUser.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newUser.authToken = res.body.data.token.token;
                        done();
                    });
            });
            it("12. should update user's password", (done) => {
                chai.request("http://localhost:3000")
                    .put("/auth/change_pass")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .send({
                        oldPassword: newUser.password,
                        newPassword: 'newest_password'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newUser.password = 'newest_password';
                        done();
                    });
            });
        });

        describe("Customer's Profile (/profile)", () => {
            it("1. should read user's profile", (done) => {
                chai.request("http://localhost:3000")
                    .get("/profile")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("2. should update customer's profile", (done) => {
                chai.request("http://localhost:3000")
                    .put("/profile")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .send({
                        imageURL: "http://customer_image.com",
                        name: "Random Name"
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
        });
    });

    describe("Merchant", () => {
        describe("Merchant Auth (/auth)", () => {
            it("1. should authenticate user", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate")
                    .send({
                        email: defaultMerchant.email,
                        password: defaultMerchant.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        defaultMerchant._id = res.body.data.user._id;
                        defaultMerchant.authToken = res.body.data.token.token;
                        done();
                    });
            });
            it("2. should NOT create a new merchant | as customer cannot create customer", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/register/" + "merchant")
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: newMerchant.name,
                        email: newMerchant.email
                    })
                    .end((err, res) => {
                        res.should.have.status(403);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("3. should create a new customer", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/register/" + "customer")
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: newCustomer.name,
                        email: newCustomer.email
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newCustomer.password = res.body.tempData.password;
                        done();
                    });
            });
            it("4. should authenticate the new customer", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate/")
                    .send({
                        email: newCustomer.email,
                        password: newCustomer.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
        });

        describe("Merchant's Profile(Info) (/auth)", () => {
            it("1. should NOT update merchant's profile(info) | as it does not belong to logged in user", (done) => {
                chai.request("http://localhost:3000")
                    .put("/merchants/" + 'random_id')
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: "Merchant One",
                        imageURL: "http://merchant_image.gr",
                        contact: {
                            phone: 2105555555,
                            websiteURL: 'merchant_shop.gr',
                            address: {
                                street: "My Street",
                                zipCode: 10000,
                                city: "Athens"
                            }
                        },
                        sector: "Durables"
                    })
                    .end((err, res) => {
                        res.should.have.status(403);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("2. should NOT update merchant's profile(info) | as it does not belong to logged in user", (done) => {
                chai.request("http://localhost:3000")
                    .put("/merchants/" + defaultMerchant._id)
                    .set('Authorization', 'Bearer ' + 'random_jwt')
                    .send({
                        name: "Merchant One",
                        imageURL: "http://merchant_image.gr",
                        contact: {
                            phone: 2105555555,
                            websiteURL: 'merchant_shop.gr',
                            address: {
                                street: "My Street",
                                zipCode: 10000,
                                city: "Athens"
                            }
                        },
                        sector: "Durables"
                    })
                    .end((err, res) => {
                        res.should.have.status(401);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("3. should update merchant's profile(info)", (done) => {
                chai.request("http://localhost:3000")
                    .put("/merchants/" + defaultMerchant._id)
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: "New Merchant Name",
                        imageURL: "http://url_merchant.gr",
                        contact: {
                            phone: 2105555555,
                            websiteURL: 'www.merchant_shop.gr',
                            address: {
                                street: "My Street",
                                zipCode: 10000,
                                city: "Athens"
                            }
                        },
                        sector: "Durables"
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
        });
    });

    describe("Admin", () => {

        describe("Admin Auth (/auth)", () => {
            it("1. should authenticate user", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate")
                    .send({
                        email: defaultAdmin.email,
                        password: defaultAdmin.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        defaultAdmin._id = res.body.data.user._id;
                        defaultAdmin.authToken = res.body.data.token.token;
                        done();
                    });
            });
            it("2. should update password", (done) => {
                chai.request("http://localhost:3000")
                    .put("/auth/change_pass")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        oldPassword: defaultAdmin.password,
                        newPassword: 'new_password'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("3. should authenticate user", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate")
                    .send({
                        email: defaultAdmin.email,
                        password: 'new_password'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        defaultAdmin._id = res.body.data.user._id;
                        defaultAdmin.authToken = res.body.data.token.token;
                        done();
                    });
            });
            it("4. should update password", (done) => {
                chai.request("http://localhost:3000")
                    .put("/auth/change_pass")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        oldPassword: 'new_password',
                        newPassword: defaultAdmin.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("5. should create a new merchant", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/register/" + "merchant")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        name: newMerchant.name,
                        email: newMerchant.email
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newMerchant.password = res.body.tempData.password;
                        done();
                    });
            });
            it("6. should NOT authenticate the new merchant | as password is empty", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate/")
                    .send({
                        email: newMerchant.email,
                    })
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("7. should authenticate the new merchant", (done) => {
                chai.request("http://localhost:3000")
                    .post("/auth/authenticate/")
                    .send({
                        email: newMerchant.email,
                        password: newMerchant.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
        });
    });

    describe("No Login Required", () => {
        it("1. should read all merchants", (done) => {
            chai.request("http://localhost:3000")
                .get("/merchants/")
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("2. should read a merchant's info", (done) => {
            chai.request("http://localhost:3000")
                .get("/merchants/" + defaultMerchant._id)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("3. should NOT read anything | as url does not exist", (done) => {
            chai.request("http://localhost:3000")
                .get("/random_url/")
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    done();
                });
        });
    });
});

