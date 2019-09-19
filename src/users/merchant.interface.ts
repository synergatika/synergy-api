import User from './user.interface'

interface Merchant extends User{
    contact: {
        phone: number;
        web: string;
        address: {
            street: string;
            city: string;
            zipCode: number;
        }
    }
}

export default Merchant;