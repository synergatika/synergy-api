import User from './user.interface'

interface Customer extends User {
    name: string;
    imageURL: string;
}
export default Customer;
