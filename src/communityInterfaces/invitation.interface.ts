interface Invitation {
    _id: string;

    sender_id: string;
    receiver_id: string;

    points: Number;

    createdAt: Date;
}

export default Invitation;