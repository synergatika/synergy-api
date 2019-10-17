import User from './user.interface'

interface Merchant extends User{
    contact: {
        phone: number;
        websiteURL: string;
        address: {
            street: string;
            city: string;
            zipCode: number;
        }
    }
    sector: string;
}

export default Merchant;
